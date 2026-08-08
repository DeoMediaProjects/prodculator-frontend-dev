import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, IconButton, Snackbar, Tooltip, Typography,
} from '@mui/material';
import {
  BlockOutlined, LockOpenOutlined, MarkEmailReadOutlined, RefreshOutlined,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { EmailGatingRecord } from '@/services/admin.types';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { AdminAccessDenied } from './AdminAccessDenied';

// The endpoint caps at 500. Fetched in one page so sorting and filtering apply
// to the whole set: paging server-side while filtering client-side would filter
// only the page you happen to be on, which reads as data loss.
const FETCH_LIMIT = 500;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
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
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [records, setRecords] = useState<EmailGatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setErrorMessage(null);
    const { data, error } = await adminApi.getEmailGatingRecords({ limit: FETCH_LIMIT }, signal);
    if (signal?.aborted) return;
    if (error) {
      setErrorMessage(error);
      setLoading(false);
      return;
    }
    setRecords(data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const toggleBlock = useCallback(async (record: EmailGatingRecord) => {
    setBusyId(record.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    const { data, error } = record.blocked
      ? await adminApi.unblockEmailGatingRecord(record.id)
      : await adminApi.blockEmailGatingRecord(record.id);
    setBusyId(null);
    if (error) {
      setErrorMessage(error);
      return;
    }
    if (data) {
      setRecords((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setSuccessMessage(`${data.email} ${data.blocked ? 'blocked' : 'unblocked'}.`);
    }
  }, []);

  const blockedCount = records.filter((r) => r.blocked).length;

  const columns = useMemo<Column<EmailGatingRecord>[]>(() => [
    {
      key: 'email',
      header: 'EMAIL ADDRESS',
      width: '2.2fr',
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.email}
        </Typography>
      ),
    },
    {
      key: 'date',
      header: 'FIRST USED',
      width: '1.4fr',
      sortValue: (r) => new Date(r.date).getTime() || 0,
      render: (r) => <Box sx={{ color: t.textSecondary }}>{formatDateTime(r.date)}</Box>,
    },
    {
      key: 'report_generated',
      header: 'REPORT',
      width: '0.8fr',
      sortValue: (r) => (r.report_generated ? 'Yes' : 'No'),
      render: (r) => (
        <Box sx={{ color: r.report_generated ? t.textPrimary : t.textFaint }}>
          {r.report_generated ? 'Generated' : 'Not yet'}
        </Box>
      ),
    },
    {
      key: 'blocked',
      header: 'STATUS',
      width: '0.9fr',
      sortValue: (r) => (r.blocked ? 'Blocked' : 'Active'),
      render: (r) => (
        // A dot plus a word, matching how the B2C tables show report status.
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: r.blocked ? t.error : t.success, flexShrink: 0 }} />
          <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: r.blocked ? t.error : t.success }}>
            {r.blocked ? 'Blocked' : 'Active'}
          </Typography>
        </Box>
      ),
    },
  ], [t]);

  return (
    <Box>
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

      <Typography sx={{ color: t.textSecondary, fontSize: 13.5, mb: 2, maxWidth: '78ch' }}>
        One record per email address that has claimed a free report. Blocking an address refuses further free
        reports from it; it does not affect a paid account using the same address.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: t.gold }} />
        </Box>
      ) : (
        <DataTable<EmailGatingRecord>
          title="Free report usage"
          headerAction={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {blockedCount > 0 && (
                <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>
                  {blockedCount} blocked
                </Typography>
              )}
              <Button size="small" startIcon={<RefreshOutlined />} onClick={() => void load()}>
                Refresh
              </Button>
            </Box>
          }
          columns={columns}
          rows={records}
          getRowId={(r) => r.id}
          pageSize={12}
          itemNoun="address"
          itemNounPlural="addresses"
          minWidth={760}
          emptyIcon={<MarkEmailReadOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
          emptyMessage="No free reports have been claimed yet. Each address that generates one appears here, so repeat use is visible before it becomes a pattern."
          rowActions={(r) => (
            <Tooltip title={r.blocked ? 'Allow free reports again' : 'Block further free reports'}>
              <IconButton
                size="small"
                disabled={busyId === r.id}
                onClick={() => void toggleBlock(r)}
                sx={{ color: r.blocked ? t.success : t.textSecondary, '&:hover': { color: r.blocked ? t.success : t.error } }}
              >
                {busyId === r.id
                  ? <CircularProgress size={17} sx={{ color: t.gold }} />
                  : r.blocked ? <LockOpenOutlined sx={{ fontSize: 19 }} /> : <BlockOutlined sx={{ fontSize: 19 }} />}
              </IconButton>
            </Tooltip>
          )}
        />
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
