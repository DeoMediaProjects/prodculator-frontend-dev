import { useEffect, useMemo, useRef, useState } from 'react';
import { getScenarioQuestions } from '@/services/api';
import type { ScenarioQuestionSet } from '@/services/api';

interface UseScenarioQuestions {
  /** One entry per selected jurisdiction, keyed by scenario key. */
  sets: Record<string, ScenarioQuestionSet>;
  /** Ordered to match the territories argument, so cards keep their order. */
  ordered: ScenarioQuestionSet[];
  loading: boolean;
  error: string | null;
}

const EMPTY: Record<string, ScenarioQuestionSet> = {};

/**
 * Statutory questions for the selected territories.
 *
 * Programme records decide what gets asked, so this hook fetches rather than
 * derives. There is deliberately no local table of "British Columbia needs
 * labour": the specification requires the frontend to be a renderer, and a
 * verified programme adding a question must not need a release.
 *
 * @param territories canonical labels or codes. A label the backend cannot
 *   resolve is an error rather than a skipped card, because a card with no
 *   questions and no reason reads as a bug.
 * @param mode comparison | coproduction | undecided. Changes the limit the
 *   backend applies, so it is part of the request rather than a display concern.
 */
export function useScenarioQuestions(
  territories: string[],
  mode: string,
): UseScenarioQuestions {
  const [sets, setSets] = useState<Record<string, ScenarioQuestionSet>>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorted and joined, so re-ordering the same selection does not refetch.
  const key = useMemo(
    () => [...territories].sort().join(',') + '|' + mode,
    [territories, mode],
  );
  const latest = useRef(key);

  useEffect(() => {
    latest.current = key;
    if (territories.length === 0) {
      setSets(EMPTY);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    // The previous answers stay visible while new ones load. Blanking them would
    // collapse every open accordion mid-entry.

    getScenarioQuestions(territories, mode)
      .then((response) => {
        if (cancelled || latest.current !== key) return;
        const next: Record<string, ScenarioQuestionSet> = {};
        for (const set of response.scenarios) {
          next[set.subdivisionId ?? set.territoryId] = set;
        }
        setSets(next);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled || latest.current !== key) return;
        setError(err instanceof Error ? err.message : 'Could not load questions');
      })
      .finally(() => {
        if (!cancelled && latest.current === key) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // territories is covered by `key`; listing it too would refetch on every
    // render because the array identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const ordered = useMemo(
    () =>
      territories
        .map((t) => sets[t] ?? Object.values(sets).find((s) => s.jurisdiction === t))
        .filter((s): s is ScenarioQuestionSet => Boolean(s)),
    [territories, sets],
  );

  return { sets, ordered, loading, error };
}
