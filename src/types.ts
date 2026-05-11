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
  /** Optional Google Maps Platform key. When set, Geocoding API + Routes API
   *  are used (road distance). Otherwise we fall back to Nominatim + haversine. */
  googleApiKey?: string;
};

export type Company = {
  id: string;
  name: string;
  notes?: string;
  createdAt: string; // ISO
};

export type Agent = {
  id: string;
  companyId: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt: string; // ISO
};

/** The seller / tenant at the property being shot. Per-booking, never reused. */
export type Occupant = {
  name?: string;
  phone?: string;
  email?: string;
  /** Gate code, lockbox code, key location, etc. */
  accessNotes?: string;
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
  /** Hiring brokerage (required when an agent is set). */
  companyId?: string;
  /** Specific agent. Optional — a company may book without naming an agent. */
  agentId?: string;
  /** Seller / tenant info. */
  occupant?: Occupant;
  /** Legacy free-form client info, only present on bookings made before the
   *  Companies + Agents tables existed. Read-only fallback for display. */
  client?: {
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
export type DraftCompany = Omit<Company, 'id' | 'createdAt'>;
export type DraftAgent = Omit<Agent, 'id' | 'createdAt'>;
