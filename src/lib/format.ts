import { isSameDay, addDays } from './datetime';

/** Whole-dollar CAD for in-app totals and totals breakdowns. */
export const currency = (n: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);

/** Invoice-grade CAD formatting (always 2 decimals). */
export const currencyExact = (n: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export const formatInvoiceDate = (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** "3:45pm" — compact 12h. We force 'en-US' for predictable AM/PM (en-CA
 *  inserts periods on some engines). */
export const formatTime = (d: Date) =>
  d
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s+/g, '');

export const formatDayLabel = (d: Date, today: Date = new Date()) => {
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, addDays(today, 1))) return 'Tomorrow';
  if (isSameDay(d, addDays(today, -1))) return 'Yesterday';
  return d.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

