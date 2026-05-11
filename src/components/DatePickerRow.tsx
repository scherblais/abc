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
          const isTomorrow = isSameDay(d, addDays(today, 1));
          const label = isToday
            ? 'Today'
            : isTomorrow
              ? 'Tmrw'
              : d.toLocaleDateString('en-CA', { weekday: 'short' });
          const num = d.getDate();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => {
                const next = new Date(d);
                next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                onChange(next);
              }}
              className={[
                'tap flex min-w-[64px] shrink-0 flex-col items-center rounded-lg border px-3 py-2.5',
                selected
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600',
              ].join(' ')}
            >
              <span
                className={[
                  'text-[11px] font-medium',
                  selected ? 'text-white/80 dark:text-neutral-900/70' : 'text-neutral-500 dark:text-neutral-400',
                ].join(' ')}
              >
                {label}
              </span>
              <span className="mt-0.5 text-[18px] font-semibold leading-none tabular-nums">
                {num}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
