export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description?: string;
};

export type Booking = {
  id: string;
  address: string;
  scheduledAt: string; // ISO
  durationMin: number;
  price: number;
  services: string[]; // service IDs (may include stale IDs after a service is removed)
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
