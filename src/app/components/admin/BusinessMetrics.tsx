import { useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
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
import {
  TrendingUp,
  Public,
  MonetizationOn,
  Person,
  People,
  Assessment,
  Speed,
  Group,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminAccessDenied } from './AdminAccessDenied';
import { adminApi } from '@/services/admin.api';
import type { BusinessMetricsDashboard } from '@/services/admin.types';

const GOLD = '#D4AF37';
const CARD_SX = { bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' } as const;
const HEAD_SX = { color: GOLD, fontWeight: 600 } as const;

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${n}%`;

function SectionCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card sx={{ ...CARD_SX, mb: 4 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ color: GOLD, display: 'flex' }}>{icon}</Box>
          <Typography variant="h6" sx={{ color: GOLD, fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function Kpi({
  icon,
  value,
  label,
  sub,
  tooltip,
  color = GOLD,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  sub?: string;
  tooltip: string;
  color?: string;
}) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} sx={{ display: 'flex' }}>
      <Tooltip title={tooltip} arrow placement="top">
        <Card
          sx={{
            width: '100%',
            bgcolor: '#0a0a0a',
            border: `1px solid ${color}40`,
            cursor: 'help',
            '&:hover': { borderColor: color },
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ color }}>{icon}</Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
                {value}
              </Typography>
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                {label}
              </Typography>
              {/* Reserve the sub-line height on every card so all cards align */}
              <Typography variant="caption" sx={{ color, fontWeight: 600, minHeight: '1.25rem' }}>
                {sub ?? ''}
              </Typography>
            </Box>
          </CardContent>
        </Card>
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
        <Typography variant="h4" sx={{ fontWeight: 700, color: GOLD, mb: 1 }}>
          Business Metrics Dashboard
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
          Live platform health from subscriptions, reports, and billing geography
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: GOLD }} />
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
              icon={<People />}
              value={data.total_paid_users.toLocaleString()}
              label="Paid Users"
              sub={`${data.total_users.toLocaleString()} total`}
              tooltip="Users on a paid plan (Professional, Producer, Studio, or B2B). The sub-line shows every registered user, paid or free."
            />
            <Kpi
              icon={<MonetizationOn />}
              value={usd(data.mrr_usd)}
              label="MRR (USD equiv.)"
              color="#66bb6a"
              tooltip="Monthly Recurring Revenue from all active subscriptions, with non-USD currencies converted to USD."
            />
            <Kpi
              icon={<TrendingUp />}
              value={usd(data.arr_usd)}
              label="ARR (USD equiv.)"
              color="#66bb6a"
              tooltip="Annual Recurring Revenue — current MRR projected over 12 months, in USD."
            />
            <Kpi
              icon={<Assessment />}
              value={data.active_subscriptions.toLocaleString()}
              label="Active Subscriptions"
              tooltip="Number of subscriptions currently in an 'active' status."
            />
            <Kpi
              icon={<Speed />}
              value={pct(data.monthly_churn_percent)}
              label="Monthly Churn"
              color="#ffa726"
              tooltip="Subscriptions cancelled in the last 30 days as a share of active plus recently-cancelled subscriptions."
            />
            <Kpi
              icon={<Person />}
              value={pct(data.free_to_paid_percent)}
              label="Free → Paid"
              color="#66bb6a"
              tooltip="Share of all registered users who are on a paid plan (paid users ÷ total users)."
            />
          </Grid>

          {/* Geographic distribution */}
          {data.geo_available ? (
            <SectionCard icon={<Public />} title="Geographic Distribution (Paid Users)">
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
                        <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>{row.country}</TableCell>
                        <TableCell sx={{ color: '#ffffff' }}>{row.users}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ flex: 1, maxWidth: 100 }}>
                              <Box sx={{ height: 8, bgcolor: GOLD, borderRadius: 1, width: `${row.percentage}%` }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                              {row.percentage}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#66bb6a', fontWeight: 600 }}>{usd(row.revenue_usd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          ) : (
            <SectionCard icon={<Public />} title="Geographic Distribution (Paid Users)">
              <Typography variant="body2" sx={{ color: '#777' }}>
                No available data
              </Typography>
            </SectionCard>
          )}

          {/* US state breakdown */}
          {data.us_states.length > 0 && (
            <SectionCard icon={<Public />} title="United States — State Breakdown">
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
                        <TableCell sx={{ color: '#ffffff', fontWeight: 600 }}>{row.state}</TableCell>
                        <TableCell sx={{ color: '#ffffff' }}>{row.users}</TableCell>
                        <TableCell sx={{ color: '#66bb6a', fontWeight: 600 }}>{usd(row.revenue_usd)}</TableCell>
                        <TableCell sx={{ color: '#42a5f5' }}>
                          {row.users ? usd(row.revenue_usd / row.users) : '—'}
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
              <SectionCard icon={<Assessment />} title="Plan Distribution">
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
                          <TableCell sx={{ color: '#ffffff' }}>{row.plan}</TableCell>
                          <TableCell sx={{ color: '#ffffff' }}>{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>

            {/* Professional profile breakdown (role counts) */}
            <Grid size={{ xs: 12, lg: 6 }}>
              <SectionCard icon={<Group />} title="Professional Profile Breakdown">
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
                          <TableCell sx={{ color: '#ffffff' }}>{row.role}</TableCell>
                          <TableCell sx={{ color: '#ffffff' }}>{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
          </Grid>

          {/* Engagement & conversion */}
          <SectionCard icon={<Speed />} title="Engagement & Conversion">
            <Grid container spacing={3}>
              {[
                { value: pct(data.free_to_paid_percent), label: 'Free → Paid Conversion', note: '% of users on a paid plan' },
                {
                  value: data.avg_days_to_convert != null ? `${data.avg_days_to_convert} days` : '—',
                  label: 'Avg. Time to Convert',
                  note: 'Signup → first paid subscription',
                },
                { value: pct(data.activation_rate_percent), label: 'Activation Rate', note: '% who generated ≥1 report' },
              ].map((m) => (
                <Grid size={{ xs: 12, md: 4 }} key={m.label}>
                  <Box
                    sx={{
                      p: 3,
                      bgcolor: 'rgba(102, 187, 106, 0.05)',
                      borderRadius: 2,
                      border: '1px solid #66bb6a40',
                    }}
                  >
                    <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1 }}>
                      {m.value}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                      {m.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
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
