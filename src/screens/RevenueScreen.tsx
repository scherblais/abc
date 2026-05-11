import { useMemo } from 'react';
import type { Booking } from '../types';
import { groupByMonth } from '../lib/revenue';
import { currency } from '../lib/format';

type Props = {
  bookings: Booking[];
  onBack: () => void;
};

export function RevenueScreen({ bookings, onBack }: Props) {
  const now = useMemo(() => new Date(), []);
  const months = useMemo(() => groupByMonth(bookings, now), [bookings, now]);

  const total = months.reduce((sum, m) => sum + m.total, 0);
  const maxMonth = months.reduce((max, m) => Math.max(max, m.total), 0);

  // Find this month index + last month total for comparison.
  const thisIdx = months.findIndex((m) => m.isCurrent);
  const thisMonth = thisIdx >= 0 ? months[thisIdx] : undefined;
  const lastMonth = thisIdx >= 0 ? months[thisIdx + 1] : undefined;
  const delta = (() => {
    if (!thisMonth || !lastMonth || lastMonth.total === 0) return null;
    const pct = ((thisMonth.total - lastMonth.total) / lastMonth.total) * 100;
    return pct;
  })();

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
        >
          ‹ Back
        </button>
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">Revenue</h1>
        <span className="w-12" aria-hidden />
      </header>

      <main className="flex-1 pb-12 pt-5">
        {thisMonth && (
          <section className="card mb-6 p-5">
            <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">{thisMonth.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-[32px] font-semibold tracking-tightish tabular-nums text-neutral-900 dark:text-neutral-100">
                {currency(thisMonth.total)}
              </p>
              {delta !== null && (
                <span
                  className={[
                    'rounded-md border px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums',
                    delta >= 0
                      ? 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300'
                      : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 dark:text-neutral-400',
                  ].join(' ')}
                >
                  {delta >= 0 ? '+' : ''}
                  {delta.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              {thisMonth.count} shoot{thisMonth.count === 1 ? '' : 's'}
              {lastMonth && ` · ${currency(lastMonth.total)} in ${lastMonth.shortLabel}`}
            </p>
          </section>
        )}

        <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">By month</p>

        {months.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">No bookings yet.</p>
          </div>
        ) : (
          <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            {months.map((m) => {
              const widthPct = maxMonth > 0 ? (m.total / maxMonth) * 100 : 0;
              return (
                <li key={`${m.year}-${m.month}`} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14.5px] font-medium text-neutral-900 dark:text-neutral-100">
                        {m.label}
                        {m.isCurrent && (
                          <span className="ml-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                            so far
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-neutral-500 dark:text-neutral-400">
                        {m.count} shoot{m.count === 1 ? '' : 's'}
                      </p>
                    </div>
                    <p className="text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {currency(m.total)}
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full bg-neutral-900/80 transition-[width] duration-200"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10.5px] text-neutral-400 dark:text-neutral-500 tabular-nums">
                    {widthPct.toFixed(0)}% of peak ({currency(maxMonth)})
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {months.length > 0 && (
          <p className="mt-3 px-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
            All-time total {currency(total)} across {bookings.length} shoot
            {bookings.length === 1 ? '' : 's'}.
          </p>
        )}
      </main>
    </div>
  );
}
