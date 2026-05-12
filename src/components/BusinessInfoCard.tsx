import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../types';

type Props = {
  settings: Settings;
  onChange: (s: Settings) => void;
};

export function BusinessInfoCard({ settings, onChange }: Props) {
  const [name, setName] = useState(settings.businessName ?? '');
  const [address, setAddress] = useState(settings.businessAddress ?? '');
  const [phone, setPhone] = useState(settings.businessPhone ?? '');
  const [email, setEmail] = useState(settings.businessEmail ?? '');
  const [terms, setTerms] = useState(settings.defaultPaymentTermsDays ?? 30);

  // Keep local form state in sync with externally-driven settings changes —
  // e.g. when Firestore loads the saved values on initial mount (which arrives
  // AFTER React's first paint), or when another device updates the same field.
  // We diff each prop value against the current local state to avoid stomping
  // on text the user is actively typing.
  const syncing = useRef(false);
  useEffect(() => {
    syncing.current = true;
    setName((prev) => (prev === (settings.businessName ?? '') ? prev : settings.businessName ?? ''));
    setAddress((prev) => (prev === (settings.businessAddress ?? '') ? prev : settings.businessAddress ?? ''));
    setPhone((prev) => (prev === (settings.businessPhone ?? '') ? prev : settings.businessPhone ?? ''));
    setEmail((prev) => (prev === (settings.businessEmail ?? '') ? prev : settings.businessEmail ?? ''));
    setTerms((prev) =>
      prev === (settings.defaultPaymentTermsDays ?? 30)
        ? prev
        : settings.defaultPaymentTermsDays ?? 30,
    );
    // After this commit, allow user-typing-driven writes again.
    const r = requestAnimationFrame(() => {
      syncing.current = false;
    });
    return () => cancelAnimationFrame(r);
  }, [
    settings.businessName,
    settings.businessAddress,
    settings.businessPhone,
    settings.businessEmail,
    settings.defaultPaymentTermsDays,
  ]);

  useEffect(() => {
    // Skip write while we're echoing an external prop change back into local
    // state — that round-trip would otherwise overwrite a fresh cloud value.
    if (syncing.current) return;
    const trimmedName = name.trim() || undefined;
    const trimmedAddress = address.trim() || undefined;
    const trimmedPhone = phone.trim() || undefined;
    const trimmedEmail = email.trim() || undefined;
    const safeTerms = Number.isFinite(terms) ? Math.max(0, terms) : 30;

    // No-op writes are wasteful and (in the round-trip-edge case) can race.
    if (
      trimmedName === settings.businessName &&
      trimmedAddress === settings.businessAddress &&
      trimmedPhone === settings.businessPhone &&
      trimmedEmail === settings.businessEmail &&
      safeTerms === (settings.defaultPaymentTermsDays ?? 30)
    ) {
      return;
    }

    const t = setTimeout(() => {
      onChange({
        ...settings,
        businessName: trimmedName,
        businessAddress: trimmedAddress,
        businessPhone: trimmedPhone,
        businessEmail: trimmedEmail,
        defaultPaymentTermsDays: safeTerms,
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, address, phone, email, terms]);

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
        onChange={(e) => setName(e.target.value)}
        placeholder="Your studio / DBA"
        autoCapitalize="words"
        className="input mt-1.5"
      />

      <label className="mt-4 block text-[12px] font-medium text-neutral-500 dark:text-neutral-400">
        Address
      </label>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
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
            onChange={(e) => setPhone(e.target.value)}
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
            onChange={(e) => setEmail(e.target.value)}
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
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={terms}
        onChange={(e) => setTerms(Number(e.target.value) || 0)}
        className="input mt-1.5"
      />

      <p className="mt-3 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
        Invoices automatically add GST (5%) and QST (9.975%).
      </p>
    </section>
  );
}
