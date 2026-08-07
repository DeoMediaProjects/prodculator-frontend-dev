import { useCallback, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert, Box, Button, Card, Chip, FormControlLabel, MenuItem, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, Tooltip, Typography,
} from '@mui/material';
import { Refresh, LockOutlined } from '@mui/icons-material';
import {
  adminB2BService,
  type SignalPoolItem,
  type SignalPoolSummary,
} from '@/services/b2b.service';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

type ConsentFilter = 'all' | 'consented' | 'not_consented';
type InternalFilter = 'all' | 'internal' | 'external';

/** Governance view over the pool that feeds every Business Intelligence
 *  aggregate. Shows how much of what we hold is actually usable, and why the
 *  rest is not. */
export function SignalPoolPanel() {
  const { enqueueSnackbar } = useSnackbar();

  const [summary, setSummary] = useState<SignalPoolSummary | null>(null);
  const [items, setItems] = useState<SignalPoolItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [consentFilter, setConsentFilter] = useState<ConsentFilter>('all');
  const [internalFilter, setInternalFilter] = useState<InternalFilter>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const consent =
        consentFilter === 'all' ? undefined : consentFilter === 'consented';
      const internal =
        internalFilter === 'all' ? undefined : internalFilter === 'internal';
      const [summaryRes, poolRes] = await Promise.all([
        adminB2BService.getSignalPoolSummary(),
        adminB2BService.getSignalPool({
          consent,
          internal,
          limit: rowsPerPage,
          offset: page * rowsPerPage,
        }),
      ]);
      setSummary(summaryRes);
      setItems(poolRes.items);
      setTotal(poolRes.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the signal pool');
    } finally {
      setLoading(false);
    }
  }, [consentFilter, internalFilter, page, rowsPerPage]);

  useEffect(() => { void load(); }, [load]);

  const setInternal = async (row: SignalPoolItem, isInternal: boolean) => {
    setSavingId(row.id);
    try {
      await adminB2BService.updateSignalFlags(row.id, { is_internal: isInternal });
      enqueueSnackbar(
        isInternal ? 'Signal marked internal and excluded from reports' : 'Signal returned to the reporting pool',
        { variant: 'success' },
      );
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Update failed', { variant: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const revokeConsent = async (row: SignalPoolItem) => {
    if (!window.confirm(
      'Revoke B2B consent for this signal?\n\nIt will be excluded from all future '
      + 'Business Intelligence reports. This cannot be undone from here: only the '
      + 'producer can grant consent again.',
    )) return;
    setSavingId(row.id);
    try {
      await adminB2BService.updateSignalFlags(row.id, { b2b_consent: false });
      enqueueSnackbar('Consent revoked', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Revoke failed', { variant: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const stat = (label: string, value: number, hint?: string) => (
    <Card key={label} sx={{ p: 2, flex: '1 1 150px', minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
      {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
    </Card>
  );

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every Business Intelligence aggregate reads only signals that are consented
        and not marked internal. This is what that filter leaves behind.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {summary && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
          {stat('Total held', summary.total)}
          {stat('Eligible for reports', summary.eligible, 'consented, not internal')}
          {stat('No consent', summary.excluded_reasons.no_consent, 'excluded')}
          {stat('Internal / test', summary.internal, 'excluded')}
        </Stack>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          select size="small" label="Consent" value={consentFilter}
          onChange={(e) => { setPage(0); setConsentFilter(e.target.value as ConsentFilter); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="consented">Consented</MenuItem>
          <MenuItem value="not_consented">Not consented</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Visibility" value={internalFilter}
          onChange={(e) => { setPage(0); setInternalFilter(e.target.value as InternalFilter); }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="external">Customer-facing</MenuItem>
          <MenuItem value="internal">Internal / test</MenuItem>
        </TextField>
        <Button startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button>
      </Stack>

      {loading ? <LoadingSpinner /> : (
        <>
          <TableContainer component={Card}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Submitted</TableCell>
                  <TableCell>Territory</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Internal</TableCell>
                  <TableCell align="right">Consent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                        No signals match these filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.submission_date || ', '}</TableCell>
                    <TableCell>{row.territory || row.home_country || ', '}</TableCell>
                    <TableCell>{row.format || ', '}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.eligible ? 'In reports' : 'Excluded'}
                        color={row.eligible ? 'success' : 'default'}
                        variant={row.eligible ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <FormControlLabel
                        sx={{ m: 0 }}
                        control={
                          <Switch
                            size="small"
                            checked={row.is_internal}
                            disabled={savingId === row.id}
                            onChange={(e) => void setInternal(row, e.target.checked)}
                          />
                        }
                        label=""
                      />
                    </TableCell>
                    <TableCell align="right">
                      {row.b2b_consent ? (
                        <Button
                          size="small" color="error" variant="outlined"
                          disabled={savingId === row.id}
                          onClick={() => void revokeConsent(row)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Tooltip title="Only the producer can grant consent, from their own account settings.">
                          <Chip
                            size="small" variant="outlined" icon={<LockOutlined />}
                            label="Not consented"
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            Consent can be revoked here but never granted. Granting consent on a
            producer&apos;s behalf would put their production into commercial reports
            they never agreed to, so it has to come from their own consent setting.
          </Alert>
        </>
      )}
    </Box>
  );
}
