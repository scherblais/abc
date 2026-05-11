import type { Booking } from '../types';

const KEY = 'lensbook.bookings.v1';

export const loadBookings = (): Booking[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveBookings = (bookings: Booking[]) => {
  localStorage.setItem(KEY, JSON.stringify(bookings));
};

export const newId = () =>
  // small ULID-ish id — sortable, no deps
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
