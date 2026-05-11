import type { Booking } from '../types';

/** Total billable amount, including travel fee if present. */
export const bookingTotal = (b: Pick<Booking, 'price' | 'travelFee'>): number =>
  b.price + (b.travelFee ?? 0);
