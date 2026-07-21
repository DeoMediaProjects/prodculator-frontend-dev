import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Badge, IconButton, Popover, Button, Divider, Checkbox, Tooltip } from '@mui/material';
import {
  NotificationsNoneOutlined, CheckCircleOutline, ErrorOutline, HourglassEmptyOutlined,
  WorkspacePremiumOutlined, DoneAll, Close, DeleteOutline,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';

// Notifications are DERIVED from real account state (report status, plan usage) —
// never fabricated — so what the bell shows always matches the data.
type Kind = 'success' | 'error' | 'info' | 'warning';
interface AppNotification {
  id: string;
  kind: Kind;
  title: string;
  body: string;
  to: string;
  ts: number; // epoch ms
}

type ReportApiResponse = {
  id: string; title?: string; script_title?: string; created_at?: string; createdAt?: string;
  analysis?: { error?: string } | null; report_data?: { error?: string } | null;
};

const READ_KEY = 'prodculator-notifs-read';
const DISMISS_KEY = 'prodculator-notifs-dismissed';
const PLAN_PERIOD_LIMIT: Record<string, number> = { free: 1, professional: 10, producer: 30, studio: Infinity };

function loadSet(key: string): Set<string> {
  try { const s = localStorage.getItem(key); if (s) return new Set(JSON.parse(s) as string[]); } catch { /* */ }
  return new Set();
}
function saveSet(key: string, ids: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* */ }
}
function ago(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60; if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60; if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24; if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function toTs(value?: string): number {
  if (!value) return Date.now();
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user } = useAuth();

  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [read, setRead] = useState<Set<string>>(() => loadSet(READ_KEY));
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadSet(DISMISS_KEY));
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list: AppNotification[] = [];
      try {
        const data = await apiClient.get<ReportApiResponse[]>('/api/reports', { auth: true });
        for (const r of data) {
          const analysis = r.analysis || r.report_data;
          const title = r.title || r.script_title || 'Untitled';
          const ts = toTs(r.created_at || r.createdAt);
          if (analysis?.error) {
            list.push({ id: `report-failed-${r.id}`, kind: 'error', title: 'Analysis failed', body: `“${title}” couldn't be completed. Try running it again.`, to: `/report/${r.id}`, ts });
          } else if (analysis) {
            list.push({ id: `report-ready-${r.id}`, kind: 'success', title: 'Report ready', body: `Your production report for “${title}” is ready to view.`, to: `/report/${r.id}`, ts });
          } else {
            list.push({ id: `report-pending-${r.id}`, kind: 'info', title: 'Analysis in progress', body: `“${title}” is still being analysed — this usually takes 2–4 minutes.`, to: `/report/${r.id}`, ts });
          }
        }
      } catch { /* no reports / not signed in */ }

      // Plan-usage nudge — only when a free user has spent their allowance.
      const plan = (user?.plan || 'free');
      const limit = PLAN_PERIOD_LIMIT[plan] ?? 1;
      const used = user?.reportsUsed ?? 0;
      if (Number.isFinite(limit) && used >= limit && plan === 'free') {
        list.push({ id: `plan-limit-${plan}-${used}`, kind: 'warning', title: 'Free report used', body: 'Upgrade to keep generating production reports.', to: '/pricing', ts: Date.now() });
      }

      list.sort((a, b) => b.ts - a.ts);
      if (!cancelled) setNotifs(list.slice(0, 25));
    })();
    return () => { cancelled = true; };
  }, [user?.plan, user?.reportsUsed]);

  // Dismissed notifications are hidden everywhere; the bell only reflects live ones.
  const visible = useMemo(() => notifs.filter((n) => !dismissed.has(n.id)), [notifs, dismissed]);
  const unread = useMemo(() => visible.filter((n) => !read.has(n.id)).length, [visible, read]);
  const allSelected = visible.length > 0 && visible.every((n) => selected.has(n.id));

  const markRead = (ids: string[]) => {
    setRead((prev) => { const next = new Set(prev); ids.forEach((i) => next.add(i)); saveSet(READ_KEY, next); return next; });
  };
  const dismiss = (ids: string[]) => {
    setDismissed((prev) => { const next = new Set(prev); ids.forEach((i) => next.add(i)); saveSet(DISMISS_KEY, next); return next; });
    setSelected((prev) => { const next = new Set(prev); ids.forEach((i) => next.delete(i)); return next; });
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(visible.map((n) => n.id)));
  };
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };

  const open = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);
  const close = () => { setAnchor(null); exitSelect(); };
  const handleClick = (n: AppNotification) => {
    if (selectMode) { toggleSelect(n.id); return; }
    markRead([n.id]); close(); navigate(n.to);
  };

  const iconFor = (k: Kind) => {
    const c = k === 'success' ? t.success : k === 'error' ? t.error : k === 'warning' ? t.warning : t.gold;
    const sx = { fontSize: 20, color: c };
    if (k === 'success') return <CheckCircleOutline sx={sx} />;
    if (k === 'error') return <ErrorOutline sx={sx} />;
    if (k === 'warning') return <WorkspacePremiumOutlined sx={sx} />;
    return <HourglassEmptyOutlined sx={sx} />;
  };

  return (
    <>
      <Badge
        badgeContent={unread}
        color="error"
        overlap="rectangular"
        max={9}
        sx={{ '& .MuiBadge-badge': { top: 5, right: 5, fontWeight: 700 } }}
      >
        <IconButton onClick={open} sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', color: unread ? t.gold : t.textSecondary }}>
          <NotificationsNoneOutlined sx={{ fontSize: 20 }} />
        </IconButton>
      </Badge>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, width: 360, maxWidth: '92vw', bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '14px', boxShadow: mode === 'dark' ? '0 12px 40px rgba(0,0,0,0.6)' : '0 12px 40px rgba(0,0,0,0.15)' } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.5 }}>
          {selectMode ? (
            <Box
              onClick={toggleSelectAll}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'pointer' }}
            >
              <Checkbox checked={allSelected} size="small" sx={{ p: 0.5, color: t.textSecondary, '&.Mui-checked': { color: t.gold } }} />
              <Typography sx={{ fontWeight: 700, color: t.textPrimary, fontSize: 14 }}>
                {selected.size ? `${selected.size} selected` : 'Select all'}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ fontWeight: 800, color: t.textPrimary }}>Notifications</Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {selectMode ? (
              <>
                <Tooltip title="Delete selected">
                  <span>
                    <Button size="small" startIcon={<DeleteOutline sx={{ fontSize: 16 }} />} disabled={!selected.size} onClick={() => dismiss([...selected])} sx={{ color: t.error, fontWeight: 700, textTransform: 'none', '&.Mui-disabled': { color: t.textFaint } }}>
                      Delete
                    </Button>
                  </span>
                </Tooltip>
                <Button size="small" onClick={exitSelect} sx={{ color: t.textSecondary, fontWeight: 600, textTransform: 'none' }}>Cancel</Button>
              </>
            ) : visible.length > 0 ? (
              <>
                {unread > 0 && (
                  <Tooltip title="Mark all read">
                    <IconButton size="small" onClick={() => markRead(visible.map((n) => n.id))} sx={{ color: t.gold }}><DoneAll sx={{ fontSize: 18 }} /></IconButton>
                  </Tooltip>
                )}
                <Button size="small" onClick={() => setSelectMode(true)} sx={{ color: t.textSecondary, fontWeight: 600, textTransform: 'none' }}>Select</Button>
                <Tooltip title="Clear all">
                  <IconButton size="small" onClick={() => dismiss(visible.map((n) => n.id))} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton>
                </Tooltip>
              </>
            ) : null}
          </Box>
        </Box>
        <Divider sx={{ borderColor: t.borderSoft }} />

        {visible.length === 0 ? (
          <Box sx={{ px: 2, py: 5, textAlign: 'center' }}>
            <NotificationsNoneOutlined sx={{ fontSize: 32, color: t.textFaint, mb: 1 }} />
            <Typography sx={{ color: t.textSecondary, fontSize: 14 }}>You're all caught up.</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {visible.map((n) => {
              const isRead = read.has(n.id);
              const isSel = selected.has(n.id);
              return (
                <Box
                  key={n.id}
                  onClick={() => handleClick(n)}
                  sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, px: 2, py: 1.5, cursor: 'pointer', borderBottom: `1px solid ${t.borderSoft}`, bgcolor: isSel ? t.goldDim : isRead ? 'transparent' : t.goldDim, '&:hover': { bgcolor: t.goldDim }, '&:hover .notif-dismiss': { opacity: 1 } }}
                >
                  {selectMode ? (
                    <Checkbox checked={isSel} size="small" sx={{ p: 0, mt: 0.25, color: t.textSecondary, '&.Mui-checked': { color: t.gold } }} />
                  ) : (
                    <Box sx={{ mt: 0.25 }}>{iconFor(n.kind)}</Box>
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: t.textPrimary }}>{n.title}</Typography>
                      <Typography sx={{ fontSize: 11, color: t.textFaint, whiteSpace: 'nowrap' }}>{ago(n.ts)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 0.25 }}>{n.body}</Typography>
                  </Box>
                  {!selectMode && (
                    <Tooltip title="Dismiss">
                      <IconButton
                        className="notif-dismiss"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); dismiss([n.id]); }}
                        sx={{ p: 0.25, color: t.textFaint, opacity: 0, transition: 'opacity .12s', '&:hover': { color: t.error } }}
                      >
                        <Close sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!selectMode && !isRead && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: t.gold, flexShrink: 0, mt: 0.75 }} />}
                </Box>
              );
            })}
          </Box>
        )}
      </Popover>
    </>
  );
}
