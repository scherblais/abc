import { useMemo } from 'react';
import { addDays, isSameDay, startOfDay } from '../lib/datetime';

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export function DatePickerRow({ value, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(today, i)),
    [today],
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <div className="flex gap-2">
        {days.map((d) => {
          const selected = isSameDay(d, value);
          const isToday = isSameDay(d, today);
          const label = isToday
            ? 'Today'
            : isSameDay(d, addDays(today, 1))
              ? 'Tomorrow'
              : d.toLocaleDateString('en-US', { weekday: 'short' });
          const num = d.getDate();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => {
                // Preserve time-of-day from current value
                const next = new Date(d);
                next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                onChange(next);
              }}
              className={[
                'tap flex min-w-[68px] shrink-0 flex-col items-center rounded-2xl px-3 py-2.5 ring-1 ring-inset transition-colors',
                selected
                  ? 'bg-accent text-white ring-accent'
                  : 'bg-white/[0.04] text-white/80 ring-white/10',
              ].join(' ')}
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] opacity-80">
                {label}
              </span>
              <span className="mt-0.5 text-[20px] font-semibold leading-none tabular-nums">
                {num}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
