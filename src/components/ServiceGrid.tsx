import type { Service } from '../types';
import { currency, formatDuration } from '../lib/format';

type Props = {
  services: Service[];
  selectedIds: string[];
  onToggle: (id: string) => void;
};

export function ServiceGrid({ services, selectedIds, onToggle }: Props) {
  const selected = new Set(selectedIds);
  return (
    <div className="grid grid-cols-2 gap-2">
      {services.map((s) => {
        const isOn = selected.has(s.id);
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onToggle(s.id)}
            className={[
              'tap rounded-xl border p-3 text-left',
              isOn
                ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                : 'border-neutral-200 bg-white hover:border-neutral-300',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold text-neutral-900">
                {s.name}
              </span>
              <span className="text-[13px] font-semibold tabular-nums text-neutral-900">
                {currency(s.price)}
              </span>
            </div>
            {s.description ? (
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-neutral-500">
                {s.description}
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-transparent">&nbsp;</p>
            )}
            <p className="mt-1 text-[11.5px] text-neutral-400">{formatDuration(s.durationMin)}</p>
          </button>
        );
      })}
    </div>
  );
}
