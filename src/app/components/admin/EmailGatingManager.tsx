import { useCallback, useEffect, useState } from 'react';
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
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  TablePagination,
} from '@mui/material';
import {
  Block,
  CheckCircle,
  Search,
  LockOpen,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { EmailGatingRecord } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

function formatDateTime(date: string) {
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return date;
  }
}

export function EmailGatingManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canManageEmailGating')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage Email Gating"
        requiredRole="Master Admin, Senior Admin, or Support Admin"
      />
    );
  }

  return <EmailGatingManagerContent />;
}

function EmailGatingManagerContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState<EmailGatingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRecords = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      const { signal, silent = false } = options || {};
      if (!silent) setLoading(true);
      setErrorMessage(null);

      const { data, error } = await adminApi.getEmailGatingRecords(
        { limit: rowsPerPage, offset: page * rowsPerPage, search: searchQuery || undefined },
        signal,
      );

      if (signal?.aborted) return;

      if (error) {
        setErrorMessage(error);
        if (!silent) setLoading(false);
        return;
      }

      setRecords(data?.items ?? []);
      setTotal(data?.total ?? 0);
      if (!silent) setLoading(false);
    },
    [page, rowsPerPage, searchQuery],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadRecords({ signal: controller.signal });
    return () => controller.abort();
  }, [loadRecords]);

  const handleToggleBlock = async (record: EmailGatingRecord) => {
    setActionInProgress(record.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    const action = record.blocked
      ? adminApi.unblockEmailGatingRecord(record.id)
      : adminApi.blockEmailGatingRecord(record.id);

    const { data, error } = await action;
    setActionInProgress(null);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (data) {
      setRecords((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setSuccessMessage(`${data.email} ${data.blocked ? 'blocked' : 'unblocked'}.`);
    }
  };

  const handleSearch = () => {
    setPage(0);
    // loadRecords will fire via useEffect since page/searchQuery changed
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 4, color: '#D4AF37' }}>
        Email Gating Management
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert
          severity="success"
          sx={{
            mb: 3,
            bgcolor: 'rgba(46, 125, 50, 0.1)',
            color: '#66bb6a',
            border: '1px solid rgba(46, 125, 50, 0.3)',
          }}
        >
          {successMessage}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
          Abuse Prevention
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
          Monitor and manage free report usage per email address
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search by email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            slotProps={{
              input: {
                startAdornment: <Search sx={{ mr: 1, color: '#a0a0a0' }} />,
              },
            }}
          />
          <Button
            variant="outlined"
            onClick={handleSearch}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.08)' },
            }}
          >
            Search
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#D4AF37' }} />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#a0a0a0' }}>Email Address</TableCell>
                    <TableCell sx={{ color: '#a0a0a0' }}>Date Used</TableCell>
                    <TableCell sx={{ color: '#a0a0a0' }}>Report Generated</TableCell>
                    <TableCell sx={{ color: '#a0a0a0' }}>Status</TableCell>
                    <TableCell sx={{ color: '#a0a0a0' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#a0a0a0', py: 4 }}>
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell sx={{ color: '#ffffff' }}>{record.email}</TableCell>
                        <TableCell sx={{ color: '#a0a0a0' }}>{formatDateTime(record.date)}</TableCell>
                        <TableCell>
                          {record.report_generated ? (
                            <Chip
                              label="Yes"
                              size="small"
                              icon={<CheckCircle />}
                              sx={{
                                bgcolor: 'rgba(46, 125, 50, 0.2)',
                                color: '#66bb6a',
                                '& .MuiChip-icon': { color: '#66bb6a' },
                              }}
                            />
                          ) : (
                            <Chip
                              label="No"
                              size="small"
                              sx={{ bgcolor: 'rgba(117, 117, 117, 0.2)', color: '#9e9e9e' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={record.blocked ? 'Blocked' : 'Active'}
                            size="small"
                            sx={{
                              bgcolor: record.blocked ? 'rgba(211, 47, 47, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                              color: record.blocked ? '#f44336' : '#66bb6a',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => void handleToggleBlock(record)}
                            disabled={actionInProgress === record.id}
                            title={record.blocked ? 'Unblock' : 'Block'}
                            sx={{
                              color: record.blocked ? '#66bb6a' : '#f44336',
                              '&:hover': {
                                bgcolor: record.blocked
                                  ? 'rgba(46, 125, 50, 0.15)'
                                  : 'rgba(211, 47, 47, 0.15)',
                              },
                            }}
                          >
                            {actionInProgress === record.id ? (
                              <CircularProgress size={20} sx={{ color: '#D4AF37' }} />
                            ) : record.blocked ? (
                              <LockOpen />
                            ) : (
                              <Block />
                            )}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
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
              rowsPerPageOptions={[10, 25, 50]}
              sx={{ color: '#a0a0a0' }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
