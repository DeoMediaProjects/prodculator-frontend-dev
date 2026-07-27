import { useCallback, useEffect, useState } from 'react';
import Joyride, { ACTIONS, STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { buildTourStyles, tourLocale, usePrefersReducedMotion } from './tourStyles';

// Shown once, the first time a user reaches the New Analysis flow. It picks up
// naturally after the dashboard tour (which drops them here), so it walks the
// upload step rather than repeating the whole dashboard.
const WIZARD_TOUR_SEEN_KEY = 'pc_wizard_tour_seen';

const WIZARD_STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: "Let's build your first report",
    content: 'A few quick details and you are done. Here is how this flow works.',
  },
  {
    target: '[data-tour="wizard-steps"]',
    title: 'Four short steps',
    content: 'Script, budget and territories, production details, then review. Your progress shows here, and you can jump back anytime.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="wizard-upload"]',
    title: 'Add your script',
    content: 'Drop a PDF, DOCX, or TXT here, or click to browse. Everything in your report is built from this.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="wizard-continue"]',
    title: 'Move through the steps',
    content: 'Fill in each step, then use Continue. On the final step this becomes Generate report, and we get to work.',
    disableBeacon: true,
    placement: 'left',
  },
];

function markSeen() {
  try { localStorage.setItem(WIZARD_TOUR_SEEN_KEY, '1'); } catch { /* ignore */ }
}
function hasSeen(): boolean {
  try { return !!localStorage.getItem(WIZARD_TOUR_SEEN_KEY); } catch { return true; }
}

export function WizardTour() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const reducedMotion = usePrefersReducedMotion();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const start = useCallback(() => {
    const live = WIZARD_STEPS.filter(
      (s) => s.target === 'body' || document.querySelector(s.target as string),
    );
    setSteps(live);
    setRun(true);
  }, []);

  // Auto-run once on the first visit, after the wizard has painted its anchors.
  useEffect(() => {
    if (hasSeen()) return;
    const id = setTimeout(start, 650);
    return () => clearTimeout(id);
  }, [start]);

  // Let the header "?" button re-launch it here too.
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener('pc:start-wizard-tour', onStart);
    return () => window.removeEventListener('pc:start-wizard-tour', onStart);
  }, [start]);

  const handleCallback = useCallback((data: CallBackProps) => {
    // `continuous` makes Joyride treat the close button as an advance unless we
    // stop the tour here, so the X would otherwise behave as Next.
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (data.action === ACTIONS.CLOSE || done.includes(data.status)) {
      setRun(false);
      markSeen();
    }
  }, []);

  return (
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
      locale={{ ...tourLocale, last: 'Got it' }}
      floaterProps={reducedMotion ? { disableAnimation: true } : undefined}
      styles={buildTourStyles(t, mode)}
    />
  );
}
