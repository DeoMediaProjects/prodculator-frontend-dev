import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Block,
  ContentCopy,
  CheckCircleOutline,
  MailOutline,
  PersonAddAlt,
  Refresh,
  Send,
} from '@mui/icons-material';
import {
  adminB2BService,
  type AdminB2BInvite,
  type AdminB2BInvitePayload,
  type B2BDeliveryFrequency,
  type B2BInviteStatus,
  type B2BProductType,
} from '@/services/b2b.service';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';


const STATUS_STYLES: Record<B2BInviteStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Awaiting claim', bg: 'rgba(184,122,31,0.2)', color: 'warning.main' },
  accepted: { label: 'Claimed', bg: 'rgba(46,125,50,0.2)', color: 'success.main' },
  revoked: { label: 'Revoked', bg: 'rgba(211,47,47,0.2)', color: 'error.main' },
  expired: { label: 'Expired', bg: 'rgba(117,117,117,0.2)', color: 'text.secondary' },
};

const EMPTY_FORM: AdminB2BInvitePayload = {
  email: '',
  product_type: 'enterprise',
  delivery_frequency: 'monthly',
  company_name: '',
  extra_recipient_email: '',
  admin_notes: '',
  expires_in_days: 30,
  send_email: true,
};

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  try {
    return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function blankToNull(value: string | null | undefined) {
  const trimmed = (value || '').trim();
  return trimmed ? trimmed : null;
}

function daysUntil(value: string | null) {
  if (!value) return null;
  const expiry = new Date(value).getTime();
  if (Number.isNaN(expiry)) return null;
  return Math.ceil((expiry - Date.now()) / 86_400_000);
}

export function B2BInvitesPanel({
  productLabels,
  onClaimed,
}: {
  productLabels: Record<B2BProductType, string>;
  /** Called after an invite is claimed elsewhere, so the parent can refresh its
   *  subscription list, a claim creates a subscription. */
  onClaimed?: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [invites, setInvites] = useState<AdminB2BInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<B2BInviteStatus | ''>('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [form, setForm] = useState<AdminB2BInvitePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminB2BInvite | null>(null);
  // The accept URL is only ever returned once, so it is surfaced until the admin
  // dismisses it rather than flashed in a snackbar they might miss.
  const [issuedLink, setIssuedLink] = useState<{ email: string; url: string } | null>(null);

  const productOptions = Object.entries(productLabels) as [B2BProductType, string][];

  const counts = useMemo(() => ({
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    revoked: invites.filter((i) => i.status === 'revoked').length,
  }), [invites]);

  const scoped = useMemo(
    () => (statusFilter ? invites.filter((i) => i.status === statusFilter) : invites),
    [invites, statusFilter],
  );

  const columns = useMemo<Column<AdminB2BInvite>[]>(() => [
    {
      key: 'email', header: 'INVITED', width: '1.9fr',
      sortValue: (i) => i.email,
      render: (i) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {i.email}
          </Typography>
          {i.company_name && (
            <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {i.company_name}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'product_type', header: 'PRODUCT', width: '1.4fr',
      sortValue: (i) => productLabels[i.product_type] ?? i.product_type,
      render: (i) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {productLabels[i.product_type] ?? i.product_type}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '1.2fr',
      sortValue: (i) => STATUS_STYLES[i.status].label,
      render: (i) => {
        const style = STATUS_STYLES[i.status];
        return <Chip size="small" label={style.label} sx={{ bgcolor: style.bg, color: style.color, fontWeight: 600, fontSize: '0.7rem' }} />;
      },
    },
    {
      key: 'expires_at', header: 'EXPIRES', width: '1.3fr',
      sortValue: (i) => Date.parse(i.expires_at || '') || Number.MAX_SAFE_INTEGER,
      render: (i) => {
        const remaining = i.status === 'pending' ? daysUntil(i.expires_at) : null;
        return (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>{formatDate(i.expires_at)}</Typography>
            {/* Only a live invite has a countdown worth reading: an expiry date on
                a claimed or revoked invite decides nothing. */}
            {remaining !== null && remaining >= 0 && (
              <Typography sx={{ fontSize: 11.5, fontWeight: remaining <= 3 ? 700 : 400, color: remaining <= 3 ? t.warning : t.textFaint }}>
                {remaining === 0 ? 'expires today' : `${remaining} day${remaining === 1 ? '' : 's'} left`}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'sent_count', header: 'TIMES SENT', width: '0.9fr', align: 'right',
      sortValue: (i) => i.sent_count + 1,
      render: (i) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {i.sent_count + 1}
        </Typography>
      ),
    },
    {
      key: 'accepted_at', header: 'CLAIMED', width: '1.2fr',
      sortValue: (i) => Date.parse(i.accepted_at || '') || 0,
      render: (i) => (
        <Typography sx={{ fontSize: 13.5, color: i.accepted_at ? t.textSecondary : t.textFaint }}>
          {i.accepted_at ? formatDate(i.accepted_at) : 'Not yet'}
        </Typography>
      ),
    },
  ], [t, productLabels]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetched unscoped: scoping is applied client-side so switching scope is
      // instant and the tab counts always agree with the rows underneath them.
      setInvites(await adminB2BService.getInvites({}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      enqueueSnackbar('Invite link copied to clipboard.', { variant: 'success' });
    } catch {
      // Clipboard access can be denied; the link is still on screen to copy by hand.
      enqueueSnackbar('Could not copy automatically, select the link and copy it.', { variant: 'warning' });
    }
  };

  const issue = async () => {
    setSaving(true);
    try {
      const result = await adminB2BService.issueInvite({
        ...form,
        email: form.email.trim(),
        company_name: blankToNull(form.company_name),
        extra_recipient_email: blankToNull(form.extra_recipient_email),
        admin_notes: blankToNull(form.admin_notes),
      });
      setIssuedLink({ email: result.invite.email, url: result.accept_url });
      enqueueSnackbar(
        form.send_email
          ? `Invite emailed to ${result.invite.email}.`
          : `Invite created for ${result.invite.email}. Send them the link below.`,
        { variant: 'success' },
      );
      setIssueOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to issue invite', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resend = async (invite: AdminB2BInvite) => {
    setBusyId(invite.id);
    try {
      const result = await adminB2BService.resendInvite(invite.id);
      setIssuedLink({ email: result.invite.email, url: result.accept_url });
      enqueueSnackbar(`Invite resent to ${result.invite.email}. The previous link no longer works.`, {
        variant: 'success',
      });
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to resend invite', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      await adminB2BService.revokeInvite(revokeTarget.id);
      enqueueSnackbar(`Invite for ${revokeTarget.email} revoked.`, { variant: 'success' });
      setRevokeTarget(null);
      await load();
      onClaimed?.();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to revoke invite', { variant: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', maxWidth: '70ch' }}>
          Invite a contracted client before they have an account. The subscription is created when they claim it, so
          nothing needs provisioning by hand.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button size="small" variant="contained" startIcon={<PersonAddAlt />} onClick={() => setIssueOpen(true)}>
            Invite client
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {issuedLink && (
        <Alert
          severity="info"
          onClose={() => setIssuedLink(null)}
          sx={{ mb: 2 }}
          action={
            <Button size="small" startIcon={<ContentCopy />} onClick={() => void copyLink(issuedLink.url)}>
              Copy
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Invite link for {issuedLink.email}
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 12 }}>
            {issuedLink.url}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
            This is the only time this link is shown, it is not stored and cannot be retrieved later. Resending
            generates a new one and invalidates this.
          </Typography>
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={statusFilter || 'all'}
          onChange={(v) => setStatusFilter(v === 'all' ? '' : (v as B2BInviteStatus))}
          options={[
            { value: 'all', label: `All ${invites.length}` },
            { value: 'pending', label: `Awaiting claim ${counts.pending}` },
            { value: 'accepted', label: `Claimed ${counts.accepted}` },
            { value: 'revoked', label: `Revoked ${counts.revoked}` },
          ]}
        />
      </Box>

      <DataTable<AdminB2BInvite>
        key={statusFilter || 'all'}
        title="Contract invites"
        columns={columns}
        rows={scoped}
        getRowId={(i) => i.id}
        pageSize={10}
        itemNoun="invite"
        minWidth={1060}
        maxHeight={520}
        emptyIcon={<MailOutline sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage={statusFilter
          ? `No ${STATUS_STYLES[statusFilter].label.toLowerCase()} invites.`
          : 'No contract invites yet. Issue one to onboard a client who has not signed up.'}
        rowActions={(invite) => (invite.status === 'accepted' ? (
          <Tooltip title="Claimed, so the subscription already exists">
            <CheckCircleOutline sx={{ fontSize: 17, color: t.success }} />
          </Tooltip>
        ) : (
          <>
            <Tooltip title="Rotate the token and email it again. The old link stops working.">
              <span>
                <IconButton
                  size="small"
                  disabled={busyId === invite.id || invite.status === 'revoked'}
                  onClick={() => void resend(invite)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}
                >
                  <Send sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Revoke this invite">
              <span>
                <IconButton
                  size="small"
                  disabled={busyId === invite.id || invite.status === 'revoked'}
                  onClick={() => setRevokeTarget(invite)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}
                >
                  <Block sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
          </>
        ))}
      />

      <Dialog open={issueOpen} onClose={() => setIssueOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite a contracted client</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: 14 }}>
            The client does not need an account yet. They will be asked to sign in with this address, and the
            subscription is created on the terms below when they claim it.
          </DialogContentText>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Client email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              helperText="The invite is tied to this address, only an account using it can claim it."
              fullWidth
            />
            <TextField
              select
              label="Product"
              value={form.product_type}
              onChange={(e) => setForm((prev) => ({ ...prev, product_type: e.target.value as B2BProductType }))}
              fullWidth
            >
              {productOptions.map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Delivery"
                value={form.delivery_frequency}
                onChange={(e) => setForm((prev) => ({ ...prev, delivery_frequency: e.target.value as B2BDeliveryFrequency }))}
                fullWidth
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
              </TextField>
              <TextField
                label="Claim window (days)"
                type="number"
                value={form.expires_in_days ?? 30}
                onChange={(e) => setForm((prev) => ({ ...prev, expires_in_days: Number(e.target.value) }))}
                slotProps={{ htmlInput: { min: 1, max: 365 } }}
                fullWidth
              />
            </Stack>
            <TextField
              label="Company name"
              value={form.company_name ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Additional recipient"
              type="email"
              value={form.extra_recipient_email ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, extra_recipient_email: e.target.value }))}
              helperText="Optional second address that receives their delivered reports."
              fullWidth
            />
            <TextField
              label="Internal notes"
              value={form.admin_notes ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, admin_notes: e.target.value }))}
              helperText="Never shown to the client."
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              select
              label="Delivery of the invite"
              value={form.send_email ? 'email' : 'link'}
              onChange={(e) => setForm((prev) => ({ ...prev, send_email: e.target.value === 'email' }))}
              fullWidth
            >
              <MenuItem value="email">Email the client now</MenuItem>
              <MenuItem value="link">Give me the link, do not email</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void issue()}
            disabled={saving || !form.email.trim()}
            startIcon={<MailOutline />}
          >
            {saving ? 'Issuing...' : 'Issue invite'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!revokeTarget} onClose={() => setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke this invite?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The link sent to {revokeTarget?.email} will stop working immediately. You can issue a new invite for the
            same address afterwards.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)}>Keep it</Button>
          <Button color="error" onClick={() => void revoke()} disabled={busyId === revokeTarget?.id}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
