import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add,
  CloudDownload,
  Edit,
  Email,
  Refresh,
  Send,
  BusinessCenterOutlined,
} from '@mui/icons-material';
import {
  adminB2BService,
  type AdminB2BManualSubscriptionPayload,
  type AdminB2BSubscriptionUpdate,
  type B2BDeliveryFrequency,
  type B2BIntelligenceRequest,
  type B2BProductType,
  type B2BSubscription,
} from '@/services/b2b.service';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { B2BInvitesPanel } from './B2BInvitesPanel';

const PRODUCT_LABELS: Record<B2BProductType, string> = {
  camera_equipment: 'Camera and equipment',
  production_services: 'Production services',
  crew_casting: 'Crew and casting',
  production_trend: 'Production trend',
  enterprise: 'Enterprise slate',
};

const PRODUCT_OPTIONS = Object.entries(PRODUCT_LABELS) as [B2BProductType, string][];

/** Shared section surface, matching the rest of the console. */
const PANEL_SX = { border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 3 } } as const;
const EYEBROW_SX = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'text.secondary' } as const;

type View = 'subscriptions' | 'requests' | 'invites';

/** Stored slug to sentence case: "past_due" reads "Past due". Used for both the
 *  cell and its filter option, so a dropdown choice reads the way the row does. */
function sentence(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

function money(cents: number, code: string) {
  return new Intl.NumberFormat(code.toLowerCase() === 'gbp' ? 'en-GB' : 'en-US', {
    style: 'currency',
    currency: code.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function metricSummary(request: B2BIntelligenceRequest) {
  const metrics = request.metrics || {};
  const sourceCount = typeof metrics.source_signal_count === 'number' ? metrics.source_signal_count : null;
  const suppressed = Array.isArray(metrics.suppressed_segments) ? metrics.suppressed_segments.length : 0;
  const insufficient = metrics.insufficient_data === true;
  return {
    sourceCount,
    suppressed,
    insufficient,
    text: `${sourceCount ?? 'unknown'} signals, ${suppressed} suppressed`,
  };
}

function blankToNull(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

export function B2BClientManager() {
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [view, setView] = useState<View>('subscriptions');
  const [subscriptions, setSubscriptions] = useState<B2BSubscription[]>([]);
  const [requests, setRequests] = useState<B2BIntelligenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<B2BSubscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<AdminB2BSubscriptionUpdate>({});
  const [manualForm, setManualForm] = useState<AdminB2BManualSubscriptionPayload>({
    user_email: '',
    product_type: 'enterprise',
    delivery_frequency: 'monthly',
    status: 'active',
    extra_recipient_email: '',
    company_name: '',
    admin_notes: '',
  });

  const summary = useMemo(() => {
    const active = subscriptions.filter((item) => ['active', 'trialing'].includes(item.status));
    // Contract values are billed in whichever currency the client agreed, so
    // they are totalled per currency and never summed into one figure: adding
    // pence to cents and labelling the result GBP is how the old "Listed MRR"
    // card produced a number that meant nothing.
    const byCurrency = new Map<string, number>();
    let manualCount = 0;
    for (const item of active) {
      if (!item.amount_cents) {
        manualCount += 1;
        continue;
      }
      const code = (item.currency || 'GBP').toUpperCase();
      byCurrency.set(code, (byCurrency.get(code) || 0) + item.amount_cents);
    }
    return {
      total: subscriptions.length,
      active: active.length,
      requests: requests.length,
      undelivered: requests.filter((r) => r.status === 'completed' && !r.delivered_at).length,
      byCurrency: [...byCurrency.entries()].sort((a, b) => b[1] - a[1]),
      manualCount,
    };
  }, [subscriptions, requests]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subscriptionRows, requestRows] = await Promise.all([
        adminB2BService.getSubscriptions(),
        adminB2BService.getRequests(),
      ]);
      setSubscriptions(subscriptionRows);
      setRequests(requestRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intelligence clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (subscription: B2BSubscription) => {
    setSelected(subscription);
    setEditForm({
      status: subscription.status,
      delivery_frequency: subscription.delivery_frequency as B2BDeliveryFrequency,
      extra_recipient_email: subscription.extra_recipient_email || '',
      next_delivery_at: subscription.next_delivery_at || '',
      company_name: subscription.company_name || '',
      admin_notes: subscription.admin_notes || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload: AdminB2BSubscriptionUpdate = {
        ...editForm,
        extra_recipient_email: blankToNull(editForm.extra_recipient_email),
        company_name: blankToNull(editForm.company_name),
        admin_notes: blankToNull(editForm.admin_notes),
      };
      if (!payload.next_delivery_at) delete payload.next_delivery_at;
      await adminB2BService.updateSubscription(selected.id, payload);
      enqueueSnackbar('Subscription updated and the client notified.', { variant: 'success' });
      setEditOpen(false);
      setSelected(null);
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update subscription', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const createManual = async () => {
    setSaving(true);
    try {
      await adminB2BService.createManualSubscription({
        ...manualForm,
        extra_recipient_email: blankToNull(manualForm.extra_recipient_email),
        company_name: blankToNull(manualForm.company_name),
        admin_notes: blankToNull(manualForm.admin_notes),
      });
      enqueueSnackbar('Manual contract created.', { variant: 'success' });
      setManualOpen(false);
      setManualForm({
        user_email: '',
        product_type: 'enterprise',
        delivery_frequency: 'monthly',
        status: 'active',
        extra_recipient_email: '',
        company_name: '',
        admin_notes: '',
      });
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create the manual contract', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resend = async (request: B2BIntelligenceRequest) => {
    try {
      const response = await adminB2BService.resendRequest(request.id);
      enqueueSnackbar(`Resent to ${response.recipients.join(', ')}`, { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to resend the PDF', { variant: 'error' });
    }
  };

  const download = async (request: B2BIntelligenceRequest) => {
    try {
      await adminB2BService.downloadRequestPdf(request);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to download the PDF', { variant: 'error' });
    }
  };

  const subscriptionColumns = useMemo<Column<B2BSubscription>[]>(() => [
    {
      key: 'user_email', header: 'CLIENT', width: '1.9fr',
      sortValue: (s) => s.company_name || s.user_email || s.user_id,
      render: (s) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.company_name || s.user_email || 'Unnamed account'}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.company_name && s.user_email ? s.user_email : `Account ${s.user_id.slice(0, 8)}`}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'product_type', header: 'PRODUCT', width: '1.4fr', filterSelect: true,
      sortValue: (s) => PRODUCT_LABELS[s.product_type] || s.product_type,
      render: (s) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {PRODUCT_LABELS[s.product_type] || s.product_type}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '1fr', filterSelect: true,
      sortValue: (s) => sentence(s.status),
      render: (s) => {
        const live = ['active', 'trialing'].includes(s.status);
        const colour = live ? t.success : s.status === 'past_due' ? t.warning : t.textFaint;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colour, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: colour }}>
              {sentence(s.status)}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'amount_cents', header: 'CONTRACT VALUE', width: '1.1fr', align: 'right',
      sortValue: (s) => s.amount_cents ?? -1,
      render: (s) => (s.amount_cents ? (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {money(s.amount_cents, s.currency || 'GBP')}
        </Typography>
      ) : (
        // A manual contract is billed outside Stripe, so no amount exists to
        // show. This is not a zero.
        <Tooltip title="Billed outside the platform, so no amount is recorded here.">
          <Typography sx={{ fontSize: 13, color: t.textFaint }}>Billed offline</Typography>
        </Tooltip>
      )),
    },
    {
      key: 'delivery_frequency', header: 'CADENCE', width: '0.9fr', filterSelect: true,
      sortValue: (s) => sentence(s.delivery_frequency),
      render: (s) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>
          {sentence(s.delivery_frequency)}
        </Typography>
      ),
    },
    {
      key: 'next_delivery_at', header: 'NEXT DELIVERY', width: '1.3fr',
      // Unscheduled sorts last: a live subscription with no next delivery is
      // the row worth chasing, and it reads better at the bottom than mixed in.
      sortValue: (s) => (s.next_delivery_at ? Date.parse(s.next_delivery_at) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER),
      render: (s) => {
        if (!s.next_delivery_at) {
          const live = ['active', 'trialing'].includes(s.status);
          return (
            <Typography sx={{ fontSize: 13, fontWeight: live ? 600 : 400, color: live ? t.warning : t.textFaint }}>
              {live ? 'Not scheduled' : 'None'}
            </Typography>
          );
        }
        return (
          <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>
            {new Date(s.next_delivery_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Typography>
        );
      },
    },
    {
      key: 'extra_recipient_email', header: 'EXTRA RECIPIENT', width: '1.4fr',
      sortValue: (s) => s.extra_recipient_email || '',
      render: (s) => (
        <Typography sx={{ fontSize: 13, color: s.extra_recipient_email ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s.extra_recipient_email || 'None'}
        </Typography>
      ),
    },
    {
      key: 'source', header: 'SOURCE', width: '0.9fr', filterSelect: true,
      sortValue: (s) => sentence(s.source),
      render: (s) => (
        <Typography sx={{ fontSize: 13, color: t.textSecondary }}>
          {sentence(s.source)}
        </Typography>
      ),
    },
  ], [t]);

  const requestColumns = useMemo<Column<B2BIntelligenceRequest>[]>(() => [
    {
      key: 'recipient_email', header: 'RECIPIENT', width: '1.8fr',
      sortValue: (r) => r.recipient_email || r.user_id,
      render: (r) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.recipient_email}
          </Typography>
          {r.extra_recipient_email && (
            <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              copy to {r.extra_recipient_email}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'product_type', header: 'PRODUCT', width: '1.4fr', filterSelect: true,
      sortValue: (r) => PRODUCT_LABELS[r.product_type] || r.product_type,
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {PRODUCT_LABELS[r.product_type] || r.product_type}
        </Typography>
      ),
    },
    {
      key: 'period', header: 'PERIOD', width: '1.4fr',
      sortValue: (r) => Date.parse(r.period_start) || 0,
      render: (r) => (
        <Typography sx={{ fontSize: 13, color: t.textSecondary, whiteSpace: 'nowrap' }}>
          {r.period_start} to {r.period_end}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '1fr', filterSelect: true,
      sortValue: (r) => sentence(r.status),
      render: (r) => {
        const colour = r.status === 'completed' ? t.success
          : r.status === 'failed' ? t.error : t.warning;
        return (
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colour, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: colour }}>
                {sentence(r.status)}
              </Typography>
            </Box>
            {r.error_message && (
              <Tooltip title={r.error_message}>
                <Typography sx={{ fontSize: 11.5, color: t.error, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.error_message}
                </Typography>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      key: 'metrics', header: 'SIGNAL BASIS', width: '1.5fr',
      sortValue: (r) => metricSummary(r).sourceCount ?? -1,
      render: (r) => {
        const m = metricSummary(r);
        return (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13, color: t.textSecondary }}>{m.text}</Typography>
            {/* The one fact that decides whether the package was worth sending. */}
            {m.insufficient && (
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: t.warning }}>
                Insufficient data overall
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'delivered_at', header: 'DELIVERED', width: '1.2fr',
      sortValue: (r) => (r.delivered_at ? Date.parse(r.delivered_at) || 0 : 0),
      render: (r) => {
        if (r.delivered_at) {
          return (
            <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>
              {new Date(r.delivered_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
          );
        }
        // Built but never sent is the actionable state: the client paid for a
        // package that is sitting in storage.
        const built = r.status === 'completed';
        return (
          <Typography sx={{ fontSize: 13, fontWeight: built ? 600 : 400, color: built ? t.warning : t.textFaint }}>
            {built ? 'Built, not sent' : 'Not yet'}
          </Typography>
        );
      },
    },
  ], [t]);

  useHeaderActions(
    <>
      <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
        Refresh
      </Button>
      <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setManualOpen(true)}>
        Manual contract
      </Button>
    </>,
    [load, loading],
  );

  if (loading && subscriptions.length === 0 && requests.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Contracted revenue leads, held per currency because the platform bills
          clients in whichever currency they agreed and never converts. */}
      <Box sx={{ ...PANEL_SX, mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(250px, 1fr) 2fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box>
          <Typography sx={EYEBROW_SX}>CONTRACTED PER MONTH</Typography>
          {summary.byCurrency.length === 0 ? (
            <>
              <Typography sx={{ fontSize: { xs: 30, md: 38 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>
                None billed here
              </Typography>
              <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>
                {summary.manualCount > 0
                  ? `All ${summary.manualCount} active ${summary.manualCount === 1 ? 'contract is' : 'contracts are'} billed offline.`
                  : 'No active contracts.'}
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: { xs: 32, md: 40 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {summary.byCurrency.map(([code, cents]) => money(cents, code)).join('  ')}
              </Typography>
              <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>
                Across {summary.active} active {summary.active === 1 ? 'contract' : 'contracts'}, shown unconverted.
                {summary.manualCount > 0 && ` ${summary.manualCount} more billed offline.`}
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {([
            ['Subscriptions', summary.total, `${summary.active} active`],
            ['Packages built', summary.requests, 'All time'],
            ['Built, not sent', summary.undelivered, summary.undelivered ? 'Needs sending' : 'All delivered'],
          ] as [string, number, string][]).map(([label, value, hint]) => (
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

      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { value: 'subscriptions', label: `Subscriptions ${subscriptions.length}` },
            { value: 'requests', label: `Packages ${requests.length}` },
            { value: 'invites', label: 'Contract invites' },
          ]}
        />
      </Box>

      {view === 'subscriptions' && (
        <DataTable<B2BSubscription>
          title="Intelligence subscriptions"
          columns={subscriptionColumns}
          rows={subscriptions}
          getRowId={(s) => s.id}
          pageSize={12}
          itemNoun="subscription"
          minWidth={1340}
          maxHeight={620}
          emptyIcon={<BusinessCenterOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
          emptyMessage="No intelligence subscriptions yet. Issue a contract invite or create a manual contract to start one."
          rowActions={(s) => (
            <Tooltip title="Edit cadence, recipients and status">
              <IconButton size="small" onClick={() => openEdit(s)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        />
      )}

      {view === 'requests' && (
        <DataTable<B2BIntelligenceRequest>
          title="Generated packages"
          columns={requestColumns}
          rows={requests}
          getRowId={(r) => r.id}
          pageSize={12}
          itemNoun="package"
          minWidth={1340}
          maxHeight={620}
          emptyIcon={<BusinessCenterOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
          emptyMessage="No intelligence packages have been generated yet. Compose one in the studio."
          rowActions={(r) => (
            <>
              <Tooltip title={r.status === 'completed' ? 'Download the PDF' : 'Available once the package has been built'}>
                <IconButton
                  size="small"
                  disabled={r.status !== 'completed'}
                  onClick={() => void download(r)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}
                >
                  <CloudDownload sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={r.status === 'completed' ? 'Email it to the client again' : 'Available once the package has been built'}>
                <IconButton
                  size="small"
                  disabled={r.status !== 'completed'}
                  onClick={() => void resend(r)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}
                >
                  <Send sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        />
      )}

      {/* A claim creates a subscription, so reload the lists when one lands. */}
      {view === 'invites' && <B2BInvitesPanel productLabels={PRODUCT_LABELS} onClaimed={load} />}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selected?.company_name || selected?.user_email || 'Edit subscription'}
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
            Saving notifies the client that their delivery arrangement changed.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Status" value={editForm.status || 'active'} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
              {['active', 'trialing', 'past_due', 'cancelled', 'inactive'].map((status) => (
                <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField select label="Delivery cadence" value={editForm.delivery_frequency || 'monthly'} onChange={(event) => setEditForm({ ...editForm, delivery_frequency: event.target.value as B2BDeliveryFrequency })}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField
              label="Extra recipient"
              helperText="Copied on every delivery. Leave blank to send to the account holder only."
              value={editForm.extra_recipient_email || ''}
              onChange={(event) => setEditForm({ ...editForm, extra_recipient_email: event.target.value })}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment> } }}
            />
            <TextField
              label="Next delivery"
              helperText="ISO timestamp, for example 2026-09-01T09:00:00Z. Leave unchanged to keep the current schedule."
              value={editForm.next_delivery_at || ''}
              onChange={(event) => setEditForm({ ...editForm, next_delivery_at: event.target.value })}
            />
            <TextField label="Company" value={editForm.company_name || ''} onChange={(event) => setEditForm({ ...editForm, company_name: event.target.value })} />
            <TextField
              label="Admin notes"
              helperText="Internal only. Never appears in a delivered package."
              multiline
              minRows={3}
              value={editForm.admin_notes || ''}
              onChange={(event) => setEditForm({ ...editForm, admin_notes: event.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>
          Create a manual contract
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
            For a client billed outside the platform. The account must already exist.
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Client email"
              helperText="Must match an existing account exactly."
              value={manualForm.user_email}
              onChange={(event) => setManualForm({ ...manualForm, user_email: event.target.value })}
            />
            <TextField select label="Product" value={manualForm.product_type} onChange={(event) => setManualForm({ ...manualForm, product_type: event.target.value as B2BProductType })}>
              {PRODUCT_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select label="Delivery cadence" value={manualForm.delivery_frequency} onChange={(event) => setManualForm({ ...manualForm, delivery_frequency: event.target.value as B2BDeliveryFrequency })}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField label="Extra recipient" value={manualForm.extra_recipient_email || ''} onChange={(event) => setManualForm({ ...manualForm, extra_recipient_email: event.target.value })} />
            <TextField label="Company" value={manualForm.company_name || ''} onChange={(event) => setManualForm({ ...manualForm, company_name: event.target.value })} />
            <TextField
              label="Admin notes"
              helperText="Internal only. Never appears in a delivered package."
              multiline
              minRows={3}
              value={manualForm.admin_notes || ''}
              onChange={(event) => setManualForm({ ...manualForm, admin_notes: event.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={createManual} disabled={saving || !manualForm.user_email.trim()}>
            {saving ? <CircularProgress size={18} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
