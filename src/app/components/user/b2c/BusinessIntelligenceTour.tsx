import { useCallback, useEffect, useState } from 'react';
import Joyride, { ACTIONS, STATUS, type CallBackProps, type Step } from 'react-joyride';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { buildTourStyles, tourLocale, usePrefersReducedMotion } from './tourStyles';

/**
 * First-run walkthrough of the Business Intelligence console.
 *
 * Deliberately narrower than the dashboard tour: it only runs for a client who
 * actually holds a subscription, and only the first time they open the console.
 * Someone browsing without a subscription sees the empty state, which already
 * explains the product, so a tour there would be selling rather than helping.
 */
const BI_TOUR_SEEN_KEY = 'pc_bi_tour_seen';

const BI_STEPS: Step[] = [
  {
    target: 'body',
    placement: 'center',
    disableBeacon: true,
    title: 'Your Business Intelligence console',
    content: 'A quick look at where everything lives. Under a minute, and you can skip whenever you like.',
  },
  {
    target: '[data-tour="bi-summary"]',
    title: 'Your subscription at a glance',
    content: 'Who the reports are prepared for, how you are billed, how often they arrive, and the date of the next one.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="bi-recipients"]',
    title: 'Who receives the reports',
    content: 'Add or remove the additional address here. Every PDF is watermarked with the address it was sent to, so each copy is traceable back to its recipient.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="bi-request"]',
    title: 'Need a period out of cycle',
    content: 'Request an ad-hoc report for any custom period within your entitlement. Whole calendar months are produced fastest.',
    disableBeacon: true,
  },
  {
    target: '[data-tour="bi-history"]',
    title: 'Every delivery, kept',
    content: 'Past reports stay here to download at any time. New ones appear automatically each period, and we email you when they land.',
    disableBeacon: true,
    placement: 'top',
  },
];

function markSeen() {
  try { localStorage.setItem(BI_TOUR_SEEN_KEY, '1'); } catch { /* storage unavailable, ignore */ }
}
function hasSeen(): boolean {
  try { return !!localStorage.getItem(BI_TOUR_SEEN_KEY); } catch { return true; }
}

interface Props {
  /** True once the console has loaded AND the viewer holds a subscription. */
  enabled: boolean;
}

export function BusinessIntelligenceTour({ enabled }: Props) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const reducedMotion = usePrefersReducedMotion();

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const start = useCallback(() => {
    // Drop any step whose anchor is absent, so the tour can never stall on a
    // section that did not render for this particular subscription.
    const live = BI_STEPS.filter(
      (s) => s.target === 'body' || document.querySelector(s.target as string),
    );
    setSteps(live);
    setRun(true);
  }, []);

  // First visit only, and only once the subscription data has arrived so the
  // anchors actually exist.
  useEffect(() => {
    if (!enabled || hasSeen()) return;
    const id = setTimeout(start, 600);
    return () => clearTimeout(id);
  }, [enabled, start]);

  // The header "?" button re-runs it on demand, subscription or not.
  useEffect(() => {
    const onStart = () => start();
    window.addEventListener('pc:start-bi-tour', onStart);
    return () => window.removeEventListener('pc:start-bi-tour', onStart);
  }, [start]);

  const handleCallback = useCallback((data: CallBackProps) => {
    // With `continuous`, Joyride reports the close button as a plain step
    // advance unless the host stops the tour, so X would behave as Next.
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
      locale={{ ...tourLocale, last: 'Done' }}
      floaterProps={reducedMotion ? { disableAnimation: true } : undefined}
      styles={buildTourStyles(t, mode)}
    />
  );
}
