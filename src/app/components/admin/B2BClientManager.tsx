import { useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  CloudDownload,
  Edit,
  Email,
  Refresh,
  Send,
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
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

const PRODUCT_LABELS: Record<B2BProductType, string> = {
  camera_equipment: 'Camera & Equipment',
  production_services: 'Production Services',
  crew_casting: 'Crew & Casting',
  production_trend: 'Production Trend',
  enterprise: 'Enterprise Slate',
};

const PRODUCT_OPTIONS = Object.entries(PRODUCT_LABELS) as [B2BProductType, string][];

function currency(amount?: number | null, code?: string | null) {
  if (!amount || !code) return 'Manual';
  return new Intl.NumberFormat(code.toLowerCase() === 'gbp' ? 'en-GB' : 'en-US', {
    style: 'currency',
    currency: code.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function metricSummary(request: B2BIntelligenceRequest) {
  const metrics = request.metrics || {};
  const sourceCount = typeof metrics.source_signal_count === 'number' ? metrics.source_signal_count : null;
  const suppressed = Array.isArray(metrics.suppressed_segments) ? metrics.suppressed_segments.length : 0;
  const insufficient = metrics.insufficient_data === true;
  return `${sourceCount ?? 'N/A'} signals, ${suppressed} suppressed${insufficient ? ', insufficient overall data' : ''}`;
}

function blankToNull(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

export function B2BClientManager() {
  const { enqueueSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
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

  const stats = useMemo(() => {
    const active = subscriptions.filter((item) => ['active', 'trialing'].includes(item.status));
    const mrr = active.reduce((sum, item) => sum + (item.amount_cents || 0), 0);
    return {
      total: subscriptions.length,
      active: active.length,
      requests: requests.length,
      mrr,
    };
  }, [subscriptions, requests]);

  const load = async () => {
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
      setError(err instanceof Error ? err.message : 'Failed to load B2B clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      enqueueSnackbar('B2B subscription updated and user notified.', { variant: 'success' });
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
      enqueueSnackbar('Manual B2B subscription created.', { variant: 'success' });
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
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create manual subscription', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resend = async (request: B2BIntelligenceRequest) => {
    try {
      const response = await adminB2BService.resendRequest(request.id);
      enqueueSnackbar(`Resent to ${response.recipients.join(', ')}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to resend PDF', { variant: 'error' });
    }
  };

  const download = async (request: B2BIntelligenceRequest) => {
    try {
      await adminB2BService.downloadRequestPdf(request);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to download PDF', { variant: 'error' });
    }
  };

  if (loading) return <LoadingSpinner overlay message="Loading B2B clients..." />;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#D4AF37' }}>
            B2B Client Management
          </Typography>
          <Typography sx={{ color: '#bbb' }}>
            Manage B2B subscriptions, manual contracts, delivery schedules, recipients, PDFs, and metrics.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={load}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setManualOpen(true)}>
            Manual Contract
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Card sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Total Subscriptions</Typography><Typography variant="h4">{stats.total}</Typography></Card>
        <Card sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Active</Typography><Typography variant="h4">{stats.active}</Typography></Card>
        <Card sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Requests</Typography><Typography variant="h4">{stats.requests}</Typography></Card>
        <Card sx={{ p: 2, flex: 1 }}><Typography color="text.secondary">Listed MRR</Typography><Typography variant="h4">{currency(stats.mrr, 'gbp')}</Typography></Card>
      </Stack>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <Tab label="Subscriptions" />
        <Tab label="Requests & Metrics" />
      </Tabs>

      {tab === 0 && (
        <TableContainer sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Cadence</TableCell>
                <TableCell>Extra Recipient</TableCell>
                <TableCell>Next Delivery</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow><TableCell colSpan={8}>No B2B subscriptions yet.</TableCell></TableRow>
              ) : subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>{PRODUCT_LABELS[subscription.product_type]}</TableCell>
                  <TableCell>{subscription.user_id}</TableCell>
                  <TableCell><Chip size="small" label={subscription.status} /></TableCell>
                  <TableCell>{subscription.source}</TableCell>
                  <TableCell>{subscription.delivery_frequency}</TableCell>
                  <TableCell>{subscription.extra_recipient_email || 'None'}</TableCell>
                  <TableCell>{subscription.next_delivery_at ? new Date(subscription.next_delivery_at).toLocaleString() : 'Not scheduled'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<Edit />} onClick={() => openEdit(subscription)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Metrics</TableCell>
                <TableCell>Delivered</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow><TableCell colSpan={7}>No B2B intelligence requests yet.</TableCell></TableRow>
              ) : requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>{PRODUCT_LABELS[request.product_type]}</TableCell>
                  <TableCell>{request.user_id}</TableCell>
                  <TableCell>{request.period_start} to {request.period_end}</TableCell>
                  <TableCell><Chip size="small" label={request.status} /></TableCell>
                  <TableCell>{metricSummary(request)}</TableCell>
                  <TableCell>{request.delivered_at ? new Date(request.delivered_at).toLocaleString() : 'No'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" startIcon={<CloudDownload />} disabled={request.status !== 'completed'} onClick={() => download(request)}>
                        PDF
                      </Button>
                      <Button size="small" startIcon={<Send />} disabled={request.status !== 'completed'} onClick={() => resend(request)}>
                        Resend
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit B2B Subscription</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Status" value={editForm.status || 'active'} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
              {['active', 'trialing', 'past_due', 'cancelled', 'inactive'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
            </TextField>
            <TextField select label="Delivery cadence" value={editForm.delivery_frequency || 'monthly'} onChange={(event) => setEditForm({ ...editForm, delivery_frequency: event.target.value as B2BDeliveryFrequency })}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField label="Extra recipient" value={editForm.extra_recipient_email || ''} onChange={(event) => setEditForm({ ...editForm, extra_recipient_email: event.target.value })} InputProps={{ startAdornment: <Email sx={{ mr: 1, color: '#999' }} /> }} />
            <TextField label="Next delivery ISO timestamp" value={editForm.next_delivery_at || ''} onChange={(event) => setEditForm({ ...editForm, next_delivery_at: event.target.value })} />
            <TextField label="Company" value={editForm.company_name || ''} onChange={(event) => setEditForm({ ...editForm, company_name: event.target.value })} />
            <TextField label="Admin notes" multiline minRows={3} value={editForm.admin_notes || ''} onChange={(event) => setEditForm({ ...editForm, admin_notes: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={manualOpen} onClose={() => setManualOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Manual B2B Contract</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="User email" value={manualForm.user_email} onChange={(event) => setManualForm({ ...manualForm, user_email: event.target.value })} />
            <TextField select label="Product" value={manualForm.product_type} onChange={(event) => setManualForm({ ...manualForm, product_type: event.target.value as B2BProductType })}>
              {PRODUCT_OPTIONS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <TextField select label="Delivery cadence" value={manualForm.delivery_frequency} onChange={(event) => setManualForm({ ...manualForm, delivery_frequency: event.target.value as B2BDeliveryFrequency })}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
            </TextField>
            <TextField label="Extra recipient" value={manualForm.extra_recipient_email || ''} onChange={(event) => setManualForm({ ...manualForm, extra_recipient_email: event.target.value })} />
            <TextField label="Company" value={manualForm.company_name || ''} onChange={(event) => setManualForm({ ...manualForm, company_name: event.target.value })} />
            <TextField label="Admin notes" multiline minRows={3} value={manualForm.admin_notes || ''} onChange={(event) => setManualForm({ ...manualForm, admin_notes: event.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={createManual} disabled={saving}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
