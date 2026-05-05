import { useMemo } from 'react';
import { appointments } from '../data/mock';
import type { Appointment } from '../data/mock';
import { useNow } from '../lib/now';
import { currency, formatDayLabel, formatTime } from '../lib/format';
import { SectionHeader } from './SectionHeader';

const groupByDay = (items: Appointment[]) => {
  const groups = new Map<string, { date: Date; items: Appointment[] }>();
  for (const a of items) {
    const d = new Date(a.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = groups.get(key) ?? {
      date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      items: [],
    };
    bucket.items.push(a);
    groups.set(key, bucket);
  }
  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
};

function StatusPill({ status }: { status: Appointment['status'] }) {
  if (status === 'tentative') {
    return (
      <span className="pill bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-300/20">
        Tentative
      </span>
    );
  }
  return (
    <span className="pill bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
      Confirmed
    </span>
  );
}

function AppointmentRow({ a, now }: { a: Appointment; now: Date }) {
  const start = new Date(a.scheduledAt);
  const end = new Date(start.getTime() + a.durationMin * 60 * 1000);
  const isPast = end.getTime() < now.getTime();
  const isLive = !isPast && start.getTime() <= now.getTime();

  return (
    <li className="tap relative flex items-stretch gap-3 px-4 py-3">
      <div className="flex w-[58px] shrink-0 flex-col items-start pt-0.5">
        <span className="text-[15px] font-semibold leading-tight tabular-nums">
          {formatTime(start)}
        </span>
        <span className="text-[11px] text-white/40">{a.durationMin}m</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-medium text-white">{a.address}</p>
          {isLive && (
            <span className="pill bg-accent/20 text-accent-soft ring-1 ring-inset ring-accent/30">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-soft" />
              Now
            </span>
          )}
        </div>
        <p className="truncate text-[12.5px] text-white/55">
          {a.city} · {a.client}
          {a.brokerage ? ` · ${a.brokerage}` : ''}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {a.services.map((s) => (
            <span
              key={s}
              className="pill bg-white/[0.04] text-white/70 ring-1 ring-inset ring-white/5"
            >
              {s}
            </span>
          ))}
          <StatusPill status={a.status} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
        <span className="text-[14px] font-semibold tabular-nums">{currency(a.price)}</span>
        <span className="text-white/30" aria-hidden>
          ›
        </span>
      </div>
    </li>
  );
}

export function UpcomingAppointments() {
  const now = useNow();

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== 'needs_booking')
        .filter((a) => {
          const end = new Date(a.scheduledAt).getTime() + a.durationMin * 60 * 1000;
          return end >= now.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
        ),
    [now],
  );

  const grouped = groupByDay(upcoming);
  const totalThisWeek = upcoming
    .filter((a) => {
      const d = new Date(a.scheduledAt);
      const sevenDays = new Date(now);
      sevenDays.setDate(sevenDays.getDate() + 7);
      return d.getTime() <= sevenDays.getTime();
    })
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <section className="mb-6">
      <SectionHeader
        title="Upcoming"
        count={upcoming.length}
        hint={`${currency(totalThisWeek)} booked this week`}
        action={<button type="button">View all</button>}
      />
      <div className="card overflow-hidden">
        {grouped.length === 0 && (
          <p className="px-4 py-6 text-center text-[13px] text-white/50">
            No upcoming shoots. Time to book some.
          </p>
        )}
        {grouped.map((g, gi) => (
          <div key={g.date.toISOString()}>
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
                {formatDayLabel(g.date, now)}
              </p>
              <p className="text-[11px] text-white/35">
                {g.items.length} shoot{g.items.length === 1 ? '' : 's'}
              </p>
            </div>
            <ul className="divide-y divide-white/[0.04]">
              {g.items.map((a) => (
                <AppointmentRow key={a.id} a={a} now={now} />
              ))}
            </ul>
            {gi < grouped.length - 1 && <div className="h-px bg-white/[0.06]" />}
          </div>
        ))}
      </div>
    </section>
  );
}
