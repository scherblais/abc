import { useMemo } from 'react';
import type { Expense } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { currencyExact } from '../lib/format';
import { CATEGORY_LABEL, computeExpenseYear, expensesCsv } from '../lib/expenses';

type Props = {
  expenses: Expense[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (e: Expense) => void;
};

export function ExpensesScreen({ expenses, onBack, onAdd, onEdit }: Props) {
  const now = useMemo(() => new Date(), []);
  const thisYear = now.getFullYear();
  const stats = useMemo(
    () => computeExpenseYear(thisYear, expenses),
    [thisYear, expenses],
  );

  const sorted = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );

  // Group by year for the list.
  const groups = useMemo(() => {
    const map = new Map<number, Expense[]>();
    for (const e of sorted) {
      const y = new Date(e.date).getFullYear();
      const arr = map.get(y) ?? [];
      arr.push(e);
      map.set(y, arr);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, items]) => ({ year, items }));
  }, [sorted]);

  const downloadCsv = () => {
    const csv = expensesCsv(thisYear, expenses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lensbook-expenses-${thisYear}.csv`;
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
        title="Expenses"
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
        <section className="card mb-6 p-5">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
                {thisYear}
              </p>
              <p className="mt-0.5 text-[28px] font-semibold tracking-tightish tabular-nums text-neutral-900 dark:text-neutral-100">
                {currencyExact(stats.amount)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
                {stats.count} expense{stats.count === 1 ? '' : 's'} this year
              </p>
            </div>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={stats.count === 0}
              className="tap rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                GST paid (ITC)
              </p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {currencyExact(stats.gst)}
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
              <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                QST paid (ITR)
              </p>
              <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {currencyExact(stats.qst)}
              </p>
            </div>
          </div>
          {stats.byCategory.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <p className="mb-2 text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                By category
              </p>
              <ul className="space-y-1.5">
                {stats.byCategory.map((c) => (
                  <li
                    key={c.category}
                    className="flex items-baseline justify-between gap-3 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                      {c.label}
                      <span className="ml-1 text-[11.5px] text-neutral-400 dark:text-neutral-500">
                        · {c.count}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                      {currencyExact(c.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {expenses.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
              No expenses yet.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
            >
              + Log your first expense
            </button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.year} className="mb-5">
              <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
                {g.year} · {g.items.length}
              </p>
              <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                {g.items.map((e) => (
                  <Row key={e.id} expense={e} onClick={() => onEdit(e)} />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function Row({
  expense,
  onClick,
}: {
  expense: Expense;
  onClick: () => void;
}) {
  const gst = expense.gst ?? 0;
  const qst = expense.qst ?? 0;
  const billed = expense.amount + gst + qst;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-medium text-neutral-900 dark:text-neutral-100">
            {expense.description || '(no description)'}
            {expense.receipt && (
              <span
                aria-label="Receipt attached"
                title="Receipt attached"
                className="ml-1.5 inline-flex translate-y-[1px] text-neutral-400 dark:text-neutral-500"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="m20.5 11.5-8 8a4 4 0 1 1-5.7-5.7l9-9a2.7 2.7 0 0 1 3.8 3.8l-9 9a1.4 1.4 0 0 1-2-2l8.5-8.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </p>
          <p className="truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
            {CATEGORY_LABEL[expense.category]}
            {expense.vendor ? ` · ${expense.vendor}` : ''}
            {' · '}
            {expense.date}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[14px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {currencyExact(billed)}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}
