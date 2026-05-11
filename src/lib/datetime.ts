export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const setTime = (d: Date, hour: number, minute = 0) => {
  const x = new Date(d);
  x.setHours(hour, minute, 0, 0);
  return x;
};

// Next round half-hour from `from`, but never earlier than 8am same day.
// If past 6pm, jump to 9am next day.
export const suggestedNextSlot = (from: Date = new Date()): Date => {
  let d = new Date(from);
  d.setMinutes(d.getMinutes() + 30);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + (from.getMinutes() >= 30 ? 1 : 0));
  if (d.getHours() < 8) {
    d = setTime(d, 9);
  }
  if (d.getHours() >= 18) {
    d = setTime(addDays(d, 1), 9);
  }
  return d;
};

const pad = (n: number) => n.toString().padStart(2, '0');

// "YYYY-MM-DDTHH:MM" for <input type="datetime-local"> — local time, no Z
export const toLocalInputValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const fromLocalInputValue = (s: string): Date | null => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    0,
    0,
  );
};
