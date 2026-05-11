import { useEffect, useState } from 'react';
import {
  applyTheme,
  installSystemListener,
  readStoredTheme,
  writeStoredTheme,
  type ThemeMode,
} from '../lib/theme';

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggleCard() {
  const [mode, setMode] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    return installSystemListener(() => mode);
  }, [mode]);

  const choose = (next: ThemeMode) => {
    setMode(next);
    writeStoredTheme(next);
    applyTheme(next);
  };

  return (
    <section className="card mb-6 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
          Appearance
        </h2>
        <span className="text-[12px] text-neutral-500 dark:text-neutral-400">
          Theme
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((o) => {
          const selected = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => choose(o.value)}
              className={[
                'tap rounded-lg border px-3 py-2 text-[13px] font-medium',
                selected
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600',
              ].join(' ')}
              aria-pressed={selected}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
