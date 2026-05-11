import type { Booking } from '../types';
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
