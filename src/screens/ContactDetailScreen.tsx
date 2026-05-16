import { useMemo } from 'react';
import type { Booking, Occupant } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { currency, formatDayLabel, formatTime } from '../lib/format';
import { aggregateContacts, type Contact } from '../lib/contacts';

type Props = {
  bookings: Booking[];
  contactKey: string;
  onBack: () => void;
  onOpenBooking: (id: string) => void;
  onNewShoot: (prefill: { occupant: Occupant; address?: string }) => void;
};

export function ContactDetailScreen({
  bookings,
  contactKey,
  onBack,
  onOpenBooking,
  onNewShoot,
}: Props) {
  const contact = useMemo(
    () => aggregateContacts(bookings).find((c) => c.key === contactKey),
    [bookings, contactKey],
  );

  const shoots = useMemo(() => {
    if (!contact) return [] as Booking[];
    const ids = new Set(contact.bookingIds);
    return bookings
      .filter((b) => ids.has(b.id))
      .sort((a, b) =>
        (b.scheduledAt ?? b.createdAt).localeCompare(a.scheduledAt ?? a.createdAt),
      );
  }, [bookings, contact]);

  if (!contact) {
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
          title="Contact"
        />
        <main className="flex-1 pb-12 pt-5">
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
              This contact no longer has any shoots on file.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const startReshoot = () => {
    const occupant: Occupant = {
      name: contact.name === '(no name)' ? undefined : contact.name,
      phone: contact.phone,
      email: contact.email,
      accessNotes: contact.accessNotes,
    };
    onNewShoot({ occupant, address: contact.lastAddress });
  };

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
        title="Contact"
      />

      <main className="flex-1 pb-12 pt-5">
        <section className="card mb-5 px-5 py-5">
          <p className="text-[22px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">
            {contact.name}
          </p>
          <div className="mt-3 space-y-1.5">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                className="tap block truncate text-[14px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="tap block truncate text-[14px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                {contact.email}
              </a>
            )}
            {!contact.phone && !contact.email && (
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
                No phone or email on file.
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Shoots" value={String(contact.totalShoots)} />
            <Stat label="Revenue" value={currency(contact.totalRevenue)} />
          </div>
          <button
            type="button"
            onClick={startReshoot}
            className="tap mt-4 w-full rounded-xl bg-neutral-900 dark:bg-neutral-100 px-5 py-3 text-[14.5px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            + New shoot for this contact
          </button>
        </section>

        {contact.accessNotes && (
          <section className="card mb-5 px-5 py-4">
            <p className="text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Access notes
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] text-neutral-800 dark:text-neutral-200">
              {contact.accessNotes}
            </p>
          </section>
        )}

        {contact.addresses.length > 1 && (
          <ContactAddresses contact={contact} />
        )}

        <section>
          <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
            Shoots · {shoots.length}
          </p>
          <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            {shoots.map((b) => (
              <ShootRow
                key={b.id}
                b={b}
                onClick={() => onOpenBooking(b.id)}
              />
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
    </div>
  );
}

function ContactAddresses({ contact }: { contact: Contact }) {
  return (
    <section className="card mb-5 px-5 py-4">
      <p className="text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Properties shot
      </p>
      <ul className="mt-2 space-y-1.5">
        {contact.addresses.map((a) => (
          <li
            key={a.address}
            className="flex items-baseline justify-between gap-3 text-[13px]"
          >
            <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
              {a.address}
            </span>
            <span className="shrink-0 text-[11.5px] text-neutral-400 dark:text-neutral-500">
              {a.count}×
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ShootRow({ b, onClick }: { b: Booking; onClick: () => void }) {
  const scheduled = b.scheduledAt ? new Date(b.scheduledAt) : null;
  const dateLabel = scheduled
    ? `${formatDayLabel(scheduled)} · ${formatTime(scheduled)}`
    : 'Unscheduled';
  const amount = (b.price ?? 0) + (b.travelFee ?? 0);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
            {b.address || '(no address)'}
          </p>
          <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
            {dateLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {currency(amount)}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}
