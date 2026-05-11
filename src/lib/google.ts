import type { LatLon } from '../types';

export type GoogleGeocodeResult = LatLon & { formattedAddress: string };
export type GoogleRouteResult = { meters: number };
export type GoogleResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

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
): Promise<GoogleResult<GoogleGeocodeResult>> => {
  const key = normalize(query);
  if (key.length < 3) return { ok: false, error: 'Address too short' };
  if (!apiKey) return { ok: false, error: 'Missing API key' };

  const cache = readCache<GoogleGeocodeResult>(GEOCODE_CACHE_KEY);
  if (cache[key]) return { ok: true, value: cache[key] };

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    console.error('[google] geocode network error:', e);
    return { ok: false, error: `Network: ${msg}` };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: `HTTP ${res.status} (non-JSON response)` };
  }

  if (!res.ok || (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
    const msg =
      data?.error_message ||
      (data?.status ? `${data.status}` : `HTTP ${res.status}`);
    console.error('[google] geocode failed:', msg, data);
    return { ok: false, error: msg };
  }

  if (data.status === 'ZERO_RESULTS' || !data.results?.[0]) {
    return { ok: false, error: 'No matches for that address' };
  }

  const r = data.results[0];
  const result: GoogleGeocodeResult = {
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    formattedAddress: r.formatted_address,
  };
  cache[key] = result;
  writeCache(GEOCODE_CACHE_KEY, cache);
  return { ok: true, value: result };
};

/**
 * Compute road distance (one way, DRIVING) via the Routes API. Accepts free-
 * form address strings — the API resolves them server-side.
 */
export const googleRoadDistance = async (
  origin: string,
  destination: string,
  apiKey: string,
): Promise<GoogleResult<GoogleRouteResult>> => {
  const cacheKey = `${normalize(origin)}|${normalize(destination)}`;
  if (!apiKey) return { ok: false, error: 'Missing API key' };
  if (normalize(origin).length < 3 || normalize(destination).length < 3)
    return { ok: false, error: 'Address too short' };

  const cache = readCache<GoogleRouteResult>(DISTANCE_CACHE_KEY);
  if (cache[cacheKey]) return { ok: true, value: cache[cacheKey] };

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_UNAWARE',
  };

  let res: Response;
  try {
    res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    console.error('[google] routes network error:', e);
    return { ok: false, error: `Network: ${msg}` };
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: `HTTP ${res.status} (non-JSON response)` };
  }

  if (!res.ok || data?.error) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    console.error('[google] routes failed:', msg, data);
    return { ok: false, error: msg };
  }

  const meters = data?.routes?.[0]?.distanceMeters;
  if (typeof meters !== 'number') {
    return { ok: false, error: 'No route returned' };
  }

  const result: GoogleRouteResult = { meters };
  cache[cacheKey] = result;
  writeCache(DISTANCE_CACHE_KEY, cache);
  return { ok: true, value: result };
};
