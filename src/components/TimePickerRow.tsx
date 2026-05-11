import { setTime } from '../lib/datetime';
import { formatTime } from '../lib/format';
import { Chip } from './Chip';

const PRESETS: { hour: number; minute: number; label?: string }[] = [
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0, label: 'Golden' },
  { hour: 18, minute: 0, label: 'Twilight' },
];

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

export function TimePickerRow({ value, onChange }: Props) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
      <div className="flex gap-2">
        {PRESETS.map((p) => {
          const candidate = setTime(value, p.hour, p.minute);
          const selected =
            value.getHours() === p.hour && value.getMinutes() === p.minute;
          return (
            <Chip
              key={`${p.hour}:${p.minute}`}
              selected={selected}
              onClick={() => onChange(candidate)}
            >
              <span className="tabular-nums">{formatTime(candidate)}</span>
              {p.label && (
                <span className={selected ? 'ml-1 text-white/70 dark:text-neutral-900/70' : 'ml-1 text-neutral-500 dark:text-neutral-400'}>
                  {p.label}
                </span>
              )}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}
