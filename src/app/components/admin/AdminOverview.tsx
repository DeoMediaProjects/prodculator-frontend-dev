import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  People,
  Assessment,
  CheckCircle,
  Warning,
  Info,
  HelpOutline,
} from '@mui/icons-material';
import { adminApi } from '@/services/admin.api';
import type { AdminMetrics, ActivityItem, ServiceStatusItem, TaskItem } from '@/services/admin.types';

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminOverview() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [systemStatus, setSystemStatus] = useState<ServiceStatusItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    (async () => {
      const [metricsResult, activityResult, statusResult, tasksResult] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getActivity(10),
        adminApi.getSystemStatus(),
        adminApi.getTasks(),
      ]);

      if (metricsResult.error) setMetricsError(metricsResult.error);
      else setMetrics(metricsResult.data);
      setMetricsLoading(false);

      setActivity(activityResult.data?.items ?? []);
      setActivityLoading(false);

      setSystemStatus(statusResult.data?.services ?? []);
      setStatusLoading(false);

      setTasks(tasksResult.data?.items ?? []);
      setTasksLoading(false);
    })();
  }, []);

  function statusChipProps(status: ServiceStatusItem['status']) {
    switch (status) {
      case 'operational':
        return { icon: <CheckCircle />, bgcolor: 'rgba(102, 187, 106, 0.2)', color: '#66bb6a' };
      case 'degraded':
        return { icon: <Warning />, bgcolor: 'rgba(255, 152, 0, 0.2)', color: '#ffa726' };
      case 'down':
        return { icon: <Warning />, bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#f44336' };
      default:
        return { icon: <HelpOutline />, bgcolor: 'rgba(160, 160, 160, 0.2)', color: '#a0a0a0' };
    }
  }

  function priorityChipColors(priority: TaskItem['priority']) {
    switch (priority) {
      case 'high':   return { bgcolor: 'rgba(244, 67, 54, 0.2)', color: '#f44336' };
      case 'medium': return { bgcolor: 'rgba(255, 152, 0, 0.2)', color: '#ffa726' };
      default:       return { bgcolor: 'rgba(66, 165, 245, 0.2)', color: '#42a5f5' };
    }
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 3 }}>
        Admin Dashboard Overview
      </Typography>

      {/* Key Metrics */}
      {metricsError && (
        <Alert severity="error" sx={{ mb: 3 }}>{metricsError}</Alert>
      )}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Total Users</Typography>
                <People sx={{ color: '#D4AF37' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? metrics.total_users.toLocaleString() : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Active Subscriptions</Typography>
                <CheckCircle sx={{ color: '#66bb6a' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? metrics.active_subscriptions.toLocaleString() : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Monthly Revenue (USD)</Typography>
                <AttachMoney sx={{ color: '#D4AF37' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? `$${metrics.mrr_usd.toLocaleString()}` : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Total Reports</Typography>
                <Assessment sx={{ color: '#D4AF37' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? metrics.total_reports.toLocaleString() : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Reports This Month</Typography>
                <TrendingUp sx={{ color: '#D4AF37' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? metrics.reports_this_month.toLocaleString() : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Conversion Rate</Typography>
                <CheckCircle sx={{ color: '#66bb6a' }} />
              </Box>
              {metricsLoading ? (
                <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 700, color: '#D4AF37' }}>
                  {metrics ? `${metrics.conversion_rate_percent.toFixed(1)}%` : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#D4AF37', mb: 2 }}>
                Recent Activity
              </Typography>
              {activityLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
                </Box>
              ) : activity.length === 0 ? (
                <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem' }}>No recent activity.</Typography>
              ) : (
                <List>
                  {activity.map((item, index) => (
                    <Box key={item.id}>
                      <ListItem disablePadding sx={{ py: 1 }}>
                        <ListItemText
                          primary={item.description}
                          secondary={
                            <Typography component="span" variant="caption" sx={{ color: '#a0a0a0' }}>
                              {formatTimestamp(item.timestamp)}{item.user_email ? ` • ${item.user_email}` : ''}
                            </Typography>
                          }
                          slotProps={{ primary: { sx: { color: '#ffffff', fontSize: '0.9rem' } } }}
                        />
                      </ListItem>
                      {index < activity.length - 1 && <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />}
                    </Box>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#D4AF37', mb: 2 }}>
                System Status
              </Typography>
              {statusLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
                </Box>
              ) : systemStatus.length === 0 ? (
                <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem' }}>Status unavailable.</Typography>
              ) : (
                <List>
                  {systemStatus.map((service, index) => {
                    const chip = statusChipProps(service.status);
                    return (
                      <Box key={service.name}>
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                                  {service.name}
                                </Typography>
                                <Chip
                                  label={service.status}
                                  size="small"
                                  icon={chip.icon}
                                  sx={{ bgcolor: chip.bgcolor, color: chip.color, fontSize: '0.75rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                                Last checked: {formatTimestamp(service.last_checked)}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < systemStatus.length - 1 && <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />}
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Tasks */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#D4AF37', mb: 2 }}>
                Upcoming Data Maintenance Tasks
              </Typography>
              {tasksLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={28} sx={{ color: '#D4AF37' }} />
                </Box>
              ) : tasks.length === 0 ? (
                <Typography sx={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                  All data sources are up to date.
                </Typography>
              ) : (
                <List>
                  {tasks.map((item, index) => {
                    const colors = priorityChipColors(item.priority);
                    return (
                      <Box key={index}>
                        <ListItem disablePadding sx={{ py: 1 }}>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                                  {item.task}
                                </Typography>
                                <Chip
                                  label={item.priority}
                                  size="small"
                                  sx={{ bgcolor: colors.bgcolor, color: colors.color, fontSize: '0.75rem' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                                Due: {item.due}
                              </Typography>
                            }
                          />
                        </ListItem>
                        {index < tasks.length - 1 && <Divider sx={{ borderColor: 'rgba(212, 175, 55, 0.1)' }} />}
                      </Box>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
