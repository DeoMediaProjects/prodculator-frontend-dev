import { useState, useEffect } from 'react';
import { getTerritories } from '@/services/api';
import type { Territory } from '@/services/admin.types';

interface UseTerritories {
  territories: Territory[];
  countries: Territory[];
  loading: boolean;
  error: string | null;
}

/**
 * @param includeAll also return territories with no active incentive, flagged
 *   via `hasActiveIncentive: false`. Use for intake pickers, which ask where a
 *   production is being considered. Leave false for rebate rankings.
 */
export function useTerritories(includeAll = false): UseTerritories {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getTerritories(includeAll)
      .then((data) => {
        if (!cancelled) setTerritories(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load territories';
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [includeAll]);

  const countries = territories.filter((t) => !t.isSubTerritory);

  return { territories, countries, loading, error };
}
