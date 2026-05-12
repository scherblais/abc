import type { Booking, Company, Invoice } from '../types';
import { bookingTotal } from './bookings';

export type MonthRevenue = {
  year: number;
  month: number; // 0-indexed
  label: string; // e.g. "May 2026"
  shortLabel: string; // e.g. "May"
  total: number;
  count: number;
  isCurrent: boolean;
};

const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/**
 * Group bookings into months. Includes any month that has at least one
 * booking, plus the current month even if empty. Sorted newest first.
 */
export const groupByMonth = (bookings: Booking[], now: Date): MonthRevenue[] => {
  const nowKey = monthKey(now);
  const groups = new Map<number, { year: number; month: number; total: number; count: number }>();

  for (const b of bookings) {
    const d = new Date(b.scheduledAt);
    const k = monthKey(d);
    const g = groups.get(k) ?? { year: d.getFullYear(), month: d.getMonth(), total: 0, count: 0 };
    g.total += bookingTotal(b);
    g.count += 1;
    groups.set(k, g);
  }

  if (!groups.has(nowKey)) {
    groups.set(nowKey, {
      year: now.getFullYear(),
      month: now.getMonth(),
      total: 0,
      count: 0,
    });
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([k, g]) => {
      const date = new Date(g.year, g.month, 1);
      return {
        year: g.year,
        month: g.month,
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        shortLabel: date.toLocaleDateString('en-US', { month: 'short' }),
        total: g.total,
        count: g.count,
        isCurrent: k === nowKey,
      };
    });
};

/* ============================================================
 *  Year-end / tax-time aggregation
 * ============================================================ */

export type BrokerageStat = {
  companyId: string | undefined;
  name: string;
  revenue: number; // pre-tax
  gst: number;
  qst: number;
  shoots: number;
  km: number;
};

export type YearStats = {
  year: number;
  yearsAvailable: number[]; // distinct years that have at least one booking
  shoots: number;
  km: number;
  revenue: number; // pre-tax, all shoots in year
  gst: number; // taxes attributed via the booking's invoice (sent/paid only)
  qst: number;
  total: number; // revenue + gst + qst
  /** Revenue on sent + paid invoices (i.e. billed). */
  billed: number;
  /** Revenue on PAID invoices specifically. */
  paid: number;
  /** Revenue billed but not yet paid (sent status). */
  outstanding: number;
  /** Revenue not yet attached to any non-void invoice. */
  notInvoiced: number;
  byBrokerage: BrokerageStat[]; // sorted by revenue desc
};

/**
 * Compute year-end aggregates anchored on the booking's scheduledAt year.
 * GST / QST are attributed via the booking's invoice (sent / paid only) so
 * the numbers line up with what was actually collected for tax filing.
 */
export function computeYearStats(
  year: number,
  bookings: Booking[],
  invoices: Invoice[],
  companies: Company[],
  bookingInvoiceIndex: Map<string, string>,
): YearStats {
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const yearsSet = new Set<number>();
  let shoots = 0;
  let revenue = 0;
  let gst = 0;
  let qst = 0;
  let km = 0;
  let billed = 0;
  let paid = 0;
  let outstanding = 0;
  let notInvoiced = 0;

  const byCompany = new Map<string, BrokerageStat>();

  for (const b of bookings) {
    const d = new Date(b.scheduledAt);
    const y = d.getFullYear();
    yearsSet.add(y);
    if (y !== year) continue;

    const total = bookingTotal(b);
    const invId = bookingInvoiceIndex.get(b.id);
    const inv = invId ? invoiceById.get(invId) : undefined;
    const onLiveInvoice = inv && inv.status !== 'void' && inv.status !== 'draft';
    const onPaidInvoice = inv && inv.status === 'paid';

    shoots += 1;
    revenue += total;
    if (typeof b.travelKm === 'number') km += b.travelKm;

    let bookingGst = 0;
    let bookingQst = 0;
    if (onLiveInvoice && inv) {
      bookingGst = total * inv.gstRate;
      bookingQst = total * inv.qstRate;
      gst += bookingGst;
      qst += bookingQst;
      billed += total;
      if (onPaidInvoice) paid += total;
      else outstanding += total;
    } else {
      notInvoiced += total;
    }

    const companyKey = b.companyId ?? '__none__';
    const companyName =
      (b.companyId && companyById.get(b.companyId)) ||
      b.client?.brokerage ||
      '(no brokerage)';
    const bucket = byCompany.get(companyKey) ?? {
      companyId: b.companyId,
      name: companyName,
      revenue: 0,
      gst: 0,
      qst: 0,
      shoots: 0,
      km: 0,
    };
    bucket.revenue += total;
    bucket.gst += bookingGst;
    bucket.qst += bookingQst;
    bucket.shoots += 1;
    if (typeof b.travelKm === 'number') bucket.km += b.travelKm;
    byCompany.set(companyKey, bucket);
  }

  // Round each subtotal to 2 decimals once at the boundary.
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const byBrokerage = [...byCompany.values()]
    .map((s) => ({
      ...s,
      revenue: r2(s.revenue),
      gst: r2(s.gst),
      qst: r2(s.qst),
      km: r2(s.km),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalAll = r2(revenue + gst + qst);
  return {
    year,
    yearsAvailable: [...yearsSet].sort((a, b) => b - a),
    shoots,
    km: r2(km),
    revenue: r2(revenue),
    gst: r2(gst),
    qst: r2(qst),
    total: totalAll,
    billed: r2(billed),
    paid: r2(paid),
    outstanding: r2(outstanding),
    notInvoiced: r2(notInvoiced),
    byBrokerage,
  };
}

/** CSV export of every booking attached to the given year. One row per
 *  booking. The accountant gets the raw inputs to re-aggregate however
 *  they like. */
export function yearCsv(
  year: number,
  bookings: Booking[],
  invoices: Invoice[],
  companies: Company[],
  bookingInvoiceIndex: Map<string, string>,
): string {
  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const rows: string[] = [
    [
      'Date',
      'Address',
      'Brokerage',
      'Services subtotal',
      'Travel km',
      'Travel fee',
      'Booking total',
      'Invoice number',
      'Invoice status',
      'GST rate',
      'QST rate',
      'GST amount',
      'QST amount',
      'Billed total',
    ]
      .map(escapeCsv)
      .join(','),
  ];

  const dated = bookings
    .filter((b) => new Date(b.scheduledAt).getFullYear() === year)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  for (const b of dated) {
    const date = new Date(b.scheduledAt).toISOString().slice(0, 10);
    const total = bookingTotal(b);
    const invId = bookingInvoiceIndex.get(b.id);
    const inv = invId ? invoiceById.get(invId) : undefined;
    const billable = inv && inv.status !== 'void' && inv.status !== 'draft';
    const gst = billable ? total * (inv?.gstRate ?? 0) : 0;
    const qst = billable ? total * (inv?.qstRate ?? 0) : 0;
    const company = b.companyId && companyById.get(b.companyId);
    rows.push(
      [
        date,
        b.address || '',
        company || b.client?.brokerage || '',
        (b.price ?? 0).toFixed(2),
        typeof b.travelKm === 'number' ? b.travelKm.toFixed(2) : '',
        typeof b.travelFee === 'number' ? b.travelFee.toFixed(2) : '',
        total.toFixed(2),
        inv?.number ?? '',
        inv?.status ?? '',
        inv ? (inv.gstRate * 100).toFixed(3) + '%' : '',
        inv ? (inv.qstRate * 100).toFixed(3) + '%' : '',
        billable ? gst.toFixed(2) : '',
        billable ? qst.toFixed(2) : '',
        billable ? (total + gst + qst).toFixed(2) : '',
      ]
        .map(escapeCsv)
        .join(','),
    );
  }
  return rows.join('\n');
}

function escapeCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
