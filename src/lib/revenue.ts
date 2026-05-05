import type { Invoice } from '../data/mock';

export type RevenueComparison = {
  thisMonthTotal: number;
  lastMonthToDateTotal: number;
  lastMonthFullTotal: number;
  /** Day-of-month we're comparing through (1-indexed) */
  comparisonDay: number;
  /** % change vs same period last month */
  pctChangeVsLastMonthToDate: number;
  /** Daily series for "this month so far" — used to draw the spark area */
  thisMonthDaily: { day: number; total: number }[];
  /** Daily series for "last month, same window" — overlay for context */
  lastMonthDaily: { day: number; total: number }[];
};

const startOfMonth = (d: Date) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
};

const inRange = (iso: string, start: Date, end: Date) => {
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
};

export const buildRevenueComparison = (invoices: Invoice[], today: Date): RevenueComparison => {
  const thisMonthStart = startOfMonth(today);
  const thisMonthSoFarEnd = new Date(today);
  thisMonthSoFarEnd.setHours(23, 59, 59, 999);

  const lastMonthRef = new Date(today);
  lastMonthRef.setMonth(lastMonthRef.getMonth() - 1);
  const lastMonthStart = startOfMonth(lastMonthRef);
  const lastMonthEnd = endOfMonth(lastMonthRef);

  // "Last month, through the same day" — clamp to actual last-month length
  const comparisonDay = today.getDate();
  const lmtdEnd = new Date(lastMonthStart);
  const daysInLastMonth = lastMonthEnd.getDate();
  lmtdEnd.setDate(Math.min(comparisonDay, daysInLastMonth));
  lmtdEnd.setHours(23, 59, 59, 999);

  let thisMonthTotal = 0;
  let lastMonthToDateTotal = 0;
  let lastMonthFullTotal = 0;

  const thisMonthByDay = new Map<number, number>();
  const lastMonthByDay = new Map<number, number>();

  for (const inv of invoices) {
    const paid = new Date(inv.paidAt);

    if (inRange(inv.paidAt, thisMonthStart, thisMonthSoFarEnd)) {
      thisMonthTotal += inv.amount;
      const day = paid.getDate();
      thisMonthByDay.set(day, (thisMonthByDay.get(day) ?? 0) + inv.amount);
    }
    if (inRange(inv.paidAt, lastMonthStart, lmtdEnd)) {
      lastMonthToDateTotal += inv.amount;
    }
    if (inRange(inv.paidAt, lastMonthStart, lastMonthEnd)) {
      lastMonthFullTotal += inv.amount;
      const day = paid.getDate();
      lastMonthByDay.set(day, (lastMonthByDay.get(day) ?? 0) + inv.amount);
    }
  }

  const pct =
    lastMonthToDateTotal === 0
      ? thisMonthTotal > 0
        ? 100
        : 0
      : ((thisMonthTotal - lastMonthToDateTotal) / lastMonthToDateTotal) * 100;

  const cumulative = (byDay: Map<number, number>, throughDay: number) => {
    const out: { day: number; total: number }[] = [];
    let running = 0;
    for (let d = 1; d <= throughDay; d += 1) {
      running += byDay.get(d) ?? 0;
      out.push({ day: d, total: running });
    }
    return out;
  };

  return {
    thisMonthTotal,
    lastMonthToDateTotal,
    lastMonthFullTotal,
    comparisonDay,
    pctChangeVsLastMonthToDate: pct,
    thisMonthDaily: cumulative(thisMonthByDay, comparisonDay),
    lastMonthDaily: cumulative(lastMonthByDay, comparisonDay),
  };
};
