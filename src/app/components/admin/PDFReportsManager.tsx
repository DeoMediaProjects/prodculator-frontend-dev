import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Tooltip,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
} from '@mui/material';
import {
  Download,
  Visibility,
  Send,
  Refresh,
  DescriptionOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { PdfReport } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { AdminAccessDenied } from './AdminAccessDenied';

export function PDFReportsManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canManagePDFReports')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage PDF Reports"
        requiredRole="Master Admin, Senior Admin, or Support Admin"
      />
    );
  }

  return <PDFReportsManagerContent />;
}

// The endpoint caps at 500. Fetched in one page so sorting and filtering cover
// every report rather than one server page.
const FETCH_LIMIT = 500;

function PDFReportsManagerContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [reports, setReports] = useState<PdfReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await adminApi.getPdfReports(FETCH_LIMIT, 0);
    if (err) {
      setError(err);
    } else if (data) {
      setReports(data.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handlePreview = async (reportId: string) => {
    const { data, error: err } = await adminApi.getPdfReportPreviewUrl(reportId);
    if (err) {
      setSnackbar({ message: err, severity: 'error' });
      return;
    }
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const handleDownload = async (reportId: string) => {
    const { data, error: err } = await adminApi.downloadPdfReport(reportId);
    if (err || !data) {
      setSnackbar({ message: err || 'Download failed', severity: 'error' });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Refresh to update downloaded status
    fetchReports();
  };

  const handleResend = async (reportId: string) => {
    const { data, error: err } = await adminApi.resendPdfReport(reportId);
    if (err) {
      setSnackbar({ message: err, severity: 'error' });
      return;
    }
    if (data) {
      setSnackbar({ message: data.message, severity: 'success' });
    }
  };

  const columns = useMemo<Column<PdfReport>[]>(() => [
    {
      key: 'title', header: 'SCRIPT TITLE', width: '1.7fr',
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.title || 'Untitled'}
        </Typography>
      ),
    },
    { key: 'email', header: 'CUSTOMER', width: '1.6fr' },
    {
      key: 'generated', header: 'GENERATED', width: '1.2fr',
      sortValue: (r) => new Date(r.generated || 0).getTime() || 0,
      render: (r) => (
        <Box sx={{ color: t.textSecondary, fontSize: 13.5 }}>
          {r.generated ? new Date(r.generated).toLocaleString() : 'Unknown'}
        </Box>
      ),
    },
    {
      key: 'downloaded', header: 'DOWNLOADED', width: '0.9fr',
      sortValue: (r) => (r.downloaded ? 'Yes' : 'No'),
      render: (r) => (
        // Not downloaded is the state worth noticing: the customer paid and may
        // never have received the thing they paid for.
        <Typography sx={{ fontSize: 13.5, color: r.downloaded ? t.textSecondary : t.warning, fontWeight: r.downloaded ? 400 : 600 }}>
          {r.downloaded ? 'Yes' : 'Not yet'}
        </Typography>
      ),
    },
    {
      key: 'size', header: 'SIZE', width: '0.65fr', align: 'right',
      render: (r) => <Box sx={{ color: t.textSecondary, fontSize: 13.5 }}>{r.size || 'Unknown'}</Box>,
    },
  ], [t]);

  useHeaderActions(
    <Button size="small" startIcon={<Refresh />} onClick={() => void fetchReports()}>
      Refresh
    </Button>,
    [fetchReports],
  );

  if (loading && reports.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }


  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography sx={{ color: t.textSecondary, fontSize: 13.5, mb: 2, maxWidth: '78ch' }}>
        Every report a customer has generated. Re-issuing regenerates the PDF from the stored analysis and emails it
        again, which is the fix when a customer reports a broken or missing download.
      </Typography>

      <DataTable<PdfReport>
        title="Generated reports"
        columns={columns}
        rows={reports}
        getRowId={(r) => r.id}
        pageSize={12}
        itemNoun="report"
        minWidth={900}
        emptyIcon={<DescriptionOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage="No reports have been generated yet. Customer reports appear here once a script has been analysed."
        rowActions={(r) => (
          <>
            <Tooltip title="Preview in a new tab">
              <IconButton size="small" onClick={() => handlePreview(r.id)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Visibility sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download the PDF">
              <IconButton size="small" onClick={() => handleDownload(r.id)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Download sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Regenerate and email again">
              <IconButton size="small" onClick={() => handleResend(r.id)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Send sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)}>
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
