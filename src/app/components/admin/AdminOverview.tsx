import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Chip, Skeleton, Typography,
} from '@mui/material';
import { CheckCircleOutlined } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { adminApi } from '@/services/admin.api';
import type { AdminMetrics, ActivityItem, AuditLogEntry, TaskItem } from '@/services/admin.types';

// Recent activity shows five rows and scrolls for the rest. Derived from a row
// height constant so the container stays exactly five rows if padding changes,
// rather than drifting out of sync with a hardcoded pixel value.
const ACTIVITY_ROWS_VISIBLE = 5;
const ACTIVITY_ROW_HEIGHT = 68;
// Fetched deeper than the five on show so scrolling reaches something. The
// endpoint caps at 50.
const ACTIVITY_FETCH_LIMIT = 30;

function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return 'Unknown time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** `update.incentive` becomes `Update incentive`. Same rule as the audit reader. */
function humaniseAction(action: string): string {
  const [verb, ...rest] = action.split('.');
  const resource = rest.join('.').replace(/_/g, ' ');
  const readable = verb.replace(/[-_]/g, ' ');
  return `${readable.charAt(0).toUpperCase()}${readable.slice(1)}${resource ? ` ${resource}` : ''}`;
}

export function AdminOverview() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  // Reading the trail needs canManageAdmins, so a narrower role gets an
  // explanation rather than an empty panel that looks like a bug.
  const [auditDenied, setAuditDenied] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      const [metricsResult, activityResult, statusResult, tasksResult] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getActivity(ACTIVITY_FETCH_LIMIT),
        adminApi.getAuditLogs({ limit: ACTIVITY_ROWS_VISIBLE }),
        adminApi.getTasks(),
      ]);

      if (metricsResult.error) setMetricsError(metricsResult.error);
      else setMetrics(metricsResult.data);
      setMetricsLoading(false);

      setActivity(activityResult.data?.items ?? []);
      setActivityLoading(false);

      if (statusResult.error) setAuditDenied(true);
      else setAuditEntries(statusResult.data?.items ?? []);
      setAuditLoading(false);

      setTasks(tasksResult.data?.items ?? []);
      setTasksLoading(false);
    })();
  }, []);

  // Shared surface, identical to the B2C dashboard's card token.
  const panel = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' } as const;
  const sectionLabel = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
    color: t.textSecondary, textTransform: 'uppercase' as const,
  };

  const taskAccent = (priority: TaskItem['priority']) =>
    priority === 'high' ? t.error : priority === 'medium' ? t.warning : t.textSecondary;

  const money = (value: number) => `$${Math.round(value).toLocaleString()}`;

  // Four figures, one focal. Revenue carries the gold because it is the number
  // the console exists to protect; making all six gold (as before) meant the
  // accent said nothing at all.
  const stats: { label: string; value: string; sub: string; focal?: boolean; to?: string }[] = metrics
    ? [
        {
          label: 'Monthly revenue',
          value: money(metrics.mrr_usd),
          sub: `${metrics.active_subscriptions.toLocaleString()} active subscription${metrics.active_subscriptions === 1 ? '' : 's'}`,
          focal: true,
          to: '/admin/metrics',
        },
        {
          label: 'Total users',
          value: metrics.total_users.toLocaleString(),
          sub: `${metrics.conversion_rate_percent.toFixed(1)}% converted to paid`,
        },
        {
          label: 'Reports this month',
          value: metrics.reports_this_month.toLocaleString(),
          sub: `${metrics.total_reports.toLocaleString()} generated all time`,
          to: '/admin/pdf-reports',
        },
        {
          label: 'Open data tasks',
          value: tasksLoading ? ', ' : String(tasks.length),
          sub: tasks.length === 0 ? 'Every dataset is current' : 'Datasets past their review window',
          to: '/admin/incentives',
        },
      ]
    : [];

  return (
    <Box>
      {metricsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {metricsError}
        </Alert>
      )}

      {/* Stat strip */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2, mb: 3,
        }}
      >
        {metricsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              // Skeletons rather than a spinner: the layout does not jump when
              // the numbers land, so the page stops feeling like it reloaded.
              <Box key={i} sx={{ ...panel, p: 2.75 }}>
                <Skeleton variant="text" width="55%" height={14} />
                <Skeleton variant="text" width="45%" height={44} sx={{ my: 0.5 }} />
                <Skeleton variant="text" width="70%" height={14} />
              </Box>
            ))
          : stats.map((s) => (
              <Box
                key={s.label}
                onClick={s.to ? () => navigate(s.to as string) : undefined}
                sx={{
                  ...panel, p: 2.75, ...(s.to
                    ? {
                        cursor: 'pointer',
                        transition: 'border-color .15s, background .15s',
                        '&:hover': { borderColor: t.gold, bgcolor: t.cardBgAlt },
                      }
                    : {}),
                }}
              >
                <Typography sx={{ ...sectionLabel, mb: 1 }}>{s.label}</Typography>
                <Typography sx={{ fontSize: 34, fontWeight: 800, lineHeight: 1, color: s.focal ? t.gold : t.textPrimary }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 1 }}>{s.sub}</Typography>
              </Box>
            ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.35fr 1fr' },
          gap: 2, alignItems: 'start',
        }}
      >
        {/* Recent activity */}
        <Box sx={{ ...panel, p: 2.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: t.textPrimary }}>Recent activity</Typography>
            {activity.length > ACTIVITY_ROWS_VISIBLE && (
              <Typography sx={{ fontSize: 12, color: t.textSecondary }}>
                {ACTIVITY_ROWS_VISIBLE} of {activity.length}, scroll for more
              </Typography>
            )}
          </Box>

          {activityLoading ? (
            <Box>
              {Array.from({ length: ACTIVITY_ROWS_VISIBLE }).map((_, i) => (
                <Box key={i} sx={{ py: 1.25, borderBottom: i < ACTIVITY_ROWS_VISIBLE - 1 ? `1px solid ${t.borderSoft}` : 'none' }}>
                  <Skeleton variant="text" width="62%" height={18} />
                  <Skeleton variant="text" width="38%" height={14} />
                </Box>
              ))}
            </Box>
          ) : activity.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: 14, mb: 0.5 }}>
                Nothing has happened yet
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
                Report generations, sign-ups and subscription changes appear here as they happen.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                maxHeight: ACTIVITY_ROWS_VISIBLE * ACTIVITY_ROW_HEIGHT,
                overflowY: 'auto',
                // Thin native scrollbar tinted to the theme. Deliberately not a
                // custom scroll widget: replacing a standard affordance in an
                // admin tool costs more than it gains.
                scrollbarWidth: 'thin',
                scrollbarColor: `${t.border} transparent`,
                mr: -1, pr: 1,
              }}
            >
              {activity.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    minHeight: ACTIVITY_ROW_HEIGHT,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    py: 1.25,
                    borderBottom: index < activity.length - 1 ? `1px solid ${t.borderSoft}` : 'none',
                  }}
                >
                  <Typography sx={{ color: t.textPrimary, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>
                    {item.description}
                  </Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: 12, mt: 0.35 }}>
                    {formatTimestamp(item.timestamp)}
                    {item.user_email ? ` · ${item.user_email}` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Recent admin changes */}
        <Box sx={{ ...panel, p: 2.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 17, color: t.textPrimary }}>Recent admin changes</Typography>
            <Typography
              onClick={() => navigate('/admin/audit-trail')}
              sx={{ fontSize: 12.5, color: t.gold, cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
            >
              Full trail
            </Typography>
          </Box>
          <Typography sx={{ color: t.textSecondary, fontSize: 12.5, mb: 2, lineHeight: 1.6 }}>
            What staff changed, and whether it took effect. A failed or denied attempt is recorded too.
          </Typography>

          {auditLoading ? (
            <Box>
              {Array.from({ length: ACTIVITY_ROWS_VISIBLE }).map((_, i) => (
                <Box key={i} sx={{ py: 1.25, borderBottom: i < ACTIVITY_ROWS_VISIBLE - 1 ? `1px solid ${t.borderSoft}` : 'none' }}>
                  <Skeleton variant="text" width="58%" height={18} />
                  <Skeleton variant="text" width="34%" height={14} />
                </Box>
              ))}
            </Box>
          ) : auditDenied ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: 14, mb: 0.5 }}>
                Not visible to your role
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
                The audit trail records before and after state for users and subscriptions, so reading it needs the
                admin-management permission.
              </Typography>
            </Box>
          ) : auditEntries.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: 14, mb: 0.5 }}>
                No changes recorded yet
              </Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
                Every edit an admin makes is recorded here with the state either side of it.
              </Typography>
            </Box>
          ) : (
            auditEntries.map((entry, index) => (
              <Box
                key={entry.id}
                sx={{
                  minHeight: ACTIVITY_ROW_HEIGHT,
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  py: 1.25,
                  borderBottom: index < auditEntries.length - 1 ? `1px solid ${t.borderSoft}` : 'none',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ color: t.textPrimary, fontSize: 14, fontWeight: 500 }}>
                    {humaniseAction(entry.action)}
                  </Typography>
                  {entry.succeeded === false && (
                    <Chip
                      size="small"
                      label={entry.status_code === 403 ? 'denied' : 'failed'}
                      sx={{ height: 19, fontSize: '0.66rem', bgcolor: t.cardBgAlt, color: t.error, fontWeight: 700 }}
                    />
                  )}
                </Box>
                <Typography sx={{ color: t.textSecondary, fontSize: 12, mt: 0.35 }}>
                  {entry.actor_email || 'Unattributed'} · {formatTimestamp(entry.created_at)}
                  {entry.resource_id ? ` · ${entry.resource_id}` : ''}
                </Typography>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* Data maintenance */}
      <Box sx={{ ...panel, p: 2.75, mt: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 17, color: t.textPrimary, mb: 0.5 }}>
          Data maintenance
        </Typography>
        <Typography sx={{ color: t.textSecondary, fontSize: 12.5, mb: 2 }}>
          Derived from how long ago each dataset was last verified, not from a manual list.
        </Typography>

        {tasksLoading ? (
          <Box>
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} sx={{ py: 1.25 }}>
                <Skeleton variant="text" width="48%" height={18} />
                <Skeleton variant="text" width="24%" height={14} />
              </Box>
            ))}
          </Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1 }}>
            <CheckCircleOutlined sx={{ fontSize: 19, color: t.success }} />
            <Typography sx={{ color: t.textPrimary, fontSize: 14 }}>
              Every dataset is inside its review window.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              columnGap: 3,
            }}
          >
            {tasks.map((item, index) => (
              <Box
                key={`${item.task}-${index}`}
                sx={{
                  display: 'flex', alignItems: 'baseline', gap: 1.25,
                  py: 1.25, borderBottom: `1px solid ${t.borderSoft}`,
                }}
              >
                {/* Priority as a small dot plus a due date. A coloured chip per
                    row turned a maintenance list into a warning wall. */}
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: taskAccent(item.priority), flexShrink: 0, mt: 0.75 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ color: t.textPrimary, fontSize: 14, lineHeight: 1.45 }}>
                    {item.task}
                  </Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: 12, mt: 0.25 }}>
                    {item.priority === 'high' ? 'Overdue' : 'Due'} {item.due}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
