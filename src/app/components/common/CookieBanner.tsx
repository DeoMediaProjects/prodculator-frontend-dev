import { useEffect, useState } from 'react';
import { Box, Button, Typography, Switch, Collapse } from '@mui/material';
import { useNavigate } from 'react-router';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useCookieConsent } from '@/app/cookies/CookieConsentProvider';

/**
 * First-visit consent for anything stored on the visitor's device beyond what the
 * Platform cannot run without.
 *
 * Two rules shape this component and are worth stating so they survive edits:
 *
 * 1. Refusing is exactly as easy as accepting. Same size, same weight, same row, no
 *    colour trick that makes one read as the default. A "Reject" hidden a click
 *    deeper inside "Manage preferences" is the pattern regulators single out, and it
 *    is also just dishonest.
 * 2. Nothing is pre-selected. The functional switch starts off, and stays off until
 *    the visitor moves it. Consent that was already given on the visitor's behalf is
 *    not consent.
 *
 * It offers no analytics or advertising toggle because the Platform has neither. A
 * switch that governs nothing is worse than no switch: it teaches people the
 * controls are decorative.
 */
export function CookieBanner() {
  const { decided, choosing, accept, reject, set, consent } = useCookieConsent();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [functional, setFunctional] = useState(false);

  const open = !decided || choosing;

  // Reopened from the footer, the switch reflects the standing choice rather than
  // resetting to off: this is a review of an existing decision, not a fresh one.
  useEffect(() => {
    if (choosing) {
      setFunctional(consent?.functional ?? false);
      setExpanded(true);
    }
  }, [choosing, consent]);

  if (!open) return null;

  const primaryButtonSx = {
    flex: 1,
    py: 1.15,
    fontWeight: 700,
    fontSize: 14,
    textTransform: 'none' as const,
    borderRadius: '10px',
  };

  return (
    <Box
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      sx={{
        position: 'fixed',
        left: { xs: 12, sm: 20 },
        right: { xs: 12, sm: 20 },
        bottom: { xs: 12, sm: 20 },
        zIndex: 2000,
        maxWidth: 560,
        mx: { xs: 0, sm: 'auto' },
        ml: { sm: 'auto' },
        bgcolor: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 3,
        boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
        p: { xs: 2.5, sm: 3 },
      }}
    >
      <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 16, mb: 1 }}>
        Cookies on Prodculator
      </Typography>

      <Typography sx={{ color: t.textSecondary, fontSize: 13.5, lineHeight: 1.65, mb: 2 }}>
        We use a small number of cookies to sign you in and keep the Platform secure.
        Those are required and cannot be turned off. Separately, we can remember
        preferences such as your theme and whether you have seen a walkthrough. That
        part is your choice.
        {' '}
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/cookies')}
          sx={{
            background: 'none', border: 0, p: 0, font: 'inherit', cursor: 'pointer',
            color: t.gold, fontWeight: 600, textDecoration: 'underline',
          }}
        >
          Read our cookie policy
        </Box>
        .
      </Typography>

      <Typography sx={{ color: t.textFaint, fontSize: 12.5, lineHeight: 1.6, mb: 2 }}>
        We do not use advertising or analytics cookies, and we do not share anything
        stored on your device with third parties for tracking.
      </Typography>

      <Collapse in={expanded}>
        <Box sx={{ mb: 2, border: `1px solid ${t.border}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${t.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: 13.5 }}>
                Strictly necessary
              </Typography>
              <Typography sx={{ color: t.textFaint, fontSize: 12, fontWeight: 700 }}>
                Always on
              </Typography>
            </Box>
            <Typography sx={{ color: t.textSecondary, fontSize: 12.5, lineHeight: 1.55, mt: 0.5 }}>
              Signs you in, keeps you signed in, and protects forms against
              cross-site request forgery. Without these you cannot use an account.
            </Typography>
          </Box>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: 13.5 }}>
                Preferences
              </Typography>
              <Switch
                checked={functional}
                onChange={(e) => setFunctional(e.target.checked)}
                inputProps={{ 'aria-label': 'Allow preference storage' }}
              />
            </Box>
            <Typography sx={{ color: t.textSecondary, fontSize: 12.5, lineHeight: 1.55, mt: 0.5 }}>
              Remembers your light or dark theme, whether the sidebar is collapsed,
              and which walkthroughs you have already seen. Turning this off means
              those reset each visit; everything else works exactly the same.
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {/* Equal prominence, same row, same styling weight. */}
      <Box sx={{ display: 'flex', gap: 1.25, flexDirection: { xs: 'column', sm: 'row' } }}>
        <Button variant="contained" onClick={accept} sx={primaryButtonSx}>
          Accept all
        </Button>
        <Button
          variant="contained"
          onClick={reject}
          sx={{
            ...primaryButtonSx,
            bgcolor: t.textFaint,
            color: mode === 'dark' ? '#000' : '#fff',
            '&:hover': { bgcolor: t.textSecondary },
          }}
        >
          Reject non-essential
        </Button>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.25 }}>
        {expanded ? (
          <Button
            onClick={() => set(functional)}
            sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, color: t.gold }}
          >
            Save my choices
          </Button>
        ) : (
          <Button
            onClick={() => setExpanded(true)}
            sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, color: t.textSecondary }}
          >
            Manage preferences
          </Button>
        )}
      </Box>
    </Box>
  );
}
