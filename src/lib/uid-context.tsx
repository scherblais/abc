import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Thin context that exposes the signed-in user's uid (or null when running
 * in offline-only mode). Lets deep components like SyncIndicator decide
 * whether to render without threading the uid through every screen prop.
 */
const UidContext = createContext<string | null>(null);

export function UidProvider({
  uid,
  children,
}: {
  uid: string | null;
  children: ReactNode;
}) {
  return <UidContext.Provider value={uid}>{children}</UidContext.Provider>;
}

export function useUid(): string | null {
  return useContext(UidContext);
}
