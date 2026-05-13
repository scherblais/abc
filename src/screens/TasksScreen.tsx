import { useMemo } from 'react';
import type { Agent, Booking, Company, Service } from '../types';
import { normalizeServices } from '../lib/catalog';
import { currency } from '../lib/format';
import { bookingTotal } from '../lib/bookings';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  bookings: Booking[];
  catalog: Service[];
  companies: Company[];
  agents: Agent[];
  onBack: () => void;
  onAdd: () => void;
  onOpen: (b: Booking) => void;
};

/**
 * Lists bookings that haven't been scheduled yet — the "to do, but no
 * date pinned" pile. Same record shape as a regular shoot; tapping a
 * row opens the booking editor where the user can fill in a date and
 * promote it into the Home day-grouped view.
 */
export function TasksScreen({
  bookings,
  catalog,
  companies,
  agents,
  onBack,
  onAdd,
  onOpen,
}: Props) {
  const undated = useMemo(
    () =>
      bookings
        .filter((b) => !b.scheduledAt)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bookings],
  );

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
      if (b.client?.name) {
        return b.client.brokerage
          ? `${b.client.name} · ${b.client.brokerage}`
          : b.client.name;
      }
      return null;
    };
  }, [companies, agents]);

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
        title="Tasks"
        right={
          <button
            type="button"
            onClick={onAdd}
            className="tap rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-[13px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            + New
          </button>
        }
      />

      <main className="flex-1 pb-12 pt-5">
        {undated.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
              No tasks yet.
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
              Use this for shoots that don't have a date yet so you don't
              forget about them. Add a date later to schedule it.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
            >
              + New task
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            {undated.map((b) => (
              <Row
                key={b.id}
                b={b}
                labelFor={labelFor}
                clientLine={clientLineFor(b)}
                onClick={() => onOpen(b)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Row({
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
  const labels = normalizeServices(b.services)
    .map(({ id, qty }) => {
      const name = labelFor(id);
      if (!name) return undefined;
      return qty > 1 ? `${name} × ${qty}` : name;
    })
    .filter((s): s is string => Boolean(s));
  const total = bookingTotal(b);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
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
                <span className="pill text-neutral-400 dark:text-neutral-500">
                  +{labels.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          {total > 0 && (
            <span className="text-[14px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {currency(total)}
            </span>
          )}
          <span
            className="text-neutral-300 dark:text-neutral-600"
            aria-hidden
          >
            ›
          </span>
        </div>
      </button>
    </li>
  );
}
