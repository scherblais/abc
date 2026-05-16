import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNav, type TabId } from '../lib/nav-context';

type Item = {
  id: TabId;
  label: string;
  icon: ReactNode;
  badge?: number;
};

/**
 * Top-right popover navigation menu. Tap the kebab → menu opens below
 * the button with the five top-level destinations + their icons. Tap an
 * item to jump to it; tap outside or Escape to close. Hidden when there
 * is no nav context (signed-out / print routes).
 */
export function NavMenu() {
  const nav = useNav();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Outside-click + Escape to close.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!nav) return null;

  const items: Item[] = [
    { id: 'home', label: 'Today', icon: <HomeIcon /> },
    { id: 'tasks', label: 'Tasks', icon: <TasksIcon /> },
    { id: 'contacts', label: 'Contacts', icon: <ContactsIcon /> },
    { id: 'revenue', label: 'Revenue', icon: <RevenueIcon /> },
    { id: 'expenses', label: 'Expenses', icon: <ExpensesIcon /> },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: <InvoiceIcon />,
      badge: nav.unpaidInvoices,
    },
    { id: 'admin', label: 'Settings', icon: <SettingsIcon /> },
  ];

  const go = (id: TabId) => {
    setOpen(false);
    nav.navigate(id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="tap grid h-11 w-11 place-items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
      >
        <KebabIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-xl shadow-neutral-900/10"
        >
          {items.map((item) => {
            const isActive = nav.current === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => go(item.id)}
                className={[
                  'tap flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium',
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/70',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={[
                    'shrink-0',
                    isActive
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-500 dark:text-neutral-400',
                  ].join(' ')}
                >
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span
                    aria-hidden
                    className="grid h-5 min-w-[20px] place-items-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white"
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- icons ---------- */

function KebabIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function TasksIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="m8 12 2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 9h16" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="14.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10 20V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 20v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M3 20h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function ContactsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5 20c1.2-3.4 4-5 7-5s5.8 1.6 7 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
