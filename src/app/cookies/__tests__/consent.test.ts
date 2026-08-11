import { describe, it, expect, beforeEach } from 'vitest';
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  FUNCTIONAL_LOCAL_KEYS,
  FUNCTIONAL_SESSION_KEYS,
  functionalAllowed,
  functionalStorage,
  hasDecided,
  purgeFunctionalStorage,
  readConsent,
  writeConsent,
} from '../consent';

/**
 * The point of these tests is that the banner enforces rather than performs. A
 * consent UI whose refusal still leaves data on the device is worse than no banner:
 * it makes a promise the code does not keep.
 */

function clearCookies() {
  for (const entry of document.cookie.split('; ')) {
    const name = entry.split('=')[0];
    if (name) document.cookie = `${name}=; Max-Age=0; Path=/`;
  }
}

beforeEach(() => {
  clearCookies();
  localStorage.clear();
  sessionStorage.clear();
});

describe('the decision itself', () => {
  it('starts undecided, so the banner shows on a first visit', () => {
    expect(readConsent()).toBeNull();
    expect(hasDecided()).toBe(false);
    expect(functionalAllowed()).toBe(false);
  });

  it('records an acceptance and stops asking', () => {
    writeConsent(true);
    expect(hasDecided()).toBe(true);
    expect(functionalAllowed()).toBe(true);
    expect(document.cookie).toContain(CONSENT_COOKIE);
  });

  it('records a refusal, which is still a decision', () => {
    writeConsent(false);
    expect(hasDecided()).toBe(true);
    expect(functionalAllowed()).toBe(false);
  });

  it('stamps when the choice was made, so it can be shown back to the user', () => {
    const record = writeConsent(true);
    expect(Date.parse(record.decidedAt)).not.toBeNaN();
  });

  it('re-asks when the categories change', () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION - 1, functional: true, decidedAt: '' }),
    )}; Path=/`;
    // A choice about a previous set of categories is not a choice about this one.
    expect(readConsent()).toBeNull();
    expect(functionalAllowed()).toBe(false);
  });

  it('treats an unreadable cookie as no decision rather than as consent', () => {
    document.cookie = `${CONSENT_COOKIE}=not-json; Path=/`;
    expect(readConsent()).toBeNull();
    expect(functionalAllowed()).toBe(false);
  });

  it('treats a cookie missing the flag as no decision', () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      JSON.stringify({ version: CONSENT_VERSION }),
    )}; Path=/`;
    expect(readConsent()).toBeNull();
  });
});

describe('functional storage is refused until permitted', () => {
  it('writes nothing before a decision is made', () => {
    functionalStorage.set('prodculator-theme-mode', 'light');
    expect(localStorage.getItem('prodculator-theme-mode')).toBeNull();
  });

  it('writes nothing after a refusal', () => {
    writeConsent(false);
    functionalStorage.set('prodculator-theme-mode', 'light');
    expect(localStorage.getItem('prodculator-theme-mode')).toBeNull();
  });

  it('writes once permitted', () => {
    writeConsent(true);
    functionalStorage.set('prodculator-theme-mode', 'light');
    expect(localStorage.getItem('prodculator-theme-mode')).toBe('light');
    expect(functionalStorage.get('prodculator-theme-mode')).toBe('light');
  });

  it('refuses to read even if a value somehow exists', () => {
    // Belt and braces: a value left by an older build, or by a code path that
    // bypassed the guard, must not be honoured while consent is refused.
    localStorage.setItem('prodculator-theme-mode', 'light');
    writeConsent(false);
    expect(functionalStorage.get('prodculator-theme-mode')).toBeNull();
  });

  it('applies the same rule to session storage', () => {
    functionalStorage.setSession('user_country', 'GB');
    expect(sessionStorage.getItem('user_country')).toBeNull();
    writeConsent(true);
    functionalStorage.setSession('user_country', 'GB');
    expect(functionalStorage.getSession('user_country')).toBe('GB');
  });
});

describe('withdrawing consent deletes what was stored', () => {
  it('purges every registered key on refusal', () => {
    writeConsent(true);
    for (const key of FUNCTIONAL_LOCAL_KEYS) functionalStorage.set(key, 'x');
    for (const key of FUNCTIONAL_SESSION_KEYS) functionalStorage.setSession(key, 'x');

    writeConsent(false);

    for (const key of FUNCTIONAL_LOCAL_KEYS) {
      expect(localStorage.getItem(key), `${key} survived the withdrawal`).toBeNull();
    }
    for (const key of FUNCTIONAL_SESSION_KEYS) {
      expect(sessionStorage.getItem(key), `${key} survived the withdrawal`).toBeNull();
    }
  });

  it('purges the per-user tour flags, which carry a suffix', () => {
    writeConsent(true);
    functionalStorage.set('pc_tutorial_seen:someone@example.com', '1');
    functionalStorage.set('pc_wizard_tour_seen:someone@example.com', '1');

    writeConsent(false);

    expect(localStorage.getItem('pc_tutorial_seen:someone@example.com')).toBeNull();
    expect(localStorage.getItem('pc_wizard_tour_seen:someone@example.com')).toBeNull();
  });

  it('leaves the consent record itself in place', () => {
    writeConsent(true);
    writeConsent(false);
    // Forgetting the refusal would mean asking again on the next page, which reads
    // as ignoring the answer.
    expect(readConsent()?.functional).toBe(false);
  });

  it('never touches keys outside the registry', () => {
    localStorage.setItem('prodculator_admin_session', 'true');
    localStorage.setItem('something-else', 'keep me');
    writeConsent(false);
    // The admin session flag is strictly necessary auth state, not a preference.
    expect(localStorage.getItem('prodculator_admin_session')).toBe('true');
    expect(localStorage.getItem('something-else')).toBe('keep me');
  });

  it('is safe to purge repeatedly with nothing stored', () => {
    expect(() => { purgeFunctionalStorage(); purgeFunctionalStorage(); }).not.toThrow();
  });
});

describe('the registry covers what the policy promises', () => {
  it('lists no duplicates, which would mean two features fighting over one key', () => {
    const all = [...FUNCTIONAL_LOCAL_KEYS];
    expect(new Set(all).size).toBe(all.length);
  });

  it('gates every key the cookie policy lists as a preference', () => {
    // If a key is added to the app but not here, it escapes consent silently. This
    // is the assertion that makes the registry the single source of truth.
    writeConsent(false);
    for (const key of FUNCTIONAL_LOCAL_KEYS) {
      functionalStorage.set(key, 'x');
      expect(localStorage.getItem(key), `${key} was written despite refusal`).toBeNull();
    }
  });
});
