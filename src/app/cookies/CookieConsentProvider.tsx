import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import {
  type ConsentRecord,
  functionalAllowed,
  hasDecided,
  purgeFunctionalStorage,
  readConsent,
  writeConsent,
} from './consent';

interface CookieConsentValue {
  /** Null until the visitor has chosen. The banner shows on exactly this condition. */
  consent: ConsentRecord | null;
  functionalAllowed: boolean;
  /** True once a decision exists, so the banner does not reappear on navigation. */
  decided: boolean;
  accept: () => void;
  reject: () => void;
  set: (functional: boolean) => void;
  /** Reopens the chooser, for the footer's "Cookie preferences" control. */
  reopen: () => void;
  choosing: boolean;
}

const CookieConsentContext = createContext<CookieConsentValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentRecord | null>(() => readConsent());
  const [choosing, setChoosing] = useState(false);

  // A refusal is enforced on every load, not only at the moment it is made. Any key
  // written by a path that forgot to check would otherwise outlive the refusal, and
  // a withdrawal that leaves data in place is not a withdrawal.
  useEffect(() => {
    if (consent && !consent.functional) purgeFunctionalStorage();
  }, [consent]);

  const apply = useCallback((functional: boolean) => {
    setConsent(writeConsent(functional));
    setChoosing(false);
  }, []);

  const value = useMemo<CookieConsentValue>(() => ({
    consent,
    functionalAllowed: consent?.functional === true,
    decided: consent !== null,
    accept: () => apply(true),
    reject: () => apply(false),
    set: apply,
    reopen: () => setChoosing(true),
    choosing,
  }), [consent, choosing, apply]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    // Deliberately not a silent default. A component reading consent outside the
    // provider would otherwise get "allowed" or "refused" by accident, and either
    // answer is wrong in a way nobody would notice.
    throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  }
  return ctx;
}

/** For non-React code paths (storage helpers, one-off checks). */
export { functionalAllowed, hasDecided };
