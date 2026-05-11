import type { Booking, Invoice, Service } from '../types';
import { bookingTotal } from './bookings';

export const GST_RATE = 0.05;
/** QST is computed independently of GST in Quebec (de-compounded since 2013). */
export const QST_RATE = 0.09975;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Auto-generated invoice number for the given year.
 * Format: `YYYY-NNN`, where NNN is max(existing-in-year) + 1, zero-padded.
 */
export const nextInvoiceNumber = (invoices: Invoice[], year: number): string => {
  const prefix = `${year}-`;
  let max = 0;
  for (const inv of invoices) {
    if (!inv.number.startsWith(prefix)) continue;
    const tail = inv.number.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
};

/** Sum of pre-tax totals for every booking still linked to this invoice. */
export const invoiceSubtotal = (
  invoice: Pick<Invoice, 'bookingIds'>,
  bookings: Booking[],
): number => {
  const byId = new Map(bookings.map((b) => [b.id, b]));
  let sum = 0;
  for (const id of invoice.bookingIds) {
    const b = byId.get(id);
    if (b) sum += bookingTotal(b);
  }
  return round2(sum);
};

export type InvoiceTaxes = {
  subtotal: number;
  gst: number;
  qst: number;
  total: number;
};

/**
 * Apply each tax independently to the pre-tax subtotal (no compounding —
 * Quebec de-compounded QST in 2013). Round each tax to the cent before
 * summing so the printed lines add up exactly.
 */
export const invoiceTaxes = (
  subtotal: number,
  gstRate: number,
  qstRate: number,
): InvoiceTaxes => {
  const sub = round2(subtotal);
  const gst = round2(sub * gstRate);
  const qst = round2(sub * qstRate);
  return { subtotal: sub, gst, qst, total: round2(sub + gst + qst) };
};

export type InvoiceLine = {
  bookingId: string;
  dateLabel: string;
  addressLabel: string;
  serviceLabels: string[];
  travelLabel?: string;
  amount: number;
};

export const invoiceLines = (
  invoice: Pick<Invoice, 'bookingIds'>,
  bookings: Booking[],
  services: Service[],
): InvoiceLine[] => {
  const serviceById = new Map(services.map((s) => [s.id, s]));
  const bookingById = new Map(bookings.map((b) => [b.id, b]));
  const lines: InvoiceLine[] = [];
  for (const id of invoice.bookingIds) {
    const b = bookingById.get(id);
    if (!b) continue;
    const labels = b.services
      .map((sid) => serviceById.get(sid)?.name)
      .filter((s): s is string => Boolean(s));
    lines.push({
      bookingId: b.id,
      dateLabel: new Date(b.scheduledAt).toISOString().slice(0, 10),
      addressLabel: b.address || '(no address)',
      serviceLabels: labels,
      travelLabel:
        b.travelKm && b.travelFee
          ? `${b.travelKm.toFixed(1)} km travel`
          : undefined,
      amount: bookingTotal(b),
    });
  }
  return lines;
};

/** Map of bookingId → invoiceId. Used to answer "is this booking on an
 *  invoice?" in O(1) without denormalising the link onto Booking itself. */
export const bookingToInvoiceIndex = (
  invoices: Invoice[],
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const inv of invoices) {
    if (inv.status === 'void') continue;
    for (const bid of inv.bookingIds) map.set(bid, inv.id);
  }
  return map;
};
