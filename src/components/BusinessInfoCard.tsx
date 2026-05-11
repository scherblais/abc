import { useEffect, useState } from 'react';
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

  // Debounce write-back to localStorage so each keystroke doesn't ping save.
  useEffect(() => {
    const t = setTimeout(() => {
      onChange({
        ...settings,
        businessName: name.trim() || undefined,
        businessAddress: address.trim() || undefined,
        businessPhone: phone.trim() || undefined,
        businessEmail: email.trim() || undefined,
        defaultPaymentTermsDays: Number.isFinite(terms)
          ? Math.max(0, terms)
          : 30,
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, address, phone, email, terms]);

  return (
    <section className="card mb-6 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">
          Business info
        </h2>
        <span className="text-[12px] text-neutral-500">For invoices</span>
      </div>

      <label className="block text-[11.5px] font-medium text-neutral-500">
        Business name
      </label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your studio / DBA"
        autoCapitalize="words"
        className="input mt-1"
      />

      <label className="mt-3 block text-[11.5px] font-medium text-neutral-500">
        Address
      </label>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        rows={2}
        placeholder="Mailing address shown on invoices"
        className="input mt-1 resize-none"
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label>
          <span className="block text-[11.5px] font-medium text-neutral-500">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            autoComplete="tel"
            placeholder="(514) 555-0123"
            className="input mt-1"
          />
        </label>
        <label>
          <span className="block text-[11.5px] font-medium text-neutral-500">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            placeholder="hello@yourstudio.ca"
            className="input mt-1"
          />
        </label>
      </div>

      <label className="mt-3 block text-[11.5px] font-medium text-neutral-500">
        Default payment terms (days)
      </label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={terms}
        onChange={(e) => setTerms(Number(e.target.value) || 0)}
        className="input mt-1"
      />

      <p className="mt-2 text-[11.5px] leading-snug text-neutral-500">
        Invoices automatically add GST (5%) and QST (9.975%).
      </p>
    </section>
  );
}
