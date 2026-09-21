import type { Territory } from '@/services/admin.types';

export interface MustFilmInOption {
  label: string;
  /** Shown beside the label to say where this option came from. */
  originHint?: string;
}

/**
 * The regions a country may declare, taken from the incentive registry.
 *
 * This replaced three hardcoded arrays that named every state a producer might
 * shoot in, plus a catch-all "Other". That offered Texas and Florida as though
 * each were a modelled regime, and in a country whose incentives are legislated
 * at state level, offering a state we cannot analyse is the misleading part.
 *
 * Returns an empty list for a country with no regions on record, which is the
 * signal to hide the field rather than show an empty dropdown.
 */
export function regionOptionsFor(
  territories: Territory[],
  country: string,
): string[] {
  if (!country) return [];
  return territories
    .filter((x) => x.isSubTerritory && x.parent === country)
    .map((x) => x.label)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Countries that exist in the picker only to group their regions.
 *
 * A country whose incentives are legislated by its regions holds no programme
 * of its own — `hasOwnIncentive: false` — so selecting it names nothing the
 * analysis can model. It must stay clickable, because clicking it is how its
 * regions are revealed, but it is a disclosure control rather than a choice:
 * it must not spend a territory slot, must not ask for an expected spend, and
 * must not be offerable as a Must Film In commitment.
 *
 * Both conditions are required. `hasOwnIncentive` is also false for a country
 * the platform knows but holds no programme for at all — Nigeria has no formal
 * rebate — and that country is a real selection: a producer may shoot there
 * for location, crew or currency reasons and the report says so. What separates
 * the United States from Nigeria is that the United States has regions carrying
 * the programmes instead, so the second test is whether the registry holds any
 * region under it.
 *
 * This previously also required that one of those regions was already selected,
 * which could not hold at the moment it mattered: selecting the country is what
 * reveals the regions, so between that click and picking a state the country
 * counted as a territory — took a slot, asked for a spend under "Expected spend
 * per territory", and offered itself as a filming commitment. A producer who
 * never picked a state kept all three.
 */
export function containerCountriesIn(territories: Territory[]): Set<string> {
  const hasRegions = new Set(
    territories
      .filter((x) => x.isSubTerritory && x.parent)
      .map((x) => x.parent as string),
  );
  return new Set(
    territories
      .filter((x) => !x.isSubTerritory
        && x.hasOwnIncentive === false
        && hasRegions.has(x.label))
      .map((x) => x.label),
  );
}

/**
 * What the producer may name as the territory they are committed to.
 *
 * The territories they selected, plus wherever the production itself is based.
 * That last part is the whole point: shooting where the company is based is the
 * most ordinary commitment a production makes, and the only way to declare it
 * used to be to spend a territory slot on it first.
 *
 * A declared region wins over the country containing it. Committing to "the
 * United States" names no programme, because there is no federal film incentive
 * to name, whereas New York names a specific regime with its own rules.
 */
export function mustFilmInOptionsFor(args: {
  countedTerritories: string[];
  country: string;
  stateProvince: string;
  regionOptions: string[];
  /** Countries that exist only to group their regions, so cannot be committed to. */
  containerCountries: Set<string>;
}): MustFilmInOption[] {
  const { countedTerritories, country, stateProvince, regionOptions } = args;
  const options: MustFilmInOption[] = countedTerritories.map((label) => ({ label }));

  const declared = stateProvince && regionOptions.includes(stateProvince)
    ? { label: stateProvince, hint: 'production location' }
    : country && !args.containerCountries.has(country)
      ? { label: country, hint: 'production country' }
      : null;

  if (declared && !options.some((o) => o.label === declared.label)) {
    options.push({ label: declared.label, originHint: declared.hint });
  }
  return options;
}
