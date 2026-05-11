import { useMemo } from 'react';
import type { Booking } from '../types';
import { labelFor } from '../lib/services';
import { startOfDay } from '../lib/datetime';
import { currency, formatDayLabel, formatTime } from '../lib/format';

type Props = {
  bookings: Booking[];
  onAdd: () => void;
  onOpen: (b: Booking) => void;
};

const groupByDay = (items: Booking[]) => {
  const groups = new Map<string, { date: Date; items: Booking[] }>();
  for (const a of items) {
    const d = new Date(a.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = groups.get(key) ?? {
      date: startOfDay(d),
      items: [],
    };
    bucket.items.push(a);
    groups.set(key, bucket);
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
};

export function HomeScreen({ bookings, onAdd, onOpen }: Props) {
  const now = useMemo(() => new Date(), []);
  const upcoming = useMemo(
    () =>
      bookings
        .filter((b) => new Date(b.scheduledAt).getTime() + b.durationMin * 60000 >= now.getTime())
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [bookings, now],
  );

  const groups = useMemo(() => groupByDay(upcoming), [upcoming]);

  const weekTotal = useMemo(() => {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return upcoming
      .filter((b) => new Date(b.scheduledAt).getTime() <= weekEnd.getTime())
      .reduce((sum, b) => sum + b.price, 0);
  }, [upcoming, now]);

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 bg-ink-950/85 px-4 pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Lensbook
            </p>
            <h1 className="text-[22px] font-semibold leading-tight">
              {upcoming.length === 0 ? 'No shoots booked' : `${upcoming.length} upcoming`}
            </h1>
          </div>
          {weekTotal > 0 && (
            <div className="text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                Next 7 days
              </p>
              <p className="text-[18px] font-semibold tabular-nums">{currency(weekTotal)}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 pb-28">
        {upcoming.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <div className="space-y-5 pt-1">
            {groups.map((g) => (
              <section key={g.date.toISOString()}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                  {formatDayLabel(g.date, now)}
                </p>
                <ul className="card divide-y divide-white/[0.04] overflow-hidden">
                  {g.items.map((b) => (
                    <BookingRow key={b.id} b={b} onClick={() => onOpen(b)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[480px] px-4 pb-4">
          <button
            type="button"
            onClick={onAdd}
            className="pointer-events-auto tap flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-[16px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(124,92,255,0.7)]"
          >
            <span className="text-[20px] leading-none" aria-hidden>
              +
            </span>
            Book a shoot
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ b, onClick }: { b: Booking; onClick: () => void }) {
  const start = new Date(b.scheduledAt);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3 text-left"
      >
        <div className="flex w-[58px] shrink-0 flex-col items-start pt-0.5">
          <span className="text-[15px] font-semibold leading-tight tabular-nums">
            {formatTime(start)}
          </span>
          <span className="text-[11px] text-white/40">{b.durationMin}m</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{b.address || 'No address'}</p>
          <p className="truncate text-[12.5px] text-white/55">
            {b.client.name ? `${b.client.name}` : 'No client name'}
            {b.client.brokerage ? ` · ${b.client.brokerage}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {b.services.slice(0, 3).map((s) => (
              <span
                key={s}
                className="pill bg-white/[0.04] text-white/65 ring-1 ring-inset ring-white/5"
              >
                {labelFor(s)}
              </span>
            ))}
            {b.services.length > 3 && (
              <span className="pill text-white/45">+{b.services.length - 3}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[14px] font-semibold tabular-nums">{currency(b.price)}</span>
          <span className="text-white/30" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-3xl bg-accent/15 ring-1 ring-accent/30">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
            stroke="#a594ff"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3.5" stroke="#a594ff" strokeWidth="1.6" />
        </svg>
      </div>
      <h2 className="text-[18px] font-semibold">Book your first shoot</h2>
      <p className="mt-1.5 max-w-[18rem] text-[13.5px] leading-snug text-white/55">
        Tap the button below — address, day, time, package. Done in under 30 seconds.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="tap mt-6 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white"
      >
        + New shoot
      </button>
    </div>
  );
}
