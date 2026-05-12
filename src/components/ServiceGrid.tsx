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
              'tap flex flex-col rounded-xl border p-3 text-left',
              isOn
                ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-800/50 ring-1 ring-neutral-900 dark:ring-neutral-100'
                : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => onChange(s.id, isOn ? 0 : 1)}
              className="block flex-1 text-left"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                  {s.name}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {currency(s.price)}
                </span>
              </div>
              {/* Reserve two lines for the description so tiles with and
                * without one (and 1- vs 2-line descriptions) match heights. */}
              <p className="mt-1 line-clamp-2 min-h-[34px] text-[12px] leading-snug text-neutral-500 dark:text-neutral-400">
                {s.description ?? ' '}
              </p>
            </button>
            {/* Always rendered (just visually hidden when qty=0) so selected
              * and unselected tiles occupy the same vertical space. */}
            <div
              className={[
                'mt-2 flex items-center justify-end gap-1',
                isOn ? '' : 'invisible',
              ].join(' ')}
              aria-hidden={!isOn}
            >
              <Stepper
                label={`Decrease ${s.name} quantity`}
                onClick={() => onChange(s.id, Math.max(0, qty - 1))}
              >
                −
              </Stepper>
              <span className="min-w-[1.5rem] text-center text-[13px] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {qty || 1}
              </span>
              <Stepper
                label={`Increase ${s.name} quantity`}
                onClick={() => onChange(s.id, qty + 1)}
              >
                +
              </Stepper>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Stepper({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap grid h-8 w-8 place-items-center rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[15px] font-semibold leading-none text-neutral-700 dark:text-neutral-200 hover:border-neutral-400 dark:hover:border-neutral-500"
    >
      {children}
    </button>
  );
}
