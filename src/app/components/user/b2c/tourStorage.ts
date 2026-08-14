// Per-account persistence for "has this user seen this tour?".
//
// These flags used to be plain per-browser localStorage keys, which meant the
// first account to sign in on a machine consumed the tour for every account
// after it. That is wrong for anyone who legitimately uses more than one login
// on the same browser — shared demo machines, agencies running several client
// accounts, or a producer with a personal and a company account. The second
// person to sit down never saw the onboarding at all.
//
// Scoping by user id fixes that: each account gets its own flag, so every user
// is offered the tour on their own first login regardless of who used the
// browser before them.

// Callers pass the signed-in user's email: it is unique per account and already
// on the auth context, so scoping needs no change to the auth payload.
import { functionalAllowed, functionalStorage } from '@/app/cookies/consent';

/** Storage key for *base*, scoped to a specific user. */
export function tourKey(base: string, userKey: string | null | undefined): string {
  return userKey ? `${base}:${userKey}` : base;
}

/** Record that this user has seen the tour. No-op when the user isn't known. */
export function markTourSeen(base: string, userKey: string | null | undefined): void {
  if (!userKey) return;
  functionalStorage.set(tourKey(base, userKey), '1');
}

/**
 * Whether this user has already seen the tour.
 *
 * Returns true (i.e. "don't prompt") while the user is still loading, so the
 * tour can't flash before we know whose flag to read. Callers re-run this once
 * the id resolves.
 */
export function hasSeenTour(base: string, userKey: string | null | undefined): boolean {
  if (!userKey) return true;
  // Without preference storage we can neither record a dismissal nor read one
  // back, so a "seen" flag can never stick. Reading the missing flag as "not
  // seen" is what made the prompt reappear on every login for anyone who did not
  // grant functional-cookie consent — dismissing it wrote nothing, so the next
  // visit looked like a first visit again. Reporting "seen" here keeps the tour
  // quiet in that state (it stays available on demand from the "?" button),
  // which matches this module's stated intent: refusing consent must not turn
  // every visit into a walkthrough.
  if (!functionalAllowed()) return true;
  return !!functionalStorage.get(tourKey(base, userKey));
}
