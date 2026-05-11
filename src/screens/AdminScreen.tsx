import type { Service, Settings } from '../types';
import { currency, formatDuration } from '../lib/format';
import { StartingLocationCard } from '../components/StartingLocationCard';
import { BusinessInfoCard } from '../components/BusinessInfoCard';

type Props = {
  services: Service[];
  settings: Settings;
  onSaveSettings: (s: Settings) => void;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (s: Service) => void;
  onOpenClients: () => void;
  companiesCount: number;
  agentsCount: number;
};

export function AdminScreen({
  services,
  settings,
  onSaveSettings,
  onBack,
  onAdd,
  onEdit,
  onOpenClients,
  companiesCount,
  agentsCount,
}: Props) {
  const clientsSummary =
    companiesCount === 0
      ? 'No brokerages or agents yet'
      : `${companiesCount} ${companiesCount === 1 ? 'brokerage' : 'brokerages'} · ${agentsCount} ${
          agentsCount === 1 ? 'agent' : 'agents'
        }`;

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
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900">Settings</h1>
        <span className="w-12" aria-hidden />
      </header>

      <main className="flex-1 pb-12 pt-4">
        <StartingLocationCard settings={settings} onChange={onSaveSettings} />
        <BusinessInfoCard settings={settings} onChange={onSaveSettings} />

        <button
          type="button"
          onClick={onOpenClients}
          className="card tap mb-6 flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-neutral-900">Clients</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">{clientsSummary}</p>
          </div>
          <span className="text-neutral-300" aria-hidden>
            ›
          </span>
        </button>

        <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
          <h2 className="text-[14px] font-semibold text-neutral-900">Catalog</h2>
          <button
            type="button"
            onClick={onAdd}
            className="tap rounded-md bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-black"
          >
            + Add service
          </button>
        </div>
        <p className="mb-3 px-0.5 text-[12.5px] leading-snug text-neutral-500">
          Services that appear on the booking screen. Tap one to edit or remove it.
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
