import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Close,
  FilterAltOff,
  Refresh,
  Search,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type {
  AuditLogEntry,
  AuditLogFacets,
  AuditLogFilters,
  AuditRetention,
} from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

const PANEL_SX = { p: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' } as const;

function formatDateTime(value: string | null) {
  if (!value) return ', ';
  try {
    return new Date(value).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatDate(value: string | null) {
  if (!value) return ', ';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return value;
  }
}

/** Turn `update.incentive` into `Update incentive` for display, leaving the raw
 *  value intact as the filter key. */
function humaniseAction(action: string) {
  const [verb, ...rest] = action.split('.');
  const resource = rest.join('.').replace(/_/g, ' ');
  const readableVerb = verb.replace(/[-_]/g, ' ');
  return `${readableVerb.charAt(0).toUpperCase()}${readableVerb.slice(1)}${resource ? ` ${resource}` : ''}`;
}

function StatusChip({ entry }: { entry: AuditLogEntry }) {
  if (entry.succeeded === null) {
    return <Chip size="small" label="No response" sx={{ bgcolor: 'rgba(117,117,117,0.2)', color: '#9e9e9e' }} />;
  }
  if (entry.succeeded) {
    return (
      <Chip
        size="small"
        label={entry.status_code ?? 'OK'}
        sx={{ bgcolor: 'rgba(46,125,50,0.2)', color: 'success.main', fontWeight: 600 }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label={entry.status_code ?? 'Failed'}
      sx={{ bgcolor: 'rgba(211,47,47,0.2)', color: 'error.main', fontWeight: 600 }}
    />
  );
}

/** Pretty-printed JSON for a before/after side. Rendered as text rather than a
 *  diff: these are arbitrary resource shapes, and a wrong diff would be worse
 *  than none when the question is "what did this change". */
function JsonPanel({ title, value }: { title: string; value: unknown }) {
  const body = useMemo(() => {
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1 }}>
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          minHeight: 80,
          maxHeight: 320,
          overflow: 'auto',
          bgcolor: '#050505',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 1,
          color: body ? '#e0e0e0' : 'text.secondary',
          fontSize: 11.5,
          lineHeight: 1.6,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {body ?? 'Not recorded for this action.'}
      </Box>
    </Box>
  );
}

export function AuditTrailManager() {
  const { hasAdminPermission } = useAuth();

  // The trail holds before/after state for user, subscription and entitlement
  // changes, so reading it is gated on the broadest admin permission rather
  // than on any of the narrower per-dataset ones.
  if (!hasAdminPermission('canManageAdmins')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage Admins"
        requiredRole="Master Admin"
      />
    );
  }

  return <AuditTrailManagerContent />;
}

const EMPTY_FILTERS: AuditLogFilters = {};

function AuditTrailManagerContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<AuditLogFacets | null>(null);
  const [retention, setRetention] = useState<AuditRetention | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  // `filters` is what the query uses; `searchDraft` is the uncommitted text box,
  // so typing does not refetch on every keystroke.
  const [filters, setFilters] = useState<AuditLogFilters>(EMPTY_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');

  const loadEntries = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await adminApi.getAuditLogs(
        { ...filters, limit: rowsPerPage, offset: page * rowsPerPage },
        signal,
      );
      if (signal?.aborted) return;
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      setEntries(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setLoading(false);
    },
    [filters, page, rowsPerPage],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadEntries(controller.signal);
    return () => controller.abort();
  }, [loadEntries]);

  // Facets and retention describe the whole trail, not the current page, so
  // they are fetched once rather than on every filter change.
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const [facetResult, retentionResult] = await Promise.all([
        adminApi.getAuditLogFacets(controller.signal),
        adminApi.getAuditRetention(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (facetResult.data) setFacets(facetResult.data);
      if (retentionResult.data) setRetention(retentionResult.data);
    })();
    return () => controller.abort();
  }, []);

  const setFilter = <K extends keyof AuditLogFilters>(key: K, value: AuditLogFilters[K]) => {
    setPage(0);
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '') delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const applySearch = () => setFilter('search', searchDraft.trim() || undefined);

  const clearFilters = () => {
    setPage(0);
    setSearchDraft('');
    setFilters(EMPTY_FILTERS);
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography sx={{ color: 'text.secondary' }}>
            Every change an admin has made, with the state either side of it. Read-only: entries cannot be edited or deleted here.
          </Typography>
        </Box>
        <Button startIcon={<Refresh />} onClick={() => void loadEntries()}>
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {retention && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Card sx={{ p: 2, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">Entries recorded</Typography>
            <Typography variant="h5">{retention.total_entries.toLocaleString()}</Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">Failed attempts</Typography>
            <Typography variant="h5" sx={{ color: retention.failed_entries > 0 ? '#f44336' : undefined }}>
              {retention.failed_entries.toLocaleString()}
            </Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">Retention</Typography>
            <Typography variant="h5">
              {retention.retains_indefinitely ? 'Indefinite' : `${retention.retention_days} days`}
            </Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1 }}>
            <Typography color="text.secondary" variant="body2">Record covers</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>
              {retention.oldest_entry_at
                ? `${formatDate(retention.oldest_entry_at)} → ${formatDate(retention.newest_entry_at)}`
                : 'Nothing recorded yet'}
            </Typography>
          </Card>
        </Stack>
      )}

      <Paper sx={{ ...PANEL_SX, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>Filters</Typography>
          {activeFilterCount > 0 && (
            <Button size="small" startIcon={<FilterAltOff />} onClick={clearFilters}>
              Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
            </Button>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            fullWidth
            label="Admin"
            value={filters.actor_id ?? ''}
            onChange={(e) => setFilter('actor_id', e.target.value || undefined)}
          >
            <MenuItem value="">All admins</MenuItem>
            {(facets?.actors ?? []).map((actor) => (
              <MenuItem key={actor.actor_id ?? 'unknown'} value={actor.actor_id ?? ''}>
                {actor.actor_email ?? actor.actor_id} ({actor.count})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Action"
            value={filters.action ?? ''}
            onChange={(e) => setFilter('action', e.target.value || undefined)}
          >
            <MenuItem value="">All actions</MenuItem>
            {(facets?.actions ?? []).map((action) => (
              <MenuItem key={action} value={action}>{humaniseAction(action)}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Resource"
            value={filters.resource_type ?? ''}
            onChange={(e) => setFilter('resource_type', e.target.value || undefined)}
          >
            <MenuItem value="">All resources</MenuItem>
            {(facets?.resource_types ?? []).map((resource) => (
              <MenuItem key={resource} value={resource}>{resource.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Outcome"
            value={filters.status ?? ''}
            onChange={(e) => setFilter('status', (e.target.value || undefined) as AuditLogFilters['status'])}
          >
            <MenuItem value="">All outcomes</MenuItem>
            <MenuItem value="success">Succeeded</MenuItem>
            <MenuItem value="failed">Failed or denied</MenuItem>
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            type="date"
            label="From"
            value={filters.start_date ?? ''}
            onChange={(e) => setFilter('start_date', e.target.value || undefined)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            type="date"
            label="To"
            value={filters.end_date ?? ''}
            onChange={(e) => setFilter('end_date', e.target.value || undefined)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 170 }}
          />
          <TextField
            fullWidth
            placeholder="Search path, resource id, action or error…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
            slotProps={{ input: { startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} /> } }}
          />
          <Button
            variant="outlined"
            onClick={applySearch}
            sx={{ borderColor: 'primary.main', color: 'primary.main', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' } }}
          >
            Search
          </Button>
        </Stack>
      </Paper>

      <Paper sx={PANEL_SX}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>When</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Admin</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Action</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Resource</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Outcome</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>IP</TableCell>
                <TableCell sx={{ color: 'text.secondary' }} align="right">Detail</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
                    Loading audit trail…
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 6 }}>
                    {activeFilterCount > 0
                      ? 'No entries match these filters.'
                      : 'No admin changes have been recorded yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell sx={{ color: '#e0e0e0', whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>
                      {entry.actor_email ?? 'Unattributed'}
                      {entry.actor_role && (
                        <Typography component="div" sx={{ color: 'text.secondary', fontSize: 11 }}>
                          {entry.actor_role.replace(/_/g, ' ')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#e0e0e0' }}>{humaniseAction(entry.action)}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.resource_type.replace(/_/g, ' ')}
                      {entry.resource_id && (
                        <Typography component="div" sx={{ color: '#6e6a61', fontSize: 11, fontFamily: 'monospace' }}>
                          {entry.resource_id}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell><StatusChip entry={entry} /></TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{entry.ip_address ?? ', '}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="View before and after">
                        <IconButton size="small" onClick={() => setSelected(entry)} sx={{ color: 'primary.main' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          sx={{ color: 'text.secondary' }}
        />
      </Paper>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: '1px solid rgba(212,175,55,0.25)' } } }}
      >
        {selected && (
          <>
            <DialogTitle sx={{ color: 'primary.main', pr: 6 }}>
              {humaniseAction(selected.action)}
              <Typography component="div" sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 400, mt: 0.5 }}>
                {selected.actor_email ?? 'Unattributed'} · {formatDateTime(selected.created_at)}
              </Typography>
              <IconButton
                onClick={() => setSelected(null)}
                sx={{ position: 'absolute', right: 12, top: 12, color: 'text.secondary' }}
                aria-label="Close"
              >
                <Close />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={0.75} sx={{ mb: 2 }}>
                {([
                  ['Request', `${selected.method ?? ', '} ${selected.path ?? ', '}`],
                  ['Resource', `${selected.resource_type}${selected.resource_id ? ` · ${selected.resource_id}` : ''}`],
                  ['Admin role', selected.actor_role?.replace(/_/g, ' ') ?? ', '],
                  ['IP address', selected.ip_address ?? ', '],
                  ['User agent', selected.user_agent ?? ', '],
                  ['Entry id', selected.id],
                ] as const).map(([label, value]) => (
                  <Stack key={label} direction="row" spacing={2}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 12, minWidth: 100 }}>{label}</Typography>
                    <Typography sx={{ color: '#e0e0e0', fontSize: 12, wordBreak: 'break-all' }}>{value}</Typography>
                  </Stack>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <StatusChip entry={selected} />
                {selected.error_message && (
                  <Alert severity="error" sx={{ py: 0, flex: 1 }}>
                    {selected.error_message}
                  </Alert>
                )}
              </Stack>

              <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.08)' }} />

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <JsonPanel title="Before" value={selected.before_json} />
                <JsonPanel title="After" value={selected.after_json} />
              </Stack>

              <Typography sx={{ color: 'text.secondary', fontSize: 11, mt: 2, lineHeight: 1.7 }}>
                Secrets (passwords, tokens, API keys) are redacted before an entry is written, so they never appear
                here. Where a before-state is absent, the resource could not be resolved from the request path and the
                submitted payload is shown as the after-state instead.
              </Typography>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
