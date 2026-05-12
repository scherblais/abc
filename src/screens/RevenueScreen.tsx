import { useMemo, useState } from 'react';
import type { Booking, Company, Invoice } from '../types';
import { computeYearStats, groupByMonth, yearCsv } from '../lib/revenue';
import { currency, currencyExact } from '../lib/format';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  bookings: Booking[];
  invoices: Invoice[];
  companies: Company[];
  bookingInvoiceIndex: Map<string, string>;
  onBack: () => void;
};

export function RevenueScreen({
  bookings,
  invoices,
  companies,
  bookingInvoiceIndex,
  onBack,
}: Props) {
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

  const [year, setYear] = useState(() => now.getFullYear());
  const yearStats = useMemo(
    () =>
      computeYearStats(year, bookings, invoices, companies, bookingInvoiceIndex),
    [year, bookings, invoices, companies, bookingInvoiceIndex],
  );

  const downloadCsv = () => {
    const csv = yearCsv(
      year,
      bookings,
      invoices,
      companies,
      bookingInvoiceIndex,
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lensbook-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        title="Revenue"
      />

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

        <YearSection
          stats={yearStats}
          year={year}
          onYearChange={setYear}
          onExportCsv={downloadCsv}
        />

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

function YearSection({
  stats,
  year,
  onYearChange,
  onExportCsv,
}: {
  stats: ReturnType<typeof computeYearStats>;
  year: number;
  onYearChange: (y: number) => void;
  onExportCsv: () => void;
}) {
  const years = stats.yearsAvailable.length > 0
    ? stats.yearsAvailable
    : [year];

  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Year
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <YearPicker year={year} years={years} onChange={onYearChange} />
            <span className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
              · {stats.shoots} shoot{stats.shoots === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={stats.shoots === 0}
          className="tap rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50"
        >
          Export CSV
        </button>
      </div>

      {stats.shoots === 0 ? (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          No shoots in {year}.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <Stat label="Revenue (pre-tax)" value={currencyExact(stats.revenue)} />
            <Stat label="GST collected" value={currencyExact(stats.gst)} />
            <Stat label="QST collected" value={currencyExact(stats.qst)} />
            <Stat label="Billed total" value={currencyExact(stats.total)} hint={`${currencyExact(stats.paid)} paid`} />
          </dl>

          <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            <p className="text-[11.5px] leading-snug text-neutral-500 dark:text-neutral-400">
              {currencyExact(stats.outstanding)} on sent (unpaid) invoices ·{' '}
              {currencyExact(stats.notInvoiced)} not yet invoiced ·{' '}
              {stats.km.toFixed(1)} km billed
            </p>
            <p className="mt-1 text-[11px] leading-snug text-neutral-400 dark:text-neutral-500">
              Tax amounts come from invoices that have left draft; shoots still
              on draft or no invoice don't contribute to GST / QST totals.
            </p>
          </div>

          {stats.byBrokerage.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                By brokerage
              </p>
              <ul className="space-y-2">
                {stats.byBrokerage.map((b) => (
                  <li
                    key={b.companyId ?? b.name}
                    className="flex items-baseline justify-between gap-3 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                      {b.name}
                      <span className="ml-1 text-[11.5px] text-neutral-400 dark:text-neutral-500">
                        · {b.shoots} shoot{b.shoots === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {currencyExact(b.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function YearPicker({
  year,
  years,
  onChange,
}: {
  year: number;
  years: number[];
  onChange: (y: number) => void;
}) {
  return (
    <select
      value={year}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1 text-[18px] font-semibold tracking-tightish tabular-nums text-neutral-900 dark:text-neutral-100"
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 text-[16px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}
