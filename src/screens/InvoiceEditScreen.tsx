import { useEffect, useMemo, useState } from 'react';
import type {
  Agent,
  Booking,
  Company,
  Invoice,
  InvoiceStatus,
  Settings,
} from '../types';
import { addDays } from '../lib/datetime';
import {
  currencyExact,
  formatInvoiceDate,
} from '../lib/format';
import {
  GST_RATE,
  QST_RATE,
  invoiceSubtotal,
  invoiceTaxes,
  nextInvoiceNumber,
} from '../lib/invoices';
import { ClientPicker } from '../components/ClientPicker';
import { INVOICE_STATUS_LABEL, StatusPill } from '../components/StatusPill';
import { ScreenHeader } from '../components/ScreenHeader';
import { RecordSyncLabel } from '../components/RecordSyncLabel';
import { recordPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  initial?: Invoice;
  invoices: Invoice[];
  bookings: Booking[];
  companies: Company[];
  agents: Agent[];
  settings: Settings;
  bookingIndex: Map<string, string>;
  /** When opening a brand-new invoice from a specific booking, preselect it. */
  preselectBookingId?: string;
  onSave: (invoice: Invoice) => void;
  onDelete?: () => void;
  onVoid?: () => void;
  onCancel: () => void;
  onOpenPrint: (id: string) => void;
  onCreateCompany: (name: string) => Company;
  onCreateAgent: (companyId: string, name: string) => Agent;
};

const buildInitial = (
  initial: Invoice | undefined,
  preselectBookingId: string | undefined,
  preselectCompanyId: string | undefined,
  invoices: Invoice[],
  settings: Settings,
): Invoice => {
  if (initial) return { ...initial, bookingIds: [...initial.bookingIds] };
  const now = new Date();
  return {
    id: '',
    number: nextInvoiceNumber(invoices, now.getFullYear()),
    companyId: preselectCompanyId ?? '',
    agentId: undefined,
    bookingIds: preselectBookingId ? [preselectBookingId] : [],
    billTo: { name: '' },
    business: {
      name: settings.businessName ?? '',
      address: settings.businessAddress,
      phone: settings.businessPhone,
      email: settings.businessEmail,
      gstNumber: settings.gstNumber,
      qstNumber: settings.qstNumber,
    },
    gstRate: GST_RATE,
    qstRate: QST_RATE,
    issuedAt: undefined,
    dueAt: undefined,
    paidAt: undefined,
    status: 'draft',
    notes: '',
    createdAt: now.toISOString(),
  };
};

export function InvoiceEditScreen({
  initial,
  invoices,
  bookings,
  companies,
  agents,
  settings,
  bookingIndex,
  preselectBookingId,
  onSave,
  onDelete,
  onVoid,
  onCancel,
  onOpenPrint,
  onCreateCompany,
  onCreateAgent,
}: Props) {
  const invoiceUid = useUid();
  const preselectCompanyId = preselectBookingId
    ? bookings.find((b) => b.id === preselectBookingId)?.companyId
    : undefined;

  const [draft, setDraft] = useState<Invoice>(() =>
    buildInitial(initial, preselectBookingId, preselectCompanyId, invoices, settings),
  );
  const [numberError, setNumberError] = useState<string | null>(null);

  const isNew = !initial;
  const isLocked = draft.status === 'void';

  const company = companies.find((c) => c.id === draft.companyId);

  // Bookings eligible to attach: same company, not on another non-void invoice.
  const eligibleBookings = useMemo(() => {
    return bookings
      .filter((b) => b.companyId && b.companyId === draft.companyId)
      .filter((b) => {
        const inv = bookingIndex.get(b.id);
        return !inv || inv === draft.id;
      })
      .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  }, [bookings, draft.companyId, draft.id, bookingIndex]);

  const subtotal = invoiceSubtotal(draft, bookings);
  const taxes = invoiceTaxes(subtotal, draft.gstRate, draft.qstRate);

  // Number-collision validation.
  useEffect(() => {
    const trimmed = draft.number.trim();
    if (!trimmed) {
      setNumberError('Invoice number is required');
      return;
    }
    const clash = invoices.some(
      (i) => i.id !== draft.id && i.number === trimmed,
    );
    setNumberError(clash ? 'That invoice number is already used' : null);
  }, [draft.number, draft.id, invoices]);

  // When the company changes, drop any agent that doesn't belong + drop bookings
  // attached to the old company.
  useEffect(() => {
    setDraft((p) => {
      const agentOk = p.agentId && agents.some((a) => a.id === p.agentId && a.companyId === p.companyId);
      const cleanBookings = p.bookingIds.filter((bid) => {
        const b = bookings.find((x) => x.id === bid);
        return b && b.companyId === p.companyId;
      });
      if (agentOk && cleanBookings.length === p.bookingIds.length) return p;
      return {
        ...p,
        agentId: agentOk ? p.agentId : undefined,
        bookingIds: cleanBookings,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.companyId]);

  const toggleBooking = (id: string) => {
    setDraft((p) => {
      const has = p.bookingIds.includes(id);
      return {
        ...p,
        bookingIds: has ? p.bookingIds.filter((x) => x !== id) : [...p.bookingIds, id],
      };
    });
  };

  const setStatus = (next: InvoiceStatus) => {
    setDraft((p) => {
      const now = new Date();
      const updates: Partial<Invoice> = { status: next };
      // First transition out of draft snapshots billing identity + sets issuedAt.
      if (p.status === 'draft' && next !== 'draft') {
        updates.issuedAt = p.issuedAt ?? now.toISOString();
        const days = settings.defaultPaymentTermsDays ?? 30;
        if (!p.dueAt && updates.issuedAt) {
          updates.dueAt = addDays(new Date(updates.issuedAt), days).toISOString();
        }
        const billTo: { name: string; address?: string } = (() => {
          const ag = agents.find((a) => a.id === p.agentId);
          const co = companies.find((c) => c.id === p.companyId);
          const name = ag && co ? `${ag.name}\n${co.name}` : co?.name ?? ag?.name ?? '';
          return { name };
        })();
        updates.billTo = p.billTo.name ? p.billTo : billTo;
        updates.business = p.business.name
          ? p.business
          : {
              name: settings.businessName ?? '',
              address: settings.businessAddress,
              phone: settings.businessPhone,
              email: settings.businessEmail,
              gstNumber: settings.gstNumber,
              qstNumber: settings.qstNumber,
            };
      }
      if (next === 'paid' && !p.paidAt) updates.paidAt = now.toISOString();
      return { ...p, ...updates };
    });
  };

  const canSave =
    !numberError &&
    draft.companyId &&
    draft.bookingIds.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    // Auto-snapshot bill-to if still empty (covers the user saving a draft
    // before transitioning status).
    let final = { ...draft };
    if (!final.billTo.name) {
      const ag = agents.find((a) => a.id === final.agentId);
      const co = companies.find((c) => c.id === final.companyId);
      final.billTo = {
        name: ag && co ? `${ag.name}\n${co.name}` : co?.name ?? ag?.name ?? '',
      };
    }
    onSave(final);
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
        title={isNew ? 'New invoice' : draft.number}
        right={
          <button
            type="button"
            onClick={handleSave}
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
      {!isNew && invoiceUid && draft.status === 'draft' && (
        <div className="-mx-4 flex justify-center border-b border-neutral-100 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/40 px-4 py-1.5">
          <RecordSyncLabel path={recordPath(invoiceUid, 'invoices', draft.id)} />
        </div>
      )}

      <div className="flex-1 pb-12 pt-5">
        <section className="card mb-5 p-5">
          <ClientPicker
            companies={companies}
            agents={agents}
            companyId={draft.companyId || undefined}
            agentId={draft.agentId}
            onChange={(companyId, agentId) =>
              setDraft((p) => ({
                ...p,
                companyId: companyId ?? '',
                agentId,
              }))
            }
            onCreateCompany={onCreateCompany}
            onCreateAgent={onCreateAgent}
          />

          <label className="mt-4 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Invoice number
          </label>
          <input
            value={draft.number}
            onChange={(e) => setDraft((p) => ({ ...p, number: e.target.value }))}
            disabled={isLocked}
            className="input mt-1.5"
          />
          {numberError && (
            <p className="mt-1 text-[11.5px] text-red-600 dark:text-red-400">{numberError}</p>
          )}
        </section>

        <section className="card mb-5 p-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Shoots</p>
            {!isLocked && draft.companyId && eligibleBookings.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const allSelected =
                    draft.bookingIds.length === eligibleBookings.length;
                  setDraft((p) => ({
                    ...p,
                    bookingIds: allSelected
                      ? []
                      : eligibleBookings.map((b) => b.id),
                  }));
                }}
                className="tap text-[12px] font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                {draft.bookingIds.length === eligibleBookings.length
                  ? 'Clear all'
                  : 'Select all'}
              </button>
            )}
          </div>
          {!draft.companyId ? (
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              Pick a brokerage to see eligible shoots.
            </p>
          ) : eligibleBookings.length === 0 ? (
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400">
              No uninvoiced shoots for {company?.name ?? 'this brokerage'}.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {eligibleBookings.map((b) => {
                const selected = draft.bookingIds.includes(b.id);
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => !isLocked && toggleBooking(b.id)}
                      disabled={isLocked}
                      className={[
                        'tap flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left',
                        selected
                          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'grid h-4 w-4 shrink-0 place-items-center rounded border',
                          selected
                            ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-900 dark:bg-neutral-900 dark:text-neutral-100'
                            : 'border-neutral-300 dark:border-neutral-600',
                        ].join(' ')}
                        aria-hidden
                      >
                        {selected && (
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 5.2L4.2 7.4L8 3" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">
                          {b.address || '(no address)'}
                        </span>
                        <span
                          className={[
                            'block text-[11.5px]',
                            selected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400',
                          ].join(' ')}
                        >
                          {formatInvoiceDate(b.scheduledAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                        {currencyExact(b.price + (b.travelFee ?? 0))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card mb-5 p-5">
          <p className="mb-2 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Totals</p>
          <TotalsRow label="Subtotal" value={taxes.subtotal} />
          {draft.gstRate > 0 && (
            <TotalsRow
              label={`GST ${(draft.gstRate * 100).toFixed(2)}%`}
              value={taxes.gst}
            />
          )}
          {draft.qstRate > 0 && (
            <TotalsRow
              label={`QST ${(draft.qstRate * 100).toFixed(3)}%`}
              value={taxes.qst}
            />
          )}
          <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
            <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">Total</span>
            <span className="text-[16px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {currencyExact(taxes.total)}
            </span>
          </div>
        </section>

        <section className="card mb-5 p-5">
          <p className="mb-2 text-[12px] font-medium text-neutral-500 dark:text-neutral-400">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {(['draft', 'sent', 'paid'] as InvoiceStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => !isLocked && setStatus(s)}
                disabled={isLocked}
                className={[
                  'tap rounded-md border px-3 py-1.5 text-[12.5px] font-medium',
                  draft.status === s
                    ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600',
                ].join(' ')}
              >
                {INVOICE_STATUS_LABEL[s]}
              </button>
            ))}
            {draft.status === 'void' && <StatusPill status="void" />}
          </div>

          {draft.status !== 'draft' && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DateField
                label="Issued"
                value={draft.issuedAt}
                onChange={(v) =>
                  setDraft((p) => ({ ...p, issuedAt: v || undefined }))
                }
                disabled={isLocked}
              />
              <DateField
                label="Due"
                value={draft.dueAt}
                onChange={(v) =>
                  setDraft((p) => ({ ...p, dueAt: v || undefined }))
                }
                disabled={isLocked}
              />
            </div>
          )}
          {draft.status === 'paid' && (
            <div className="mt-2">
              <DateField
                label="Paid"
                value={draft.paidAt}
                onChange={(v) =>
                  setDraft((p) => ({ ...p, paidAt: v || undefined }))
                }
                disabled={isLocked}
              />
            </div>
          )}
        </section>

        <section className="card mb-5 p-5">
          <label className="block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Notes (printed on invoice)
          </label>
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
            disabled={isLocked}
            rows={3}
            placeholder="Payment terms, e-transfer email, thank-you note…"
            className="input mt-1.5 resize-none"
          />
        </section>

        {!isNew && (
          <button
            type="button"
            onClick={() => onOpenPrint(draft.id)}
            className="tap mb-3 w-full rounded-lg bg-neutral-900 dark:bg-neutral-100 py-2.5 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            Print / Save as PDF
          </button>
        )}

        {!isNew && draft.status === 'draft' && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this draft invoice? Shoots will be released.')) {
                onDelete();
              }
            }}
            className="btn-destructive"
          >
            Delete draft
          </button>
        )}
        {!isNew && draft.status !== 'draft' && draft.status !== 'void' && onVoid && (
          <button
            type="button"
            onClick={() => {
              if (
                confirm(
                  'Void this invoice? It stays on the list but its shoots are released.',
                )
              ) {
                onVoid();
              }
            }}
            className="btn-destructive"
          >
            Void invoice
          </button>
        )}
      </div>
    </div>
  );
}

function TotalsRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-[13px] text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="text-[13.5px] tabular-nums text-neutral-900 dark:text-neutral-100">
        {currencyExact(value)}
      </span>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isoDay = value ? value.slice(0, 10) : '';
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <input
        type="date"
        value={isoDay}
        onChange={(e) => {
          if (!e.target.value) onChange('');
          else onChange(new Date(e.target.value + 'T00:00:00').toISOString());
        }}
        disabled={disabled}
        className="input-compact mt-1"
      />
    </label>
  );
}
