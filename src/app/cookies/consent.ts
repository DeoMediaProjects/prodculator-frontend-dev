/**
 * Cookie and local-storage consent.
 *
 * Two categories, because two is what this platform actually has. There is no
 * analytics, advertising, or third-party tracking anywhere in the codebase, so this
 * offers no toggle for them: a control that governs nothing teaches people that the
 * controls are decorative, and a policy that lists cookies we do not set is a false
 * statement about our own product. If tracking is ever added, bump CONSENT_VERSION
 * and add the category here — everyone is then re-asked, which is the correct
 * outcome and the reason the version exists.
 *
 * PECR (and UK GDPR, which the Platform operates under as a Deo Media Limited
 * product registered in England & Wales) governs storing information on a visitor's
 * device, not the word "cookie". localStorage counts. That is why the functional
 * keys below are gated exactly as cookies would be.
 */

export const CONSENT_VERSION = 1;

/** Six months. The ICO's guidance is to re-ask periodically rather than treat a
 *  single click as permanent; a year is the outer edge of what is defensible. */
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182;

export const CONSENT_COOKIE = 'pc_cookie_consent';

export type ConsentCategory = 'essential' | 'functional';

export interface ConsentRecord {
  version: number;
  /** Preferences, interface state, and the "you have seen this" flags. */
  functional: boolean;
  /** ISO timestamp of the decision, so we can show the user when they chose. */
  decidedAt: string;
}

/**
 * Every key this application writes that is NOT strictly necessary.
 *
 * Kept in one list rather than beside each feature so the cookie policy, the purge,
 * and the write guard can never drift apart. Adding a key elsewhere without adding
 * it here means it escapes consent silently, so treat this as the registry: if it
 * stores something on the visitor's device and the Platform would still work
 * without it, it belongs in this list.
 */
export const FUNCTIONAL_LOCAL_KEYS = [
  'prodculator-theme-mode',
  'prodculator-sidebar-collapsed',
  'prodculator-admin-sidebar-collapsed',
  'prodculator-profile',
  'prodculator-avatar',
  'prodculator-email-notifs',
  'prodculator-notifs-read',
  'prodculator-notifs-dismissed',
] as const;

/** Prefix-matched, because these carry a per-user suffix (see tourStorage.ts). */
export const FUNCTIONAL_LOCAL_PREFIXES = [
  'pc_tutorial_seen',
  'pc_wizard_tour_seen',
  'pc_wizard_finish_seen',
  'pc_bi_tour_seen',
  'pc_dashboard_visited',
] as const;

export const FUNCTIONAL_SESSION_KEYS = [
  'user_country',
  'prodculator_intro_played',
] as const;

function isFunctionalKey(key: string): boolean {
  return (
    (FUNCTIONAL_LOCAL_KEYS as readonly string[]).includes(key)
    || FUNCTIONAL_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

// ── Reading and writing the decision ─────────────────────────────────────────
// The consent record itself is stored without consent, which is permitted and
// necessary: remembering that someone said no is the only way to stop asking.

export function readConsent(): ConsentRecord | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentRecord>;
    if (typeof parsed?.functional !== 'boolean') return null;
    // A decision recorded against an older set of categories is not a decision
    // about the current one, so it is not carried forward.
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      version: CONSENT_VERSION,
      functional: parsed.functional,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : '',
    };
  } catch {
    return null;
  }
}

export function writeConsent(functional: boolean): ConsentRecord {
  const record: ConsentRecord = {
    version: CONSENT_VERSION,
    functional,
    decidedAt: new Date().toISOString(),
  };
  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(record));
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    // First-party, Lax, no domain attribute: this cookie never needs to travel
    // cross-site and never needs to be read by a third party.
    document.cookie =
      `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }
  if (!functional) purgeFunctionalStorage();
  return record;
}

export function hasDecided(): boolean {
  return readConsent() !== null;
}

export function functionalAllowed(): boolean {
  return readConsent()?.functional === true;
}

// ── Enforcement ──────────────────────────────────────────────────────────────

/**
 * Remove everything the functional category covers.
 *
 * Called when consent is refused or withdrawn, and again on every load while it is
 * refused. The second call matters: without it, anything written by a code path that
 * forgot to check would survive indefinitely, and a withdrawal that leaves the data
 * in place is not a withdrawal.
 */
export function purgeFunctionalStorage(): void {
  try {
    for (const key of Object.keys(localStorage)) {
      if (isFunctionalKey(key)) localStorage.removeItem(key);
    }
  } catch {
    /* Storage unavailable (private mode, blocked). Nothing to purge. */
  }
  try {
    for (const key of FUNCTIONAL_SESSION_KEYS) sessionStorage.removeItem(key);
  } catch {
    /* as above */
  }
}

/**
 * Storage for anything that is not strictly necessary.
 *
 * Reads and writes are refused outright while consent is absent or refused, rather
 * than written and cleared later. Storing first and tidying up afterwards is still
 * storing without consent, and it is the difference between a banner that works and
 * a banner that performs.
 *
 * Every method swallows storage errors, matching the call sites this replaces: a
 * browser in private mode, or with storage blocked, must degrade to "no preference
 * remembered" rather than crash a page.
 */
export const functionalStorage = {
  get(key: string): string | null {
    if (!functionalAllowed()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (!functionalAllowed()) return;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota or private mode */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* as above */
    }
  },
  getSession(key: string): string | null {
    if (!functionalAllowed()) return null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setSession(key: string, value: string): void {
    if (!functionalAllowed()) return;
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* as above */
    }
  },
};
