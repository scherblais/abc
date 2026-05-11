import { useMemo, useState } from 'react';
import type { Agent, Booking, Company, Invoice, Service } from '../types';
import { startOfDay } from '../lib/datetime';
import { currency, formatDayLabel, formatTime } from '../lib/format';
import { bookingTotal } from '../lib/bookings';
import { invoiceSubtotal, invoiceTaxes } from '../lib/invoices';

type Props = {
  bookings: Booking[];
  catalog: Service[];
  companies: Company[];
  agents: Agent[];
  invoices: Invoice[];
  onAdd: () => void;
  onOpen: (b: Booking) => void;
  onOpenAdmin: () => void;
  onOpenRevenue: () => void;
  onOpenInvoices: () => void;
};

const groupByDay = (items: Booking[]) => {
  const groups = new Map<string, { date: Date; items: Booking[] }>();
  for (const a of items) {
    const d = new Date(a.scheduledAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const bucket = groups.get(key) ?? { date: startOfDay(d), items: [] };
    bucket.items.push(a);
    groups.set(key, bucket);
  }
  for (const g of groups.values()) {
    g.items.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }
  return [...groups.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
};

export function HomeScreen({
  bookings,
  catalog,
  companies,
  agents,
  invoices,
  onAdd,
  onOpen,
  onOpenAdmin,
  onOpenRevenue,
  onOpenInvoices,
}: Props) {
  const outstanding = useMemo(() => {
    const sent = invoices.filter((i) => i.status === 'sent');
    let total = 0;
    for (const inv of sent) {
      const sub = invoiceSubtotal(inv, bookings);
      total += invoiceTaxes(sub, inv.gstRate, inv.qstRate).total;
    }
    return { count: sent.length, total };
  }, [invoices, bookings]);
  const now = useMemo(() => new Date(), []);
  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (b) => new Date(b.scheduledAt).getTime() + b.durationMin * 60000 >= now.getTime(),
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [bookings, now],
  );

  const past = useMemo(
    () =>
      bookings
        .filter(
          (b) => new Date(b.scheduledAt).getTime() + b.durationMin * 60000 < now.getTime(),
        )
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [bookings, now],
  );

  const groups = useMemo(() => groupByDay(upcoming), [upcoming]);
  const [pastOpen, setPastOpen] = useState(false);
  const pastVisible = pastOpen ? past.slice(0, 25) : [];

  const monthStats = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const inThisMonth = bookings.filter((b) => {
      const d = new Date(b.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const total = inThisMonth.reduce((sum, b) => sum + bookingTotal(b), 0);
    const label = now.toLocaleDateString('en-CA', { month: 'long' });
    return { total, count: inThisMonth.length, label };
  }, [bookings, now]);

  const labelFor = useMemo(() => {
    const byId = new Map(catalog.map((s) => [s.id, s.name]));
    return (id: string) => byId.get(id);
  }, [catalog]);

  const clientLineFor = useMemo(() => {
    const companyById = new Map(companies.map((c) => [c.id, c]));
    const agentById = new Map(agents.map((a) => [a.id, a]));
    return (b: Booking): string | null => {
      const agent = b.agentId ? agentById.get(b.agentId) : undefined;
      const company = b.companyId ? companyById.get(b.companyId) : undefined;
      if (agent && company) return `${agent.name} · ${company.name}`;
      if (agent) return agent.name;
      if (company) return company.name;
      // Fall back to legacy embedded client info on pre-migration bookings.
      if (b.client?.name) {
        return b.client.brokerage
          ? `${b.client.name} · ${b.client.brokerage}`
          : b.client.name;
      }
      // Booking with companyId/agentId pointing at deleted records.
      if (b.companyId || b.agentId) return '(deleted client)';
      return null;
    };
  }, [companies, agents]);

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 border-b border-neutral-200/80 bg-white/85 px-4 pb-3 pt-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold tracking-tightish text-neutral-900">
              Lensbook
            </h1>
            {monthStats.total > 0 ? (
              <button
                type="button"
                onClick={onOpenRevenue}
                className="tap mt-0.5 inline-flex items-baseline gap-1 text-[13px] text-neutral-500 hover:text-neutral-900"
              >
                <span className="font-medium text-neutral-900 tabular-nums">
                  {currency(monthStats.total)}
                </span>
                <span>in {monthStats.label}</span>
                {upcoming.length > 0 && <span>· {upcoming.length} upcoming</span>}
                <span className="text-neutral-400" aria-hidden>
                  ›
                </span>
              </button>
            ) : upcoming.length > 0 ? (
              <p className="mt-0.5 text-[13px] text-neutral-500">
                {upcoming.length} upcoming
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] text-neutral-500">No shoots booked</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenInvoices}
              aria-label="Invoices"
              className="tap relative grid h-9 w-9 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
            >
              <InvoiceIcon />
              {outstanding.count > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white"
                >
                  {outstanding.count}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              aria-label="Manage catalog"
              className="tap grid h-9 w-9 place-items-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-28 pt-4">
        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState onAdd={onAdd} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-5">
                {groups.map((g) => (
                  <section key={g.date.toISOString()}>
                    <p className="mb-2 px-0.5 text-[12px] font-medium text-neutral-500">
                      {formatDayLabel(g.date, now)}
                    </p>
                    <ul className="card divide-y divide-neutral-100 overflow-hidden">
                      {g.items.map((b) => (
                        <BookingRow
                          key={b.id}
                          b={b}
                          labelFor={labelFor}
                          clientLine={clientLineFor(b)}
                          onClick={() => onOpen(b)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {past.length > 0 && (
              <section className="mt-7">
                <button
                  type="button"
                  onClick={() => setPastOpen((v) => !v)}
                  className="tap flex w-full items-center justify-between px-0.5 py-1 text-[12px] font-medium text-neutral-500 hover:text-neutral-700"
                >
                  <span>
                    Past shoots · {past.length}
                  </span>
                  <span
                    className={`transition-transform ${pastOpen ? 'rotate-90' : ''}`}
                    aria-hidden
                  >
                    ›
                  </span>
                </button>
                {pastOpen && pastVisible.length > 0 && (
                  <ul className="card mt-2 divide-y divide-neutral-100 overflow-hidden opacity-90">
                    {pastVisible.map((b) => (
                      <PastBookingRow
                        key={b.id}
                        b={b}
                        labelFor={labelFor}
                        clientLine={clientLineFor(b)}
                        onClick={() => onOpen(b)}
                      />
                    ))}
                  </ul>
                )}
                {pastOpen && past.length > pastVisible.length && (
                  <button
                    type="button"
                    onClick={onOpenRevenue}
                    className="tap mt-2 w-full rounded-lg border border-neutral-200 bg-white py-2 text-[12.5px] text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                  >
                    {past.length - pastVisible.length} older shoots · view in Revenue ›
                  </button>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[480px] px-4 pb-4">
          <button
            type="button"
            onClick={onAdd}
            className="pointer-events-auto tap flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-5 py-3.5 text-[15px] font-medium text-white shadow-lg shadow-neutral-900/15 hover:bg-black"
          >
            <span className="text-[18px] leading-none" aria-hidden>
              +
            </span>
            Book a shoot
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingRow({
  b,
  labelFor,
  clientLine,
  onClick,
}: {
  b: Booking;
  labelFor: (id: string) => string | undefined;
  clientLine: string | null;
  onClick: () => void;
}) {
  const start = new Date(b.scheduledAt);
  const labels = b.services
    .map((id) => labelFor(id))
    .filter((s): s is string => Boolean(s));

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <div className="flex w-[60px] shrink-0 flex-col items-start pt-0.5">
          <span className="text-[14.5px] font-semibold leading-tight tabular-nums text-neutral-900">
            {formatTime(start)}
          </span>
          <span className="text-[11.5px] text-neutral-400">{b.durationMin}m</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-neutral-900">
            {b.address || 'No address'}
          </p>
          <p className="truncate text-[12.5px] text-neutral-500">
            {clientLine ?? 'No client'}
          </p>
          {labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {labels.slice(0, 3).map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="pill border border-neutral-200 bg-neutral-50 text-neutral-600"
                >
                  {label}
                </span>
              ))}
              {labels.length > 3 && (
                <span className="pill text-neutral-400">+{labels.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[14px] font-semibold tabular-nums text-neutral-900">
            {currency(bookingTotal(b))}
          </span>
          <span className="text-neutral-300" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}

function PastBookingRow({
  b,
  labelFor,
  clientLine,
  onClick,
}: {
  b: Booking;
  labelFor: (id: string) => string | undefined;
  clientLine: string | null;
  onClick: () => void;
}) {
  const start = new Date(b.scheduledAt);
  const dateLabel = start.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
  const firstService = b.services.map(labelFor).find(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50"
      >
        <span className="w-12 shrink-0 text-[12px] font-medium tabular-nums text-neutral-500">
          {dateLabel}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-neutral-800">
            {b.address || 'No address'}
          </p>
          <p className="truncate text-[11.5px] text-neutral-500">
            {clientLine ?? firstService ?? '—'}
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-neutral-700">
          {currency(bookingTotal(b))}
        </span>
      </button>
    </li>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-neutral-200 bg-white">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
            stroke="#0a0a0a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="13" r="3.5" stroke="#0a0a0a" strokeWidth="1.6" />
        </svg>
      </div>
      <h2 className="text-[17px] font-semibold tracking-tightish text-neutral-900">
        Book your first shoot
      </h2>
      <p className="mt-1.5 max-w-[20rem] text-[13.5px] leading-snug text-neutral-500">
        Tap the button below — address, day, time, services. Done in under 30 seconds.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="tap mt-5 rounded-lg bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-black"
      >
        + New shoot
      </button>
    </div>
  );
}

function InvoiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 13h7M9 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m19.4 13.6.1-1.6-.1-1.6 2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.7-1.6L13.9 2h-3.8l-.5 2.8a7 7 0 0 0-2.7 1.6l-2.3-.9-2 3.4 2 1.5-.1 1.6.1 1.6-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.7 1.6L10.1 22h3.8l.5-2.8a7 7 0 0 0 2.7-1.6l2.3.9 2-3.4-2-1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
