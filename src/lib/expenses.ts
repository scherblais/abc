import type { Expense, ExpenseCategory } from '../types';

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  gear: 'Gear',
  software: 'Software',
  vehicle: 'Vehicle',
  phone: 'Phone & internet',
  marketing: 'Marketing',
  insurance: 'Insurance',
  memberships: 'Memberships',
  education: 'Education',
  office: 'Office',
  fees: 'Bank & card fees',
  travel: 'Travel',
  meals: 'Meals (50%)',
  other: 'Other',
};

export const CATEGORY_ORDER: ExpenseCategory[] = [
  'gear',
  'software',
  'vehicle',
  'phone',
  'marketing',
  'insurance',
  'memberships',
  'education',
  'office',
  'fees',
  'travel',
  'meals',
  'other',
];

export type ExpenseYearStats = {
  year: number;
  yearsAvailable: number[];
  count: number;
  amount: number; // pre-tax
  gst: number; // ITC
  qst: number; // ITR
  total: number; // amount + gst + qst (cash out)
  byCategory: Array<{
    category: ExpenseCategory;
    label: string;
    amount: number;
    count: number;
  }>;
};

/**
 * Roll up expenses for a year. Anchors on the expense's date year.
 * Pre-tax amount and GST/QST are summed independently so the QC ITC/ITR
 * figures match the user's filing (Quick Method users can choose to
 * ignore GST/QST collected here — left to the user/accountant).
 */
export function computeExpenseYear(
  year: number,
  expenses: Expense[],
): ExpenseYearStats {
  const yearsSet = new Set<number>();
  let count = 0;
  let amount = 0;
  let gst = 0;
  let qst = 0;
  const byCat = new Map<ExpenseCategory, { amount: number; count: number }>();

  for (const e of expenses) {
    const y = new Date(e.date).getFullYear();
    yearsSet.add(y);
    if (y !== year) continue;
    count += 1;
    amount += e.amount;
    if (typeof e.gst === 'number') gst += e.gst;
    if (typeof e.qst === 'number') qst += e.qst;
    const bucket = byCat.get(e.category) ?? { amount: 0, count: 0 };
    bucket.amount += e.amount;
    bucket.count += 1;
    byCat.set(e.category, bucket);
  }

  const r2 = (n: number) => Math.round(n * 100) / 100;
  const byCategory = CATEGORY_ORDER.map((cat) => {
    const v = byCat.get(cat);
    if (!v) return null;
    return {
      category: cat,
      label: CATEGORY_LABEL[cat],
      amount: r2(v.amount),
      count: v.count,
    };
  })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.amount - a.amount);

  return {
    year,
    yearsAvailable: [...yearsSet].sort((a, b) => b - a),
    count,
    amount: r2(amount),
    gst: r2(gst),
    qst: r2(qst),
    total: r2(amount + gst + qst),
    byCategory,
  };
}

/**
 * Compute a sensible default sales-tax split for an expense line — Quebec
 * combined rate (GST 5%, QST 9.975%) applied to a pre-tax amount. Used
 * by the form's "auto-fill taxes" button so the user doesn't have to
 * type them.
 */
export function defaultQcTaxes(preTax: number): { gst: number; qst: number } {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    gst: r2(preTax * 0.05),
    qst: r2(preTax * 0.09975),
  };
}

/** CSV export of expenses for a year — one row per expense. */
export function expensesCsv(year: number, expenses: Expense[]): string {
  const rows: string[] = [
    [
      'Date',
      'Category',
      'Description',
      'Vendor',
      'Amount (pre-tax)',
      'GST',
      'QST',
      'Total',
      'Notes',
    ]
      .map(escapeCsv)
      .join(','),
  ];
  const sorted = expenses
    .filter((e) => new Date(e.date).getFullYear() === year)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const e of sorted) {
    const gst = e.gst ?? 0;
    const qst = e.qst ?? 0;
    rows.push(
      [
        e.date,
        CATEGORY_LABEL[e.category],
        e.description,
        e.vendor ?? '',
        e.amount.toFixed(2),
        gst.toFixed(2),
        qst.toFixed(2),
        (e.amount + gst + qst).toFixed(2),
        e.notes ?? '',
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
