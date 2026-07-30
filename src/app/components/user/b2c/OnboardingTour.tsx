import { forwardRef, useCallback, useEffect, useMemo, useState, type ReactElement, type Ref } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Joyride, { ACTIONS, STATUS, type CallBackProps, type Step } from 'react-joyride';
import { Box, Button, Dialog, Grow, Typography } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import logoMark from '@/assets/prodculator-logo-white.png';
import { buildTourStyles, tourLocale, usePrefersReducedMotion } from './tourStyles';
import { hasSeenTour, markTourSeen } from './tourStorage';

// Marks that the user has been offered / completed the guided tour, so we don't
// prompt on every visit. The header "?" button re-runs it on demand regardless.
const TOUR_SEEN_KEY = 'pc_tutorial_seen';

// Each step targets a [data-tour="…"] anchor placed on the real UI. Steps whose
// target isn't in the DOM (e.g. sidebar items while the mobile drawer is closed)
// are filtered out at start time so the tour never stalls on a missing element.
const TOUR_STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome aboard',
    content: 'A 60-second walk through the essentials, so you know exactly where everything lives. Skip whenever you like.',
  },
  {
    target: '[data-tour="new-analysis"]',
    title: 'Start a new analysis',
    content: 'This is where it begins. Upload a script and we work out where it makes the most financial sense to shoot: incentives, budget, the lot.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="stats"]',
    title: 'Your snapshot',
    content: 'Reports generated, scripts left on your plan, and active projects. A quick read on where you stand.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="plan-usage"]',
    title: 'Plan usage',
    content: 'Your current plan and how many reports remain this period, always in view.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-what-if"]',
    title: 'What If Calculator',
    content: 'No script yet? Compare financial returns across territories at your budget. No upload needed.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '[data-tour="nav-territories"]',
    title: 'Compare territories',
    content: 'Put territories side by side to weigh incentives, crew depth, and logistics.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '[data-tour="nav-timeline"]',
    title: 'Production timeline',
    content: 'Track a project from first analysis all the way to shoot day.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '[data-tour="reports"]',
    title: "Now let's make your first one",
    content: 'Every report you generate lands here. Finish up and we will open a new analysis so you can create yours.',
    disableBeacon: true,
  },
];

const GrowTransition = forwardRef(function GrowTransition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Grow ref={ref} timeout={{ enter: 280, exit: 160 }} {...props} />;
});

export function OnboardingTour() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  const firstName = useMemo(() => (user?.name || '').trim().split(/\s+/)[0] || '', [user]);
  // Scoped per account — see tourStorage.ts. A shared browser must still offer
  // the tour to each user who signs in, not just the first one.
  const userId = user?.email;
  const markSeen = useCallback(() => markTourSeen(TOUR_SEEN_KEY, userId), [userId]);

  const startTour = useCallback(() => {
    const begin = () => {
      const live = TOUR_STEPS.filter(
        (s) => s.target === 'body' || document.querySelector(s.target as string),
      );
      setSteps(live);
      setShowPrompt(false);
      setRun(true);
    };
    // The tour highlights dashboard-home elements, so make sure we're there
    // (the "?" button can be pressed from any dashboard page).
    if (location.pathname !== '/dashboard') {
      navigate('/dashboard');
      setTimeout(begin, 350);
    } else {
      setShowPrompt(false);
      setTimeout(begin, 50);
    }
  }, [navigate, location.pathname]);

  const dismissPrompt = useCallback(() => {
    markSeen();
    setShowPrompt(false);
  }, [markSeen]);

  // Offer the tour on this account's first dashboard visit. Keyed on userId so
  // it re-evaluates once auth resolves — before that we don't know whose flag
  // to read, and hasSeenTour deliberately reports "seen" to avoid a flash.
  useEffect(() => {
    if (!hasSeenTour(TOUR_SEEN_KEY, userId)) {
      const id = setTimeout(() => setShowPrompt(true), 550);
      return () => clearTimeout(id);
    }
  }, [userId]);

  // Let anything (e.g. the header "?" button) re-launch the tour on demand.
  useEffect(() => {
    const onStart = () => startTour();
    window.addEventListener('pc:start-tour', onStart);
    return () => window.removeEventListener('pc:start-tour', onStart);
  }, [startTour]);

  const handleCallback = useCallback((data: CallBackProps) => {
    // With `continuous`, Joyride reports the close button as a plain
    // "step:after" and advances to the next step unless the host stops the tour
    // itself. Without this, the X behaves as Next.
    if (data.action === ACTIONS.CLOSE) {
      setRun(false);
      markSeen();
      return;
    }
    if (data.status === STATUS.FINISHED) {
      // Completing the tour flows straight into creating the first report.
      setRun(false);
      markSeen();
      navigate('/analysis/new');
    } else if (data.status === STATUS.SKIPPED) {
      setRun(false);
      markSeen();
    }
  }, [navigate, markSeen]);

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        continuous
        showSkipButton
        showProgress
        scrollToFirstStep
        disableScrollParentFix
        disableOverlayClose
        spotlightPadding={6}
        callback={handleCallback}
        locale={{ ...tourLocale, last: 'Upload my first script' }}
        floaterProps={reducedMotion ? { disableAnimation: true } : undefined}
        styles={buildTourStyles(t, mode)}
      />

      <Dialog
        open={showPrompt}
        disableEscapeKeyDown
        TransitionComponent={reducedMotion ? undefined : GrowTransition}
        slotProps={{
          paper: { sx: { bgcolor: t.cardBg, borderRadius: '20px', border: `1px solid ${t.border}`, maxWidth: 428, overflow: 'hidden' } },
          backdrop: { sx: { backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.72)' : 'rgba(20,18,12,0.5)', backdropFilter: 'blur(2px)' } },
        }}
      >
        {/* Branded moment: logo on a soft gold glow. Static glow (no decorative
            pulse); the entrance itself carries the motion. */}
        <Box sx={{ position: 'relative', pt: 4.5, pb: 1, textAlign: 'center' }}>
          <Box
            aria-hidden
            sx={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(120px 90px at 50% 42%, ${t.goldDim}, transparent 72%)`,
              pointerEvents: 'none',
            }}
          />
          <Box
            component="img"
            src={logoMark}
            alt="Prodculator"
            sx={{ position: 'relative', height: 30, width: 'auto', filter: mode === 'light' ? 'invert(1)' : 'none' }}
          />
        </Box>

        <Box sx={{ px: 3.5, pb: 3.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 21, fontWeight: 800, color: t.textPrimary, mt: 1.5, mb: 1 }}>
            {firstName ? `Welcome, ${firstName}` : 'Welcome to Prodculator'}
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: 14.5, lineHeight: 1.65, mb: 3, mx: 'auto', maxWidth: 340 }}>
            Take a quick guided tour to see how a script becomes location, incentive,
            and budget intelligence. Prefer to look around first? You can start the
            tour anytime from the <strong>?</strong> button up top.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Button variant="contained" onClick={startTour} sx={{ fontWeight: 700, py: 1.1 }}>
              Take the tour
            </Button>
            <Button variant="text" onClick={dismissPrompt} sx={{ color: t.textSecondary, fontWeight: 600 }}>
              Explore on my own
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
