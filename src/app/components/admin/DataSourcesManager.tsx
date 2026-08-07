import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Save, CheckCircle, Warning, Refresh, Schedule } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { DataSource, DataSourceSyncSchedule, SyncScheduleItem } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

const SYNC_SCHEDULE_OPTIONS: { value: DataSourceSyncSchedule; label: string }[] = [
  { value: 'on-demand', label: 'On demand' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi annual' },
  { value: 'annual', label: 'Annual' },
  { value: null, label: 'Not scheduled' },
];

function formatDateTime(date: string | null) {
  if (!date) return 'Never';
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

function formatScheduleLabel(schedule: DataSourceSyncSchedule) {
  const option = SYNC_SCHEDULE_OPTIONS.find((item) => item.value === schedule);
  return option?.label ?? 'Unknown';
}

function getCredentialLabel(source: DataSource) {
  if (source.credential_mode === 'backend_env') return 'Managed in backend environment';
  return source.credential_mode;
}

function getStatusChip(source: DataSource) {
  if (!source.is_implemented) {
    return {
      label: 'Planned',
      color: 'warning.main',
      bgColor: 'rgba(255, 167, 38, 0.15)',
      icon: <Schedule sx={{ fontSize: 16 }} />,
    };
  }

  if (source.status === 'connected' && source.credential_configured) {
    return {
      label: 'Active',
      color: 'success.main',
      bgColor: 'rgba(46, 125, 50, 0.2)',
      icon: <CheckCircle sx={{ fontSize: 16 }} />,
    };
  }

  if (source.status === 'disconnected' && source.credential_configured) {
    return {
      label: 'Error',
      color: 'error.main',
      bgColor: 'rgba(211, 47, 47, 0.2)',
      icon: <Warning sx={{ fontSize: 16 }} />,
    };
  }

  if (!source.credential_configured) {
    return {
      label: 'Not Configured',
      color: source.status === 'disconnected' ? 'error.main' : 'text.secondary',
      bgColor: source.status === 'disconnected' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(117, 117, 117, 0.2)',
      icon: source.status === 'disconnected' ? <Warning sx={{ fontSize: 16 }} /> : undefined,
    };
  }

  return {
    label: 'Untested',
    color: 'text.secondary',
    bgColor: 'rgba(117, 117, 117, 0.2)',
    icon: undefined,
  };
}

export function DataSourcesManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canManageDataSources')) {
    return (
      <AdminAccessDenied
        requiredPermission="Manage Data Sources"
        requiredRole="Master Admin or Senior Admin"
      />
    );
  }

  return <DataSourcesManagerContent />;
}

function DataSourcesManagerContent() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [scheduleItems, setScheduleItems] = useState<SyncScheduleItem[]>([]);
  const [enabledChanges, setEnabledChanges] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingById, setTestingById] = useState<Record<string, boolean>>({});
  const [updatingScheduleById, setUpdatingScheduleById] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async (options?: { signal?: AbortSignal; silent?: boolean }) => {
    const { signal, silent = false } = options || {};
    if (!silent) setLoading(true);

    const [sourcesRes, scheduleRes] = await Promise.all([
      adminApi.getDataSources(50, 0, signal),
      adminApi.getDataSourceSyncSchedule(signal),
    ]);

    if (signal?.aborted) return;

    setSources(sourcesRes.data?.items ?? []);
    setScheduleItems(scheduleRes.data?.items ?? []);

    const firstError = sourcesRes.error || scheduleRes.error;
    setErrorMessage(firstError ?? null);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData({ signal: controller.signal });
    return () => controller.abort();
  }, [loadData]);

  const pendingChangesCount = useMemo(
    () => Object.keys(enabledChanges).length,
    [enabledChanges],
  );

  const getEnabledValue = (source: DataSource) => enabledChanges[source.id] ?? source.enabled;

  const handleToggle = (sourceId: string, checked: boolean) => {
    setEnabledChanges((previous) => {
      const source = sources.find((item) => item.id === sourceId);
      if (!source) return previous;
      if (checked === source.enabled) {
        const { [sourceId]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [sourceId]: checked };
    });
  };

  const handleSave = async () => {
    if (pendingChangesCount === 0) return;

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = {
      sources: Object.entries(enabledChanges).map(([id, enabled]) => ({ id, enabled })),
    };

    const { data, error } = await adminApi.bulkSaveDataSourceConfiguration(payload);
    setSaving(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    setEnabledChanges({});
    setSuccessMessage(`Configuration saved. Updated ${data?.updated ?? payload.sources.length} source(s).`);
    await loadData({ silent: true });
  };

  const handleTestConnection = async (source: DataSource) => {
    setTestingById((previous) => ({ ...previous, [source.id]: true }));
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await adminApi.testDataSourceConnection(source.id);
    setTestingById((previous) => ({ ...previous, [source.id]: false }));

    if (error) {
      setErrorMessage(error);
      return;
    }

    setSuccessMessage(data?.message ? `${source.name}: ${data.message}` : `${source.name} test completed.`);
    await loadData({ silent: true });
  };

  const handleScheduleChange = async (source: DataSource, nextValue: DataSourceSyncSchedule) => {
    setUpdatingScheduleById((previous) => ({ ...previous, [source.id]: true }));
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await adminApi.updateDataSource(source.id, { sync_schedule: nextValue });
    setUpdatingScheduleById((previous) => ({ ...previous, [source.id]: false }));

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (data) {
      setSources((previous) => previous.map((item) => (item.id === source.id ? data : item)));
      setScheduleItems((previous) =>
        previous.map((item) =>
          item.slug === data.slug
            ? {
                slug: item.slug,
                name: data.name,
                sync_schedule: data.sync_schedule,
                last_tested_at: data.last_tested_at,
                enabled: data.enabled,
              }
            : item,
        ),
      );
      setSuccessMessage(`${source.name} schedule updated.`);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          Visibility into active integrations.
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
              color: 'success.main',
              border: '1px solid rgba(46, 125, 50, 0.3)',
            }}
          >
            {successMessage}
          </Alert>
        )}

        {pendingChangesCount > 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {pendingChangesCount} unsaved source change(s).
          </Alert>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {sources.map((source) => {
            const chip = getStatusChip(source);
            const isEnabled = getEnabledValue(source);
            return (
              <Grid size={{ xs: 12 }} key={source.id}>
                <Card
                  sx={{
                    bgcolor: 'background.paper',
                    border: 1, borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'action.hover',
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                            {source.name}
                          </Typography>
                          <Chip
                            icon={chip.icon}
                            label={chip.label}
                            size="small"
                            sx={{
                              bgcolor: chip.bgColor,
                              color: chip.color,
                              fontWeight: 600,
                            }}
                          />
                          <Chip
                            label={source.category.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: 'action.hover',
                              color: 'primary.main',
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                          {source.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Refresh sx={{ fontSize: 14 }} />
                          Last tested: {formatDateTime(source.last_tested_at)}
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isEnabled}
                            onChange={(_, checked) => handleToggle(source.id, checked)}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'primary.main',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'primary.main',
                              },
                            }}
                          />
                        }
                        label={isEnabled ? 'Enabled' : 'Disabled'}
                        sx={{ color: 'text.secondary' }}
                      />
                    </Box>

                    <Divider sx={{ my: 2, borderColor: 'divider' }} />

                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          label="Endpoint"
                          value={source.endpoint || 'N/A'}
                          fullWidth
                          size="small"
                          InputProps={{
                            readOnly: true,
                          }}
                          sx={{
                            '& .MuiInputBase-input': {
                              fontSize: '0.875rem',
                              color: 'text.secondary',
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          label="Credential Handling"
                          value={getCredentialLabel(source)}
                          fullWidth
                          size="small"
                          InputProps={{
                            readOnly: true,
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Sync Schedule"
                          value={source.sync_schedule ?? ''}
                          onChange={(event) =>
                            void handleScheduleChange(
                              source,
                              (event.target.value || null) as DataSourceSyncSchedule,
                            )
                          }
                          disabled={!source.is_implemented || Boolean(updatingScheduleById[source.id])}
                        >
                          {SYNC_SCHEDULE_OPTIONS.map((option) => (
                            <MenuItem key={option.value ?? 'none'} value={option.value ?? ''}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Button
                          variant="outlined"
                          fullWidth
                          size="small"
                          onClick={() => void handleTestConnection(source)}
                          disabled={!isEnabled || !source.is_implemented || Boolean(testingById[source.id])}
                          sx={{
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'action.hover',
                            },
                            '&.Mui-disabled': {
                              borderColor: '#333',
                              color: 'text.secondary',
                            },
                          }}
                        >
                          {testingById[source.id] ? 'Testing...' : 'Test Connection'}
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          <strong>Security:</strong> Secret keys are stored server side only. Frontend never stores OpenAI or backend service credentials.
        </Typography>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving || pendingChangesCount === 0}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 600,
            px: 4,
            '&:hover': {
              bgcolor: 'primary.main',
            },
          }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      <Box sx={{ mt: 4, p: 3, bgcolor: 'action.hover', borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
          Curated Data Update Schedule
        </Typography>
        {scheduleItems.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No schedule data available.
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {scheduleItems.map((item) => (
              <Grid size={{ xs: 12, md: 6 }} key={item.slug}>
                <Typography variant="body2" sx={{ color: 'text.primary', mb: 0.5 }}>
                  <strong>{item.name}:</strong> {formatScheduleLabel(item.sync_schedule)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Last tested: {formatDateTime(item.last_tested_at)} • {item.enabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
