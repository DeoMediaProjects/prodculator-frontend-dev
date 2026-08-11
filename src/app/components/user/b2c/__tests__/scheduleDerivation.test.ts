import { describe, it, expect } from 'vitest';
import { deriveSchedule, type ScheduleInput } from '../scheduleDerivation';

/**
 * The reported bug: with a filming start and an expected completion both set, the
 * Filming Duration field could not be cleared. Deleting the only digit re-derived the
 * value from the two dates on the same keystroke, so the digit reappeared instantly
 * and the number could never be changed.
 */

const base: ScheduleInput = {
  filmingStart: '2026-08-13',
  filmingDuration: '',
  completionDate: '',
  driver: null,
  autoCompletion: '',
  autoDuration: '',
};

const input = (over: Partial<ScheduleInput>): ScheduleInput => ({ ...base, ...over });

describe('the field being edited is never written to', () => {
  it('leaves an emptied duration empty while it is the field being edited', () => {
    // The exact failing case: start and completion set, user deletes the last digit.
    const out = deriveSchedule(input({
      filmingDuration: '',
      completionDate: '2026-09-10',
      driver: 'duration',
      autoDuration: '4',
    }));
    expect(out.filmingDuration).toBeUndefined();
  });

  it('refilled it before the fix, which is what made the field unusable', () => {
    // Same state, but with nothing marked as being edited: this is the old
    // behaviour, kept as a test so the regression is visible rather than implied.
    const out = deriveSchedule(input({
      filmingDuration: '',
      completionDate: '2026-09-10',
      driver: null,
      autoDuration: '4',
    }));
    expect(out.filmingDuration).toBe('4');
  });

  it('leaves a cleared completion date alone while it is being edited', () => {
    const out = deriveSchedule(input({
      filmingDuration: '4',
      completionDate: '',
      driver: 'completion',
    }));
    expect(out.completionDate).toBeUndefined();
  });

  it('lets a partially typed duration stand without being corrected', () => {
    // Typing "1" on the way to "12" must not be overwritten mid-keystroke.
    const out = deriveSchedule(input({
      filmingDuration: '1',
      completionDate: '2026-09-10',
      driver: 'duration',
      autoDuration: '4',
    }));
    expect(out.filmingDuration).toBeUndefined();
  });
});

describe('the convenience still works', () => {
  it('derives completion from start and duration', () => {
    const out = deriveSchedule(input({ filmingDuration: '4', driver: 'duration' }));
    expect(out.completionDate).toBe('2026-09-10');
  });

  it('derives duration from start and completion', () => {
    const out = deriveSchedule(input({ completionDate: '2026-09-10', driver: 'completion' }));
    expect(out.filmingDuration).toBe('4');
  });

  it('derives duration on first load with neither field being edited', () => {
    const out = deriveSchedule(input({ completionDate: '2026-09-10', driver: null }));
    expect(out.filmingDuration).toBe('4');
  });

  it('recomputes from a moved start date, which is not an edit of either field', () => {
    const out = deriveSchedule(input({
      filmingStart: '2026-08-13',
      filmingDuration: '4',
      completionDate: '2026-09-10',
      driver: null,
      autoCompletion: '2026-09-10',
    }));
    // Nothing to change here; the pairing is already consistent.
    expect(out.completionDate).toBeUndefined();
    expect(out.autoCompletion).toBe('2026-09-10');
  });
});

describe('a value the producer set by hand is theirs', () => {
  it('does not overwrite a completion date they chose themselves', () => {
    const out = deriveSchedule(input({
      filmingDuration: '4',
      completionDate: '2026-12-25',   // deliberately not what 4 weeks implies
      driver: 'duration',
      autoCompletion: '',             // never auto-filled, so it is the user's
    }));
    expect(out.completionDate).toBeUndefined();
  });

  it('does not overwrite a duration they typed themselves', () => {
    const out = deriveSchedule(input({
      filmingDuration: '9',
      completionDate: '2026-09-10',
      driver: null,
      autoDuration: '',
    }));
    expect(out.filmingDuration).toBeUndefined();
  });

  it('does replace a value it produced itself', () => {
    const out = deriveSchedule(input({
      filmingDuration: '4',
      completionDate: '2026-09-10',
      driver: 'completion',
      autoDuration: '4',
    }));
    expect(out.filmingDuration).toBeUndefined(); // already correct, nothing to write
    expect(out.autoDuration).toBe('4');
  });
});

describe('nonsense input changes nothing', () => {
  it.each(['', 'not-a-date'])('ignores an unusable start date (%s)', (filmingStart) => {
    expect(deriveSchedule(input({ filmingStart, filmingDuration: '4' }))).toEqual({});
  });

  it('ignores an unusable completion date', () => {
    expect(deriveSchedule(input({ completionDate: 'not-a-date', driver: null }))).toEqual({});
  });

  it('ignores a completion date before the start', () => {
    expect(deriveSchedule(input({ completionDate: '2026-01-01', driver: null }))).toEqual({});
  });

  it.each(['0', '-3', 'abc'])('ignores a non-positive or non-numeric duration (%s)', (d) => {
    expect(deriveSchedule(input({ filmingDuration: d, driver: 'duration' })).completionDate)
      .toBeUndefined();
  });
});
