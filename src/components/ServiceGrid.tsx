import type { Service } from '../types';
import { currency } from '../lib/format';

type Props = {
  services: Service[];
  selected: Array<{ id: string; qty: number }>;
  onChange: (id: string, qty: number) => void;
};

export function ServiceGrid({ services, selected, onChange }: Props) {
  const qtyById = new Map(selected.map((e) => [e.id, e.qty]));

  return (
    <div className="grid grid-cols-2 gap-2">
      {services.map((s) => {
        const qty = qtyById.get(s.id) ?? 0;
        const isOn = qty > 0;
        return (
          <div
            key={s.id}
            className={[
              'tap rounded-xl border p-3 text-left',
              isOn
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800/50 ring-1 ring-neutral-900 dark:ring-neutral-100'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onChange(s.id, isOn ? 0 : 1)}
              className="block w-full text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {s.name}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {currency(s.price)}
                </span>
              </div>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
                  {s.description}
                </p>
              )}
            </button>
            {isOn && (
              <div className="mt-2 flex items-center justify-end gap-1">
                <Stepper
                  aria-label={`Decrease ${s.name} quantity`}
                  onClick={() => onChange(s.id, Math.max(0, qty - 1))}
                >
                  −
                </Stepper>
                <span className="min-w-[1.5rem] text-center text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {qty}
                </span>
                <Stepper
                  aria-label={`Increase ${s.name} quantity`}
                  onClick={() => onChange(s.id, qty + 1)}
                >
                  +
                </Stepper>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({
  children,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap grid h-7 w-7 place-items-center rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[14px] font-semibold text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-500"
      {...rest}
    >
      {children}
    </button>
  );
}
