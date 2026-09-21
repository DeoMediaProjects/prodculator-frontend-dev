import { describe, expect, it } from 'vitest';
import {
  COMMON_LANGUAGE_LABELS,
  LANGUAGE_OPTIONS,
  MAX_LANGUAGES,
} from '../languages';

/** The catalogue replaced a free-text box. Its whole value is that every entry
 *  is a name the eligibility rules can match, so the invariants worth holding
 *  are about identity and coverage, not about the exact size of the list. */
describe('LANGUAGE_OPTIONS', () => {
  it('holds every ISO 639-1 language', () => {
    // 184 two-letter codes are assigned, less `bh` — a collective code for the
    // Bihari languages rather than a language, deliberately omitted. Any other
    // number means an entry was lost in an edit.
    const spoken = LANGUAGE_OPTIONS.filter((o) => o.group === 'Spoken');
    expect(spoken).toHaveLength(183);
    expect(spoken.map((o) => o.code)).not.toContain('bh');
  });

  it('keeps the spoken list in code order, so a gap is visible', () => {
    const codes = LANGUAGE_OPTIONS.filter((o) => o.group === 'Spoken').map((o) => o.code);
    expect(codes).toEqual([...codes].sort());
  });

  it('gives every entry a unique code', () => {
    const codes = LANGUAGE_OPTIONS.map((o) => o.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every entry a unique label', () => {
    // The label is what is sent and what the rules match on, so a duplicate
    // would make two different languages indistinguishable downstream.
    const labels = LANGUAGE_OPTIONS.map((o) => o.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('uses two-letter codes for spoken and three-letter for sign', () => {
    for (const option of LANGUAGE_OPTIONS) {
      expect(option.code).toMatch(option.group === 'Spoken' ? /^[a-z]{2}$/ : /^[a-z]{3}$/);
    }
  });

  it('carries sign languages as languages in their own right', () => {
    // A production shooting in American Sign Language is not shooting in
    // English. ISO 639-1 has no codes for these at all, which is why they are
    // listed separately rather than left out.
    const labels = LANGUAGE_OPTIONS.map((o) => o.label);
    expect(labels).toContain('American Sign Language');
    expect(labels).toContain('British Sign Language');
    expect(LANGUAGE_OPTIONS.filter((o) => o.group === 'Sign').length).toBeGreaterThan(10);
  });

  it('lists sign languages before the spoken ones', () => {
    // Twenty entries ahead of 184 rather than scattered through them.
    const firstSpoken = LANGUAGE_OPTIONS.findIndex((o) => o.group === 'Spoken');
    const lastSign = LANGUAGE_OPTIONS.map((o) => o.group).lastIndexOf('Sign');
    expect(lastSign).toBeLessThan(firstSpoken);
  });
});

describe('COMMON_LANGUAGE_LABELS', () => {
  it('names only languages that are actually in the catalogue', () => {
    // A shortcut label with no matching option would render a group header
    // above nothing.
    const labels = new Set(LANGUAGE_OPTIONS.map((o) => o.label));
    for (const common of COMMON_LANGUAGE_LABELS) {
      expect(labels.has(common), `${common} is not in the catalogue`).toBe(true);
    }
  });

  it('puts English within reach', () => {
    // It sorts near the middle of 184 entries, which made the commonest answer
    // on the form something you had to search for.
    expect(COMMON_LANGUAGE_LABELS).toContain('English');
  });
});

describe('MAX_LANGUAGES', () => {
  it('keeps the cap the intake has always applied', () => {
    expect(MAX_LANGUAGES).toBe(5);
  });
});
