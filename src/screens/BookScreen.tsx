import { useEffect, useMemo, useRef, useState } from 'react';
import type { Booking, DraftBooking, Service } from '../types';
import { sumServices } from '../lib/catalog';
import { suggestedNextSlot } from '../lib/datetime';
import { currency, formatDayLabel, formatDuration, formatTime } from '../lib/format';
import { DatePickerRow } from '../components/DatePickerRow';
import { TimePickerRow } from '../components/TimePickerRow';
import { ServiceGrid } from '../components/ServiceGrid';
import { Field } from '../components/Field';

type Props = {
  initial?: Booking;
  catalog: Service[];
  onSave: (draft: DraftBooking) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onManageCatalog: () => void;
};

const draftFromBooking = (b: Booking): DraftBooking => ({
  address: b.address,
  scheduledAt: b.scheduledAt,
  durationMin: b.durationMin,
  services: [...b.services],
  price: b.price,
  client: { ...b.client },
  notes: b.notes,
});

const emptyDraft = (catalog: Service[]): DraftBooking => {
  // Default to the first service in the catalog (if any) so a fresh booking
  // already has a price and duration. The user can change it instantly.
  const first = catalog[0];
  return {
    address: '',
    scheduledAt: suggestedNextSlot().toISOString(),
    durationMin: first?.durationMin ?? 60,
    services: first ? [first.id] : [],
    price: first?.price ?? 0,
    client: {},
    notes: '',
  };
};

export function BookScreen({
  initial,
  catalog,
  onSave,
  onDelete,
  onCancel,
  onManageCatalog,
}: Props) {
  const [draft, setDraft] = useState<DraftBooking>(() =>
    initial ? draftFromBooking(initial) : emptyDraft(catalog),
  );
  const [showClient, setShowClient] = useState(() => Boolean(initial?.client?.name));
  const [overrideTotals, setOverrideTotals] = useState(false);

  const scheduled = useMemo(() => new Date(draft.scheduledAt), [draft.scheduledAt]);
  const canSave = draft.address.trim().length > 1 && draft.services.length > 0;

  const addressRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => addressRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [initial]);

  const setScheduled = (d: Date) =>
    setDraft((p) => ({ ...p, scheduledAt: d.toISOString() }));

  const toggleService = (id: string) => {
    setDraft((p) => {
      const has = p.services.includes(id);
      const next = has ? p.services.filter((s) => s !== id) : [...p.services, id];
      // If user hasn't overridden totals, recompute from catalog.
      if (!overrideTotals) {
        const { durationMin, price } = sumServices(next, catalog);
        return { ...p, services: next, durationMin, price };
      }
      return { ...p, services: next };
    });
  };

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between bg-ink-950/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onCancel}
          className="tap -ml-1 rounded-lg px-2 py-1.5 text-[15px] text-white/70 hover:text-white"
        >
          Cancel
        </button>
        <h1 className="text-[15px] font-semibold">{initial ? 'Edit shoot' : 'New shoot'}</h1>
        <button
          type="button"
          onClick={() => canSave && onSave(draft)}
          disabled={!canSave}
          className={[
            'tap rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors',
            canSave ? 'bg-accent text-white' : 'bg-white/10 text-white/40',
          ].join(' ')}
        >
          {initial ? 'Save' : 'Book'}
        </button>
      </header>

      <div className="flex-1 pb-32 pt-2">
        <Field label="Address">
          <input
            ref={addressRef}
            value={draft.address}
            onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            placeholder="123 Main St, San Francisco"
            autoComplete="street-address"
            autoCapitalize="words"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-[16px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none focus:ring-accent/60"
          />
        </Field>

        <Field label="Day" hint={formatDayLabel(scheduled)}>
          <DatePickerRow value={scheduled} onChange={setScheduled} />
        </Field>

        <Field label="Time" hint={formatTime(scheduled)}>
          <TimePickerRow value={scheduled} onChange={setScheduled} />
        </Field>

        <Field
          label="Services"
          hint={
            draft.services.length === 0
              ? 'pick at least one'
              : `${formatDuration(draft.durationMin)} · ${currency(draft.price)}`
          }
        >
          {catalog.length === 0 ? (
            <div className="card px-4 py-6 text-center">
              <p className="text-[13.5px] text-white/55">
                Your catalog is empty. Add a service before you can book.
              </p>
              <button
                type="button"
                onClick={onManageCatalog}
                className="tap mt-3 rounded-full bg-accent px-4 py-2 text-[13px] font-semibold text-white"
              >
                Manage catalog
              </button>
            </div>
          ) : (
            <ServiceGrid
              services={catalog}
              selectedIds={draft.services}
              onToggle={toggleService}
            />
          )}
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOverrideTotals((v) => !v)}
              className="tap text-[12.5px] text-accent-soft"
            >
              {overrideTotals ? 'Use catalog totals' : 'Override price / duration'}
            </button>
            <button
              type="button"
              onClick={onManageCatalog}
              className="tap text-[12.5px] text-white/45"
            >
              Edit catalog ›
            </button>
          </div>
          {overrideTotals && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="rounded-2xl bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/10">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  Duration (min)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  value={draft.durationMin}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      durationMin: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-white focus:outline-none"
                />
              </label>
              <label className="rounded-2xl bg-white/[0.04] px-3 py-2 ring-1 ring-inset ring-white/10">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/45">
                  Price ($)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  value={draft.price}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      price: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                  className="mt-0.5 w-full bg-transparent text-[15px] font-semibold tabular-nums text-white focus:outline-none"
                />
              </label>
            </div>
          )}
        </Field>

        {showClient ? (
          <Field label="Client (optional)">
            <div className="space-y-2">
              <input
                value={draft.client.name ?? ''}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, client: { ...p.client, name: e.target.value } }))
                }
                placeholder="Name"
                autoComplete="name"
                autoCapitalize="words"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-accent/60"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={draft.client.phone ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, client: { ...p.client, phone: e.target.value } }))
                  }
                  placeholder="Phone"
                  type="tel"
                  autoComplete="tel"
                  className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-accent/60"
                />
                <input
                  value={draft.client.brokerage ?? ''}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      client: { ...p.client, brokerage: e.target.value },
                    }))
                  }
                  placeholder="Brokerage"
                  autoCapitalize="words"
                  className="rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-accent/60"
                />
              </div>
              <input
                value={draft.notes ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (gate code, lockbox, owner home...)"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-accent/60"
              />
            </div>
          </Field>
        ) : (
          <button
            type="button"
            onClick={() => setShowClient(true)}
            className="tap mb-4 mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3.5 py-2 text-[13px] text-white/70 ring-1 ring-inset ring-white/10"
          >
            <span aria-hidden>+</span> Add client / notes
          </button>
        )}

        {initial && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="tap mt-4 w-full rounded-2xl bg-rose-500/10 py-3 text-[14px] font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/20"
          >
            Delete shoot
          </button>
        )}
      </div>

      <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[480px] px-4 pb-3">
          <button
            type="button"
            onClick={() => canSave && onSave(draft)}
            disabled={!canSave}
            className={[
              'pointer-events-auto tap flex w-full items-center justify-between rounded-2xl px-5 py-4 text-[16px] font-semibold shadow-[0_8px_24px_-8px_rgba(124,92,255,0.6)] transition-colors',
              canSave ? 'bg-accent text-white' : 'bg-white/10 text-white/40 shadow-none',
            ].join(' ')}
          >
            <span>{initial ? 'Save changes' : 'Book this shoot'}</span>
            <span className="tabular-nums">{currency(draft.price)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
