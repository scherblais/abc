import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Agent,
  Booking,
  Company,
  DraftBooking,
  Invoice,
  Occupant,
  Service,
  Settings,
} from '../types';
import { catalogFor, normalizeServices, sumServices } from '../lib/catalog';
import { suggestedNextSlot } from '../lib/datetime';
import { currency, formatDayLabel, formatTime } from '../lib/format';
import { distanceKm, geocode, travelFee } from '../lib/geocode';
import { googleGeocode, googleRoadDistance } from '../lib/google';
import { GOOGLE_API_KEY } from '../config';
import { DatePickerRow } from '../components/DatePickerRow';
import { TimePickerRow } from '../components/TimePickerRow';
import { ServiceGrid } from '../components/ServiceGrid';
import { Field } from '../components/Field';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { ClientPicker } from '../components/ClientPicker';
import { NumberField } from '../components/NumberField';
import { ScreenHeader } from '../components/ScreenHeader';
import { RecordSyncLabel } from '../components/RecordSyncLabel';
import { recordPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  initial?: Booking;
  /** Start a brand-new booking with no scheduled date — i.e. as a task.
   *  The Day/Time fields collapse into a "Schedule a date" button until
   *  the user is ready to pin it to a slot. Ignored when `initial` is set. */
  startUndated?: boolean;
  /** Seed values for a brand-new booking. Used by the "+ New shoot for
   *  this contact" flow on ContactDetailScreen. Ignored when `initial`
   *  is set. */
  prefill?: { occupant?: Occupant; address?: string };
  catalog: Service[];
  companies: Company[];
  agents: Agent[];
  invoices: Invoice[];
  bookingInvoiceIndex: Map<string, string>;
  settings: Settings;
  onSave: (draft: DraftBooking) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onManageCatalog: () => void;
  onCreateCompany: (name: string) => Company;
  onCreateAgent: (companyId: string, name: string) => Agent;
  onAddBookingToInvoice: (invoiceId: string, bookingId: string) => void;
  onRemoveBookingFromInvoice: (bookingId: string) => void;
  onCreateInvoiceForBooking: (bookingId: string) => void;
  onOpenInvoice: (invoiceId: string) => void;
};

type TravelState =
  | { kind: 'idle' }
  | { kind: 'looking' }
  | { kind: 'no_origin' }
  | { kind: 'not_found'; reason?: string }
  | {
      kind: 'resolved';
      km: number;
      fee: number;
      coords: { lat: number; lon: number };
      mode: 'road' | 'straight';
      warning?: string;
    };

const draftFromBooking = (b: Booking): DraftBooking => ({
  address: b.address,
  scheduledAt: b.scheduledAt,
  services: [...b.services],
  price: b.price,
  travelKm: b.travelKm,
  travelFee: b.travelFee,
  coords: b.coords,
  companyId: b.companyId,
  agentId: b.agentId,
  occupant: b.occupant ? { ...b.occupant } : undefined,
  client: b.client ? { ...b.client } : undefined,
  notes: b.notes,
});

const emptyDraft = (
  catalog: Service[],
  undated: boolean,
  prefill?: { occupant?: Occupant; address?: string },
): DraftBooking => {
  const first = catalog[0];
  return {
    address: prefill?.address ?? '',
    scheduledAt: undated ? undefined : suggestedNextSlot().toISOString(),
    services: first ? [{ id: first.id, qty: 1 }] : [],
    price: first?.price ?? 0,
    occupant: prefill?.occupant ? { ...prefill.occupant } : undefined,
    notes: '',
  };
};

const INPUT = 'input';

export function BookScreen({
  initial,
  startUndated,
  prefill,
  catalog,
  companies,
  agents,
  invoices,
  bookingInvoiceIndex,
  settings,
  onSave,
  onDelete,
  onCancel,
  onManageCatalog,
  onCreateCompany,
  onCreateAgent,
  onAddBookingToInvoice,
  onRemoveBookingFromInvoice,
  onCreateInvoiceForBooking,
  onOpenInvoice,
}: Props) {
  const bookingUid = useUid();
  const currentInvoice = useMemo(() => {
    if (!initial) return undefined;
    const id = bookingInvoiceIndex.get(initial.id);
    return id ? invoices.find((i) => i.id === id) : undefined;
  }, [initial, invoices, bookingInvoiceIndex]);
  const [draft, setDraft] = useState<DraftBooking>(() =>
    initial
      ? draftFromBooking(initial)
      : emptyDraft(catalog, !!startUndated, prefill),
  );
  const hasOccupant =
    !!initial?.occupant &&
    Boolean(
      initial.occupant.name ||
        initial.occupant.phone ||
        initial.occupant.email ||
        initial.occupant.accessNotes,
    );
  const prefillHasOccupant =
    !!prefill?.occupant &&
    Boolean(
      prefill.occupant.name ||
        prefill.occupant.phone ||
        prefill.occupant.email ||
        prefill.occupant.accessNotes,
    );
  const [showExtras, setShowExtras] = useState(
    () =>
      hasOccupant ||
      prefillHasOccupant ||
      Boolean(initial?.notes) ||
      Boolean(initial?.client?.name),
  );
  const [overrideTotals, setOverrideTotals] = useState(false);

  // When a brokerage is selected, swap in their per-service price overrides
  // so the catalog tiles + the booking total reflect the negotiated rate.
  const effectiveCatalog = useMemo(() => {
    const company = companies.find((c) => c.id === draft.companyId);
    return catalogFor(catalog, company);
  }, [catalog, companies, draft.companyId]);

  const scheduled = useMemo(
    () => (draft.scheduledAt ? new Date(draft.scheduledAt) : null),
    [draft.scheduledAt],
  );
  const isTask = !draft.scheduledAt;
  const total = draft.price + (draft.travelFee ?? 0);
  const canSave = draft.address.trim().length > 1 && draft.services.length > 0;

  // Geocode the booking address, debounced. Re-runs when address or
  // starting coords / rates change so totals stay accurate while editing.
  const [travel, setTravel] = useState<TravelState>(() => {
    if (initial?.coords && typeof initial.travelKm === 'number') {
      return {
        kind: 'resolved',
        km: initial.travelKm,
        fee: initial.travelFee ?? 0,
        coords: initial.coords,
        mode: GOOGLE_API_KEY ? 'road' : 'straight',
      };
    }
    return { kind: 'idle' };
  });
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const trimmed = draft.address.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (trimmed.length < 4) {
      setTravel({ kind: 'idle' });
      setDraft((p) =>
        p.travelKm === undefined && p.travelFee === undefined && p.coords === undefined
          ? p
          : { ...p, travelKm: undefined, travelFee: undefined, coords: undefined },
      );
      return;
    }
    if (!settings.startingCoords && !GOOGLE_API_KEY) {
      setTravel({ kind: 'no_origin' });
      return;
    }
    setTravel({ kind: 'looking' });
    const apiKey = GOOGLE_API_KEY.trim();
    debounceRef.current = window.setTimeout(async () => {
      if (apiKey) {
        // Resolve the booking address coordinates (for the on-screen "X km
        // from..." display) and fetch road distance in parallel.
        const [geocodeRes, routeRes] = await Promise.all([
          googleGeocode(trimmed, apiKey),
          googleRoadDistance(settings.startingAddress, trimmed, apiKey),
        ]);

        if (!geocodeRes.ok) {
          setTravel({ kind: 'not_found', reason: `Geocoding: ${geocodeRes.error}` });
          return;
        }
        const coords = { lat: geocodeRes.value.lat, lon: geocodeRes.value.lon };

        if (routeRes.ok) {
          const km = routeRes.value.meters / 1000;
          const fee = travelFee(km, settings);
          setTravel({ kind: 'resolved', km, fee, coords, mode: 'road' });
          setDraft((p) => ({ ...p, travelKm: km, travelFee: fee, coords }));
          return;
        }

        // Routes failed but the address is valid — degrade to haversine so
        // the user still gets a travel fee. Surface the Routes error too.
        if (settings.startingCoords) {
          const km = distanceKm(settings.startingCoords, coords);
          const fee = travelFee(km, settings);
          setTravel({
            kind: 'resolved',
            km,
            fee,
            coords,
            mode: 'straight',
            warning: `Routes API: ${routeRes.error}`,
          });
          setDraft((p) => ({ ...p, travelKm: km, travelFee: fee, coords }));
          return;
        }

        setTravel({ kind: 'not_found', reason: `Routes: ${routeRes.error}` });
        return;
      }

      // No Google key — fall back to Nominatim + haversine.
      if (!settings.startingCoords) {
        setTravel({ kind: 'no_origin' });
        return;
      }
      const result = await geocode(trimmed);
      if (!result) {
        setTravel({ kind: 'not_found' });
        return;
      }
      const km = distanceKm(settings.startingCoords, result);
      const fee = travelFee(km, settings);
      setTravel({
        kind: 'resolved',
        km,
        fee,
        coords: { lat: result.lat, lon: result.lon },
        mode: 'straight',
      });
      setDraft((p) => ({
        ...p,
        travelKm: km,
        travelFee: fee,
        coords: { lat: result.lat, lon: result.lon },
      }));
    }, 700);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [
    draft.address,
    settings.startingAddress,
    settings.startingCoords,
    settings.freeRadiusKm,
    settings.perKmRate,
    settings,
  ]);

  const setScheduled = (d: Date) =>
    setDraft((p) => ({ ...p, scheduledAt: d.toISOString() }));

  const setServiceQty = (id: string, qty: number) => {
    setDraft((p) => {
      // Reconstruct as a normalized {id, qty} list, then rewrite the entry
      // for `id`. qty === 0 removes the entry. Order is preserved for the
      // existing entries; new entries append.
      const current = normalizeServices(p.services);
      const idx = current.findIndex((e) => e.id === id);
      let next: Array<{ id: string; qty: number }>;
      if (qty <= 0) {
        next = current.filter((e) => e.id !== id);
      } else if (idx >= 0) {
        next = current.map((e) => (e.id === id ? { id, qty } : e));
      } else {
        next = [...current, { id, qty }];
      }
      if (!overrideTotals) {
        const { price } = sumServices(next, effectiveCatalog);
        return { ...p, services: next, price };
      }
      return { ...p, services: next };
    });
  };

  // When the brokerage changes mid-booking, re-evaluate the total against
  // the new brokerage's price overrides (unless the user has manually
  // overridden totals). Catalog stays the same; only effective prices shift.
  useEffect(() => {
    if (overrideTotals) return;
    setDraft((p) => {
      if (p.services.length === 0) return p;
      const { price } = sumServices(p.services, effectiveCatalog);
      if (p.price === price) return p;
      return { ...p, price };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.companyId, effectiveCatalog, overrideTotals]);

  return (
    <div className="flex h-full min-h-full flex-col">
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onCancel}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Cancel
          </button>
        }
        title={
          initial
            ? isTask
              ? 'Edit task'
              : 'Edit shoot'
            : isTask
              ? 'New task'
              : 'New shoot'
        }
        right={
          <button
            type="button"
            onClick={() => canSave && onSave(draft)}
            disabled={!canSave}
            className={[
              'tap rounded-md px-3 py-1.5 text-[14px] font-medium',
              canSave
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
            ].join(' ')}
          >
            Save
          </button>
        }
      />
      {initial && bookingUid && (
        <div className="-mx-4 flex justify-center border-b border-neutral-100 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/40 px-4 py-1.5">
          <RecordSyncLabel path={recordPath(bookingUid, 'bookings', initial.id)} />
        </div>
      )}

      <div className="flex-1 pb-32 pt-5">
        {currentInvoice && currentInvoice.status !== 'draft' && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="text-[12.5px] leading-snug text-amber-900 dark:text-amber-200">
              On invoice{' '}
              <button
                type="button"
                onClick={() => onOpenInvoice(currentInvoice.id)}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {currentInvoice.number}
              </button>{' '}
              ({currentInvoice.status}). Editing this shoot will change that
              invoice's totals.
            </p>
          </div>
        )}
        <Field label="Address">
          <AddressAutocomplete
            value={draft.address}
            onChange={(v) => setDraft((p) => ({ ...p, address: v }))}
            apiKey={GOOGLE_API_KEY || undefined}
            bias={settings.startingCoords}
            placeholder="123 Main St, Montréal"
            inputClassName={INPUT}
            autoFocus={!initial}
          />
          <TravelLine state={travel} settings={settings} />
        </Field>

        <Field label="Client">
          <ClientPicker
            companies={companies}
            agents={agents}
            companyId={draft.companyId}
            agentId={draft.agentId}
            onChange={(companyId, agentId) =>
              setDraft((p) => ({ ...p, companyId, agentId }))
            }
            onCreateCompany={onCreateCompany}
            onCreateAgent={onCreateAgent}
          />
          {!draft.companyId && draft.client?.name && (
            <p className="mt-1.5 px-0.5 text-[11.5px] leading-snug text-neutral-500 dark:text-neutral-400">
              Previously: {draft.client.name}
              {draft.client.brokerage ? ` · ${draft.client.brokerage}` : ''}
            </p>
          )}
        </Field>

        {showExtras ? (
          <Field label="Property contact" hint="seller / tenant">
            <div className="space-y-2">
              <input
                value={draft.occupant?.name ?? ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    occupant: { ...p.occupant, name: e.target.value },
                  }))
                }
                placeholder="Name"
                autoComplete="name"
                autoCapitalize="words"
                className={INPUT}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draft.occupant?.phone ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      occupant: { ...p.occupant, phone: e.target.value },
                    }))
                  }
                  placeholder="Phone"
                  type="tel"
                  autoComplete="tel"
                  className={INPUT}
                />
                <input
                  value={draft.occupant?.email ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      occupant: { ...p.occupant, email: e.target.value },
                    }))
                  }
                  placeholder="Email"
                  type="email"
                  autoComplete="email"
                  className={INPUT}
                />
              </div>
              <input
                value={draft.occupant?.accessNotes ?? ''}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    occupant: { ...p.occupant, accessNotes: e.target.value },
                  }))
                }
                placeholder="Access (gate code, lockbox, key location)"
                className={INPUT}
              />
              <input
                value={draft.notes ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes for this shoot"
                className={INPUT}
              />
            </div>
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setShowExtras(true)}
            className="tap mb-4 mt-1 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-2.5 text-[13.5px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600"
          >
            <span aria-hidden>+</span> Add property contact / notes
          </button>
        )}

        {scheduled ? (
          <>
            <Field label="Day" hint={formatDayLabel(scheduled)}>
              <DatePickerRow value={scheduled} onChange={setScheduled} />
            </Field>

            <Field label="Time" hint={formatTime(scheduled)}>
              <TimePickerRow value={scheduled} onChange={setScheduled} />
            </Field>

            <button
              type="button"
              onClick={() =>
                setDraft((p) => ({ ...p, scheduledAt: undefined }))
              }
              className="tap mb-5 -mt-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400 underline-offset-4 hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline"
            >
              Remove date — save as a task
            </button>
          </>
        ) : (
          <Field label="Schedule" hint="optional">
            <div className="card flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-neutral-700 dark:text-neutral-300">
                  No date set
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
                  This will live in Tasks until you pick a day and time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduled(suggestedNextSlot())}
                className="tap shrink-0 rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-[13px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
              >
                Schedule
              </button>
            </div>
          </Field>
        )}

        <Field
          label="Services"
          hint={
            draft.services.length === 0
              ? 'Pick at least one'
              : currency(draft.price)
          }
        >
          {catalog.length === 0 ? (
            <div className="card px-4 py-6 text-center">
              <p className="text-[13.5px] text-neutral-600 dark:text-neutral-400">
                Your catalog is empty. Add a service before you can book.
              </p>
              <button
                type="button"
                onClick={onManageCatalog}
                className="tap mt-3 rounded-md bg-neutral-900 dark:bg-neutral-100 px-3.5 py-1.5 text-[13px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
              >
                Manage catalog
              </button>
            </div>
          ) : (
            <ServiceGrid
              services={effectiveCatalog}
              selected={normalizeServices(draft.services)}
              onChange={setServiceQty}
            />
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOverrideTotals((v) => !v)}
              className="tap text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 underline-offset-4 hover:underline"
            >
              {overrideTotals ? 'Use catalog price' : 'Override price'}
            </button>
            <button
              type="button"
              onClick={onManageCatalog}
              className="tap text-[12.5px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Edit catalog ›
            </button>
          </div>
          {overrideTotals && (
            <label className="mt-4 block rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2">
              <span className="block text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Price ($)</span>
              <NumberField
                min={0}
                step={5}
                value={draft.price}
                onChange={(n) => setDraft((p) => ({ ...p, price: n }))}
                className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </label>
          )}
        </Field>

        {(draft.travelFee ?? 0) > 0 && (
          <div className="mb-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-neutral-600 dark:text-neutral-400">Services</span>
              <span className="text-[13.5px] font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {currency(draft.price)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-neutral-600 dark:text-neutral-400">
                Travel · {(draft.travelKm ?? 0).toFixed(1)} km
              </span>
              <span className="text-[13.5px] font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                {currency(draft.travelFee ?? 0)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-2">
              <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">Total</span>
              <span className="text-[15px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {currency(total)}
              </span>
            </div>
          </div>
        )}

        {initial && (
          <InvoiceSection
            currentInvoice={currentInvoice}
            invoices={invoices}
            companyId={draft.companyId}
            onAdd={(invId) => onAddBookingToInvoice(invId, initial.id)}
            onCreateNew={() => onCreateInvoiceForBooking(initial.id)}
            onOpen={(invId) => onOpenInvoice(invId)}
            onRemove={() => onRemoveBookingFromInvoice(initial.id)}
          />
        )}

        {initial && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (currentInvoice) {
                if (
                  !confirm(
                    `Delete this shoot? It will also be removed from invoice ${currentInvoice.number}.`,
                  )
                ) {
                  return;
                }
              }
              onDelete();
            }}
            className="btn-destructive mt-8"
          >
            {isTask ? 'Delete task' : 'Delete shoot'}
          </button>
        )}
      </div>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200/80 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md">
        <div className="mx-auto max-w-[480px] px-4 py-3">
          <button
            type="button"
            onClick={() => canSave && onSave(draft)}
            disabled={!canSave}
            className={[
              'pointer-events-auto tap flex w-full items-center justify-between rounded-xl px-5 py-3.5 text-[15px] font-medium',
              canSave
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-lg shadow-neutral-900/15 hover:bg-black dark:hover:bg-neutral-200'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
            ].join(' ')}
          >
            <span>
              {initial
                ? 'Save changes'
                : isTask
                  ? 'Save task'
                  : 'Book this shoot'}
            </span>
            <span className="tabular-nums">{currency(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TravelLine({ state, settings }: { state: TravelState; settings: Settings }) {
  if (state.kind === 'idle') return null;
  let text = '';
  let detail: string | null = null;
  let muted = true;

  if (state.kind === 'looking') text = 'Locating address…';
  else if (state.kind === 'no_origin')
    text = 'Set a starting location in Settings to bill travel.';
  else if (state.kind === 'not_found') {
    text = "Couldn't locate that address — travel fee won't apply.";
    detail = state.reason ?? null;
    muted = false;
  } else {
    const km = state.km.toFixed(1);
    const kind = state.mode === 'road' ? 'road' : 'straight-line';
    if (state.fee > 0) {
      text = `${km} km ${kind} from ${settings.startingAddress} · +${formatMoney(state.fee)} travel`;
      muted = false;
    } else {
      text = `${km} km ${kind} from ${settings.startingAddress} · within free radius`;
    }
    detail = state.warning ?? null;
  }

  return (
    <div className="mt-1.5 px-0.5" aria-live="polite">
      <p
        className={`line-clamp-2 text-[11.5px] leading-snug ${
          muted ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-700 dark:text-neutral-300'
        }`}
      >
        {text}
      </p>
      {detail && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
          {detail}
        </p>
      )}
    </div>
  );
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(n);
}

function InvoiceSection({
  currentInvoice,
  invoices,
  companyId,
  onAdd,
  onCreateNew,
  onOpen,
  onRemove,
}: {
  currentInvoice?: Invoice;
  invoices: Invoice[];
  companyId?: string;
  onAdd: (invoiceId: string) => void;
  onCreateNew: () => void;
  onOpen: (invoiceId: string) => void;
  onRemove: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const draftInvoicesForCompany = useMemo(() => {
    if (!companyId) return [];
    return invoices
      .filter((i) => i.companyId === companyId && i.status === 'draft')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [invoices, companyId]);

  if (currentInvoice) {
    return (
      <Field label="Invoice">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5">
          <span className="flex-1 truncate text-[14.5px] text-neutral-900 dark:text-neutral-100">
            On invoice{' '}
            <span className="font-semibold">{currentInvoice.number}</span>
            <span className="ml-1.5 text-[12px] text-neutral-500 dark:text-neutral-400">
              ({currentInvoice.status})
            </span>
          </span>
          <button
            type="button"
            onClick={() => onOpen(currentInvoice.id)}
            className="tap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white"
          >
            Open
          </button>
          {currentInvoice.status === 'draft' && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove this shoot from invoice ${currentInvoice.number}?`)) {
                  onRemove();
                }
              }}
              className="tap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white"
            >
              Remove
            </button>
          )}
        </div>
      </Field>
    );
  }

  if (!companyId) {
    return (
      <Field label="Invoice">
        <p className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 px-3.5 py-2.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
          Pick a brokerage above to invoice this shoot.
        </p>
      </Field>
    );
  }

  // No invoice yet — show "Add to invoice" button which expands to a picker.
  return (
    <Field label="Invoice">
      {!pickerOpen ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="tap flex w-full items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-left hover:border-neutral-300 dark:hover:border-neutral-600"
        >
          <span className="text-[14px] text-neutral-700 dark:text-neutral-300">Not on an invoice</span>
          <span className="text-[12.5px] font-medium text-neutral-900 dark:text-neutral-100">
            Add to invoice ›
          </span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          {draftInvoicesForCompany.length === 0 ? (
            <p className="px-3.5 py-2.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              No draft invoices for this brokerage yet.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {draftInvoicesForCompany.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(inv.id);
                      setPickerOpen(false);
                    }}
                    className="tap flex w-full items-center justify-between px-3.5 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <span className="text-[14px] text-neutral-900 dark:text-neutral-100">
                      {inv.number}
                    </span>
                    <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                      {inv.bookingIds.length}{' '}
                      {inv.bookingIds.length === 1 ? 'shoot' : 'shoots'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onCreateNew}
            className="tap flex w-full items-center justify-between border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 px-3.5 py-2.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/70"
          >
            <span className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
              + New invoice
            </span>
            <span className="text-[12px] text-neutral-500 dark:text-neutral-400">starts in draft</span>
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="tap w-full border-t border-neutral-100 dark:border-neutral-800 px-3.5 py-2 text-[12px] text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </Field>
  );
}
