import type { Service } from '../types';
import { currency, formatDuration } from '../lib/format';

type Props = {
  services: Service[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (s: Service) => void;
};

export function AdminScreen({ services, onBack, onAdd, onEdit }: Props) {
  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 hover:text-neutral-900"
        >
          ‹ Back
        </button>
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900">Catalog</h1>
        <button
          type="button"
          onClick={onAdd}
          className="tap rounded-md bg-neutral-900 px-3 py-1.5 text-[14px] font-medium text-white hover:bg-black"
        >
          + Add
        </button>
      </header>

      <main className="flex-1 pb-12 pt-4">
        <p className="mb-3 px-0.5 text-[13px] leading-snug text-neutral-500">
          These services show up on the booking screen. Tap one to edit, or remove it from
          your catalog.
        </p>

        {services.length === 0 ? (
          <div className="card mt-2 px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600">Your catalog is empty.</p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-md bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-black"
            >
              + Add your first service
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-neutral-100 overflow-hidden">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="tap flex w-full items-stretch gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-neutral-900">
                      {s.name}
                    </p>
                    <p className="text-[12.5px] text-neutral-500">
                      {formatDuration(s.durationMin)} · {currency(s.price)}
                    </p>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-neutral-400">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <span className="self-center text-neutral-300" aria-hidden>
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
