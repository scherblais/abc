import { useMemo, useState } from 'react';
import type { Agent, Booking, Company, Invoice, Service } from '../types';
import { startOfDay } from '../lib/datetime';
import { normalizeServices } from '../lib/catalog';
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
          (b) => new Date(b.scheduledAt).getTime() >= now.getTime(),
        )
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [bookings, now],
  );

  const past = useMemo(
    () =>
      bookings
        .filter(
          (b) => new Date(b.scheduledAt).getTime() < now.getTime(),
        )
        .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [bookings, now],
  );

  const groups = useMemo(() => groupByDay(upcoming), [upcoming]);
  const [pastOpen, setPastOpen] = useState(false);
  const pastVisible = pastOpen ? past.slice(0, 25) : [];

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
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/85 px-4 py-2 backdrop-blur-md">
        <span
          className="text-[18px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100"
          aria-label="Lensbook"
        >
          LM
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenRevenue}
            aria-label="Revenue"
            className="tap grid h-9 w-9 place-items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
          >
            <RevenueIcon />
          </button>
          <button
            type="button"
            onClick={onOpenInvoices}
            aria-label="Invoices"
            className="tap relative grid h-9 w-9 place-items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
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
            aria-label="Settings"
            className="tap grid h-9 w-9 place-items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-28 pt-5">
        {upcoming.length === 0 && past.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-6">
                {groups.map((g) => (
                  <section key={g.date.toISOString()}>
                    <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
                      {formatDayLabel(g.date, now)}
                    </p>
                    <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
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
                  className="tap flex w-full items-center justify-between px-0.5 py-1 text-[12px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
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
                  <ul className="card mt-2 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden opacity-90">
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
                    className="tap mt-2 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 text-[12.5px] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white"
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
            className="pointer-events-auto tap flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 px-5 py-3.5 text-[15px] font-medium text-white dark:text-neutral-900 shadow-lg shadow-neutral-900/15 hover:bg-black dark:hover:bg-neutral-200"
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
  const labels = normalizeServices(b.services)
    .map(({ id, qty }) => {
      const name = labelFor(id);
      if (!name) return undefined;
      return qty > 1 ? `${name} × ${qty}` : name;
    })
    .filter((s): s is string => Boolean(s));

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="flex w-[60px] shrink-0 flex-col items-start pt-0.5">
          <span className="text-[14.5px] font-semibold leading-tight tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatTime(start)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-neutral-900 dark:text-neutral-100">
            {b.address || 'No address'}
          </p>
          <p className="truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
            {clientLine ?? 'No client'}
          </p>
          {labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {labels.slice(0, 3).map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="pill border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-600 dark:text-neutral-400"
                >
                  {label}
                </span>
              ))}
              {labels.length > 3 && (
                <span className="pill text-neutral-400 dark:text-neutral-500">+{labels.length - 3}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[14px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {currency(bookingTotal(b))}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
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
  const firstService = normalizeServices(b.services)
    .map(({ id }) => labelFor(id))
    .find(Boolean);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <span className="w-12 shrink-0 text-[12px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
          {dateLabel}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-neutral-800 dark:text-neutral-200">
            {b.address || 'No address'}
          </p>
          <p className="truncate text-[11.5px] text-neutral-500 dark:text-neutral-400">
            {clientLine ?? firstService ?? '—'}
          </p>
        </div>
        <span className="shrink-0 text-[13px] font-medium tabular-nums text-neutral-700 dark:text-neutral-300">
          {currency(bookingTotal(b))}
        </span>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
            className="stroke-neutral-900 dark:stroke-neutral-100"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="13"
            r="3.5"
            className="stroke-neutral-900 dark:stroke-neutral-100"
            strokeWidth="1.6"
          />
        </svg>
      </div>
      <h2 className="text-[17px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">
        Book your first shoot
      </h2>
      <p className="mt-1.5 max-w-[20rem] text-[13.5px] leading-snug text-neutral-500 dark:text-neutral-400">
        Tap the button below — address, day, time, services. Done in under 30 seconds.
      </p>
    </div>
  );
}

function RevenueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 20V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 20v-9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 20h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
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
