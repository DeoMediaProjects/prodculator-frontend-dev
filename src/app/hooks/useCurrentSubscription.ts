import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CurrentSubscriptionResponse,
  getCurrentSubscription,
} from '@/services/subscription.service';

interface UseCurrentSubscriptionResult {
  data: CurrentSubscriptionResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const STALE_MS = 60_000;

/**
 * Fetches /api/subscriptions/current with a 60s stale window and revalidates
 * on tab focus. Used by Pricing.tsx (CTA labels per card) and the Account tab.
 */
export function useCurrentSubscription(enabled: boolean = true): UseCurrentSubscriptionResult {
  const [data, setData] = useState<CurrentSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const inFlight = useRef<Promise<void> | null>(null);

  const fetcher = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    setLoading(true);
    const promise = (async () => {
      try {
        const response = await getCurrentSubscription();
        setData(response);
        setError(null);
        lastFetchedAt.current = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
      } finally {
        setLoading(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void fetcher();
  }, [enabled, fetcher]);

  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => {
      if (Date.now() - lastFetchedAt.current > STALE_MS) {
        void fetcher();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [enabled, fetcher]);

  return { data, loading, error, refetch: fetcher };
}
