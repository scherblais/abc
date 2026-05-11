export type ServiceKey = 'photo' | 'photo_video' | 'drone' | 'twilight' | 'floor_plan' | 'tour_3d';

export type Service = {
  key: ServiceKey;
  label: string;
  durationMin: number;
  basePrice: number;
};

export type Package = {
  id: string;
  label: string;
  services: ServiceKey[];
  durationMin: number;
  price: number;
  description: string;
};

export type Booking = {
  id: string;
  address: string;
  scheduledAt: string; // ISO
  durationMin: number;
  services: ServiceKey[];
  price: number;
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
