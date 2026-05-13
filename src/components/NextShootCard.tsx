import type { Booking } from '../types';
import { currency, formatDayLabel, formatTime } from '../lib/format';

type Props = {
  booking: Booking;
  now: Date;
  /** Translates serviceId → name for the services line. */
  labelFor: (id: string) => string | undefined;
  clientLine: string | null;
  onOpen: () => void;
};

/** Avg driving speed used to estimate trip duration when we only know
 *  road distance. ~40 km/h matches Google Maps for typical urban + light-
 *  suburban driving in Greater Montreal. */
const AVG_KMH = 40;

/** Buffer added on top of pure drive time so the user arrives with gear
 *  ready, not running in. Time to park + walk + small contingency. */
const ARRIVAL_BUFFER_MIN = 10;

/**
 * Hero card on HomeScreen highlighting the very next upcoming shoot —
 * time/date, address, estimated drive, suggested leave-by time, and a
 * one-tap Directions button that opens the address in the device's
 * default maps app (Apple Maps on iOS, Google Maps everywhere else).
 */
export function NextShootCard({ booking, now, labelFor, clientLine, onOpen }: Props) {
  const start = new Date(booking.scheduledAt!);
  const driveMin =
    typeof booking.travelKm === 'number' && booking.travelKm > 0
      ? Math.max(1, Math.round((booking.travelKm / AVG_KMH) * 60))
      : null;
  const leaveBy =
    driveMin != null
      ? new Date(start.getTime() - (driveMin + ARRIVAL_BUFFER_MIN) * 60_000)
      : null;
  const leaveOverdue = leaveBy ? leaveBy.getTime() <= now.getTime() : false;
  const totalKmRound = booking.travelKm ? booking.travelKm.toFixed(1) : null;

  const firstService = booking.services
    .map((entry) => (typeof entry === 'string' ? entry : entry.id))
    .map((id) => labelFor(id))
    .find(Boolean);

  const onDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      directionsUrl(booking.address, booking.coords),
      '_blank',
      'noopener',
    );
  };

  return (
    <section className="card mb-6 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Next shoot
        </p>
        <p className="text-[12.5px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
          {formatDayLabel(start, now)} · {formatTime(start)}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="tap mt-2 -mx-1 block w-[calc(100%+0.5rem)] rounded-lg px-1 py-1 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
      >
        <p className="truncate text-[16px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">
          {booking.address || '(no address)'}
        </p>
        {(clientLine || firstService) && (
          <p className="mt-0.5 truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
            {clientLine ?? firstService}
          </p>
        )}
      </button>

      {driveMin != null && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Stat
            label="Drive"
            value={`~${driveMin} min`}
            hint={`${totalKmRound} km · ${currency(booking.travelFee ?? 0)} fee`}
          />
          <Stat
            label="Leave by"
            value={leaveBy ? formatTime(leaveBy) : '—'}
            hint={
              leaveBy
                ? leaveOverdue
                  ? 'Time to go now'
                  : relativeFromNow(leaveBy, now)
                : undefined
            }
            tone={leaveOverdue ? 'urgent' : undefined}
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onDirections}
          className="tap flex flex-1 items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2.5 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
        >
          <DirectionsIcon />
          Directions
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="tap rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-[14px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
        >
          Open
        </button>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'urgent';
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5">
      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p
        className={[
          'mt-0.5 text-[18px] font-semibold tabular-nums',
          tone === 'urgent'
            ? 'text-red-600 dark:text-red-400'
            : 'text-neutral-900 dark:text-neutral-100',
        ].join(' ')}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11.5px] text-neutral-500 dark:text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function DirectionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m21.6 11.3-8.9-8.9a1 1 0 0 0-1.4 0L2.4 11.3a1 1 0 0 0 0 1.4l8.9 8.9a1 1 0 0 0 1.4 0l8.9-8.9a1 1 0 0 0 0-1.4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 13v-2a2 2 0 0 1 2-2h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13 7 3 2-3 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Build a directions URL aimed at the user's default maps app.
 * iOS hands `maps.apple.com` off to Apple Maps; everywhere else gets the
 * Google Maps universal URL.
 *
 * COORDS WIN over the address string. QC street names without their
 * Est / Ouest qualifier (e.g. "Saint-Joseph") send Apple/Google Maps to
 * the wrong half of the city. Our stored coords were locked in at booking
 * time by Google Geocoding (or OSM as a fallback) using the full address
 * the autocomplete suggested, so they unambiguously point at the right
 * building. The plain address text is the fallback only when no coords.
 *
 * We also pass the address as `q=` (Apple) or via reverse-geocoding label
 * (Google) so the destination card in the maps app shows a human-readable
 * name instead of just lat/lon.
 */
function directionsUrl(
  address: string,
  coords?: { lat: number; lon: number },
): string {
  const isIos =
    typeof navigator !== 'undefined' &&
    /iPhone|iPad|iPod/.test(navigator.userAgent);
  const trimmed = address?.trim();

  if (coords) {
    if (isIos) {
      // daddr= pins the destination at our coords; q= sets the visible
      // destination name in the Apple Maps card.
      const label = trimmed
        ? `&q=${encodeURIComponent(trimmed)}`
        : '';
      return `https://maps.apple.com/?daddr=${coords.lat},${coords.lon}${label}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lon}`;
  }
  if (trimmed) {
    if (isIos) {
      return `https://maps.apple.com/?daddr=${encodeURIComponent(trimmed)}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trimmed)}`;
  }
  return isIos ? 'https://maps.apple.com/' : 'https://www.google.com/maps';
}

function relativeFromNow(future: Date, now: Date): string {
  const min = Math.round((future.getTime() - now.getTime()) / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `in ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `in ${hr}h`;
  const day = Math.round(hr / 24);
  return `in ${day}d`;
}
