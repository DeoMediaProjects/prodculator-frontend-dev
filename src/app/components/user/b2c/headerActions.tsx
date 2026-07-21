import { createContext, useContext, useEffect, type ReactNode } from 'react';

/**
 * Lets a routed page render its action buttons (Export CSV, Add Milestone, …)
 * into the shared dashboard top bar next to "New Analysis", instead of inside
 * its own content. B2CLayout provides the setter; pages register via the hook.
 */
export const HeaderActionsContext = createContext<{ setActions: (n: ReactNode) => void }>({
  setActions: () => {},
});

export function useHeaderActions(node: ReactNode, deps: unknown[]): void {
  const { setActions } = useContext(HeaderActionsContext);
  useEffect(() => {
    setActions(node);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
