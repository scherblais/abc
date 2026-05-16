import { useMemo, useState } from 'react';
import type { Booking } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { currency } from '../lib/format';
import {
  aggregateContacts,
  matchesContactSearch,
  type Contact,
} from '../lib/contacts';

type Props = {
  bookings: Booking[];
  onBack: () => void;
  onOpen: (contactKey: string) => void;
};

export function ContactsScreen({ bookings, onBack, onOpen }: Props) {
  const contacts = useMemo(() => aggregateContacts(bookings), [bookings]);
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => contacts.filter((c) => matchesContactSearch(c, query)),
    [contacts, query],
  );

  const totalShoots = useMemo(
    () => contacts.reduce((s, c) => s + c.totalShoots, 0),
    [contacts],
  );

  return (
    <div className="flex h-full min-h-full flex-col">
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onBack}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            ‹ Back
          </button>
        }
        title="Contacts"
      />

      <main className="flex-1 pb-12 pt-5">
        {contacts.length === 0 ? (
          <div className="card px-5 py-10 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
              No contacts yet.
            </p>
            <p className="mt-1.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              Add a property contact (seller or tenant) when you book a shoot
              and they'll show up here.
            </p>
          </div>
        ) : (
          <>
            <section className="card mb-5 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                    People
                  </p>
                  <p className="mt-0.5 text-[28px] font-semibold tracking-tightish tabular-nums text-neutral-900 dark:text-neutral-100">
                    {contacts.length}
                  </p>
                </div>
                <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                  {totalShoots} shoot{totalShoots === 1 ? '' : 's'} on file
                </p>
              </div>
            </section>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, phone, email, or address"
              className="input mb-3"
              type="search"
              autoCorrect="off"
              autoCapitalize="none"
            />

            {filtered.length === 0 ? (
              <div className="card px-5 py-8 text-center">
                <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400">
                  No matches for "{query}".
                </p>
              </div>
            ) : (
              <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                {filtered.map((c) => (
                  <Row key={c.key} c={c} onClick={() => onOpen(c.key)} />
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function lastShootLabel(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
}

function Row({ c, onClick }: { c: Contact; onClick: () => void }) {
  const sub = [
    `${c.totalShoots} shoot${c.totalShoots === 1 ? '' : 's'}`,
    c.lastShootAt ? `last ${lastShootLabel(c.lastShootAt)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-neutral-900 dark:text-neutral-100">
            {c.name}
          </p>
          <p className="truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
            {c.phone ?? c.email ?? c.addresses[0]?.address ?? '—'}
          </p>
          <p className="truncate text-[11.5px] text-neutral-400 dark:text-neutral-500">
            {sub}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {currency(c.totalRevenue)}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}
