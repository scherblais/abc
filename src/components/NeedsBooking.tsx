import { useMemo } from 'react';
import { appointments } from '../data/mock';
import type { Appointment } from '../data/mock';
import { useNow } from '../lib/now';
import { currency, formatRelativeDeadline } from '../lib/format';
import { SectionHeader } from './SectionHeader';

function urgencyColor(days: number) {
  if (days <= 1) return 'bg-rose-500/15 text-rose-300 ring-rose-400/20';
  if (days <= 3) return 'bg-amber-400/15 text-amber-300 ring-amber-300/20';
  return 'bg-white/[0.06] text-white/70 ring-white/10';
}

function NeedsBookingRow({ a, now }: { a: Appointment; now: Date }) {
  const deadline = a.listingGoesLiveOn ? new Date(a.listingGoesLiveOn) : null;
  const days = deadline
    ? Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 99;

  return (
    <li className="tap flex items-stretch gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-medium">{a.address}</p>
          <span className="shrink-0 text-[14px] font-semibold tabular-nums text-white/85">
            {currency(a.price)}
          </span>
        </div>
        <p className="truncate text-[12.5px] text-white/55">
          {a.city} · {a.client}
          {a.brokerage ? ` · ${a.brokerage}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {deadline && (
            <span
              className={`pill ring-1 ring-inset ${urgencyColor(days)}`}
              aria-label={`Listing goes live ${deadline.toDateString()}`}
            >
              {formatRelativeDeadline(deadline, now)}
            </span>
          )}
          {a.services.map((s) => (
            <span
              key={s}
              className="pill bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/5"
            >
              {s}
            </span>
          ))}
        </div>
        {a.notes && <p className="mt-1.5 text-[12px] text-white/45">{a.notes}</p>}
      </div>
    </li>
  );
}

export function NeedsBooking() {
  const now = useNow();
  const items = useMemo(
    () =>
      appointments
        .filter((a) => a.status === 'needs_booking')
        .sort((a, b) => {
          const ad = a.listingGoesLiveOn ? new Date(a.listingGoesLiveOn).getTime() : Infinity;
          const bd = b.listingGoesLiveOn ? new Date(b.listingGoesLiveOn).getTime() : Infinity;
          return ad - bd;
        }),
    [],
  );

  const pendingValue = items.reduce((sum, a) => sum + a.price, 0);

  return (
    <section className="mb-6">
      <SectionHeader
        title="Needs booking"
        count={items.length}
        hint={`${currency(pendingValue)} pending`}
        action={<button type="button">Schedule</button>}
      />
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-white/50">
            All caught up — nothing waiting to be scheduled.
          </p>
        ) : (
          <ul className="divide-y divide-white/[0.04]">
            {items.map((a) => (
              <NeedsBookingRow key={a.id} a={a} now={now} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
