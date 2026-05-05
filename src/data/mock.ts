export type AppointmentStatus = 'confirmed' | 'tentative' | 'needs_booking';

export type ServiceType =
  | 'Photo'
  | 'Photo + Video'
  | 'Twilight'
  | 'Drone'
  | 'Floor Plan'
  | '3D Tour';

export type Appointment = {
  id: string;
  client: string;
  brokerage?: string;
  address: string;
  city: string;
  scheduledAt: string; // ISO; only meaningful when status !== 'needs_booking'
  durationMin: number;
  services: ServiceType[];
  price: number;
  status: AppointmentStatus;
  // For listings that need to be booked: a deadline (e.g. when the listing goes live)
  listingGoesLiveOn?: string; // ISO date
  notes?: string;
};

export type Invoice = {
  id: string;
  appointmentId: string;
  paidAt: string; // ISO
  amount: number;
};

const iso = (d: Date) => d.toISOString();

const today = new Date('2026-05-05T09:00:00');
const at = (daysFromToday: number, hour: number, minute = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, minute, 0, 0);
  return iso(d);
};
const dateOnly = (daysFromToday: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(0, 0, 0, 0);
  return iso(d);
};

export const appointments: Appointment[] = [
  // Today
  {
    id: 'a1',
    client: 'Maya Chen',
    brokerage: 'Compass',
    address: '482 Linden Ave',
    city: 'Oakland',
    scheduledAt: at(0, 11, 0),
    durationMin: 90,
    services: ['Photo', 'Drone'],
    price: 425,
    status: 'confirmed',
  },
  {
    id: 'a2',
    client: 'Daniel Rivera',
    brokerage: 'Coldwell Banker',
    address: '17 Seacliff Dr',
    city: 'Sausalito',
    scheduledAt: at(0, 15, 30),
    durationMin: 120,
    services: ['Photo + Video', '3D Tour'],
    price: 875,
    status: 'confirmed',
  },
  // Tomorrow
  {
    id: 'a3',
    client: 'Priya Shah',
    brokerage: 'Sotheby’s',
    address: '2210 Webster St, Apt 7B',
    city: 'San Francisco',
    scheduledAt: at(1, 9, 0),
    durationMin: 60,
    services: ['Photo'],
    price: 295,
    status: 'confirmed',
  },
  {
    id: 'a4',
    client: 'Jordan Lee',
    address: '88 Marina Blvd',
    city: 'Berkeley',
    scheduledAt: at(1, 17, 45),
    durationMin: 45,
    services: ['Twilight'],
    price: 240,
    status: 'tentative',
    notes: 'Awaiting access code from listing agent',
  },
  // Later this week
  {
    id: 'a5',
    client: 'Elena Park',
    brokerage: 'Compass',
    address: '6 Hillview Ct',
    city: 'Mill Valley',
    scheduledAt: at(3, 10, 30),
    durationMin: 120,
    services: ['Photo + Video', 'Drone', 'Floor Plan'],
    price: 1150,
    status: 'confirmed',
  },
  {
    id: 'a6',
    client: 'Marcus Holloway',
    address: '309 Ashbury St',
    city: 'San Francisco',
    scheduledAt: at(4, 13, 0),
    durationMin: 75,
    services: ['Photo', 'Floor Plan'],
    price: 480,
    status: 'confirmed',
  },

  // Need to be booked — leads / pending requests
  {
    id: 'n1',
    client: 'Sarah Whitfield',
    brokerage: 'Vanguard Properties',
    address: '120 Castro St',
    city: 'San Francisco',
    scheduledAt: '',
    durationMin: 90,
    services: ['Photo', 'Drone'],
    price: 525,
    status: 'needs_booking',
    listingGoesLiveOn: dateOnly(2),
    notes: 'Wants morning light — owner home until 10am',
  },
  {
    id: 'n2',
    client: 'Tomás Aguilar',
    brokerage: 'Keller Williams',
    address: '47 Glenmoor Pl',
    city: 'San Rafael',
    scheduledAt: '',
    durationMin: 60,
    services: ['Photo'],
    price: 295,
    status: 'needs_booking',
    listingGoesLiveOn: dateOnly(5),
  },
  {
    id: 'n3',
    client: 'Beth Okafor',
    address: '88 Sea Cliff Ln',
    city: 'Pacifica',
    scheduledAt: '',
    durationMin: 120,
    services: ['Photo + Video', '3D Tour'],
    price: 950,
    status: 'needs_booking',
    listingGoesLiveOn: dateOnly(7),
    notes: 'Reply with 2 time options',
  },
  {
    id: 'n4',
    client: 'Henry Watanabe',
    brokerage: 'Compass',
    address: '14 Buena Vista Terrace',
    city: 'San Francisco',
    scheduledAt: '',
    durationMin: 45,
    services: ['Twilight'],
    price: 260,
    status: 'needs_booking',
    listingGoesLiveOn: dateOnly(1),
    notes: 'Tight turnaround — confirm today',
  },
];

// Paid invoices — used for revenue calculations.
// Today is 2026-05-05, so "this month so far" = May 1–5, "last month" = April.
export const invoices: Invoice[] = [
  // April (last month) — 30 days, full month
  { id: 'i-apr-01', appointmentId: 'h1', paidAt: '2026-04-02T18:00:00Z', amount: 295 },
  { id: 'i-apr-02', appointmentId: 'h2', paidAt: '2026-04-03T18:00:00Z', amount: 480 },
  { id: 'i-apr-03', appointmentId: 'h3', paidAt: '2026-04-05T18:00:00Z', amount: 875 },
  { id: 'i-apr-04', appointmentId: 'h4', paidAt: '2026-04-07T18:00:00Z', amount: 425 },
  { id: 'i-apr-05', appointmentId: 'h5', paidAt: '2026-04-09T18:00:00Z', amount: 525 },
  { id: 'i-apr-06', appointmentId: 'h6', paidAt: '2026-04-10T18:00:00Z', amount: 295 },
  { id: 'i-apr-07', appointmentId: 'h7', paidAt: '2026-04-11T18:00:00Z', amount: 1150 },
  { id: 'i-apr-08', appointmentId: 'h8', paidAt: '2026-04-13T18:00:00Z', amount: 240 },
  { id: 'i-apr-09', appointmentId: 'h9', paidAt: '2026-04-15T18:00:00Z', amount: 425 },
  { id: 'i-apr-10', appointmentId: 'h10', paidAt: '2026-04-17T18:00:00Z', amount: 950 },
  { id: 'i-apr-11', appointmentId: 'h11', paidAt: '2026-04-18T18:00:00Z', amount: 295 },
  { id: 'i-apr-12', appointmentId: 'h12', paidAt: '2026-04-20T18:00:00Z', amount: 480 },
  { id: 'i-apr-13', appointmentId: 'h13', paidAt: '2026-04-22T18:00:00Z', amount: 525 },
  { id: 'i-apr-14', appointmentId: 'h14', paidAt: '2026-04-24T18:00:00Z', amount: 875 },
  { id: 'i-apr-15', appointmentId: 'h15', paidAt: '2026-04-25T18:00:00Z', amount: 240 },
  { id: 'i-apr-16', appointmentId: 'h16', paidAt: '2026-04-27T18:00:00Z', amount: 295 },
  { id: 'i-apr-17', appointmentId: 'h17', paidAt: '2026-04-28T18:00:00Z', amount: 480 },
  { id: 'i-apr-18', appointmentId: 'h18', paidAt: '2026-04-29T18:00:00Z', amount: 295 },

  // May (this month) — through May 5
  { id: 'i-may-01', appointmentId: 'h19', paidAt: '2026-05-01T17:00:00Z', amount: 425 },
  { id: 'i-may-02', appointmentId: 'h20', paidAt: '2026-05-02T17:00:00Z', amount: 875 },
  { id: 'i-may-03', appointmentId: 'h21', paidAt: '2026-05-02T20:00:00Z', amount: 295 },
  { id: 'i-may-04', appointmentId: 'h22', paidAt: '2026-05-04T17:00:00Z', amount: 525 },
  { id: 'i-may-05', appointmentId: 'h23', paidAt: '2026-05-05T15:00:00Z', amount: 480 },
];
