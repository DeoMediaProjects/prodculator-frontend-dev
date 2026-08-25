import { describe, expect, it } from 'vitest';
import { mustFilmInOptionsFor, regionOptionsFor } from '../locationOptions';
import type { Territory } from '@/services/admin.types';

/** Shaped from the live /api/territories response, which returns only regions
 *  carrying their own non-supplementary programme. Australia is here on purpose:
 *  it has a national incentive and no state records, so it must yield no
 *  regions. */
const REGISTRY = [
  { label: 'United States', parent: null, isSubTerritory: false, hasOwnIncentive: false },
  { label: 'California', parent: 'United States', isSubTerritory: true },
  { label: 'New York', parent: 'United States', isSubTerritory: true },
  { label: 'Georgia (USA)', parent: 'United States', isSubTerritory: true },
  { label: 'Canada', parent: null, isSubTerritory: false, hasOwnIncentive: true },
  { label: 'Ontario', parent: 'Canada', isSubTerritory: true },
  { label: 'Alberta', parent: 'Canada', isSubTerritory: true },
  { label: 'Australia', parent: null, isSubTerritory: false, hasOwnIncentive: true },
  { label: 'Spain', parent: null, isSubTerritory: false, hasOwnIncentive: true },
  { label: 'Canary Islands', parent: 'Spain', isSubTerritory: true },
] as unknown as Territory[];

describe('regionOptionsFor', () => {
  it('returns only the regions the registry holds a programme for', () => {
    // Texas and Florida were in the old hardcoded list. Neither has a record, so
    // offering them presented an unanalysable state as a modelled regime.
    expect(regionOptionsFor(REGISTRY, 'United States')).toEqual([
      'California', 'Georgia (USA)', 'New York',
    ]);
  });

  it('offers no catch-all Other', () => {
    // "Other" resolved to no jurisdiction at all, so nothing downstream could
    // act on it.
    expect(regionOptionsFor(REGISTRY, 'United States')).not.toContain('Other');
  });

  it('returns nothing for a country whose incentive is national', () => {
    // Which is the signal to hide the field rather than show an empty dropdown.
    expect(regionOptionsFor(REGISTRY, 'Australia')).toEqual([]);
  });

  it('surfaces a region for a country the old hardcoded lists never covered', () => {
    // The Canary Islands carry a materially higher rate than mainland Spain, and
    // there was previously no way to declare it here at all.
    expect(regionOptionsFor(REGISTRY, 'Spain')).toEqual(['Canary Islands']);
  });

  it('returns nothing when no country is chosen yet', () => {
    expect(regionOptionsFor(REGISTRY, '')).toEqual([]);
  });
});

describe('mustFilmInOptionsFor', () => {
  const base = {
    countedTerritories: [] as string[],
    containerCountries: new Set<string>(),
  };

  it('offers the declared state, which is the reported bug', () => {
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'United States',
      stateProvince: 'New York',
      regionOptions: regionOptionsFor(REGISTRY, 'United States'),
    });
    expect(options.map((o) => o.label)).toContain('New York');
  });

  it('offers the state instead of the country containing it', () => {
    // Committing to "the United States" names no programme: there is no federal
    // film incentive to name, so the answer would be unactionable.
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'United States',
      stateProvince: 'New York',
      regionOptions: regionOptionsFor(REGISTRY, 'United States'),
    });
    expect(options.map((o) => o.label)).not.toContain('United States');
  });

  it('labels the state as the production location, not as the country', () => {
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'Canada',
      stateProvince: 'Ontario',
      regionOptions: regionOptionsFor(REGISTRY, 'Canada'),
    });
    expect(options.find((o) => o.label === 'Ontario')?.originHint)
      .toBe('production location');
  });

  it('falls back to the country when no state is declared', () => {
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'Canada',
      stateProvince: '',
      regionOptions: regionOptionsFor(REGISTRY, 'Canada'),
    });
    expect(options.find((o) => o.label === 'Canada')?.originHint)
      .toBe('production country');
  });

  it('ignores a state that is not on the country list', () => {
    // Stale state left over from a previous country. Carrying it through would
    // name a jurisdiction the production is not in.
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'Canada',
      stateProvince: 'New York',
      regionOptions: regionOptionsFor(REGISTRY, 'Canada'),
    });
    expect(options.map((o) => o.label)).toEqual(['Canada']);
  });

  it('does not offer a grouping-only country', () => {
    const options = mustFilmInOptionsFor({
      ...base,
      country: 'United States',
      stateProvince: '',
      regionOptions: regionOptionsFor(REGISTRY, 'United States'),
      containerCountries: new Set(['United States']),
    });
    expect(options).toEqual([]);
  });

  it('keeps the selected territories and does not duplicate one of them', () => {
    const options = mustFilmInOptionsFor({
      countedTerritories: ['New York', 'Ontario'],
      containerCountries: new Set<string>(),
      country: 'United States',
      stateProvince: 'New York',
      regionOptions: regionOptionsFor(REGISTRY, 'United States'),
    });
    expect(options.map((o) => o.label)).toEqual(['New York', 'Ontario']);
  });
});
