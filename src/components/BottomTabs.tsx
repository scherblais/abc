import type { ReactNode } from 'react';

export type TabId = 'home' | 'revenue' | 'expenses' | 'invoices' | 'admin';

type Tab = {
  id: TabId;
  label: string;
  icon: ReactNode;
  /** Optional badge content (e.g. unpaid-invoice count). Falsy hides it. */
  badge?: number;
};

type Props = {
  active: TabId | null;
  onChange: (tab: TabId) => void;
  unpaidInvoices?: number;
};

/**
 * Bottom tab bar. Always visible, anchored to the safe-area bottom. Each
 * tab is the full width of its slot (≈70px+), labeled + iconned so it's
 * easy to hit precisely without remembering what each icon means. Hidden
 * behind a `null` active tab on the print route, where it would clash
 * with the print-only layout.
 */
export function BottomTabs({ active, onChange, unpaidInvoices }: Props) {
  if (active === null) return null;

  const tabs: Tab[] = [
    { id: 'home', label: 'Today', icon: <HomeIcon /> },
    { id: 'revenue', label: 'Revenue', icon: <RevenueIcon /> },
    { id: 'expenses', label: 'Expenses', icon: <ExpensesIcon /> },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <InvoiceIcon />,
      badge: unpaidInvoices,
    },
    { id: 'admin', label: 'Settings', icon: <SettingsIcon /> },
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[480px] items-stretch px-1">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'tap relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10.5px] font-medium',
                isActive
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100',
              ].join(' ')}
            >
              <span aria-hidden className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -right-2 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ---------- icons ---------- */

function HomeIcon() {
  // Calendar with a dot — "today" feel.
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 20V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 20v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 20h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M9 8h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function InvoiceIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 13h7M9 17h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m19.4 13.6.1-1.6-.1-1.6 2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.7-1.6L13.9 2h-3.8l-.5 2.8a7 7 0 0 0-2.7 1.6l-2.3-.9-2 3.4 2 1.5-.1 1.6.1 1.6-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.7 1.6L10.1 22h3.8l.5-2.8a7 7 0 0 0 2.7-1.6l2.3.9 2-3.4-2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
