import { useCallback, useEffect, useState } from 'react';
import Joyride, { ACTIONS, STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { buildTourStyles, tourLocale, usePrefersReducedMotion } from './tourStyles';
import { hasSeenTour, markTourSeen } from './tourStorage';

// Shown once, the first time a user reaches the New Analysis flow. It picks up
// naturally after the dashboard tour (which drops them here), so it walks the
// upload step rather than repeating the whole dashboard.
const WIZARD_TOUR_SEEN_KEY = 'pc_wizard_tour_seen';
// The closing nudge is tracked separately: it can only fire once the user has
// actually reached the review step, which may be minutes after the intro.
const WIZARD_FINISH_SEEN_KEY = 'pc_wizard_finish_seen';

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
    content: 'Fill in each step, then use Continue. We will meet you again at the last step to finish the job.',
    disableBeacon: true,
    placement: 'left',
  },
];

// Fires when the user reaches the review step, which is the first moment the
// Generate button exists in the DOM. Without this the tour ended at "Continue"
// and never actually walked anyone to producing a report.
const WIZARD_FINISH_STEPS: Step[] = [
  {
    target: '[data-tour="wizard-generate"]',
    title: 'Last step: generate your report',
    content: 'Everything we need is in. Press Generate report and we will analyse the script and build your production intelligence. It takes a few minutes, and we will email you when it is ready.',
    disableBeacon: true,
    placement: 'left',
  },
];

export function WizardTour() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const reducedMotion = usePrefersReducedMotion();
  const { user } = useAuth();
  const userId = user?.email;

  // Scoped per account — see tourStorage.ts.
  const markSeen = useCallback(
    (key: string = WIZARD_TOUR_SEEN_KEY) => markTourSeen(key, userId),
    [userId],
  );
  const hasSeen = useCallback(
    (key: string = WIZARD_TOUR_SEEN_KEY) => hasSeenTour(key, userId),
    [userId],
  );

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  // Which stage is on screen, so the callback marks the right key as seen.
  const [stage, setStage] = useState<'intro' | 'finish'>('intro');

  const start = useCallback(() => {
    const live = WIZARD_STEPS.filter(
      (s) => s.target === 'body' || document.querySelector(s.target as string),
    );
    setStage('intro');
    setSteps(live);
    setRun(true);
  }, []);

  const startFinish = useCallback(() => {
    if (!document.querySelector('[data-tour="wizard-generate"]')) return;
    setStage('finish');
    setSteps(WIZARD_FINISH_STEPS);
    setRun(true);
  }, []);

  // Auto-run once on the first visit, after the wizard has painted its anchors.
  useEffect(() => {
    if (hasSeen()) return;
    const id = setTimeout(start, 650);
    return () => clearTimeout(id);
  }, [start, hasSeen]);

  // Let the header "?" button re-launch it here too.
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener('pc:start-wizard-tour', onStart);
    return () => window.removeEventListener('pc:start-wizard-tour', onStart);
  }, [start]);

  // The wizard tells us when the review step renders. Wait a beat so the
  // Generate button has painted before Joyride measures it.
  useEffect(() => {
    const onFinalStep = () => {
      if (hasSeen(WIZARD_FINISH_SEEN_KEY)) return;
      setTimeout(startFinish, 500);
    };
    window.addEventListener('pc:wizard-final-step', onFinalStep);
    return () => window.removeEventListener('pc:wizard-final-step', onFinalStep);
  }, [startFinish, hasSeen]);

  const handleCallback = useCallback((data: CallBackProps) => {
    // `continuous` makes Joyride treat the close button as an advance unless we
    // stop the tour here, so the X would otherwise behave as Next.
    const done: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (data.action === ACTIONS.CLOSE || done.includes(data.status)) {
      setRun(false);
      markSeen(stage === 'finish' ? WIZARD_FINISH_SEEN_KEY : WIZARD_TOUR_SEEN_KEY);
    }
  }, [stage, markSeen]);

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
      locale={{ ...tourLocale, last: stage === 'finish' ? 'Generate my report' : 'Got it' }}
      floaterProps={reducedMotion ? { disableAnimation: true } : undefined}
      styles={buildTourStyles(t, mode)}
    />
  );
}
