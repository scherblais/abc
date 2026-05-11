import type { ReactNode } from 'react';

type Props = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: Props) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {label}
        </label>
        {hint && <span className="text-[11px] text-white/40">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
