import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import dialogLogo from '@/assets/prodculator-logo-white.png';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface AuthRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onLogIn: () => void;
  /** Plan the user was trying to subscribe to, e.g. "Producer". */
  planLabel?: string;
  /** Formatted price line, e.g. "£119 / month". Shown for reassurance. */
  priceLabel?: string;
}

/**
 * Shown when a signed-out visitor tries to start a subscription.
 *
 * Replaces a `window.prompt('Please enter your email address:')` that could
 * never have worked: /api/payments/subscription-checkout requires an
 * authenticated user, so the request 401'd no matter what was typed — and the
 * collected email was discarded by createSubscriptionCheckout anyway.
 *
 * A subscription needs an account to attach to, so the honest ask is "create an
 * account", not "give us an email".
 */
export function AuthRequiredDialog({
  open,
  onClose,
  onSignUp,
  onLogIn,
  planLabel,
  priceLabel,
}: AuthRequiredDialogProps) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const isDark = mode === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="auth-required-title"
      PaperProps={{
        sx: {
          bgcolor: isDark ? '#1a1a1a' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(212,175,55,0.28)' : 'rgba(212,175,55,0.45)'}`,
          borderRadius: 2,
          minWidth: { xs: '90vw', sm: 440 },
          maxWidth: 480,
          overflow: 'hidden',
        },
      }}
    >
      {/* Brand band — the reason this exists rather than a native prompt: the
          visitor is about to be asked for money and should see who is asking. */}
      <Box
        sx={{
          px: 3,
          py: 2.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${isDark ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.35)'}`,
          background: isDark
            ? 'linear-gradient(180deg, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0) 100%)'
            : 'linear-gradient(180deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0) 100%)',
        }}
      >
        <Box
          component="img"
          src={dialogLogo}
          alt="Prodculator"
          sx={{ height: 22, width: 'auto', filter: isDark ? 'none' : 'invert(1)' }}
        />
      </Box>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.5 }}>
          <LockOutlined sx={{ fontSize: 20, color: t.gold, mt: '2px' }} />
          <Typography
            id="auth-required-title"
            sx={{ fontSize: 19, fontWeight: 800, color: t.textPrimary, lineHeight: 1.3 }}
          >
            Create an account to continue
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 14, color: t.textSecondary, lineHeight: 1.7 }}>
          {planLabel
            ? <>Your <strong style={{ color: t.textPrimary }}>{planLabel}</strong> subscription needs an account to attach to, so your reports and billing stay in one place.</>
            : <>A subscription needs an account to attach to, so your reports and billing stay in one place.</>}
        </Typography>

        {priceLabel && (
          <Box
            sx={{
              mt: 2.25,
              px: 1.75,
              py: 1.25,
              borderRadius: 1,
              bgcolor: isDark ? 'rgba(212,175,55,0.08)' : 'rgba(212,175,55,0.12)',
              border: `1px solid ${isDark ? 'rgba(212,175,55,0.18)' : 'rgba(212,175,55,0.3)'}`,
            }}
          >
            <Typography sx={{ fontSize: 12, color: t.textSecondary, letterSpacing: '0.08em', fontWeight: 700 }}>
              {planLabel?.toUpperCase() ?? 'SELECTED PLAN'}
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, color: t.textPrimary, mt: 0.25 }}>
              {priceLabel}
            </Typography>
          </Box>
        )}

        <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 2, lineHeight: 1.6 }}>
          You won't be charged until you confirm payment on the next step.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} sx={{ color: t.textSecondary, fontWeight: 700 }}>
          Cancel
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onLogIn}
          variant="outlined"
          sx={{
            fontWeight: 700,
            color: t.textPrimary,
            borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)',
            '&:hover': { borderColor: t.gold },
          }}
        >
          I have an account
        </Button>
        <Button
          onClick={onSignUp}
          variant="contained"
          sx={{
            fontWeight: 800,
            bgcolor: t.gold,
            color: '#000',
            '&:hover': { bgcolor: t.gold, filter: 'brightness(1.08)' },
          }}
        >
          Sign Up
        </Button>
      </DialogActions>
    </Dialog>
  );
}
