import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert, Box, Button, CircularProgress, IconButton, Switch, Tooltip, Typography,
} from '@mui/material';
import { Refresh, LockOutlined, LayersOutlined, BlockOutlined } from '@mui/icons-material';
import {
  adminB2BService,
  type SignalPoolItem,
  type SignalPoolSummary,
} from '@/services/b2b.service';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';

type Scope = 'all' | 'eligible' | 'excluded';

// Fetched deep in one page so the table's own sorting and filtering cover the
// whole pool rather than one server page of twenty-five.
const FETCH_LIMIT = 500;

const EYEBROW_SX = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'text.secondary' } as const;

/** Governance view over the pool that feeds every Business Intelligence
 *  aggregate. Shows how much of what we hold is actually usable, and why the
 *  rest is not. */
export function SignalPoolPanel() {
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [summary, setSummary] = useState<SignalPoolSummary | null>(null);
  const [items, setItems] = useState<SignalPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, poolRes] = await Promise.all([
        adminB2BService.getSignalPoolSummary(),
        // Unfiltered: scoping is applied client-side so switching scope does not
        // cost a round trip and the counts stay consistent with the rows.
        adminB2BService.getSignalPool({ limit: FETCH_LIMIT, offset: 0 }),
      ]);
      setSummary(summaryRes);
      setItems(poolRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the signal pool');
    } finally {
      setLoading(false);
    }
  }, []);

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
      'Revoke Business Intelligence consent for this signal?\n\nIt will be excluded from all future '
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

  const scoped = useMemo(() => {
    if (scope === 'eligible') return items.filter((r) => r.eligible);
    if (scope === 'excluded') return items.filter((r) => !r.eligible);
    return items;
  }, [items, scope]);

  const columns = useMemo<Column<SignalPoolItem>[]>(() => [
    {
      key: 'submission_date', header: 'SUBMITTED', width: '1.1fr',
      sortValue: (r) => Date.parse(r.submission_date || '') || 0,
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: r.submission_date ? t.textSecondary : t.textFaint }}>
          {r.submission_date
            ? new Date(r.submission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Not recorded'}
        </Typography>
      ),
    },
    {
      key: 'territory', header: 'TERRITORY', width: '1.3fr',
      sortValue: (r) => r.territory || r.home_country || '',
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: (r.territory || r.home_country) ? t.textPrimary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.territory || r.home_country || 'Not recorded'}
        </Typography>
      ),
    },
    {
      key: 'format', header: 'FORMAT', width: '1.1fr',
      sortValue: (r) => r.format || '',
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: r.format ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.format || 'Not recorded'}
        </Typography>
      ),
    },
    {
      key: 'eligible', header: 'IN AGGREGATES', width: '1.5fr',
      sortValue: (r) => (r.eligible ? 'Included' : 'Excluded'),
      render: (r) => {
        if (r.eligible) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.success, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.success }}>Included</Typography>
            </Box>
          );
        }
        // Say which gate excluded the signal, not just that it was excluded:
        // no consent is the producer's decision and cannot be changed here,
        // whereas internal is a flag an admin set and can unset.
        const reason = !r.b2b_consent ? 'no consent' : 'marked internal';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.textFaint, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, color: t.textSecondary }}>Excluded, {reason}</Typography>
          </Box>
        );
      },
    },
    {
      key: 'is_internal', header: 'INTERNAL', width: '0.9fr',
      sortValue: (r) => (r.is_internal ? 'Yes' : 'No'),
      render: (r) => (
        <Tooltip title={r.is_internal
          ? 'Held back from customer-facing aggregation. Switch off to return it to the pool.'
          : 'Counted in customer-facing aggregation. Switch on to hold it back.'}>
          <Switch
            size="small"
            checked={r.is_internal}
            disabled={savingId === r.id}
            onChange={(e) => void setInternal(r, e.target.checked)}
          />
        </Tooltip>
      ),
    },
  ], [t, savingId]);

  if (loading && items.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const eligible = summary?.eligible ?? 0;
  const total = summary?.total ?? 0;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* What survives the consent and internal gates is the only figure that
          matters here: it is the actual denominator of every aggregate. */}
      <Box
        sx={{
          border: 1, borderColor: 'divider', bgcolor: 'background.paper',
          p: { xs: 2.5, md: 3 }, mb: 3,
          display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) 2fr' },
          gap: { xs: 3, md: 4 }, alignItems: 'start',
        }}
      >
        <Box>
          <Typography sx={EYEBROW_SX}>ELIGIBLE FOR REPORTS</Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {eligible}
            <Typography component="span" sx={{ fontSize: 17, fontWeight: 600, color: t.textSecondary }}>
              {' '}of {total} held
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>
            Every aggregate reads only these. The rest are excluded and stay excluded.
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {([
            ['No consent', summary?.excluded_reasons.no_consent ?? 0, 'Producer has not opted in'],
            ['Internal or test', summary?.internal ?? 0, 'Held back by an admin'],
            ['Coverage', total > 0 ? `${Math.round((eligible / total) * 100)}%` : 'None held', 'Share of the pool usable'],
          ] as [string, number | string, string][]).map(([label, value, hint]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>{label}</Typography>
              <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.25 }}>{hint}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <SegmentedToggle
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          options={[
            { value: 'all', label: `All ${items.length}` },
            { value: 'eligible', label: `Eligible ${items.filter((r) => r.eligible).length}` },
            { value: 'excluded', label: `Excluded ${items.filter((r) => !r.eligible).length}` },
          ]}
        />
        <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <DataTable<SignalPoolItem>
        key={scope}
        title="Consented production signals"
        columns={columns}
        rows={scoped}
        getRowId={(r) => r.id}
        pageSize={12}
        itemNoun="signal"
        minWidth={1000}
        maxHeight={560}
        emptyIcon={<LayersOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage={scope === 'all'
          ? 'No production signals have been collected yet.'
          : scope === 'eligible'
            ? 'No signal currently passes both the consent and internal gates.'
            : 'Every signal in the pool is eligible.'}
        rowActions={(r) => (r.b2b_consent ? (
          <Tooltip title="Revoke consent, excluding this signal from all future reports">
            <IconButton
              size="small"
              disabled={savingId === r.id}
              onClick={() => void revokeConsent(r)}
              sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}
            >
              <BlockOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Only the producer can grant consent, from their own account settings.">
            <LockOutlined sx={{ fontSize: 17, color: t.textFaint }} />
          </Tooltip>
        ))}
      />

      <Alert severity="info" sx={{ mt: 2 }}>
        Consent can be revoked here but never granted. Granting consent on a producer&apos;s behalf would put their
        production into commercial reports they never agreed to, so it has to come from their own consent setting.
      </Alert>
    </Box>
  );
}
