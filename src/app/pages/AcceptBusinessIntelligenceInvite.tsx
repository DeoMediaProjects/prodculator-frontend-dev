import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  CheckCircle,
  ErrorOutline,
  Insights,
  Login,
  MailOutline,
  ScheduleSend,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { useAuth } from '@/app/contexts/AuthContext';
import { ApiError } from '@/services/api';
import { b2bService, type B2BInvitePreview, type B2BInviteStatus } from '@/services/b2b.service';

const PRODUCT_LABELS: Record<string, string> = {
  camera_equipment: 'Camera & Equipment Intelligence',
  production_services: 'Production Services Intelligence',
  crew_casting: 'Crew & Casting Intelligence',
  production_trend: 'Production Trend Intelligence',
  enterprise: 'Enterprise Slate Intelligence',
};

/** Wording per unclaimable state. The API returns the reason precisely so this
 *  page can say which of three different situations applies, rather than
 *  showing one generic error for all of them. */
const UNCLAIMABLE_COPY: Record<Exclude<B2BInviteStatus, 'pending'>, { title: string; body: string }> = {
  accepted: {
    title: 'This invitation has already been used',
    body: 'The subscription it created is active. Sign in and open Business Intelligence to see it — if you think someone else claimed it, contact your account manager.',
  },
  revoked: {
    title: 'This invitation has been revoked',
    body: 'Your account manager withdrew it. They can issue a new one if it was withdrawn in error.',
  },
  expired: {
    title: 'This invitation has expired',
    body: 'Invitations are time-limited. Ask your account manager to resend it and you will get a fresh link.',
  },
};

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return value;
  }
}

export function AcceptBusinessIntelligenceInvite() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { isAuthenticated, isUserAuthLoading, user } = useAuth();

  const [preview, setPreview] = useState<B2BInvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    // Handled here rather than in the effect so the effect body stays free of
    // synchronous state writes. The route requires a token, so this only fires
    // if someone hand-trims the URL.
    if (!token) {
      setLoadError('This invitation link is incomplete. Use the full link from your email.');
      setLoading(false);
      return;
    }
    try {
      setPreview(await b2bService.previewInvite(token));
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 404
          ? 'This invitation link is not valid. Check you copied the whole link from your email, or ask your account manager to resend it.'
          : err instanceof Error
            ? err.message
            : 'Could not load this invitation.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const claim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      await b2bService.acceptInvite(token);
      setClaimed(true);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Could not claim this invitation.');
      // The state may have moved on since the page loaded (revoked, or claimed
      // in another tab), so re-read it rather than leaving stale copy on screen.
      void loadPreview();
    } finally {
      setClaiming(false);
    }
  };

  // Sign-in and sign-up carry the current location so the user lands back here
  // afterwards, rather than on the dashboard with the invite abandoned.
  const authState = { from: { pathname: location.pathname, search: location.search } };

  const productLabel = preview ? (PRODUCT_LABELS[preview.product_type] ?? preview.product_type) : '';
  const emailMatches =
    !!preview && !!user?.email && preview.email.toLowerCase() === user.email.toLowerCase();

  const panelSx = {
    p: { xs: 3, sm: 5 },
    border: `1px solid ${t.border}`,
    borderRadius: 3,
  } as const;

  if (loading || isUserAuthLoading) {
    return (
      <AuthLayout>
        <Paper elevation={0} sx={{ ...panelSx, textAlign: 'center' }}>
          <CircularProgress sx={{ color: t.gold, mb: 2 }} />
          <Typography sx={{ color: t.textSecondary }}>Checking your invitation…</Typography>
        </Paper>
      </AuthLayout>
    );
  }

  if (loadError) {
    return (
      <AuthLayout>
        <Paper elevation={0} sx={{ ...panelSx, textAlign: 'center' }}>
          <ErrorOutline sx={{ fontSize: 48, color: t.error, mb: 2 }} />
          <Typography variant="h5" sx={{ color: t.textPrimary, fontWeight: 700, mb: 1.5 }}>
            We couldn&apos;t open this invitation
          </Typography>
          <Typography sx={{ color: t.textSecondary, mb: 3 }}>{loadError}</Typography>
          <Button variant="outlined" onClick={() => navigate('/contact')}>
            Contact us
          </Button>
        </Paper>
      </AuthLayout>
    );
  }

  if (claimed) {
    return (
      <AuthLayout>
        <Paper elevation={0} sx={{ ...panelSx, textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 56, color: t.success, mb: 2 }} />
          <Typography variant="h4" sx={{ color: t.gold, fontWeight: 700, mb: 1.5 }}>
            Your subscription is active
          </Typography>
          <Typography sx={{ color: t.textSecondary, mb: 3 }}>
            {productLabel} is now linked to your account. Your first report is delivered on the agreed schedule, and
            you can request one for a specific period at any time from the Business Intelligence console.
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<Insights />}
            onClick={() => navigate('/dashboard/business-intelligence')}
          >
            Open Business Intelligence
          </Button>
        </Paper>
      </AuthLayout>
    );
  }

  if (preview && !preview.claimable) {
    const copy = UNCLAIMABLE_COPY[preview.status as Exclude<B2BInviteStatus, 'pending'>]
      ?? UNCLAIMABLE_COPY.expired;
    return (
      <AuthLayout>
        <Paper elevation={0} sx={{ ...panelSx, textAlign: 'center' }}>
          <ScheduleSend sx={{ fontSize: 48, color: t.warning, mb: 2 }} />
          <Typography variant="h5" sx={{ color: t.textPrimary, fontWeight: 700, mb: 1.5 }}>
            {copy.title}
          </Typography>
          <Typography sx={{ color: t.textSecondary, mb: 3 }}>{copy.body}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
            {preview.status === 'accepted' && (
              <Button variant="contained" onClick={() => navigate('/dashboard/business-intelligence')}>
                Open Business Intelligence
              </Button>
            )}
            <Button variant="outlined" onClick={() => navigate('/contact')}>
              Contact your account manager
            </Button>
          </Stack>
        </Paper>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Paper elevation={0} sx={panelSx}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              bgcolor: t.goldDim,
              border: `2px solid ${t.gold}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
            }}
          >
            <Insights sx={{ fontSize: 36, color: t.gold }} />
          </Box>
          <Typography variant="h4" sx={{ color: t.gold, fontWeight: 700, mb: 1 }}>
            Claim your subscription
          </Typography>
          <Typography sx={{ color: t.textSecondary }}>
            {preview?.company_name
              ? `${preview.company_name} has a Business Intelligence subscription ready to activate.`
              : 'Your Business Intelligence subscription is ready to activate.'}
          </Typography>
        </Box>

        <Box sx={{ bgcolor: t.cardBgAlt, border: `1px solid ${t.borderSoft}`, borderRadius: 2, p: 2.5, mb: 3 }}>
          <Stack spacing={1.25}>
            {([
              ['Product', productLabel],
              ['Delivery', preview?.delivery_frequency
                ? `${preview.delivery_frequency.charAt(0).toUpperCase()}${preview.delivery_frequency.slice(1)}`
                : null],
              ['Invited address', preview?.email ?? null],
              ['Claim by', formatDate(preview?.expires_at ?? null)],
            ] as const).map(([label, value]) => value ? (
              <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2" sx={{ color: t.textFaint }}>{label}</Typography>
                <Typography variant="body2" sx={{ color: t.textPrimary, fontWeight: 600, textAlign: 'right' }}>
                  {value}
                </Typography>
              </Stack>
            ) : null)}
          </Stack>
        </Box>

        {claimError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {claimError}
          </Alert>
        )}

        {!isAuthenticated ? (
          <>
            <Alert severity="info" icon={<MailOutline />} sx={{ mb: 3, textAlign: 'left' }}>
              Sign in with <strong>{preview?.email}</strong> to claim this. The invitation is tied to that address, so
              signing in with a different one will not claim it. If you do not have an account yet, create one using
              that address.
            </Alert>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Login />}
                onClick={() => navigate('/login', { state: authState })}
              >
                Sign in to claim
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => navigate('/signup', { state: authState })}
              >
                Create an account
              </Button>
            </Stack>
          </>
        ) : (
          <>
            {!emailMatches && (
              // Caught before the request so the user is not bounced by a 403
              // they cannot act on from an error toast.
              <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                You are signed in as <strong>{user?.email}</strong>, but this invitation was issued to{' '}
                <strong>{preview?.email}</strong>. Sign in with the invited address to claim it, or ask your account
                manager to reissue it to the address you use.
              </Alert>
            )}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={claiming || !emailMatches}
              startIcon={claiming ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <CheckCircle />}
              onClick={() => void claim()}
            >
              {claiming ? 'Activating…' : 'Claim subscription'}
            </Button>
            {!emailMatches && (
              <Button
                fullWidth
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => navigate('/login', { state: authState })}
              >
                Sign in as {preview?.email}
              </Button>
            )}
          </>
        )}

        <Divider sx={{ my: 3, borderColor: t.borderSoft }} />
        <Typography variant="caption" sx={{ color: t.textFaint, display: 'block', textAlign: 'center', lineHeight: 1.7 }}>
          This link is personal to you and can only be used once. Claiming it activates the contracted subscription on
          the terms above — it does not add a charge to your account.
        </Typography>
      </Paper>
    </AuthLayout>
  );
}
