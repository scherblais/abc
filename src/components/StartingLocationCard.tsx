import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';
import { geocode } from '../lib/geocode';
import { googleGeocode } from '../lib/google';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'located'; lat: number; lon: number; displayName: string; provider: 'google' | 'osm' }
  | { kind: 'not_found' }
  | { kind: 'error' };

const INPUT =
  'w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900';

export function StartingLocationCard({ settings, onChange }: Props) {
  const [address, setAddress] = useState(settings.startingAddress);
  const [freeKm, setFreeKm] = useState(settings.freeRadiusKm);
  const [rate, setRate] = useState(settings.perKmRate);
  const [apiKey, setApiKey] = useState(settings.googleApiKey ?? '');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<Status>(() =>
    settings.startingCoords
      ? {
          kind: 'located',
          lat: settings.startingCoords.lat,
          lon: settings.startingCoords.lon,
          displayName: settings.startingAddress,
          provider: settings.googleApiKey ? 'google' : 'osm',
        }
      : { kind: 'idle' },
  );

  // Resolve the starting address (debounced) whenever address or apiKey changes.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const trimmedAddress = address.trim();
    const trimmedKey = apiKey.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (trimmedAddress.length < 3) {
      setStatus({ kind: 'idle' });
      return;
    }
    setStatus({ kind: 'looking' });
    debounceRef.current = window.setTimeout(async () => {
      const result = trimmedKey
        ? await googleGeocode(trimmedAddress, trimmedKey)
        : await geocode(trimmedAddress).then((r) =>
            r ? { lat: r.lat, lon: r.lon, formattedAddress: r.displayName } : null,
          );
      if (!result) {
        setStatus({ kind: 'not_found' });
        onChange({
          ...settings,
          startingAddress: trimmedAddress,
          startingCoords: undefined,
          freeRadiusKm: freeKm,
          perKmRate: rate,
          googleApiKey: trimmedKey || undefined,
        });
        return;
      }
      setStatus({
        kind: 'located',
        lat: result.lat,
        lon: result.lon,
        displayName: result.formattedAddress,
        provider: trimmedKey ? 'google' : 'osm',
      });
      onChange({
        ...settings,
        startingAddress: trimmedAddress,
        startingCoords: { lat: result.lat, lon: result.lon },
        freeRadiusKm: freeKm,
        perKmRate: rate,
        googleApiKey: trimmedKey || undefined,
      });
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, apiKey]);

  useEffect(() => {
    if (freeKm === settings.freeRadiusKm && rate === settings.perKmRate) return;
    onChange({ ...settings, freeRadiusKm: freeKm, perKmRate: rate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freeKm, rate]);

  return (
    <section className="card mb-6 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">Starting location</h2>
        <span className="text-[12px] text-neutral-500">Travel billed one way</span>
      </div>

      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Carignan, QC"
        autoCapitalize="words"
        autoComplete="off"
        className={INPUT}
      />
      <StatusLine status={status} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
          <span className="block text-[11px] font-medium text-neutral-500">Free km</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={freeKm}
            onChange={(e) => setFreeKm(Math.max(0, Number(e.target.value) || 0))}
            className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 focus:outline-none"
          />
        </label>
        <label className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
          <span className="block text-[11px] font-medium text-neutral-500">$ per km</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Math.max(0, Number(e.target.value) || 0))}
            className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-2 text-[12px] text-neutral-500">
        Charged ${rate.toFixed(2)} per km beyond the first {freeKm} km.
      </p>

      <div className="mt-4 border-t border-neutral-100 pt-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <label className="text-[12.5px] font-medium text-neutral-900">
            Google Maps API key
          </label>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="tap text-[11.5px] text-neutral-500 hover:text-neutral-900"
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your API key (optional)"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className={INPUT + ' font-mono text-[13px]'}
        />
        <p className="mt-1.5 text-[11.5px] leading-snug text-neutral-500">
          With a key set, addresses resolve via Google Geocoding and travel is billed by
          road distance (Routes API). Restrict the key to{' '}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px]">
            scherblais.github.io
          </code>{' '}
          referrers in Google Cloud Console. Without a key, OpenStreetMap + straight-line
          distance is used.
        </p>
      </div>
    </section>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === 'idle') return null;
  let text = '';
  let cls = 'text-neutral-500';
  if (status.kind === 'looking') text = 'Locating…';
  else if (status.kind === 'located')
    text = `Located${status.provider === 'google' ? ' (Google)' : ''} · ${status.displayName}`;
  else if (status.kind === 'not_found') {
    text = "Couldn't locate that address";
    cls = 'text-neutral-700';
  } else text = 'Lookup failed — check connection';

  return (
    <p
      className={`mt-1.5 line-clamp-2 px-0.5 text-[11.5px] leading-snug ${cls}`}
      aria-live="polite"
    >
      {text}
    </p>
  );
}
