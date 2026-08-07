import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Snackbar } from '@mui/material';
import { RefreshOutlined } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { EmailGatingRecord } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';
import { AdminPanel } from './AdminPanel';
import { AdminTable, type AdminColumn } from './AdminTable';

// The endpoint caps at 500. Pulled in one page so Tabulator owns sorting and
// filtering over the whole set: server-side paging plus client-side filtering
// would filter only the page you happen to be on, which reads as data loss.
const FETCH_LIMIT = 500;

function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
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

  const columns = useMemo<AdminColumn[]>(() => [
    { title: 'Email address', field: 'email', minWidth: 240, headerFilterPlaceholder: 'Filter email' },
    {
      title: 'First used',
      field: 'date',
      width: 190,
      sorter: 'datetime',
      headerFilter: 'input',
      formatter: (cell) => formatDateTime(cell.getValue()),
    },
    {
      title: 'Report generated',
      field: 'report_generated',
      width: 150,
      hozAlign: 'center',
      // A select filter rather than a text box: the value is boolean, so typing
      // into it could only ever be a guess at how it is spelled.
      headerFilter: 'list',
      headerFilterParams: { values: { '': 'All', true: 'Yes', false: 'No' } },
      formatter: (cell) => (cell.getValue() ? 'Yes' : 'No'),
    },
    {
      title: 'Status',
      field: 'blocked',
      width: 130,
      hozAlign: 'center',
      headerFilter: 'list',
      headerFilterParams: { values: { '': 'All', true: 'Blocked', false: 'Active' } },
      formatter: (cell) => (cell.getValue() ? 'Blocked' : 'Active'),
    },
    {
      title: '',
      field: 'id',
      width: 118,
      hozAlign: 'right',
      headerSort: false,
      headerFilter: undefined,
      formatter: (cell) => {
        const row = cell.getRow().getData() as EmailGatingRecord;
        if (busyId === row.id) return 'Saving...';
        return row.blocked ? 'Unblock' : 'Block';
      },
      cellClick: (_e, cell) => {
        const row = cell.getRow().getData() as EmailGatingRecord;
        if (busyId !== row.id) void toggleBlock(row);
      },
    },
  ], [busyId, toggleBlock]);

  return (
    <Box>
      {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}

      <AdminPanel
        title="Free report usage"
        description="One record per email address that has claimed a free report. Blocking an address refuses further free reports from it."
      >
        <AdminTable<EmailGatingRecord & Record<string, unknown>>
          rows={records as (EmailGatingRecord & Record<string, unknown>)[]}
          columns={columns}
          loading={loading}
          visibleRows={14}
          searchPlaceholder="Search by email address..."
          emptyTitle="No free reports have been claimed yet"
          emptyBody="Each address that generates a free report appears here, so repeat use from one address is visible before it becomes a pattern."
          actions={
            <Button size="small" startIcon={<RefreshOutlined />} onClick={() => void load()}>
              Refresh
            </Button>
          }
        />
      </AdminPanel>

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
