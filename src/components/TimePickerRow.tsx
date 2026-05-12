import { setTime } from '../lib/datetime';
import { formatTime } from '../lib/format';
import { Chip } from './Chip';

const PRESETS: { hour: number; minute: number; label?: string }[] = (() => {
  const out: { hour: number; minute: number; label?: string }[] = [];
  for (let h = 8; h <= 18; h++) {
    const label =
      h === 17 ? 'Golden' : h === 18 ? 'Twilight' : undefined;
    out.push({ hour: h, minute: 0, label });
    if (h < 18) out.push({ hour: h, minute: 30 });
  }
  return out;
})();

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
