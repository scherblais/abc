import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';
import { geocode } from '../lib/geocode';
import { googleGeocode } from '../lib/google';
import { GOOGLE_API_KEY } from '../config';
import { RecordSyncLabel } from './RecordSyncLabel';
import { settingsPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'located'; lat: number; lon: number; displayName: string; provider: 'google' | 'osm' }
  | { kind: 'not_found'; reason?: string }
  | { kind: 'error' };

const INPUT = 'input';

export function StartingLocationCard({ settings, onChange }: Props) {
  const uid = useUid();
  const [address, setAddress] = useState(settings.startingAddress);
  const [freeKm, setFreeKm] = useState(settings.freeRadiusKm);
  const [rate, setRate] = useState(settings.perKmRate);
  const [status, setStatus] = useState<Status>(() =>
    settings.startingCoords
      ? {
          kind: 'located',
          lat: settings.startingCoords.lat,
          lon: settings.startingCoords.lon,
          displayName: settings.startingAddress,
          provider: GOOGLE_API_KEY ? 'google' : 'osm',
        }
      : { kind: 'idle' },
  );

  // Always-fresh ref to settings so async commits never use a stale copy.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Editing flag: true while the user has changed a field but not yet
  // committed. Prevents the sync useEffect below from clobbering in-progress
  // typing when Firestore delivers the cloud value mid-edit.
  const editingRef = useRef(false);

  // Hydrate local form state from settings whenever the user isn't editing.
  useEffect(() => {
    if (editingRef.current) return;
    setAddress(settings.startingAddress);
    setFreeKm(settings.freeRadiusKm);
    setRate(settings.perKmRate);
    if (settings.startingCoords && settings.startingAddress) {
      setStatus({
        kind: 'located',
        lat: settings.startingCoords.lat,
        lon: settings.startingCoords.lon,
        displayName: settings.startingAddress,
        provider: GOOGLE_API_KEY ? 'google' : 'osm',
      });
    }
  }, [
    settings.startingAddress,
    settings.startingCoords?.lat,
    settings.startingCoords?.lon,
    settings.freeRadiusKm,
    settings.perKmRate,
  ]);

  // Resolve the starting address (debounced) whenever the user edits it.
  // Geocoding runs only when address changed AND it differs from what's
  // already saved with coords — prevents redundant lookups on every
  // settings round-trip.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!editingRef.current) return;
    const trimmedAddress = address.trim();
    const trimmedKey = GOOGLE_API_KEY.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmedAddress.length < 3) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'looking' });
    debounceRef.current = window.setTimeout(async () => {
      let resolved: { lat: number; lon: number; formattedAddress: string } | null = null;
      let reason: string | undefined;

      if (trimmedKey) {
        const r = await googleGeocode(trimmedAddress, trimmedKey);
        if (r.ok) resolved = r.value;
        else reason = r.error;
      } else {
        const r = await geocode(trimmedAddress);
        if (r) resolved = { lat: r.lat, lon: r.lon, formattedAddress: r.displayName };
      }

      const base = settingsRef.current;
      if (!resolved) {
        setStatus({ kind: 'not_found', reason });
        onChange({
          ...base,
          startingAddress: trimmedAddress,
          startingCoords: undefined,
          freeRadiusKm: freeKm,
          perKmRate: rate,
        });
        editingRef.current = false;
        return;
      }
      setStatus({
        kind: 'located',
        lat: resolved.lat,
        lon: resolved.lon,
        displayName: resolved.formattedAddress,
        provider: trimmedKey ? 'google' : 'osm',
      });
      onChange({
        ...base,
        startingAddress: trimmedAddress,
        startingCoords: { lat: resolved.lat, lon: resolved.lon },
        freeRadiusKm: freeKm,
        perKmRate: rate,
      });
      editingRef.current = false;
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Commit freeKm + rate changes once the user pauses for 300ms.
  useEffect(() => {
    if (!editingRef.current) return;
    if (
      freeKm === settings.freeRadiusKm &&
      rate === settings.perKmRate
    ) {
      return;
    }
    const t = setTimeout(() => {
      onChange({
        ...settingsRef.current,
        freeRadiusKm: freeKm,
        perKmRate: rate,
      });
      editingRef.current = false;
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeKm, rate]);

  const edit =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      editingRef.current = true;
      setter(v);
    };

  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">Starting location</h2>
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">Travel billed one way</span>
      </div>

      <input
        value={address}
        onChange={(e) => edit(setAddress)(e.target.value)}
        placeholder="Carignan, QC"
        autoCapitalize="words"
        autoComplete="off"
        className={INPUT}
      />
      <StatusLine status={status} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
          <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Free km</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={freeKm}
            onChange={(e) => edit(setFreeKm)(Math.max(0, Number(e.target.value) || 0))}
            className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </label>
        <label className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
          <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">$ per km</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={rate}
            onChange={(e) => edit(setRate)(Math.max(0, Number(e.target.value) || 0))}
            className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
          Charged ${rate.toFixed(2)} per km beyond the first {freeKm} km.
          {GOOGLE_API_KEY
            ? ' Geocoded with Google Maps + road distance.'
            : ' Geocoded with OpenStreetMap + straight-line distance.'}
        </p>
        {uid && <RecordSyncLabel path={settingsPath(uid)} />}
      </div>
    </section>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  let text = '';
  let detail: string | null = null;
  let cls = 'text-neutral-500 dark:text-neutral-400';
  if (status.kind === 'looking') text = 'Locating…';
  else if (status.kind === 'located')
    text = `Located${status.provider === 'google' ? ' (Google)' : ''} · ${status.displayName}`;
  else if (status.kind === 'not_found') {
    text = "Couldn't locate that address";
    detail = status.reason ?? null;
    cls = 'text-neutral-700 dark:text-neutral-300';
  } else text = 'Lookup failed — check connection';

  return (
    <div className="mt-1.5 px-0.5" aria-live="polite">
      <p className={`line-clamp-2 text-[11.5px] leading-snug ${cls}`}>{text}</p>
      {detail && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          {detail}
        </p>
      )}
    </div>
  );
}
