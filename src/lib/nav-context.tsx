import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type TabId = 'home' | 'revenue' | 'expenses' | 'invoices' | 'admin';

export type NavContextValue = {
  /** Currently active top-level destination (or null on edit/print routes). */
  current: TabId | null;
  /** Jump to a top-level destination. */
  navigate: (id: TabId) => void;
  /** Used by the Invoices menu item to show an unpaid-count badge. */
  unpaidInvoices: number;
};

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({
  value,
  children,
}: {
  value: NavContextValue;
  children: ReactNode;
}) {
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

/** Returns null when there's no provider in scope — NavMenu uses this to
 *  decide whether to render (e.g. on screens like SignInScreen where the
 *  shell hasn't mounted yet). */
export function useNav(): NavContextValue | null {
  return useContext(NavContext);
}
