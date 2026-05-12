import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';
import { NumberField } from './NumberField';
import { RecordSyncLabel } from './RecordSyncLabel';
import { settingsPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
};

export function BusinessInfoCard({ settings, onChange }: Props) {
  const uid = useUid();
  const [name, setName] = useState(settings.businessName ?? '');
  const [address, setAddress] = useState(settings.businessAddress ?? '');
  const [phone, setPhone] = useState(settings.businessPhone ?? '');
  const [email, setEmail] = useState(settings.businessEmail ?? '');
  const [terms, setTerms] = useState(settings.defaultPaymentTermsDays ?? 30);

  // Track the latest settings prop in a ref so the debounced commit always
  // uses the most recent value (including the Firestore-loaded payload),
  // not whatever happened to be captured when the user first started typing.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // While the user is actively editing, we DO NOT mirror prop changes into
  // local state — doing so would wipe their in-progress typing the instant
  // Firestore's subscription delivers the saved values. Cleared after the
  // commit timer fires.
  const editingRef = useRef(false);

  // Pull fresh values from the settings prop into the form fields whenever
  // the user is NOT mid-edit. This is the path that hydrates the form once
  // Firestore loads (and the path that picks up changes from other devices).
  useEffect(() => {
    if (editingRef.current) return;
    setName(settings.businessName ?? '');
    setAddress(settings.businessAddress ?? '');
    setPhone(settings.businessPhone ?? '');
    setEmail(settings.businessEmail ?? '');
    setTerms(settings.defaultPaymentTermsDays ?? 30);
  }, [
    settings.businessName,
    settings.businessAddress,
    settings.businessPhone,
    settings.businessEmail,
    settings.defaultPaymentTermsDays,
  ]);

  // Debounced commit. Only runs after the user actually edited something
  // (editingRef.current === true), uses settingsRef.current so it can never
  // clobber fields it didn't intend to touch.
  useEffect(() => {
    if (!editingRef.current) return;
    const t = setTimeout(() => {
      const current = settingsRef.current;
      const trimmedName = name.trim() || undefined;
      const trimmedAddress = address.trim() || undefined;
      const trimmedPhone = phone.trim() || undefined;
      const trimmedEmail = email.trim() || undefined;
      const safeTerms = Number.isFinite(terms) ? Math.max(0, terms) : 30;
      onChange({
        ...current,
        businessName: trimmedName,
        businessAddress: trimmedAddress,
        businessPhone: trimmedPhone,
        businessEmail: trimmedEmail,
        defaultPaymentTermsDays: safeTerms,
      });
      editingRef.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [name, address, phone, email, terms, onChange]);

  // Wrap every setter so a real user edit marks the form as dirty. Programmatic
  // updates from the sync effect above don't go through these wrappers, so
  // editingRef stays false in that path.
  const edit =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      editingRef.current = true;
      setter(v);
    };

  return (
    <section className="card mb-6 p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
          Business info
        </h2>
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">For invoices</span>
      </div>

      <label className="block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        Business name
      </label>
      <input
        value={name}
        onChange={(e) => edit(setName)(e.target.value)}
        placeholder="Your studio / DBA"
        autoCapitalize="words"
        className="input mt-1.5"
      />

      <label className="mt-4 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        Address
      </label>
      <textarea
        value={address}
        onChange={(e) => edit(setAddress)(e.target.value)}
        rows={2}
        placeholder="Mailing address shown on invoices"
        className="input mt-1.5 resize-none"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => edit(setPhone)(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="(514) 555-0123"
            className="input mt-1.5"
          />
        </label>
        <label>
          <span className="block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => edit(setEmail)(e.target.value)}
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            placeholder="hello@yourstudio.ca"
            className="input mt-1.5"
          />
        </label>
      </div>

      <label className="mt-4 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        Default payment terms (days)
      </label>
      <NumberField
        min={0}
        step={1}
        value={terms}
        onChange={edit(setTerms)}
        className="input mt-1.5"
      />

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
          Invoices automatically add GST (5%) and QST (9.975%).
        </p>
        {uid && <RecordSyncLabel path={settingsPath(uid)} />}
      </div>
    </section>
  );
}
