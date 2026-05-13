import type { Service, Settings } from '../types';
import { currency } from '../lib/format';
import { StartingLocationCard } from '../components/StartingLocationCard';
import { BusinessInfoCard } from '../components/BusinessInfoCard';
import { ThemeToggleCard } from '../components/ThemeToggleCard';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  services: Service[];
  settings: Settings;
  accountEmail?: string | null;
  onSaveSettings: (s: Settings) => void;
  onSignOut?: () => void;
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
  accountEmail,
  onSaveSettings,
  onSignOut,
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
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onBack}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            ‹ Back
          </button>
        }
        title="Settings"
      />

      <main className="flex-1 pb-24 pt-5">
        <ThemeToggleCard />
        <StartingLocationCard settings={settings} onChange={onSaveSettings} />
        <BusinessInfoCard settings={settings} onChange={onSaveSettings} />

        {onSignOut && (
          <section className="card mb-6 p-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
                Account
              </h2>
              <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
                Synced
              </span>
            </div>
            {accountEmail && (
              <p className="truncate text-[13px] text-neutral-700 dark:text-neutral-300">
                {accountEmail}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                if (confirm('Sign out? Your data stays in the cloud and reappears next sign-in.')) {
                  onSignOut();
                }
              }}
              className="tap mt-4 w-full rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-2 text-[13px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white"
            >
              Sign out
            </button>
          </section>
        )}

        <button
          type="button"
          onClick={onOpenClients}
          className="card tap mb-6 flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">Clients</p>
            <p className="mt-0.5 text-[12.5px] text-neutral-500 dark:text-neutral-400">{clientsSummary}</p>
          </div>
          <span className="text-neutral-300 dark:text-neutral-600" aria-hidden>
            ›
          </span>
        </button>

        <div className="mb-2 flex items-end justify-between gap-2 px-0.5">
          <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">Catalog</h2>
          <button
            type="button"
            onClick={onAdd}
            className="tap rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-[13px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            + Add service
          </button>
        </div>
        <p className="mb-3 px-0.5 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
          Services that appear on the booking screen. Tap one to edit or remove it.
        </p>

        {services.length === 0 ? (
          <div className="card mt-2 px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">Your catalog is empty.</p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
            >
              + Add your first service
            </button>
          </div>
        ) : (
          <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onEdit(s)}
                  className="tap flex w-full items-stretch gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-neutral-900 dark:text-neutral-100">
                      {s.name}
                    </p>
                    <p className="text-[12.5px] text-neutral-500 dark:text-neutral-400">
                      {currency(s.price)}
                    </p>
                    {s.description && (
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-neutral-400 dark:text-neutral-500">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <span className="self-center text-neutral-300 dark:text-neutral-600" aria-hidden>
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
