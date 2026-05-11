import type { Service } from '../types';

export const DEFAULT_CATALOG: Service[] = [
  {
    id: 'photo',
    name: 'Photo',
    durationMin: 60,
    price: 295,
    description: '~25 photos, next-day delivery',
  },
  {
    id: 'photo-drone',
    name: 'Photo + Drone',
    durationMin: 90,
    price: 425,
    description: 'Standard listing combo',
  },
  {
    id: 'photo-video',
    name: 'Photo + Video',
    durationMin: 90,
    price: 695,
    description: 'Photos + cinematic walkthrough',
  },
  {
    id: 'full-package',
    name: 'Full package',
    durationMin: 150,
    price: 1150,
    description: 'Photo, video, drone, 3D tour, floor plan',
  },
  {
    id: 'twilight',
    name: 'Twilight',
    durationMin: 45,
    price: 240,
    description: 'Dusk exterior, 5–8 photos',
  },
  {
    id: 'drone',
    name: 'Drone',
    durationMin: 30,
    price: 175,
    description: 'Aerial photos, weather permitting',
  },
  {
    id: 'floor-plan',
    name: 'Floor plan',
    durationMin: 20,
    price: 95,
  },
  {
    id: 'tour-3d',
    name: '3D tour',
    durationMin: 45,
    price: 295,
    description: 'Matterport-style walkthrough',
  },
];

export const sumServices = (ids: string[], catalog: Service[]) => {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  let durationMin = 0;
  let price = 0;
  const matched: Service[] = [];
  for (const id of ids) {
    const s = byId.get(id);
    if (s) {
      durationMin += s.durationMin;
      price += s.price;
      matched.push(s);
    }
  }
  return { durationMin, price, matched };
};
