import type { Package, Service, ServiceKey } from '../types';

export const SERVICES: Record<ServiceKey, Service> = {
  photo: { key: 'photo', label: 'Photo', durationMin: 60, basePrice: 295 },
  photo_video: { key: 'photo_video', label: 'Photo + Video', durationMin: 90, basePrice: 595 },
  drone: { key: 'drone', label: 'Drone', durationMin: 30, basePrice: 175 },
  twilight: { key: 'twilight', label: 'Twilight', durationMin: 45, basePrice: 240 },
  floor_plan: { key: 'floor_plan', label: 'Floor plan', durationMin: 20, basePrice: 95 },
  tour_3d: { key: 'tour_3d', label: '3D tour', durationMin: 45, basePrice: 295 },
};

export const PACKAGES: Package[] = [
  {
    id: 'photo-only',
    label: 'Photo only',
    services: ['photo'],
    durationMin: 60,
    price: 295,
    description: '~25 photos, next-day delivery',
  },
  {
    id: 'photo-drone',
    label: 'Photo + Drone',
    services: ['photo', 'drone'],
    durationMin: 90,
    price: 425,
    description: 'Standard listing combo',
  },
  {
    id: 'photo-video',
    label: 'Photo + Video',
    services: ['photo_video'],
    durationMin: 90,
    price: 695,
    description: 'Photos + cinematic walkthrough',
  },
  {
    id: 'full',
    label: 'Full package',
    services: ['photo_video', 'drone', 'tour_3d', 'floor_plan'],
    durationMin: 150,
    price: 1150,
    description: 'Photo, video, drone, 3D tour, floor plan',
  },
];

export const sumServices = (keys: ServiceKey[]) => {
  let dur = 0;
  let price = 0;
  for (const k of keys) {
    const s = SERVICES[k];
    dur += s.durationMin;
    price += s.basePrice;
  }
  return { durationMin: dur, price };
};

export const labelFor = (key: ServiceKey) => SERVICES[key].label;
