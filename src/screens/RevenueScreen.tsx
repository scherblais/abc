import { useMemo, useState } from 'react';
import type { Booking, Company, Expense, Invoice } from '../types';
import { computeYearStats, groupByMonth, yearCsv } from '../lib/revenue';
import { computeExpenseYear } from '../lib/expenses';
import { currency, currencyExact } from '../lib/format';
import {
  formatDeadlineDate,
  instalmentDates,
  relativeDeadline,
  taxDeadlines,
  type Deadline,
} from '../lib/tax-deadlines';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  bookings: Booking[];
  invoices: Invoice[];
  companies: Company[];
  expenses: Expense[];
  bookingInvoiceIndex: Map<string, string>;
  onBack: () => void;
  onOpenExpenses: () => void;
};

export function RevenueScreen({
  bookings,
  invoices,
  companies,
  expenses,
  bookingInvoiceIndex,
  onBack,
  onOpenExpenses,
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
  const expenseStats = useMemo(
    () => computeExpenseYear(year, expenses),
    [year, expenses],
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

      <main className="flex-1 pb-24 pt-5">
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
          expenseStats={expenseStats}
          year={year}
          onYearChange={setYear}
          onExportCsv={downloadCsv}
          onOpenExpenses={onOpenExpenses}
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
  expenseStats,
  year,
  onYearChange,
  onExportCsv,
  onOpenExpenses,
}: {
  stats: ReturnType<typeof computeYearStats>;
  expenseStats: ReturnType<typeof computeExpenseYear>;
  year: number;
  onYearChange: (y: number) => void;
  onExportCsv: () => void;
  onOpenExpenses: () => void;
}) {
  const years = mergeYears(stats.yearsAvailable, expenseStats.yearsAvailable, year);
  const netIncome = stats.revenue - expenseStats.amount;
  const netGst = stats.gst - expenseStats.gst;
  const netQst = stats.qst - expenseStats.qst;
  const empty = stats.shoots === 0 && expenseStats.count === 0;

  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Year
          </p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <YearPicker year={year} years={years} onChange={onYearChange} />
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

      {empty ? (
        <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
          Nothing logged for {year} yet.
        </p>
      ) : (
        <div className="space-y-5">
          {/* ----------------- You charged ----------------- */}
          <SubSection
            label="You charged"
            sub={`${stats.shoots} shoot${stats.shoots === 1 ? '' : 's'}`}
          >
            <Row label="Services + travel" value={currencyExact(stats.revenue)} />
            <Row label="GST collected (5%)" value={currencyExact(stats.gst)} muted={stats.gst === 0} />
            <Row label="QST collected (9.975%)" value={currencyExact(stats.qst)} muted={stats.qst === 0} />
            <Row label="Billed total" value={currencyExact(stats.total)} strong />
            <p className="mt-1.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
              {currencyExact(stats.paid)} paid · {currencyExact(stats.outstanding)} sent &amp; outstanding ·{' '}
              {currencyExact(stats.notInvoiced)} not yet on an invoice
            </p>
          </SubSection>

          {/* ----------------- You spent ----------------- */}
          <SubSection
            label="You spent"
            sub={`${expenseStats.count} expense${expenseStats.count === 1 ? '' : 's'}`}
            action={{ label: 'Manage ›', onClick: onOpenExpenses }}
          >
            {expenseStats.count === 0 ? (
              <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                No expenses yet for {year}.
              </p>
            ) : (
              <>
                <Row label="Pre-tax expenses" value={currencyExact(expenseStats.amount)} />
                <Row label="GST paid (ITC)" value={currencyExact(expenseStats.gst)} muted={expenseStats.gst === 0} />
                <Row label="QST paid (ITR)" value={currencyExact(expenseStats.qst)} muted={expenseStats.qst === 0} />
                <Row label="Total paid out" value={currencyExact(expenseStats.total)} strong />
              </>
            )}
          </SubSection>

          {/* ----------------- Tax filing ----------------- */}
          <TaxFilingSubsection
            year={year}
            netIncome={netIncome}
            stats={stats}
            expenseStats={expenseStats}
            netGst={netGst}
            netQst={netQst}
          />

          {/* ----------------- By brokerage ----------------- */}
          {stats.byBrokerage.length > 0 && (
            <SubSection label="By brokerage">
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
            </SubSection>
          )}
        </div>
      )}
    </section>
  );
}

function TaxFilingSubsection({
  year,
  netIncome,
  stats,
  expenseStats,
  netGst,
  netQst,
}: {
  year: number;
  netIncome: number;
  stats: ReturnType<typeof computeYearStats>;
  expenseStats: ReturnType<typeof computeExpenseYear>;
  netGst: number;
  netQst: number;
}) {
  const now = useMemo(() => new Date(), []);
  // Sales-tax payment date is the canonical "send the cheque" date — paste
  // it onto each obligation row so the user sees who / how much / by when
  // on one line.
  const deadlines = useMemo(() => taxDeadlines(year), [year]);
  const salesTaxPayDate = deadlines.find(
    (d) => d.kind === 'sales-tax-payment',
  )!.date;

  return (
    <SubSection label="Tax filing" sub={`for ${year}`}>
      <Row
        label="Net income (revenue − expenses)"
        value={currencyExact(netIncome)}
        strong
      />
      <ObligationRow
        label="GST"
        authority="CRA"
        collected={stats.gst}
        paid={expenseStats.gst}
        net={netGst}
        dueOn={salesTaxPayDate}
        now={now}
      />
      <ObligationRow
        label="QST"
        authority="RQ"
        collected={stats.qst}
        paid={expenseStats.qst}
        net={netQst}
        dueOn={salesTaxPayDate}
        now={now}
      />

      <div className="mt-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 px-3 py-2.5">
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Deadlines
        </p>
        <ul className="space-y-1.5">
          {deadlines.map((d) => (
            <DeadlineRow key={d.kind} d={d} now={now} />
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          Annual filer, sole prop, calendar year-end. Filing extension to
          June 15 — but any balance owing is due April 30.
        </p>
      </div>

      <details className="mt-2 text-[12px] text-neutral-500 dark:text-neutral-400">
        <summary className="cursor-pointer select-none rounded px-0.5 py-0.5 text-[11.5px] hover:text-neutral-900 dark:hover:text-white">
          Need quarterly instalments?
        </summary>
        <ul className="mt-1.5 space-y-1 px-0.5">
          {instalmentDates(year).map((d) => (
            <DeadlineRow key={d.kind + d.date.toISOString()} d={d} now={now} />
          ))}
        </ul>
        <p className="mt-1.5 px-0.5 text-[11px] leading-snug">
          Required if your prior-year tax owing was over $3,000 federal
          ($1,800 QC). If not, ignore this row.
        </p>
      </details>

      <p className="mt-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
        Estimates only — confirm with your accountant before remitting.
      </p>
    </SubSection>
  );
}

function DeadlineRow({ d, now }: { d: Deadline; now: Date }) {
  const rel = relativeDeadline(d.date, now);
  const overdue = d.date.getTime() < now.getTime();
  return (
    <li className="flex items-baseline justify-between gap-3 text-[12.5px]">
      <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">
        {d.label}
      </span>
      <span className="shrink-0 text-[12px] tabular-nums text-neutral-900 dark:text-neutral-100">
        {formatDeadlineDate(d.date, now)}{' '}
        <span
          className={
            overdue
              ? 'text-red-600 dark:text-red-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }
        >
          · {rel}
        </span>
      </span>
    </li>
  );
}

function SubSection({
  label,
  sub,
  action,
  children,
}: {
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
          {sub && (
            <span className="ml-1.5 text-[11px] normal-case text-neutral-400 dark:text-neutral-500">
              {sub}
            </span>
          )}
        </p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="tap text-[12px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            {action.label}
          </button>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={[
          'text-[13px]',
          strong
            ? 'font-semibold text-neutral-900 dark:text-neutral-100'
            : muted
              ? 'text-neutral-500 dark:text-neutral-400'
              : 'text-neutral-700 dark:text-neutral-300',
        ].join(' ')}
      >
        {label}
      </span>
      <span
        className={[
          'shrink-0 text-[13px] tabular-nums',
          strong
            ? 'font-semibold text-neutral-900 dark:text-neutral-100'
            : muted
              ? 'text-neutral-500 dark:text-neutral-400'
              : 'font-medium text-neutral-900 dark:text-neutral-100',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A "net tax owed" line that flips between "Pay" / "Refund" / "Even"
 * based on the sign of (collected − paid). Includes the filing deadline
 * so the user sees by-when at a glance.
 */
function ObligationRow({
  label,
  authority,
  collected,
  paid,
  net,
  dueOn,
  now,
}: {
  label: string;
  authority: string;
  collected: number;
  paid: number;
  net: number;
  dueOn?: Date;
  now?: Date;
}) {
  const owe = Math.round(net * 100) / 100;
  let verdict: string;
  let tone: string;
  if (owe > 0) {
    verdict = `Pay ${authority}`;
    tone = 'text-amber-700 dark:text-amber-300';
  } else if (owe < 0) {
    verdict = `Refund from ${authority}`;
    tone = 'text-emerald-700 dark:text-emerald-300';
  } else {
    verdict = 'Even';
    tone = 'text-neutral-500 dark:text-neutral-400';
  }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </span>
        <span className="shrink-0 text-[14px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
          {currencyExact(Math.abs(owe))}
        </span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-3 text-[11.5px] leading-snug">
        <span className="text-neutral-500 dark:text-neutral-400">
          Collected {currencyExact(collected)} − Paid {currencyExact(paid)}
        </span>
        <span className={`shrink-0 font-medium ${tone}`}>{verdict}</span>
      </div>
      {dueOn && owe > 0 && (
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          Due by {formatDeadlineDate(dueOn, now)} · {relativeDeadline(dueOn, now)}
        </p>
      )}
    </div>
  );
}

function mergeYears(a: number[], b: number[], fallback: number): number[] {
  const set = new Set<number>([...a, ...b]);
  if (set.size === 0) set.add(fallback);
  return [...set].sort((x, y) => y - x);
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

