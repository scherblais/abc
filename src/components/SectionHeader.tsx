import type { ReactNode } from 'react';

type Props = {
  title: string;
  count?: number;
  action?: ReactNode;
  hint?: string;
};

export function SectionHeader({ title, count, action, hint }: Props) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3 px-1">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
        {typeof count === 'number' && (
          <span className="text-[12px] font-medium text-white/40">{count}</span>
        )}
        {hint && <span className="text-[11px] text-white/40">· {hint}</span>}
      </div>
      {action && <div className="text-[13px] text-accent-soft">{action}</div>}
    </div>
  );
}
