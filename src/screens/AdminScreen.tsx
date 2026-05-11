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
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between bg-ink-950/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="tap -ml-1 rounded-lg px-2 py-1.5 text-[15px] text-white/70 hover:text-white"
        >
          ‹ Back
        </button>
        <h1 className="text-[15px] font-semibold">Catalog</h1>
        <button
          type="button"
          onClick={onAdd}
          className="tap rounded-full bg-accent px-3.5 py-1.5 text-[14px] font-semibold text-white"
        >
          + Add
        </button>
      </header>

      <main className="flex-1 pb-12 pt-2">
        <p className="mb-3 px-1 text-[12px] leading-snug text-white/50">
          These services show up on the booking screen. Tap one to edit, or remove it from
          your catalog.
        </p>

        {services.length === 0 ? (
          <div className="card mt-2 px-5 py-8 text-center">
            <p className="text-[14px] text-white/60">Your catalog is empty.</p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-white"
            >
              + Add your first service
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-white/[0.04] overflow-hidden">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="tap flex w-full items-stretch gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-white">{s.name}</p>
                    <p className="text-[12.5px] text-white/55">
                      {formatDuration(s.durationMin)} · {currency(s.price)}
                    </p>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-white/40">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <span className="self-center text-white/30" aria-hidden>
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
