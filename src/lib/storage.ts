import type { Booking, Service, Settings } from '../types';

const BOOKINGS_KEY = 'lensbook.bookings.v1';
const SERVICES_KEY = 'lensbook.services.v1';
const SETTINGS_KEY = 'lensbook.settings.v1';

export const DEFAULT_SETTINGS: Settings = {
  startingAddress: 'Carignan, QC',
  freeRadiusKm: 25,
  perKmRate: 0.65,
};

export const loadBookings = (): Booking[] => {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveBookings = (bookings: Booking[]) => {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
};

export const loadServices = (): Service[] | null => {
  try {
    const raw = localStorage.getItem(SERVICES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Service[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveServices = (services: Service[]) => {
  localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
};

export const loadSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
