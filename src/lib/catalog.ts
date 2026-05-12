import type { BookingServiceEntry, Company, Service } from '../types';

/** Normalize a booking's services array (which may contain bare-string
 *  legacy entries) into the canonical { id, qty }[] shape. Drops zero/negative
 *  quantities. */
export const normalizeServices = (
  entries: BookingServiceEntry[],
): Array<{ id: string; qty: number }> => {
  const out: Array<{ id: string; qty: number }> = [];
  for (const e of entries) {
    if (typeof e === 'string') {
      out.push({ id: e, qty: 1 });
    } else if (e && typeof e === 'object' && typeof e.id === 'string') {
      const qty = Math.max(0, Math.floor(Number(e.qty) || 0));
      if (qty > 0) out.push({ id: e.id, qty });
    }
  }
  return out;
};

export const DEFAULT_CATALOG: Service[] = [
  {
    id: 'photo',
    name: 'Photo',
    price: 295,
    description: '~25 photos, next-day delivery',
  },
  {
    id: 'photo-drone',
    name: 'Photo + Drone',
    price: 425,
    description: 'Standard listing combo',
  },
  {
    id: 'photo-video',
    name: 'Photo + Video',
    price: 695,
    description: 'Photos + cinematic walkthrough',
  },
  {
    id: 'full-package',
    name: 'Full package',
    price: 1150,
    description: 'Photo, video, drone, 3D tour, floor plan',
  },
  {
    id: 'twilight',
    name: 'Twilight',
    price: 240,
    description: 'Dusk exterior, 5–8 photos',
  },
  {
    id: 'drone',
    name: 'Drone',
    price: 175,
    description: 'Aerial photos, weather permitting',
  },
  {
    id: 'floor-plan',
    name: 'Floor plan',
    price: 95,
  },
  {
    id: 'tour-3d',
    name: '3D tour',
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

export const sumServices = (
  entries: BookingServiceEntry[],
  catalog: Service[],
) => {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  let price = 0;
  const matched: Array<{ service: Service; qty: number }> = [];
  for (const { id, qty } of normalizeServices(entries)) {
    const s = byId.get(id);
    if (s) {
      price += s.price * qty;
      matched.push({ service: s, qty });
    }
  }
  return { price, matched };
};
