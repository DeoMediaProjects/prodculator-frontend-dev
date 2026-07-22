import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, MenuItem, Avatar, Checkbox, IconButton, CircularProgress,
} from '@mui/material';
import {
  ReceiptLongOutlined, FileDownloadOutlined, LogoutOutlined, DeleteOutline, CreditCardOutlined,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { getCustomerPortalUrl } from '@/services/stripe.service';
import { useCurrentSubscription } from '@/app/hooks/useCurrentSubscription';
import { DataTable } from './DataTable';
import { ConfirmDialog } from '@/app/components/common/ConfirmDialog';
import { PROFILE_KEY, PROFILE_UPDATED_EVENT } from './Sidebar';

const ACCOUNT_DELETE_REASONS = [
  'No longer need the service',
  'Too expensive',
  'Missing features I need',
  'Switching to another tool',
  'Privacy concerns',
  'Other',
];

interface InvoiceItem {
  id: string; number: string | null; status: string; amount_paid: number; amount_due: number;
  currency: string; created: number | null; invoice_pdf: string | null; hosted_invoice_url: string | null;
}

const COUNTRIES = ['United Kingdom', 'United States', 'Canada', 'Australia', 'Ireland', 'France', 'Germany', 'Spain', 'Italy', 'Other'];
const NOTIF_KEY = 'prodculator-email-notifs';

function money(amountMinor: number, currency: string) {
  const sym = currency?.toUpperCase() === 'USD' ? '$' : currency?.toUpperCase() === 'EUR' ? '€' : '£';
  return `${sym}${(amountMinor / 100).toFixed(2)}`;
}
function fmtDate(unixSec: number | null) {
  if (!unixSec) return '—';
  return new Date(unixSec * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function AccountPage() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user, userLogout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { data: subData } = useCurrentSubscription(!!user);
  // subscription record shape varies; read optional fields defensively.
  const subscription = (subData?.subscription ?? null) as null | Record<string, any>;

  const email = user?.email || '';
  const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
  const initials = (derivedName || 'U').split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
  const plan = (user?.plan || 'free').toUpperCase();

  const [fullName, setFullName] = useState(derivedName);
  const [country, setCountry] = useState('United Kingdom');
  const [countryOther, setCountryOther] = useState('');
  const effectiveCountry = country === 'Other' ? countryOther.trim() : country;
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const [notifs, setNotifs] = useState<{ reportReady: boolean; deadlines: boolean; product: boolean }>(() => {
    try { const s = localStorage.getItem(NOTIF_KEY); if (s) return JSON.parse(s); } catch { /* */ }
    return { reportReady: true, deadlines: true, product: false };
  });
  useEffect(() => { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs)); } catch { /* */ } }, [notifs]);

  useEffect(() => { if (derivedName && !fullName) setFullName(derivedName); }, [derivedName]); // eslint-disable-line

  // Restore any locally-saved profile (name/country/avatar) on mount.
  useEffect(() => {
    try {
      const s = localStorage.getItem(PROFILE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p.fullName) setFullName(p.fullName);
        if (p.country) {
          // A saved country outside the preset list means the user typed their own.
          if (COUNTRIES.includes(p.country)) { setCountry(p.country); }
          else { setCountry('Other'); setCountryOther(p.country); }
        }
      }
      const a = localStorage.getItem('prodculator-avatar');
      if (a) setAvatar(a);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiClient.get<{ invoices: InvoiceItem[] }>('/api/subscriptions/invoices', { auth: true })
      .then((d) => { if (!cancelled) setInvoices(d.invoices || []); })
      .catch(() => { if (!cancelled) setInvoices([]); })
      .finally(() => { if (!cancelled) setInvoicesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const latestPaid = useMemo(() => invoices.find((i) => i.status === 'paid') || invoices[0], [invoices]);
  const renews = subscription?.current_period_end
    ? new Date(String(subscription.current_period_end).length > 10 ? String(subscription.current_period_end) : Number(subscription.current_period_end) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const cardBrand = subscription?.card_brand || subscription?.brand;
  const cardLast4 = subscription?.card_last4 || subscription?.last4;

  const handleSave = () => {
    setSaving(true);
    // No profile-update endpoint exists yet; persist locally and confirm.
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ fullName, country: effectiveCountry })); } catch { /* */ }
    window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
    setTimeout(() => { setSaving(false); enqueueSnackbar('Profile changes saved.', { variant: 'success' }); }, 350);
  };
  const handlePhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { enqueueSnackbar('Please choose an image file.', { variant: 'error' }); return; }
    if (file.size > 2 * 1024 * 1024) { enqueueSnackbar('Image must be under 2MB.', { variant: 'error' }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setAvatar(url);
      try { localStorage.setItem('prodculator-avatar', url); } catch { /* */ }
      enqueueSnackbar('Profile photo updated.', { variant: 'success' });
    };
    reader.readAsDataURL(file);
  };
  const handleManageBilling = async () => {
    const customerId = subscription?.stripe_customer_id;
    if (!customerId) { enqueueSnackbar('No billing account on file yet.', { variant: 'info' }); return; }
    try {
      const { url } = await getCustomerPortalUrl(customerId);
      if (url) window.location.href = url; else enqueueSnackbar('Unable to open billing portal.', { variant: 'error' });
    } catch { enqueueSnackbar('Unable to open billing portal.', { variant: 'error' }); }
  };
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirmDeleteAccount = (reason?: string) => {
    setDeleting(true);
    apiClient.delete('/api/users/me', { auth: true, data: reason ? { reason } : undefined })
      .then(() => { enqueueSnackbar('Account deletion requested.', { variant: 'success' }); userLogout(); navigate('/'); })
      .catch(() => enqueueSnackbar('Could not process the request automatically. Please contact support.', { variant: 'error' }))
      .finally(() => { setDeleting(false); setDeleteOpen(false); });
  };

  const cardSx = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px', p: 3 };
  const label = { fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: t.textSecondary, mb: 0.75 };
  const sectionTitle = { fontSize: 17, fontWeight: 800, color: t.textPrimary };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Profile */}
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography sx={sectionTitle}>Profile</Typography>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Avatar src={avatar || undefined} sx={{ width: 84, height: 84, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontSize: 26, fontWeight: 800 }}>{!avatar && initials}</Avatar>
            <Typography component="label" sx={{ display: 'inline-block', fontSize: 12, color: t.gold, mt: 1, cursor: 'pointer', fontWeight: 600 }}>
              Change photo
              <input hidden type="file" accept="image/*" onChange={handlePhoto} />
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 260, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography sx={label}>FULL NAME</Typography>
              <TextField fullWidth size="small" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Box>
            <Box>
              <Typography sx={label}>EMAIL ADDRESS</Typography>
              <TextField fullWidth size="small" value={email} disabled />
            </Box>
            <Box>
              <Typography sx={label}>COUNTRY / REGION</Typography>
              <TextField fullWidth size="small" select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              {country === 'Other' && (
                <TextField fullWidth size="small" placeholder="Type your country / region" value={countryOther} onChange={(e) => setCountryOther(e.target.value)} sx={{ mt: 1 }} />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Password + Subscription */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        <Box sx={cardSx}>
          <Typography sx={{ ...sectionTitle, mb: 2.5 }}>Password &amp; Security</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600 }}>Password</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13, letterSpacing: 2 }}>••••••••••</Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate('/reset-password')}>Change</Button>
          </Box>
        </Box>

        <Box sx={cardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography sx={sectionTitle}>Subscription</Typography>
            <Box sx={{ border: `1px solid ${t.gold}`, color: t.gold, borderRadius: '8px', px: 1.2, py: 0.4, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em' }}>{plan}</Box>
          </Box>
          {latestPaid ? (
            <Typography sx={{ fontSize: 30, fontWeight: 800, color: t.textPrimary }}>
              {money(latestPaid.amount_paid, latestPaid.currency)}<span style={{ fontSize: 14, color: t.textSecondary, fontWeight: 500 }}> / month</span>
            </Typography>
          ) : (
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: t.textPrimary }}>{plan} plan</Typography>
          )}
          <Typography sx={{ color: t.textSecondary, fontSize: 13, mb: 2 }}>
            {plan === 'STUDIO' ? 'Unlimited reports' : 'Report allowance per period'}{renews ? ` · Renews ${renews}` : ''}
          </Typography>
          {(cardBrand || cardLast4) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${t.border}`, borderRadius: '10px', p: 1.5, mb: 2 }}>
              <CreditCardOutlined sx={{ color: t.gold }} />
              <Typography sx={{ color: t.textPrimary, fontSize: 14 }}>{cardBrand || 'Card'} ending {cardLast4 || '••••'}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" fullWidth onClick={() => navigate('/pricing')}>Change plan</Button>
            <Button variant="outlined" fullWidth onClick={handleManageBilling}>Manage billing</Button>
          </Box>
        </Box>
      </Box>

      {/* Invoice history */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ReceiptLongOutlined sx={{ color: t.gold }} />
          <Typography sx={sectionTitle}>Invoice History</Typography>
        </Box>
        {invoicesLoading ? (
          <Box sx={{ ...cardSx, display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: t.gold }} /></Box>
        ) : (
          <DataTable
            rows={invoices}
            getRowId={(inv) => inv.id}
            minWidth={560}
            maxHeight={360}
            emptyMessage="No invoices yet."
            columns={[
              { key: 'number', header: 'INVOICE', width: '1.4fr', sortValue: (inv) => inv.number || inv.id, render: (inv) => <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{inv.number || inv.id.slice(0, 12)}</Typography> },
              { key: 'created', header: 'DATE', width: '1.2fr', sortValue: (inv) => inv.created || 0, render: (inv) => <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{fmtDate(inv.created)}</Typography> },
              { key: 'amount', header: 'AMOUNT', width: '1fr', filterable: false, sortValue: (inv) => (inv.status === 'paid' ? inv.amount_paid : inv.amount_due), render: (inv) => <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 13.5 }}>{money(inv.status === 'paid' ? inv.amount_paid : inv.amount_due, inv.currency)}</Typography> },
              { key: 'status', header: 'STATUS', width: '1fr', render: (inv) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: inv.status === 'paid' ? t.success : t.warning }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: inv.status === 'paid' ? t.success : t.warning, textTransform: 'capitalize' }}>{inv.status}</Typography>
                </Box>
              ) },
            ]}
            rowActions={(inv) => (
              <IconButton size="small" disabled={!inv.invoice_pdf && !inv.hosted_invoice_url} onClick={() => { const u = inv.invoice_pdf || inv.hosted_invoice_url; if (u) window.open(u, '_blank'); }} sx={{ color: t.gold }}>
                <FileDownloadOutlined fontSize="small" />
              </IconButton>
            )}
            actionsHeader="DOWNLOAD"
          />
        )}
      </Box>

      {/* Notifications + Session */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        <Box sx={cardSx}>
          <Typography sx={{ ...sectionTitle, mb: 2 }}>Email Notifications</Typography>
          {([
            { k: 'reportReady', label: 'Report ready notifications' },
            { k: 'deadlines', label: 'Incentive & deadline reminders' },
            { k: 'product', label: 'Product news & offers' },
          ] as const).map((row) => (
            <Box key={row.k} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Checkbox
                checked={notifs[row.k]}
                onChange={(e) => setNotifs((n) => ({ ...n, [row.k]: e.target.checked }))}
                sx={{ color: t.gold, '&.Mui-checked': { color: t.gold }, py: 0.5 }}
              />
              <Typography sx={{ color: t.textPrimary, fontSize: 14 }}>{row.label}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ ...sectionTitle, mb: 2 }}>Session &amp; Account</Typography>
          <Button fullWidth variant="outlined" startIcon={<LogoutOutlined />} onClick={() => { userLogout(); navigate('/'); }} sx={{ justifyContent: 'flex-start', mb: 1.5 }}>Sign out</Button>
          <Button fullWidth variant="outlined" startIcon={<DeleteOutline />} onClick={() => setDeleteOpen(true)} sx={{ justifyContent: 'flex-start', color: t.error, borderColor: t.error, '&:hover': { borderColor: t.error, bgcolor: 'rgba(229,104,109,0.08)' } }}>Request account deletion</Button>
        </Box>
      </Box>

      <ConfirmDialog
        open={deleteOpen}
        title="Request account deletion"
        message="We retain your account and reports for 30 days after you request deletion, then permanently delete everything. You can contact support within that window to cancel. Please let us know why you are leaving."
        confirmLabel="Request deletion"
        destructive
        loading={deleting}
        reasons={ACCOUNT_DELETE_REASONS}
        reasonLabel="Reason for leaving"
        reasonRequired
        onConfirm={confirmDeleteAccount}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
