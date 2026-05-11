import type { LatLon, Settings } from '../types';

export type GeocodeResult = LatLon & { displayName: string };

const CACHE_KEY = 'lensbook.geocode.v1';

const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

const readCache = (): Record<string, GeocodeResult> => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GeocodeResult>) : {};
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<string, GeocodeResult>) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
};

/**
 * Look up an address. Hits localStorage cache first, then Nominatim
 * (OpenStreetMap). Returns null if no result or on network/parse error.
 *
 * Respect: low-volume use only. Cache aggressively.
 */
export const geocode = async (query: string): Promise<GeocodeResult | null> => {
  const key = normalize(query);
  if (key.length < 3) return null;

  const cache = readCache();
  if (cache[key]) return cache[key];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('addressdetails', '0');

  try {
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data || data.length === 0) return null;
    const top = data[0];
    const lat = parseFloat(top.lat);
    const lon = parseFloat(top.lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    const result: GeocodeResult = { lat, lon, displayName: top.display_name };
    cache[key] = result;
    writeCache(cache);
    return result;
  } catch {
    return null;
  }
};

/** Great-circle distance in kilometres. */
export const distanceKm = (a: LatLon, b: LatLon): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * Travel fee for a single shoot. We bill from the starting location to the
 * address (one-way) above `freeRadiusKm`. Rounded to the nearest cent.
 */
export const travelFee = (km: number, settings: Settings): number => {
  if (km <= settings.freeRadiusKm) return 0;
  const billable = km - settings.freeRadiusKm;
  return Math.round(billable * settings.perKmRate * 100) / 100;
};

export const billableKm = (km: number, settings: Settings): number =>
  Math.max(0, km - settings.freeRadiusKm);
