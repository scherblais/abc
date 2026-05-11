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
              'tap rounded-2xl p-3 text-left ring-1 ring-inset transition-colors',
              isOn ? 'bg-accent/15 ring-accent/60' : 'bg-white/[0.03] ring-white/10',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[14px] font-semibold text-white">{s.name}</span>
              <span className="text-[13px] font-semibold tabular-nums text-white/90">
                {currency(s.price)}
              </span>
            </div>
            {s.description ? (
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-white/55">
                {s.description}
              </p>
            ) : (
              <p className="mt-1 text-[11.5px] text-white/40">&nbsp;</p>
            )}
            <p className="mt-1 text-[11px] text-white/40">{formatDuration(s.durationMin)}</p>
          </button>
        );
      })}
    </div>
  );
}
