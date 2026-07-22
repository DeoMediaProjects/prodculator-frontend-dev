import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, IconButton, CircularProgress, Tooltip } from '@mui/material';
import { VisibilityOutlined, FileDownloadOutlined, DeleteOutline, DescriptionOutlined, ArrowBack } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { apiClient } from '@/services/api';
import { downloadReportPDF } from '@/services/report-pdf.service';
import { DataTable } from './DataTable';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';

const REPORT_DELETE_REASONS = ['No longer needed', 'Created by mistake', 'Duplicate report', 'Incorrect or outdated data', 'Other'];

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

function fmtDate(value: string): string {
  if (!value) return 'N/A';
  const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export function AllReports() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ReportRow | null>(null);

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

  const confirmDelete = async (reason?: string) => {
    const target = pendingDelete;
    if (!target) return;
    setDeletingId(target.id);
    const prev = reports;
    setReports((rs) => rs.filter((r) => r.id !== target.id));
    try {
      await apiClient.delete(`/api/reports/${target.id}`, { auth: true, data: reason ? { reason } : undefined });
    } catch {
      setReports(prev);
      window.alert('Could not delete the report. Please try again.');
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleDownload = async (r: ReportRow) => {
    if (!r.pdfUrl) return;
    setDownloadingId(r.id);
    try { await downloadReportPDF(r.id, r.title); } catch { /* ignore */ } finally { setDownloadingId(null); }
  };

  const statusColor = (s: ReportRow['status']) => (s === 'Completed' ? t.success : s === 'Pending' ? t.warning : t.error);
  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: t.gold }} /></Box>;
  }

  if (reports.length === 0) {
    return (
      <Box sx={{ ...card, p: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: t.goldDim, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <DescriptionOutlined sx={{ color: t.gold, fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, mb: 1 }}>No reports yet</Typography>
        <Typography sx={{ color: t.textSecondary, maxWidth: 440, mx: 'auto', mb: 3 }}>
          Upload a script to generate your first investor-ready production intelligence report.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/analysis/new')}>Upload First Script</Button>
      </Box>
    );
  }

  return (
    <>
    <Button
      startIcon={<ArrowBack />}
      onClick={() => navigate('/dashboard')}
      sx={{ color: t.textSecondary, textTransform: 'none', fontWeight: 600, mb: 2, '&:hover': { color: t.textPrimary, bgcolor: t.goldDim } }}
    >
      Back to dashboard
    </Button>
    <DataTable
      rows={reports}
      getRowId={(r) => r.id}
      onRowClick={(r) => navigate(`/report/${r.id}`)}
      maxHeight={9999}
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
          <Tooltip title="Delete"><span><IconButton size="small" disabled={deletingId === r.id} onClick={() => setPendingDelete(r)} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}>
            {deletingId === r.id ? <CircularProgress size={16} /> : <DeleteOutline fontSize="small" />}
          </IconButton></span></Tooltip>
        </>
      )}
    />
    <ConfirmDialog
      open={!!pendingDelete}
      title="Delete report"
      message={<>Delete <strong>“{pendingDelete?.title}”</strong>? We keep it for 30 days in case you change your mind, after which it is permanently deleted.</>}
      confirmLabel="Delete report"
      destructive
      loading={!!deletingId}
      reasons={REPORT_DELETE_REASONS}
      reasonLabel="Reason for deletion"
      onConfirm={confirmDelete}
      onClose={() => setPendingDelete(null)}
    />
    </>
  );
}
