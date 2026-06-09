import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  TablePagination,
} from '@mui/material';
import {
  Download,
  Visibility,
  Send,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { PdfReport } from '@/services/admin.types';
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

function PDFReportsManagerContent() {
  const [reports, setReports] = useState<PdfReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await adminApi.getPdfReports(rowsPerPage, page * rowsPerPage);
    if (err) {
      setError(err);
    } else if (data) {
      setReports(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, rowsPerPage]);

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

  if (loading && reports.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
        PDF Reports Manager
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          View, download, and re issue generated PDF reports
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Script Title</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Downloaded</TableCell>
                <TableCell>Size</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.title}</TableCell>
                  <TableCell>{report.email}</TableCell>
                  <TableCell>{new Date(report.generated).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={report.downloaded ? 'Yes' : 'No'}
                      size="small"
                      color={report.downloaded ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{report.size}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" title="View" onClick={() => handlePreview(report.id)}>
                      <Visibility />
                    </IconButton>
                    <IconButton size="small" title="Download" onClick={() => handleDownload(report.id)}>
                      <Download />
                    </IconButton>
                    <IconButton size="small" title="Re issue" onClick={() => handleResend(report.id)}>
                      <Send />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {reports.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

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
