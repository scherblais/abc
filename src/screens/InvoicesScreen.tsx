import { useMemo, useState } from 'react';
import type { Booking, Company, Invoice, InvoiceStatus } from '../types';
import { currencyExact, formatInvoiceDate } from '../lib/format';
import { invoiceSubtotal, invoiceTaxes } from '../lib/invoices';
import { INVOICE_STATUS_LABEL, StatusPill } from '../components/StatusPill';

type Props = {
  invoices: Invoice[];
  bookings: Booking[];
  companies: Company[];
  onBack: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
};

const STATUS_ORDER: InvoiceStatus[] = ['draft', 'sent', 'paid'];

export function InvoicesScreen({
  invoices,
  bookings,
  companies,
  onBack,
  onNew,
  onOpen,
}: Props) {
  const [showVoid, setShowVoid] = useState(false);

  const companyName = useMemo(() => {
    const byId = new Map(companies.map((c) => [c.id, c.name]));
    return (id?: string) => (id ? byId.get(id) : undefined);
  }, [companies]);

  const grouped = useMemo(() => {
    const out: Record<InvoiceStatus, Invoice[]> = {
      draft: [],
      sent: [],
      paid: [],
      void: [],
    };
    for (const inv of invoices) out[inv.status].push(inv);
    for (const k of Object.keys(out) as InvoiceStatus[]) {
      out[k].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return out;
  }, [invoices]);

  const totalsFor = (inv: Invoice) => {
    const sub = invoiceSubtotal(inv, bookings);
    return invoiceTaxes(sub, inv.gstRate, inv.qstRate);
  };

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 hover:text-neutral-900"
        >
          ‹ Back
        </button>
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900">
          Invoices
        </h1>
        <button
          type="button"
          onClick={onNew}
          className="tap rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-black"
        >
          + New
        </button>
      </header>

      <main className="flex-1 pb-12 pt-4">
        {invoices.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600">No invoices yet.</p>
            <button
              type="button"
              onClick={onNew}
              className="tap mt-4 rounded-md bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-black"
            >
              + Create your first invoice
            </button>
          </div>
        ) : (
          <>
            {STATUS_ORDER.map((status) => {
              const list = grouped[status];
              if (list.length === 0) return null;
              return (
                <section key={status} className="mb-5">
                  <p className="mb-2 px-0.5 text-[12px] font-medium text-neutral-500">
                    {INVOICE_STATUS_LABEL[status]} · {list.length}
                  </p>
                  <ul className="card divide-y divide-neutral-100 overflow-hidden">
                    {list.map((inv) => (
                      <Row
                        key={inv.id}
                        invoice={inv}
                        totals={totalsFor(inv)}
                        companyName={
                          inv.billTo.name || companyName(inv.companyId) || '(unknown)'
                        }
                        onClick={() => onOpen(inv.id)}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}

            {grouped.void.length > 0 && (
              <section className="mb-5">
                <button
                  type="button"
                  onClick={() => setShowVoid((v) => !v)}
                  className="tap mb-2 flex w-full items-center justify-between px-0.5 text-[12px] font-medium text-neutral-500 hover:text-neutral-700"
                >
                  <span>
                    Void · {grouped.void.length}
                  </span>
                  <span
                    className={`transition-transform ${showVoid ? 'rotate-90' : ''}`}
                    aria-hidden
                  >
                    ›
                  </span>
                </button>
                {showVoid && (
                  <ul className="card divide-y divide-neutral-100 overflow-hidden">
                    {grouped.void.map((inv) => (
                      <Row
                        key={inv.id}
                        invoice={inv}
                        totals={totalsFor(inv)}
                        companyName={
                          inv.billTo.name || companyName(inv.companyId) || '(unknown)'
                        }
                        onClick={() => onOpen(inv.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Row({
  invoice,
  totals,
  companyName,
  onClick,
}: {
  invoice: Invoice;
  totals: { total: number };
  companyName: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="tap flex w-full items-stretch gap-3 px-4 py-3 text-left hover:bg-neutral-50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-[14.5px] font-medium text-neutral-900">
              {invoice.number}
            </p>
            <StatusPill status={invoice.status} />
          </div>
          <p className="truncate text-[12.5px] text-neutral-500">
            {companyName} · {invoice.bookingIds.length}{' '}
            {invoice.bookingIds.length === 1 ? 'shoot' : 'shoots'}
            {invoice.issuedAt
              ? ` · issued ${formatInvoiceDate(invoice.issuedAt)}`
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between pt-0.5">
          <span className="text-[14px] font-semibold tabular-nums text-neutral-900">
            {currencyExact(totals.total)}
          </span>
          <span className="text-neutral-300" aria-hidden>
            ›
          </span>
        </div>
      </button>
    </li>
  );
}
