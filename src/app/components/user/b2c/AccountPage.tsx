import { useEffect, useMemo, useState } from 'react';
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
  const [saving, setSaving] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  const [notifs, setNotifs] = useState<{ reportReady: boolean; deadlines: boolean; product: boolean }>(() => {
    try { const s = localStorage.getItem(NOTIF_KEY); if (s) return JSON.parse(s); } catch { /* */ }
    return { reportReady: true, deadlines: true, product: false };
  });
  useEffect(() => { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs)); } catch { /* */ } }, [notifs]);

  useEffect(() => { if (derivedName && !fullName) setFullName(derivedName); }, [derivedName]); // eslint-disable-line

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
    try { localStorage.setItem('prodculator-profile', JSON.stringify({ fullName, country })); } catch { /* */ }
    setTimeout(() => { setSaving(false); enqueueSnackbar('Profile changes saved.', { variant: 'success' }); }, 350);
  };
  const handleManageBilling = async () => {
    const customerId = subscription?.stripe_customer_id;
    if (!customerId) { enqueueSnackbar('No billing account on file yet.', { variant: 'info' }); return; }
    try {
      const { url } = await getCustomerPortalUrl(customerId);
      if (url) window.location.href = url; else enqueueSnackbar('Unable to open billing portal.', { variant: 'error' });
    } catch { enqueueSnackbar('Unable to open billing portal.', { variant: 'error' }); }
  };
  const handleDelete = () => {
    if (!window.confirm('Delete your account? This is permanent and cannot be undone.')) return;
    apiClient.delete('/api/users/me', { auth: true })
      .then(() => { enqueueSnackbar('Account deletion requested.', { variant: 'success' }); userLogout(); navigate('/'); })
      .catch(() => enqueueSnackbar('Could not delete the account automatically. Please contact support.', { variant: 'error' }));
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
            <Avatar sx={{ width: 84, height: 84, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontSize: 26, fontWeight: 800 }}>{initials}</Avatar>
            <Typography sx={{ fontSize: 12, color: t.gold, mt: 1, cursor: 'pointer', fontWeight: 600 }}>Change photo</Typography>
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
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Password + Subscription */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        <Box sx={cardSx}>
          <Typography sx={{ ...sectionTitle, mb: 2.5 }}>Password &amp; Security</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, pb: 2, borderBottom: `1px solid ${t.borderSoft}` }}>
            <Box>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600 }}>Password</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13, letterSpacing: 2 }}>••••••••••</Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate('/reset-password')}>Change</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600 }}>Two-factor authentication</Typography>
              <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>Not enabled</Typography>
            </Box>
            <Button variant="outlined" onClick={() => enqueueSnackbar('Two-factor setup is coming soon.', { variant: 'info' })}>Enable</Button>
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
      <Box sx={cardSx}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ReceiptLongOutlined sx={{ color: t.gold }} />
          <Typography sx={sectionTitle}>Invoice History</Typography>
        </Box>
        {invoicesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: t.gold }} /></Box>
        ) : invoices.length === 0 ? (
          <Typography sx={{ color: t.textSecondary, py: 2 }}>No invoices yet.</Typography>
        ) : (
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 1fr 0.6fr', px: 1, py: 1, borderBottom: `1px solid ${t.border}` }}>
              {['INVOICE', 'DATE', 'AMOUNT', 'STATUS', 'DOWNLOAD'].map((h) => (
                <Typography key={h} sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', color: t.textSecondary }}>{h}</Typography>
              ))}
            </Box>
            {invoices.map((inv) => (
              <Box key={inv.id} sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 1fr 0.6fr', alignItems: 'center', px: 1, py: 1.5, borderBottom: `1px solid ${t.borderSoft}` }}>
                <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{inv.number || inv.id.slice(0, 12)}</Typography>
                <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{fmtDate(inv.created)}</Typography>
                <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 13.5 }}>{money(inv.status === 'paid' ? inv.amount_paid : inv.amount_due, inv.currency)}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: inv.status === 'paid' ? t.success : t.warning }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: inv.status === 'paid' ? t.success : t.warning, textTransform: 'capitalize' }}>{inv.status}</Typography>
                </Box>
                <IconButton size="small" disabled={!inv.invoice_pdf && !inv.hosted_invoice_url} onClick={() => { const u = inv.invoice_pdf || inv.hosted_invoice_url; if (u) window.open(u, '_blank'); }} sx={{ color: t.gold, justifySelf: 'end' }}>
                  <FileDownloadOutlined fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
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
          <Button fullWidth variant="outlined" startIcon={<DeleteOutline />} onClick={handleDelete} sx={{ justifyContent: 'flex-start', color: t.error, borderColor: t.error, '&:hover': { borderColor: t.error, bgcolor: 'rgba(229,104,109,0.08)' } }}>Delete account</Button>
        </Box>
      </Box>
    </Box>
  );
}
