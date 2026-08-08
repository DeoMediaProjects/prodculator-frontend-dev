import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminAccessDenied } from './AdminAccessDenied';
import { adminApi } from '@/services/admin.api';
import type { BusinessMetricsDashboard } from '@/services/admin.types';

const CARD_SX = { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } as const;
const HEAD_SX = { color: 'primary.main', fontWeight: 600 } as const;

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${n}%`;

/**
 * Section surface for this page.
 *
 * The heading previously paired a gold icon with gold text on every panel, so
 * the accent marked nothing: when six sections all shout, none of them leads.
 * The heading is now plain text at one weight, and the icon is dropped rather
 * than recoloured, because a decorative icon beside a text label adds no
 * information a reader needs.
 */
function SectionCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Box sx={{ ...CARD_SX, p: 2.75, mb: 2 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 17, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography sx={{ color: 'text.secondary', fontSize: 12.5, mt: 0.5, mb: 2, maxWidth: '78ch' }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: description ? 0 : 2 }}>{children}</Box>
    </Box>
  );
}

function Kpi({
  value,
  label,
  sub,
  tooltip,
  focal = false,
}: {
  value: string;
  label: string;
  sub?: string;
  tooltip: string;
  /** The one figure this page exists to report. Exactly one should set it. */
  focal?: boolean;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} sx={{ display: 'flex' }}>
      <Tooltip title={tooltip} arrow placement="top">
        <Box
          sx={{
            width: '100%', ...CARD_SX, p: 2.25, cursor: 'help',
            transition: 'border-color .15s',
            '&:hover': { borderColor: 'primary.main' },
          }}
        >
          {/* Label above value: the reader needs to know what they are looking
              at before the number means anything. Icons are gone, they were
              decoration repeated six times. */}
          <Typography
            sx={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'text.secondary', mb: 0.75,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontSize: 27, fontWeight: 800, lineHeight: 1.05,
              color: focal ? 'primary.main' : 'text.primary',
            }}
          >
            {value}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75, minHeight: '1.15rem' }}>
            {sub ?? ''}
          </Typography>
        </Box>
      </Tooltip>
    </Grid>
  );
}

export function BusinessMetrics() {
  const { hasAdminPermission } = useAuth();
  const allowed = hasAdminPermission('canViewBusinessMetrics');

  const [data, setData] = useState<BusinessMetricsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      const result = await adminApi.getBusinessMetrics(controller.signal);
      if (controller.signal.aborted) return;
      if (result.error) setError(result.error);
      else setData(result.data);
      setLoading(false);
    })();
    return () => controller.abort();
  }, [allowed]);

  if (!allowed) {
    return (
      <AdminAccessDenied
        requiredPermission="View Business Metrics"
        requiredRole="Master Admin or Senior Admin"
      />
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Live platform health from subscriptions, reports, and billing geography
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && data && (
        <>
          {/* Core KPIs */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Kpi
              value={data.total_paid_users.toLocaleString()}
              label="Paid Users"
              sub={`${data.total_users.toLocaleString()} total`}
              tooltip="Users on a paid plan (Professional, Producer, Studio, or Business Intelligence). The subline shows every registered user, paid or free."
            />
            <Kpi
              value={usd(data.mrr_usd)}
              label="MRR (USD equiv.)"
              focal
              tooltip="Monthly Recurring Revenue from all active subscriptions, with non USD currencies converted to USD."
            />
            <Kpi
              value={usd(data.arr_usd)}
              label="ARR (USD equiv.)"
              tooltip="Annual Recurring Revenue, current MRR projected over 12 months, in USD."
            />
            <Kpi
              value={data.active_subscriptions.toLocaleString()}
              label="Active Subscriptions"
              tooltip="Number of subscriptions currently in an 'active' status."
            />
            <Kpi
              value={pct(data.monthly_churn_percent)}
              label="Monthly Churn"
              tooltip="Subscriptions cancelled in the last 30 days as a share of active plus recently cancelled subscriptions."
            />
            <Kpi
              value={pct(data.free_to_paid_percent)}
              label="Free to paid"
              tooltip="Share of all registered users who are on a paid plan (paid users ÷ total users)."
            />
          </Grid>

          {/* Geographic distribution */}
          {data.geo_available ? (
            <SectionCard title="Geographic Distribution (Paid Users)">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEAD_SX}>Country</TableCell>
                      <TableCell sx={HEAD_SX}>Paid Users</TableCell>
                      <TableCell sx={HEAD_SX}>% of Total</TableCell>
                      <TableCell sx={HEAD_SX}>Monthly Revenue (USD)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.geographic.map((row) => (
                      <TableRow key={row.country_code || row.country}>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>{row.country}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{row.users}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1, maxWidth: 100 }}>
                              <Box sx={{ height: 8, bgcolor: 'primary.main', borderRadius: 1, width: `${row.percentage}%` }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {row.percentage}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{usd(row.revenue_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          ) : (
            <SectionCard title="Geographic Distribution (Paid Users)">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No available data
              </Typography>
            </SectionCard>
          )}

          {/* US state breakdown */}
          {data.us_states.length > 0 && (
            <SectionCard title="United States State Breakdown">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HEAD_SX}>State</TableCell>
                      <TableCell sx={HEAD_SX}>Paid Users</TableCell>
                      <TableCell sx={HEAD_SX}>Monthly Revenue (USD)</TableCell>
                      <TableCell sx={HEAD_SX}>ARPU</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.us_states.map((row) => (
                      <TableRow key={row.state_code}>
                        <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>{row.state}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{row.users}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 600 }}>{usd(row.revenue_usd)}</TableCell>
                        <TableCell sx={{ color: 'info.main' }}>
                          {row.users ? usd(row.revenue_usd / row.users) : 'No users'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          )}

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Plan distribution */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <SectionCard title="Plan Distribution">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={HEAD_SX}>Plan</TableCell>
                        <TableCell sx={HEAD_SX}>Users</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.plan_distribution.map((row) => (
                        <TableRow key={row.plan}>
                          <TableCell sx={{ color: 'text.primary' }}>{row.plan}</TableCell>
                          <TableCell sx={{ color: 'text.primary' }}>{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>

            {/* Professional profile breakdown (role counts) */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <SectionCard title="Professional Profile Breakdown">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={HEAD_SX}>Role</TableCell>
                        <TableCell sx={HEAD_SX}>Users</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.role_distribution.map((row) => (
                        <TableRow key={row.role}>
                          <TableCell sx={{ color: 'text.primary' }}>{row.role}</TableCell>
                          <TableCell sx={{ color: 'text.primary' }}>{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
          </Grid>

          {/* Engagement & conversion */}
          <SectionCard title="Engagement & Conversion">
            <Grid container spacing={3}>
              {[
                { value: pct(data.free_to_paid_percent), label: 'Free to paid conversion', note: '% of users on a paid plan' },
                {
                  value: data.avg_days_to_convert != null ? `${data.avg_days_to_convert} days` : 'Not enough data',
                  label: 'Avg. Time to Convert',
                  note: 'Signup to first paid subscription',
                },
                { value: pct(data.activation_rate_percent), label: 'Activation Rate', note: '% who generated ≥1 report' },
              ].map((m) => (
                <Grid size={{ xs: 12, md: 4 }} key={m.label}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: 'rgba(102, 187, 106, 0.05)',
                      borderRadius: 2,
                      border: 1, borderColor: 'divider',
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 700, mb: 1 }}>
                      {m.value}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
                      {m.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {m.note}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </>
      )}
    </Box>
  );
}
