/**
 * Tax filing deadlines for a QC self-employed individual.
 *
 * Assumptions baked in (most common for the target user):
 * - GST registered with CRA, QST registered with Revenu Québec.
 * - Annual filer, calendar fiscal year (Jan 1 → Dec 31).
 * - Sole proprietor (individual), not incorporated.
 *
 * Under those rules (CRA + RQ both):
 * - Sales-tax payment due:  April 30 of the year AFTER the fiscal year.
 * - Sales-tax filing due:   June 15 of the year AFTER the fiscal year.
 * - Income-tax payment due: April 30 (same).
 * - Income-tax filing due:  June 15 (self-employed extension).
 * - Quarterly instalments (optional, only if last year's tax > thresholds):
 *   Mar 15, Jun 15, Sep 15, Dec 15 of the SAME year.
 *
 * Everything returned is local time so the UI displays the date the user
 * sees on every CRA form, not a UTC-shifted one.
 */

export type DeadlineKind =
  | 'sales-tax-payment'
  | 'sales-tax-filing'
  | 'income-tax-payment'
  | 'income-tax-filing'
  | 'instalment';

export type Deadline = {
  kind: DeadlineKind;
  date: Date;
  label: string;
  /** Short verbal description ("Send GST + QST to CRA / RQ"). */
  what: string;
  /** Authority the cheque/transfer goes to. */
  authority?: string;
};

export function taxDeadlines(year: number): Deadline[] {
  const ny = year + 1;
  return [
    {
      kind: 'sales-tax-payment',
      date: new Date(ny, 3, 30), // April 30 of year+1
      label: 'Sales tax balance due',
      what: 'Pay GST balance (CRA) + QST balance (RQ) for ' + year,
    },
    {
      kind: 'sales-tax-filing',
      date: new Date(ny, 5, 15), // June 15 of year+1
      label: 'Sales tax return filed',
      what: 'File the annual GST + QST return for ' + year,
    },
    {
      kind: 'income-tax-payment',
      date: new Date(ny, 3, 30), // April 30 of year+1
      label: 'Income tax balance due',
      what: 'Pay any income tax owing for ' + year,
    },
    {
      kind: 'income-tax-filing',
      date: new Date(ny, 5, 15), // June 15 of year+1
      label: 'Income tax return filed',
      what: 'Self-employed filing deadline for ' + year,
    },
  ];
}

/** Quarterly instalment dates DURING `year` (Mar 15, Jun 15, Sep 15, Dec 15). */
export function instalmentDates(year: number): Deadline[] {
  return [
    [2, 15],
    [5, 15],
    [8, 15],
    [11, 15],
  ].map(([m, d], i) => ({
    kind: 'instalment' as const,
    date: new Date(year, m, d),
    label: `Instalment ${i + 1}`,
    what: `Quarterly tax instalment for ${year}`,
  }));
}

/** Pleasant relative-time hint: "in 3 months", "in 14 days", "overdue 2 weeks". */
export function relativeDeadline(d: Date, now: Date = new Date()): string {
  const ms = d.getTime() - now.getTime();
  const days = Math.round(ms / 86400000);
  if (days === 0) return 'today';
  if (days < 0) {
    const past = -days;
    if (past < 7) return `${past} day${past === 1 ? '' : 's'} overdue`;
    if (past < 30) return `${Math.round(past / 7)} weeks overdue`;
    return `${Math.round(past / 30)} months overdue`;
  }
  if (days <= 14) return `in ${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

/** Short month / day formatter that includes the year only when different
 *  from the current year (most-of-the-time it's known context). */
export function formatDeadlineDate(d: Date, now: Date = new Date()): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}
