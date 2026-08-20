import { describe, it, expect } from 'vitest';
import {
  EXPLORER_SECTIONS,
  LOCKED_FOR_EXPLORER,
  isExplorerSectionLocked,
  type GatedSection,
} from '../explorerSections';

/**
 * Explorer (free) reports carry 8 of the 13 sections. Before this, one
 * `isPreview` flag gated every section at once, so the tier read as a locked
 * contents page rather than a preview.
 */
describe('explorer section gating', () => {
  // ── The paid five ────────────────────────────────────────────────────────

  it.each<GatedSection>([
    'scriptIntelligence',
    'territoryAnalysis',
    'financialAnalysis',
    'taxIncentives',
    'festivals',
  ])('locks %s for an Explorer viewer', (section) => {
    expect(isExplorerSectionLocked(section, true)).toBe(true);
  });

  it('locks nothing for a paid viewer', () => {
    for (const section of LOCKED_FOR_EXPLORER) {
      expect(isExplorerSectionLocked(section, false)).toBe(false);
    }
  });

  // ── The open eight ───────────────────────────────────────────────────────

  it('does not lock any Explorer section', () => {
    for (const section of EXPLORER_SECTIONS) {
      // Cast: these are deliberately outside GatedSection, and the guard must
      // still answer "not locked" if one is ever passed by mistake.
      expect(isExplorerSectionLocked(section as unknown as GatedSection, true)).toBe(false);
    }
  });

  it.each([
    'comparables',
    'weatherLogistics',
    'fundingOpportunities',
    'distributorRecommendations',
    'financialReadiness',
    'nextSteps',
  ])('%s is readable by Explorer (it used to be removed)', (section) => {
    expect(isExplorerSectionLocked(section as unknown as GatedSection, true)).toBe(false);
    expect(EXPLORER_SECTIONS).toContain(section as never);
  });

  // ── The two lists must not overlap ───────────────────────────────────────

  it('never lists a section as both open and locked', () => {
    const locked = new Set<string>(LOCKED_FOR_EXPLORER);
    const overlap = EXPLORER_SECTIONS.filter((s) => locked.has(s));
    expect(overlap).toEqual([]);
  });

  it('accounts for all 13 report sections across the two lists', () => {
    expect(EXPLORER_SECTIONS.length + LOCKED_FOR_EXPLORER.length).toBe(13);
  });

  // ── Festivals vs distributors, which used to share a gate ────────────────

  it('locks festivals while leaving distributors open', () => {
    expect(isExplorerSectionLocked('festivals', true)).toBe(true);
    expect(
      isExplorerSectionLocked('distributorRecommendations' as unknown as GatedSection, true),
    ).toBe(false);
  });
});
