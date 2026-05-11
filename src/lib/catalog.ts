import type { Company, Service } from '../types';

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

/**
 * Resolve the effective price for a service given an optional brokerage.
 * Brokerage override (Company.pricing[service.id]) wins over the catalog
 * price when present. Returns the catalog price otherwise.
 */
export const effectivePrice = (service: Service, company?: Company): number => {
  const override = company?.pricing?.[service.id];
  return typeof override === 'number' && Number.isFinite(override)
    ? override
    : service.price;
};

/**
 * Apply a brokerage's pricing overrides across the whole catalog. Returns a
 * shallow-cloned catalog with effective prices substituted. Useful where
 * downstream code expects plain Service objects (ServiceGrid, sumServices).
 */
export const catalogFor = (catalog: Service[], company?: Company): Service[] => {
  if (!company?.pricing || Object.keys(company.pricing).length === 0) {
    return catalog;
  }
  return catalog.map((s) => {
    const override = company.pricing?.[s.id];
    return typeof override === 'number' && Number.isFinite(override)
      ? { ...s, price: override }
      : s;
  });
};

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
