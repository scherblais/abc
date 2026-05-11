export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description?: string;
};

export type LatLon = { lat: number; lon: number };

export type Settings = {
  startingAddress: string;
  startingCoords?: LatLon;
  /** No travel fee within this radius (km). */
  freeRadiusKm: number;
  /** Dollars per billable km. */
  perKmRate: number;
};

export type Booking = {
  id: string;
  address: string;
  scheduledAt: string; // ISO
  durationMin: number;
  /** Services price (does not include travel). */
  price: number;
  services: string[]; // service IDs (may include stale IDs after a service is removed)
  /** One-way distance from starting location at booking time, km. */
  travelKm?: number;
  /** Travel fee charged on this booking. */
  travelFee?: number;
  /** Resolved address coordinates at booking time. */
  coords?: LatLon;
  client: {
    name?: string;
    phone?: string;
    email?: string;
    brokerage?: string;
  };
  notes?: string;
  createdAt: string; // ISO
  source: 'me' | 'client_link';
};

export type DraftBooking = Omit<Booking, 'id' | 'createdAt' | 'source'>;

export type DraftService = Omit<Service, 'id'>;
