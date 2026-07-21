import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, IconButton, CircularProgress, LinearProgress, Tooltip,
} from '@mui/material';
import {
  VisibilityOutlined, FileDownloadOutlined, DeleteOutline, DescriptionOutlined,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { downloadReportPDF } from '@/services/report-pdf.service';
import { DataTable } from './DataTable';

interface ReportRow {
  id: string;
  title: string;
  createdAt: string;
  reportType: string;
  topTerritory: string;
  status: 'Completed' | 'Failed' | 'Pending';
  pdfUrl?: string | null;
}

type AnalysisPayload = {
  error?: string;
  topRecommendation?: string;
  executiveSummary?: { recommendedTerritories?: string[] };
  locationRankings?: Array<{ name?: string; country?: string }>;
};
type ReportApiResponse = {
  id: string; title?: string; script_title?: string; createdAt?: string; created_at?: string;
  reportType?: string; report_type?: string; analysis?: AnalysisPayload | null;
  report_data?: AnalysisPayload | null; pdfUrl?: string | null; pdf_url?: string | null;
};

const PLAN_PERIOD_LIMIT: Record<string, number> = { free: 1, professional: 10, producer: 30, studio: Infinity };

function fmtDate(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export function DashboardHome() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user } = useAuth();

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get<ReportApiResponse[]>('/api/reports', { auth: true });
        const mapped: ReportRow[] = data.map((r) => {
          const analysis = r.analysis || r.report_data;
          const status: ReportRow['status'] = analysis?.error ? 'Failed' : analysis ? 'Completed' : 'Pending';
          return {
            id: r.id,
            title: r.title || r.script_title || 'Untitled',
            createdAt: r.createdAt || r.created_at || '',
            reportType: (r.reportType || r.report_type || 'unknown').replace(/^\w/, (c) => c.toUpperCase()),
            topTerritory:
              analysis?.locationRankings?.[0]?.name ||
              analysis?.locationRankings?.[0]?.country ||
              analysis?.executiveSummary?.recommendedTerritories?.[0] ||
              analysis?.topRecommendation || 'N/A',
            status,
            pdfUrl: r.pdfUrl || r.pdf_url || null,
          };
        });
        if (!cancelled) setReports(mapped);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const plan = user?.plan || 'free';
  const periodLimit = PLAN_PERIOD_LIMIT[plan] ?? 1;
  const usedThisPeriod = Math.min(user?.reportsUsed ?? 0, Number.isFinite(periodLimit) ? periodLimit : (user?.reportsUsed ?? 0));
  const remaining = Number.isFinite(periodLimit) ? Math.max(0, periodLimit - usedThisPeriod) : Infinity;
  const credits = user?.reportsLimit ?? 0;

  const stats = useMemo(() => {
    const completed = reports.filter((r) => r.status === 'Completed').length;
    const thisMonth = reports.filter((r) => {
      const d = new Date(r.createdAt); const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { generated: reports.length, thisMonth, active: completed };
  }, [reports]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This permanently removes the report and cannot be undone.`)) return;
    setDeletingId(id);
    const prev = reports;
    setReports((rs) => rs.filter((r) => r.id !== id));
    try {
      await apiClient.delete(`/api/reports/${id}`, { auth: true });
    } catch {
      setReports(prev);
      window.alert('Could not delete the report. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (r: ReportRow) => {
    if (!r.pdfUrl) return;
    setDownloadingId(r.id);
    try { await downloadReportPDF(r.id, r.title); } catch { /* ignore */ } finally { setDownloadingId(null); }
  };

  const statusColor = (s: ReportRow['status']) => (s === 'Completed' ? t.success : s === 'Pending' ? t.warning : t.error);
  // Mockup shows two-digit, zero-padded counters (03, 04, 12).
  const pad = (n: number | string) => (typeof n === 'number' && Number.isFinite(n) ? String(n).padStart(2, '0') : String(n));

  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' };

  return (
    <Box>
      {/* Stat cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          { label: 'REPORTS GENERATED', value: pad(stats.generated), sub: stats.thisMonth ? `+${stats.thisMonth} this month` : 'No reports yet', gold: false },
          { label: 'CREDITS REMAINING', value: pad(Number.isFinite(credits) ? credits : '∞'), sub: plan === 'free' ? 'Free plan credit' : 'Pay-per-report overflow', gold: true },
          { label: 'ACTIVE PROJECTS', value: pad(stats.active), sub: stats.active ? 'In production pipeline' : 'Start your first', gold: false },
        ].map((s) => (
          <Box key={s.label} sx={{ ...card, p: 2.75 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: t.textSecondary, mb: 1 }}>{s.label}</Typography>
            <Typography sx={{ fontSize: 38, fontWeight: 800, lineHeight: 1, color: s.gold ? t.gold : t.textPrimary }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 1 }}>{s.sub}</Typography>
          </Box>
        ))}
      </Box>

      {/* Plan usage */}
      <Box sx={{ ...card, p: 2.75, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontWeight: 700, color: t.textPrimary }}>
            Plan Usage <span style={{ color: t.gold, fontSize: 12, letterSpacing: '0.12em', marginLeft: 6 }}>{plan.toUpperCase()}</span>
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>Renews monthly</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ fontSize: 13, color: t.textSecondary }}>
            {Number.isFinite(periodLimit) ? `${usedThisPeriod} / ${periodLimit} reports used this period` : 'Unlimited reports this period'}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.gold }}>
            {Number.isFinite(remaining) ? `${remaining} remaining` : 'Unlimited'}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Number.isFinite(periodLimit) ? Math.min(100, (usedThisPeriod / periodLimit) * 100) : 100}
          sx={{ height: 6, borderRadius: 3, bgcolor: t.goldDim, '& .MuiLinearProgress-bar': { bgcolor: t.gold } }}
        />
      </Box>

      {/* Recent reports */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 18, color: t.textPrimary }}>Recent Reports</Typography>
        {reports.length > 0 && (
          <Button variant="text" onClick={() => navigate('/dashboard')} sx={{ color: t.gold, fontWeight: 700 }}>View all</Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: t.gold }} /></Box>
      ) : reports.length === 0 ? (
        <Box sx={{ ...card, p: { xs: 4, md: 8 }, textAlign: 'center' }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: t.goldDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <DescriptionOutlined sx={{ color: t.gold, fontSize: 28 }} />
          </Box>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, mb: 1 }}>No reports yet</Typography>
          <Typography sx={{ color: t.textSecondary, maxWidth: 440, mx: 'auto', mb: 3 }}>
            Upload a script to generate your first investor-ready production intelligence report: location strategy, tax incentives, festivals and more.
          </Typography>
          <Button variant="contained" startIcon={<FileDownloadOutlined />} onClick={() => navigate('/analysis/new')}>Upload First Script</Button>
        </Box>
      ) : (
        <DataTable
          rows={reports}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/report/${r.id}`)}
          maxHeight={400}
          columns={[
            { key: 'title', header: 'PROJECT', width: '2fr', render: (r) => <Typography sx={{ fontWeight: 700, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</Typography> },
            { key: 'reportType', header: 'TYPE', width: '1fr', render: (r) => <Typography sx={{ color: t.textSecondary, fontSize: 14 }}>{r.reportType}</Typography> },
            { key: 'createdAt', header: 'DATE', width: '1.2fr', sortValue: (r) => new Date(r.createdAt).getTime() || 0, render: (r) => <Typography sx={{ color: t.textSecondary, fontSize: 14, whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</Typography> },
            { key: 'topTerritory', header: 'TOP TERRITORY', width: '1.4fr', render: (r) => <Typography sx={{ color: t.textPrimary, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.topTerritory}</Typography> },
            { key: 'status', header: 'STATUS', width: '1.1fr', render: (r) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor(r.status) }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: statusColor(r.status) }}>{r.status}</Typography>
              </Box>
            ) },
          ]}
          rowActions={(r) => (
            <>
              <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/report/${r.id}`)} sx={{ color: t.gold }}><VisibilityOutlined fontSize="small" /></IconButton></Tooltip>
              <Tooltip title={r.pdfUrl ? 'Download PDF' : 'PDF not ready'}>
                <span><IconButton size="small" disabled={!r.pdfUrl || downloadingId === r.id} onClick={() => handleDownload(r)} sx={{ color: r.pdfUrl ? t.gold : t.textFaint }}>
                  {downloadingId === r.id ? <CircularProgress size={16} sx={{ color: t.gold }} /> : <FileDownloadOutlined fontSize="small" />}
                </IconButton></span>
              </Tooltip>
              <Tooltip title="Delete"><span><IconButton size="small" disabled={deletingId === r.id} onClick={() => handleDelete(r.id, r.title)} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}>
                {deletingId === r.id ? <CircularProgress size={16} /> : <DeleteOutline fontSize="small" />}
              </IconButton></span></Tooltip>
            </>
          )}
        />
      )}
    </Box>
  );
}
