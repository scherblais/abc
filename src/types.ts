export type Service = {
  id: string;
  name: string;
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
  /** Optional Google Maps API key — DEPRECATED. Kept here only so that
   *  pre-existing localStorage entries from older versions still parse;
   *  the live key now lives in src/config.ts. */
  googleApiKey?: string;
  /** Business identity for invoices (snapshotted onto each invoice at issue). */
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  gstNumber?: string;
  qstNumber?: string;
  /** Days added to issuedAt to auto-compute dueAt. Default 30. */
  defaultPaymentTermsDays?: number;
};

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';

export type Invoice = {
  id: string;
  number: string; // "2026-001"
  companyId: string;
  agentId?: string;
  bookingIds: string[];
  /** Snapshot at issue time so a deleted brokerage doesn't blank out the
   *  historical record. */
  billTo: { name: string; address?: string };
  business: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    gstNumber?: string;
    qstNumber?: string;
  };
  /** Snapshot of the tax rates at issue time (0.05, 0.09975 today). */
  gstRate: number;
  qstRate: number;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
};

export type Company = {
  id: string;
  name: string;
  notes?: string;
  /** Per-service price overrides, keyed by Service.id. When a service has an
   *  entry here, this number replaces the catalog price for any booking
   *  attached to this brokerage. Agents at this brokerage inherit it. */
  pricing?: Record<string, number>;
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

/** A line item on a booking. Strings are accepted for backward compatibility
 *  with legacy data (treated as qty 1); new writes always use the object form. */
export type BookingServiceEntry = string | { id: string; qty: number };

export type Booking = {
  id: string;
  address: string;
  /** ISO timestamp of when the shoot is scheduled. Optional — bookings
   *  without a date are reminders that show up in the Tasks tab; they
   *  become regular shoots the moment a date is set. */
  scheduledAt?: string;
  /** Services price (does not include travel). */
  price: number;
  services: BookingServiceEntry[]; // service IDs (may include stale IDs after a service is removed)
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

/** Business expense categories. Fixed list mirrors common CRA / RQ
 *  T2125 / TP-80 line items so the year-end view can roll up by category
 *  without per-user customisation. */
export type ExpenseCategory =
  | 'gear'
  | 'software'
  | 'vehicle'
  | 'phone'
  | 'marketing'
  | 'insurance'
  | 'memberships'
  | 'education'
  | 'office'
  | 'fees'
  | 'travel'
  | 'meals'
  | 'other';

export type Expense = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD anchor)
  /** Pre-tax amount in CAD. */
  amount: number;
  /** GST paid on this expense (recoverable as Input Tax Credit). */
  gst?: number;
  /** QST paid on this expense (recoverable as Input Tax Refund). */
  qst?: number;
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  notes?: string;
  /** Receipt photo (Firebase Storage). `path` is the storage object path,
   *  retained so we can delete it cleanly on Replace / Remove. */
  receipt?: { url: string; path: string; contentType?: string };
  createdAt: string; // ISO
};

export type DraftExpense = Omit<Expense, 'id' | 'createdAt'>;

export type DraftCompany = Omit<Company, 'id' | 'createdAt'>;
export type DraftAgent = Omit<Agent, 'id' | 'createdAt'>;
export type DraftInvoice = Omit<Invoice, 'id' | 'createdAt'>;
