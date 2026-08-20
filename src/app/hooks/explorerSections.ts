/**
 * Which report sections an Explorer (free) account may read.
 *
 * Explorer used to be gated with a single `isPreview` flag applied to every
 * section at once, which is why the tier read as a locked document rather than a
 * preview. It now carries 8 of the 13 sections:
 *
 *   01 Executive Summary            06 Financial Readiness
 *   03 Production Location Strategy 07 Weather & Logistics
 *   09 Grant & Funding              10 Comparable Productions
 *   12 Distributors                 13 Next Steps
 *
 * The five below stay paid and render as locked teasers with an upgrade prompt.
 *
 * The API is the authority: `_build_free_tier_report_data` strips the payload
 * server-side, so a mistake here cannot leak a paid figure — only show an empty
 * section. Keep this list in step with the server's `_EXPLORER_SECTIONS` and the
 * PDF template's lock flags in `report_base.html`.
 */
export const LOCKED_FOR_EXPLORER = [
  'scriptIntelligence',
  'territoryAnalysis',
  'financialAnalysis',
  'taxIncentives',
  'festivals',
] as const;

export type GatedSection = (typeof LOCKED_FOR_EXPLORER)[number];

/** Sections an Explorer account reads in full (money still redacted upstream). */
export const EXPLORER_SECTIONS = [
  'executiveSummary',
  'locationRankings',
  'financialReadiness',
  'weatherLogistics',
  'fundingOpportunities',
  'comparables',
  'distributorRecommendations',
  'nextSteps',
] as const;

/**
 * Whether `section` is withheld from the current viewer.
 *
 * `isPreview` covers both an Explorer account and the unauthenticated preview
 * route. A paid viewer is never gated.
 */
export function isExplorerSectionLocked(
  section: GatedSection,
  isPreview: boolean,
): boolean {
  return isPreview && (LOCKED_FOR_EXPLORER as readonly string[]).includes(section);
}
