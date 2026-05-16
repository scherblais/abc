import { useEffect, useMemo, useRef, useState } from 'react';
import type { DraftExpense, Expense, ExpenseCategory } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field } from '../components/Field';
import { NumberField } from '../components/NumberField';
import { ReceiptUpload } from '../components/ReceiptUpload';
import { RecordSyncLabel } from '../components/RecordSyncLabel';
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  expenseTotal,
  splitFromTotal,
  type TaxMode,
} from '../lib/expenses';
import { currencyExact } from '../lib/format';
import { deleteReceipt, uploadReceipt } from '../lib/receipts';
import { recordPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  initial?: Expense;
  /** Stable id used both for the eventual Expense record and for the
   *  Storage path of any receipt picked in this form. */
  formId: string;
  onSave: (draft: DraftExpense, id: string) => void;
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
  receipt: e.receipt,
});

const TAX_MODES: { value: TaxMode; label: string; hint: string }[] = [
  { value: 'qc', label: 'QC (5% + 9.975%)', hint: 'GST + QST' },
  { value: 'gst', label: 'GST only (5%)', hint: 'out-of-province' },
  { value: 'none', label: 'No tax', hint: 'exempt' },
];

/** Infer the tax mode from an existing expense's stored breakdown so the
 *  form re-opens in the same state the user saved it in. */
function inferMode(e: Expense | undefined): TaxMode {
  if (!e) return 'qc';
  const gst = e.gst ?? 0;
  const qst = e.qst ?? 0;
  if (gst === 0 && qst === 0) return 'none';
  if (qst === 0) return 'gst';
  return 'qc';
}

export function ExpenseEditScreen({
  initial,
  formId,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const uid = useUid();
  const [draft, setDraft] = useState<DraftExpense>(() =>
    initial ? fromExpense(initial) : emptyDraft(),
  );
  const [mode, setMode] = useState<TaxMode>(() => inferMode(initial));
  // The user types the *total* (after-tax). The pre-tax + tax breakdown is
  // derived from this + the current mode and re-applied to the draft on
  // every change.
  const [total, setTotal] = useState<number>(() =>
    initial ? expenseTotal(initial.amount, initial.gst, initial.qst) : 0,
  );
  // Receipt picker state. `pendingFile` is uploaded on Save (lazy, so a
  // Cancel doesn't leave orphaned blobs in Storage). `removed` flags an
  // existing receipt for deletion.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const existingReceipt = initial?.receipt ?? null;
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => descRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [initial]);

  // Recompute the breakdown into draft whenever total or mode changes.
  useEffect(() => {
    const split = splitFromTotal(total, mode);
    setDraft((p) => ({
      ...p,
      amount: split.amount,
      gst: split.gst,
      qst: split.qst,
    }));
  }, [total, mode]);

  const split = useMemo(() => splitFromTotal(total, mode), [total, mode]);

  const canSave =
    !uploading &&
    draft.description.trim().length > 0 &&
    total > 0 &&
    draft.date.length > 0;

  const save = async () => {
    if (!canSave) return;

    let nextReceipt = draft.receipt;
    try {
      if (pendingFile && uid) {
        setUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        nextReceipt = await uploadReceipt(
          uid,
          formId,
          pendingFile,
          setUploadProgress,
        );
      } else if (removed) {
        nextReceipt = undefined;
      }
    } catch (err) {
      console.error('[receipt] save failed:', err);
      setUploading(false);
      const code = (err as { code?: string })?.code;
      const message =
        code === 'storage/unauthorized'
          ? "Couldn't upload: Storage rules block this write. Publish storage.rules in the Firebase Console (Storage → Rules)."
          : code === 'storage/unknown' || code === 'storage/object-not-found'
            ? "Couldn't upload: is Firebase Storage enabled for this project? (Console → Storage → Get started.)"
            : ((err as { message?: string })?.message ?? 'Receipt upload failed.');
      setUploadError(message);
      return;
    }

    onSave(
      {
        ...draft,
        description: draft.description.trim(),
        vendor: draft.vendor?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
        gst: split.gst > 0 ? split.gst : undefined,
        qst: split.qst > 0 ? split.qst : undefined,
        amount: split.amount,
        receipt: nextReceipt,
      },
      formId,
    );

    // Best-effort: clean up the previously stored receipt after the save
    // commits. Skip when the new receipt happens to live at the same path
    // (uploadReceipt overwrites in place when extension is identical).
    const oldPath = existingReceipt?.path;
    if (oldPath && oldPath !== nextReceipt?.path) {
      void deleteReceipt(oldPath);
    }
    setUploading(false);
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
            {uploading ? 'Saving…' : 'Save'}
          </button>
        }
      />
      {initial && uid && (
        <div className="-mx-4 flex justify-center border-b border-neutral-100 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/40 px-4 py-1.5">
          <RecordSyncLabel path={recordPath(uid, 'expenses', initial.id)} />
        </div>
      )}
      {uploadError && (
        <div
          role="alert"
          className="-mx-4 border-b border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-2.5"
        >
          <p className="text-[12.5px] leading-snug text-red-800 dark:text-red-300">
            {uploadError}
          </p>
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
              Total paid
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px] text-neutral-400 dark:text-neutral-500">
                $
              </span>
              <NumberField
                decimal
                min={0}
                step={1}
                value={total}
                onChange={setTotal}
                className="mt-0.5 w-full bg-transparent pl-3.5 text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </div>
          </label>
        </div>

        <div className="mb-5">
          <p className="mb-1.5 px-0.5 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Tax on this receipt
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TAX_MODES.map((m) => {
              const selected = mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={[
                    'tap rounded-lg border px-2 py-2 text-left',
                    selected
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-200 bg-white text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600',
                  ].join(' ')}
                  aria-pressed={selected}
                >
                  <span className="block text-[12.5px] font-medium leading-tight">
                    {m.label}
                  </span>
                  <span
                    className={[
                      'block text-[11px] leading-tight',
                      selected
                        ? 'text-white/70 dark:text-neutral-900/70'
                        : 'text-neutral-500 dark:text-neutral-400',
                    ].join(' ')}
                  >
                    {m.hint}
                  </span>
                </button>
              );
            })}
          </div>
          <Breakdown split={split} mode={mode} />
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

        <Field
          label="Receipt"
          hint={uid ? 'optional · photo or PDF' : 'sign in to attach'}
        >
          <ReceiptUpload
            existing={existingReceipt}
            pendingFile={pendingFile}
            removed={removed}
            disabled={!uid || uploading}
            onPick={(f) => {
              setPendingFile(f);
              if (f) setRemoved(false);
              setUploadError(null);
            }}
            onRemove={() => {
              setRemoved(true);
              setUploadError(null);
            }}
            onUndoRemove={() => setRemoved(false)}
          />
          {uploading && (
            <p className="mt-1.5 px-0.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              Uploading receipt… {uploadProgress}%
            </p>
          )}
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

function Breakdown({
  split,
  mode,
}: {
  split: { amount: number; gst: number; qst: number };
  mode: TaxMode;
}) {
  if (split.amount === 0 && split.gst === 0 && split.qst === 0) {
    return (
      <p className="mt-2 px-0.5 text-[11.5px] leading-snug text-neutral-500 dark:text-neutral-400">
        Enter the total you paid above. The app will split it into pre-tax +
        taxes.
      </p>
    );
  }
  return (
    <dl className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 px-3 py-2 text-[12px]">
      <Cell label="Pre-tax" value={currencyExact(split.amount)} />
      <Cell
        label="GST"
        value={mode === 'none' ? '—' : currencyExact(split.gst)}
        muted={mode === 'none'}
      />
      <Cell
        label="QST"
        value={mode === 'qc' ? currencyExact(split.qst) : '—'}
        muted={mode !== 'qc'}
      />
    </dl>
  );
}

function Cell({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd
        className={[
          'mt-0.5 text-[13px] font-semibold tabular-nums',
          muted
            ? 'text-neutral-400 dark:text-neutral-500'
            : 'text-neutral-900 dark:text-neutral-100',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
