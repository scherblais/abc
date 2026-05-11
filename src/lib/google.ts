import type { LatLon } from '../types';

export type GoogleGeocodeResult = LatLon & { formattedAddress: string };
export type GoogleRouteResult = { meters: number };

const GEOCODE_CACHE_KEY = 'lensbook.google.geocode.v1';
const DISTANCE_CACHE_KEY = 'lensbook.google.distance.v1';

const normalize = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

const readCache = <T>(key: string): Record<string, T> => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
};

const writeCache = <T>(key: string, cache: Record<string, T>) => {
  try {
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
};

/**
 * Geocode an address with the Google Maps Geocoding API.
 * Caches results in localStorage.
 */
export const googleGeocode = async (
  query: string,
  apiKey: string,
): Promise<GoogleGeocodeResult | null> => {
  const key = normalize(query);
  if (key.length < 3 || !apiKey) return null;

  const cache = readCache<GoogleGeocodeResult>(GEOCODE_CACHE_KEY);
  if (cache[key]) return cache[key];

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };
    if (data.status !== 'OK' || !data.results?.[0]) return null;
    const r = data.results[0];
    const result: GoogleGeocodeResult = {
      lat: r.geometry.location.lat,
      lon: r.geometry.location.lng,
      formattedAddress: r.formatted_address,
    };
    cache[key] = result;
    writeCache(GEOCODE_CACHE_KEY, cache);
    return result;
  } catch {
    return null;
  }
};

/**
 * Compute road distance (one way, DRIVING) via the Routes API. Accepts free-
 * form address strings — the API resolves them server-side.
 * Returns metres, or null on failure.
 */
export const googleRoadDistance = async (
  origin: string,
  destination: string,
  apiKey: string,
): Promise<GoogleRouteResult | null> => {
  const cacheKey = `${normalize(origin)}|${normalize(destination)}`;
  if (!apiKey || normalize(origin).length < 3 || normalize(destination).length < 3)
    return null;

  const cache = readCache<GoogleRouteResult>(DISTANCE_CACHE_KEY);
  if (cache[cacheKey]) return cache[cacheKey];

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_UNAWARE',
  };

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { routes?: Array<{ distanceMeters?: number }> };
    const meters = data.routes?.[0]?.distanceMeters;
    if (typeof meters !== 'number') return null;
    const result: GoogleRouteResult = { meters };
    cache[cacheKey] = result;
    writeCache(DISTANCE_CACHE_KEY, cache);
    return result;
  } catch {
    return null;
  }
};
