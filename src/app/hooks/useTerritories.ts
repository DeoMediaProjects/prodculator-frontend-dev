import { useState, useEffect } from 'react';
import { getTerritories } from '@/services/api';
import type { Territory } from '@/services/admin.types';

interface UseTerritories {
  territories: Territory[];
  countries: Territory[];
  loading: boolean;
  error: string | null;
}

export function useTerritories(): UseTerritories {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getTerritories()
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
  }, []);

  const countries = territories.filter((t) => !t.isSubTerritory);

  return { territories, countries, loading, error };
}
