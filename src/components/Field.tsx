import type { ReactNode } from 'react';

type Props = {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, hint, children }: Props) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-baseline justify-between gap-2 px-0.5">
        <label className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{label}</label>
        {hint && <span className="text-[12px] tabular-nums text-neutral-500 dark:text-neutral-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
