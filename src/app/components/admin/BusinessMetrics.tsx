import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Tooltip, Button } from '@mui/material';
import { Refresh, PublicOutlined, MapOutlined } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminAccessDenied } from './AdminAccessDenied';
import { adminApi } from '@/services/admin.api';
import type { BusinessMetricsDashboard, GeoCountry, GeoState } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';

const PANEL_SX = { border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 3 } } as const;
const EYEBROW_SX = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'text.secondary' } as const;

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${n}%`;

type GeoScope = 'countries' | 'states';

export function BusinessMetrics() {
  const { hasAdminPermission } = useAuth();
  const allowed = hasAdminPermission('canViewBusinessMetrics');

  if (!allowed) {
    return (
      <AdminAccessDenied
        requiredPermission="View Business Metrics"
        requiredRole="Master Admin or Senior Admin"
      />
    );
  }

  return <BusinessMetricsContent />;
}

function BusinessMetricsContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [data, setData] = useState<BusinessMetricsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoScope, setGeoScope] = useState<GeoScope>('countries');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const result = await adminApi.getBusinessMetrics(signal);
    if (signal?.aborted) return;
    if (result.error) setError(result.error);
    else setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const countryColumns = useMemo<Column<GeoCountry>[]>(() => [
    {
      key: 'country', header: 'COUNTRY', width: '1.8fr',
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.country}
        </Typography>
      ),
    },
    {
      key: 'users', header: 'PAID USERS', width: '0.9fr', align: 'right',
      sortValue: (r) => r.users,
      render: (r) => (
        <Typography sx={{ fontSize: 14, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {r.users.toLocaleString()}
        </Typography>
      ),
    },
    {
      key: 'percentage', header: 'SHARE OF PAID BASE', width: '1.6fr',
      sortValue: (r) => r.percentage,
      render: (r) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, width: '100%' }}>
          <Box sx={{ flex: 1, minWidth: 40, height: 4, bgcolor: t.inputBg }}>
            <Box sx={{ height: '100%', width: `${Math.min(100, r.percentage)}%`, bgcolor: t.gold }} />
          </Box>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {r.percentage}%
          </Typography>
        </Box>
      ),
    },
    {
      key: 'revenue_usd', header: 'MONTHLY REVENUE', width: '1.2fr', align: 'right',
      sortValue: (r) => r.revenue_usd,
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {usd(r.revenue_usd)}
        </Typography>
      ),
    },
    {
      key: 'arpu', header: 'PER USER', width: '1fr', align: 'right',
      sortValue: (r) => (r.users ? r.revenue_usd / r.users : -1),
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: r.users ? t.textSecondary : t.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {r.users ? usd(r.revenue_usd / r.users) : 'No users'}
        </Typography>
      ),
    },
  ], [t]);

  const stateColumns = useMemo<Column<GeoState>[]>(() => [
    {
      key: 'state', header: 'STATE', width: '1.8fr',
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.state}
        </Typography>
      ),
    },
    {
      key: 'users', header: 'PAID USERS', width: '0.9fr', align: 'right',
      sortValue: (r) => r.users,
      render: (r) => (
        <Typography sx={{ fontSize: 14, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {r.users.toLocaleString()}
        </Typography>
      ),
    },
    {
      key: 'revenue_usd', header: 'MONTHLY REVENUE', width: '1.2fr', align: 'right',
      sortValue: (r) => r.revenue_usd,
      render: (r) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {usd(r.revenue_usd)}
        </Typography>
      ),
    },
    {
      key: 'arpu', header: 'PER USER', width: '1fr', align: 'right',
      sortValue: (r) => (r.users ? r.revenue_usd / r.users : -1),
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: r.users ? t.textSecondary : t.textFaint, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {r.users ? usd(r.revenue_usd / r.users) : 'No users'}
        </Typography>
      ),
    },
  ], [t]);

  useHeaderActions(
    <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
      Refresh
    </Button>,
    [load, loading],
  );

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  const estimated = data.mrr_estimated_subscriptions ?? 0;
  const mixed = data.mrr_by_currency.filter((c) => c.amount > 0);
  const showStates = data.us_states.length > 0;

  /** Supporting figure, rendered as a value with its own caption rather than as
   *  one of six identical cards where nothing leads. */
  const figure = (label: string, value: string, hint: string, tip: string) => (
    <Tooltip key={label} title={tip} arrow placement="top">
      <Box sx={{ cursor: 'help' }}>
        <Typography sx={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>{label}</Typography>
        <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.25 }}>{hint}</Typography>
      </Box>
    </Tooltip>
  );

  return (
    <Box>
      {/* Recurring revenue leads. The other figures on this page all explain it,
          so giving all six equal weight left the reader no entry point. */}
      <Box sx={{ ...PANEL_SX, mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 1fr) 2fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box>
          <Typography sx={EYEBROW_SX}>MONTHLY RECURRING REVENUE</Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 44 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
            {usd(data.mrr_usd)}
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>
            {usd(data.arr_usd)} annualised.
            {mixed.length > 1 && ` Billed in ${mixed.map((c) => c.currency).join(' and ')}, converted to USD.`}
          </Typography>
          {/* An imputed figure that does not say so is what let platform MRR read
              as zero for months without anyone noticing. */}
          {estimated > 0 && (
            <Typography sx={{ fontSize: 12.5, color: t.warning, fontWeight: 600, mt: 0.75 }}>
              Partly estimated: {estimated} active {estimated === 1 ? 'subscription has' : 'subscriptions have'} no
              billed amount recorded, so the plan list price stands in.
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {figure(
            'Paid users',
            data.total_paid_users.toLocaleString(),
            `${data.total_users.toLocaleString()} registered in total`,
            'Users on a paid plan: Professional, Producer, Studio or Business Intelligence.',
          )}
          {figure(
            'Active subscriptions',
            data.active_subscriptions.toLocaleString(),
            'Currently in an active status',
            'Subscriptions whose status is active. A user can hold more than one.',
          )}
          {figure(
            'Monthly churn',
            pct(data.monthly_churn_percent),
            'Cancelled in the last 30 days',
            'Subscriptions cancelled in the last 30 days as a share of active plus recently cancelled subscriptions.',
          )}
          {figure(
            'Free to paid',
            pct(data.free_to_paid_percent),
            'Share of all registered users',
            'Paid users divided by total registered users.',
          )}
          {figure(
            'Time to convert',
            data.avg_days_to_convert != null ? `${data.avg_days_to_convert} days` : 'Not enough data',
            'Signup to first subscription',
            'Mean days between registering and starting a first paid subscription.',
          )}
          {figure(
            'Activation',
            pct(data.activation_rate_percent),
            'Generated at least one report',
            'Share of registered users who have generated at least one report.',
          )}
        </Box>
      </Box>

      {/* Plan and role mix side by side: two short lists, each of which only
          makes sense next to the other. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        {([
          ['PLAN MIX', data.plan_distribution.map((r) => [r.plan, r.count] as [string, number]), 'No plans recorded.'],
          ['PROFESSIONAL ROLES', data.role_distribution.map((r) => [r.role, r.count] as [string, number]), 'No roles recorded.'],
        ] as [string, [string, number][], string][]).map(([heading, rows, empty]) => {
          const max = Math.max(1, ...rows.map(([, n]) => n));
          return (
            <Box key={heading} sx={PANEL_SX}>
              <Typography sx={{ ...EYEBROW_SX, mb: 2 }}>{heading}</Typography>
              {rows.length === 0 ? (
                <Typography sx={{ fontSize: 13, color: t.textFaint }}>{empty}</Typography>
              ) : rows.map(([label, count]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.25 }}>
                  <Typography sx={{ fontSize: 13.5, color: t.textPrimary, flex: '0 0 40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </Typography>
                  {/* Bars scaled against the largest row, so the shape of the
                      distribution is readable without reading every number. */}
                  <Box sx={{ flex: 1, height: 4, bgcolor: t.inputBg, minWidth: 30 }}>
                    <Box sx={{ height: '100%', width: `${(count / max) * 100}%`, bgcolor: t.gold }} />
                  </Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: t.textPrimary, fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                    {count.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>

      {showStates && (
        <Box sx={{ mb: 2 }}>
          <SegmentedToggle
            value={geoScope}
            onChange={(v) => setGeoScope(v as GeoScope)}
            options={[
              { value: 'countries', label: `Countries ${data.geographic.length}` },
              { value: 'states', label: `US states ${data.us_states.length}` },
            ]}
          />
        </Box>
      )}

      {geoScope === 'countries' || !showStates ? (
        <DataTable<GeoCountry>
          title="Paid users by country"
          columns={countryColumns}
          rows={data.geo_available ? data.geographic : []}
          getRowId={(r) => r.country_code || r.country}
          pageSize={12}
          itemNoun="country"
          minWidth={960}
          maxHeight={560}
          emptyIcon={<PublicOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
          emptyMessage={data.geo_available
            ? 'No paid users have a billing country recorded.'
            : 'Billing geography is not available. No paid subscription carries a country on its billing record.'}
        />
      ) : (
        <DataTable<GeoState>
          title="Paid users by US state"
          columns={stateColumns}
          rows={data.us_states}
          getRowId={(r) => r.state_code}
          pageSize={12}
          itemNoun="state"
          minWidth={880}
          maxHeight={560}
          emptyIcon={<MapOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
          emptyMessage="No US paid users have a state recorded."
        />
      )}
    </Box>
  );
}
