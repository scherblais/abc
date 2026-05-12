import { useEffect, useRef, useState } from 'react';
import type { DraftExpense, Expense, ExpenseCategory } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field } from '../components/Field';
import { NumberField } from '../components/NumberField';
import { RecordSyncLabel } from '../components/RecordSyncLabel';
import { CATEGORY_LABEL, CATEGORY_ORDER, defaultQcTaxes } from '../lib/expenses';
import { recordPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  initial?: Expense;
  onSave: (draft: DraftExpense) => void;
  onDelete?: () => void;
  onCancel: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyDraft = (): DraftExpense => ({
  date: today(),
  amount: 0,
  category: 'gear',
  description: '',
});

const fromExpense = (e: Expense): DraftExpense => ({
  date: e.date,
  amount: e.amount,
  gst: e.gst,
  qst: e.qst,
  category: e.category,
  description: e.description,
  vendor: e.vendor,
  notes: e.notes,
});

export function ExpenseEditScreen({
  initial,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const uid = useUid();
  const [draft, setDraft] = useState<DraftExpense>(() =>
    initial ? fromExpense(initial) : emptyDraft(),
  );
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => descRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [initial]);

  const canSave =
    draft.description.trim().length > 0 && draft.amount >= 0 && draft.date.length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...draft,
      description: draft.description.trim(),
      vendor: draft.vendor?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
      gst: draft.gst && draft.gst > 0 ? draft.gst : undefined,
      qst: draft.qst && draft.qst > 0 ? draft.qst : undefined,
    });
  };

  const autoTaxes = () => {
    const t = defaultQcTaxes(draft.amount);
    setDraft((p) => ({ ...p, gst: t.gst, qst: t.qst }));
  };

  return (
    <div className="flex h-full min-h-full flex-col">
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onCancel}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Cancel
          </button>
        }
        title={initial ? 'Edit expense' : 'New expense'}
        right={
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={[
              'tap rounded-md px-3 py-1.5 text-[14px] font-medium',
              canSave
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
            ].join(' ')}
          >
            Save
          </button>
        }
      />
      {initial && uid && (
        <div className="-mx-4 flex justify-center border-b border-neutral-100 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/40 px-4 py-1.5">
          <RecordSyncLabel path={recordPath(uid, 'expenses', initial.id)} />
        </div>
      )}

      <div className="flex-1 pb-12 pt-5">
        <Field label="Description">
          <input
            ref={descRef}
            value={draft.description}
            onChange={(e) =>
              setDraft((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="e.g. 64 GB SD card"
            autoCapitalize="sentences"
            className="input"
          />
        </Field>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
            <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Date
            </span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) =>
                setDraft((p) => ({ ...p, date: e.target.value }))
              }
              className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
            />
          </label>
          <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
            <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              Amount (pre-tax)
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px] text-neutral-400 dark:text-neutral-500">
                $
              </span>
              <NumberField
                decimal
                min={0}
                step={1}
                value={draft.amount}
                onChange={(n) => setDraft((p) => ({ ...p, amount: n }))}
                className="mt-0.5 w-full bg-transparent pl-3.5 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </div>
          </label>
        </div>

        <Field label="Category">
          <select
            value={draft.category}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                category: e.target.value as ExpenseCategory,
              }))
            }
            className="input"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>

        <div className="mb-5">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 px-0.5">
            <label className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
              Sales taxes paid (ITC / ITR)
            </label>
            <button
              type="button"
              onClick={autoTaxes}
              className="tap text-[11.5px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Fill QC default
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
              <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                GST paid
              </span>
              <NumberField
                decimal
                min={0}
                step={0.01}
                value={draft.gst ?? 0}
                onChange={(n) => setDraft((p) => ({ ...p, gst: n }))}
                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </label>
            <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
              <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                QST paid
              </span>
              <NumberField
                decimal
                min={0}
                step={0.01}
                value={draft.qst ?? 0}
                onChange={(n) => setDraft((p) => ({ ...p, qst: n }))}
                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </label>
          </div>
          <p className="mt-1.5 px-0.5 text-[11.5px] leading-snug text-neutral-500 dark:text-neutral-400">
            Track GST / QST you paid to claim them back as Input Tax
            Credits / Input Tax Refunds.
          </p>
        </div>

        <Field label="Vendor" hint="optional">
          <input
            value={draft.vendor ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, vendor: e.target.value }))}
            placeholder="Best Buy, B&H, Adobe…"
            autoCapitalize="words"
            className="input"
          />
        </Field>

        <Field label="Notes" hint="optional">
          <input
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Receipt #, project, justification"
            className="input"
          />
        </Field>

        {initial && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this expense?')) onDelete();
            }}
            className="btn-destructive mt-8"
          >
            Delete expense
          </button>
        )}
      </div>
    </div>
  );
}
