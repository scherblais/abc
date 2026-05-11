import { PACKAGES } from '../lib/services';
import type { Package, ServiceKey } from '../types';
import { currency, formatDuration } from '../lib/format';

type Props = {
  selectedServices: ServiceKey[];
  price: number;
  durationMin: number;
  onPick: (pkg: Package) => void;
};

const sameSet = (a: ServiceKey[], b: ServiceKey[]) => {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((k) => s.has(k));
};

export function PackagePicker({ selectedServices, price, durationMin, onPick }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {PACKAGES.map((p) => {
        const matches =
          sameSet(p.services, selectedServices) &&
          p.price === price &&
          p.durationMin === durationMin;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            className={[
              'tap rounded-2xl p-3 text-left ring-1 ring-inset transition-colors',
              matches
                ? 'bg-accent/15 ring-accent/60'
                : 'bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-semibold text-white">{p.label}</span>
              <span className="text-[13px] font-semibold tabular-nums text-white/90">
                {currency(p.price)}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-white/55">
              {p.description}
            </p>
            <p className="mt-1 text-[11px] text-white/40">{formatDuration(p.durationMin)}</p>
          </button>
        );
      })}
    </div>
  );
}
