import { useEffect } from 'react';
import type { Booking, Invoice, Service } from '../types';
import { currencyExact, formatInvoiceDate } from '../lib/format';
import { invoiceLines, invoiceSubtotal, invoiceTaxes } from '../lib/invoices';

type Props = {
  invoice: Invoice;
  bookings: Booking[];
  services: Service[];
  onBack: () => void;
};

export function InvoicePrintScreen({ invoice, bookings, services, onBack }: Props) {
  // Auto-open the print dialog on mount. The user can still cancel and use the
  // visible toolbar buttons.
  useEffect(() => {
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, []);

  const lines = invoiceLines(invoice, bookings, services);
  const subtotal = invoiceSubtotal(invoice, bookings);
  const taxes = invoiceTaxes(subtotal, invoice.gstRate, invoice.qstRate);
  const hasGst = invoice.gstRate > 0;
  const hasQst = invoice.qstRate > 0;

  return (
    <div id="print-root" className="min-h-full bg-white text-neutral-900">
      <div className="no-print sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
          <button
            type="button"
            onClick={onBack}
            className="tap rounded-md px-2 py-1.5 text-[14px] text-neutral-600 hover:text-neutral-900"
          >
            ‹ Back
          </button>
          <p className="text-[12px] text-neutral-500">
            Tip: disable headers/footers in the print dialog for a clean PDF.
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="tap rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-black"
          >
            Print
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-10 py-12 print:px-12 print:py-10">
        <header className="flex items-start justify-between gap-8 border-b border-neutral-300 pb-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {invoice.business.name || 'Your business name'}
            </h1>
            {invoice.business.address && (
              <p className="mt-1 whitespace-pre-line text-[12.5px] text-neutral-600">
                {invoice.business.address}
              </p>
            )}
            <div className="mt-2 space-y-0.5 text-[11.5px] text-neutral-600">
              {invoice.business.gstNumber && (
                <p>GST # {invoice.business.gstNumber}</p>
              )}
              {invoice.business.qstNumber && (
                <p>QST # {invoice.business.qstNumber}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11.5px] uppercase tracking-wide text-neutral-500">
              Invoice
            </p>
            <p className="mt-0.5 text-[20px] font-semibold tabular-nums">
              {invoice.number}
            </p>
            {invoice.status === 'void' && (
              <p className="mt-1 text-[14px] font-semibold uppercase tracking-wide text-red-600">
                Void
              </p>
            )}
            {invoice.status === 'paid' && (
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-emerald-700">
                Paid
                {invoice.paidAt ? ` · ${formatInvoiceDate(invoice.paidAt)}` : ''}
              </p>
            )}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 py-6">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Billed to
            </p>
            <p className="mt-1 whitespace-pre-line text-[13px] text-neutral-900">
              {invoice.billTo.name || '—'}
            </p>
            {invoice.billTo.address && (
              <p className="mt-1 whitespace-pre-line text-[12px] text-neutral-600">
                {invoice.billTo.address}
              </p>
            )}
          </div>
          <div className="text-right">
            {invoice.issuedAt && (
              <DateLine label="Issued" value={invoice.issuedAt} />
            )}
            {invoice.dueAt && <DateLine label="Due" value={invoice.dueAt} />}
            {invoice.paidAt && <DateLine label="Paid" value={invoice.paidAt} />}
          </div>
        </section>

        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="py-6 text-center text-[12px] text-neutral-500"
                >
                  No shoots on this invoice.
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr
                  key={l.bookingId}
                  className="border-b border-neutral-100 align-top"
                >
                  <td className="py-3 pr-4 tabular-nums text-neutral-700">
                    {l.dateLabel}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-neutral-900">
                      {l.addressLabel}
                    </p>
                    {l.serviceLabels.length > 0 && (
                      <p className="mt-0.5 text-[11.5px] text-neutral-600">
                        {l.serviceLabels.join(' · ')}
                      </p>
                    )}
                    {l.travelLabel && (
                      <p className="text-[11.5px] text-neutral-500">
                        {l.travelLabel}
                      </p>
                    )}
                  </td>
                  <td className="py-3 text-right tabular-nums text-neutral-900">
                    {currencyExact(l.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <section className="mt-6 ml-auto w-full max-w-xs space-y-1 text-[12.5px]">
          <TotalsLine label="Subtotal" value={taxes.subtotal} />
          {hasGst && (
            <TotalsLine
              label={`GST ${(invoice.gstRate * 100).toFixed(2)}%`}
              value={taxes.gst}
            />
          )}
          {hasQst && (
            <TotalsLine
              label={`QST ${(invoice.qstRate * 100).toFixed(3)}%`}
              value={taxes.qst}
            />
          )}
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-neutral-300 pt-2 text-[14px] font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{currencyExact(taxes.total)}</span>
          </div>
        </section>

        {invoice.notes && (
          <section className="mt-8 border-t border-neutral-200 pt-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-500">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-line text-[12.5px] text-neutral-700">
              {invoice.notes}
            </p>
          </section>
        )}

        <footer className="mt-12 text-center text-[11px] text-neutral-400">
          Thank you for your business.
        </footer>
      </article>
    </div>
  );
}

function DateLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[12px] text-neutral-700">
      <span className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </span>{' '}
      <span className="tabular-nums">{formatInvoiceDate(value)}</span>
    </p>
  );
}

function TotalsLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums text-neutral-900">
        {currencyExact(value)}
      </span>
    </div>
  );
}
