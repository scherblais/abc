import { useEffect, useRef, useState } from 'react';
import { useSyncStatus, type GlobalColor } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

const DOT_BG: Record<GlobalColor, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
  idle: 'bg-neutral-400 dark:bg-neutral-600',
};

const DOT_RING: Record<GlobalColor, string> = {
  green: 'ring-emerald-500/30',
  yellow: 'ring-amber-500/30',
  red: 'ring-red-500/30',
  idle: 'ring-neutral-400/20',
};

/**
 * Compact coloured dot that shows the app's global sync state. Tap opens
 * a popover with the active label, the last error if any, and a Retry
 * button when an error is recoverable. Hidden when no uid is in context
 * (signed-out / local-only mode has nothing to sync).
 */
export function SyncIndicator() {
  const uid = useUid();
  const { color, label, lastError, retry, dismissError } = useSyncStatus();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  // Close on outside tap.
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [open]);

  if (!uid) return null;

  const onRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="relative" ref={popRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Sync status: ${label}`}
        className="tap grid h-9 w-9 place-items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-600"
      >
        <span
          aria-hidden
          className={[
            'block h-2 w-2 rounded-full ring-4 transition-colors',
            DOT_BG[color],
            DOT_RING[color],
            color === 'yellow' ? 'animate-pulse' : '',
          ].join(' ')}
        />
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 shadow-lg"
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`block h-2 w-2 rounded-full ${DOT_BG[color]}`}
            />
            <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
              {label}
            </p>
          </div>
          {lastError && (
            <>
              <p className="mt-2 text-[12px] leading-snug text-neutral-600 dark:text-neutral-400">
                {lastError.message}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
                Path: <code className="font-mono text-[10.5px]">{shortPath(lastError.path)}</code>
              </p>
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    dismissError();
                    setOpen(false);
                  }}
                  className="tap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white"
                >
                  Dismiss
                </button>
                {lastError.retry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    disabled={retrying}
                    className="tap rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-[12.5px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200 disabled:opacity-60"
                  >
                    {retrying ? 'Retrying…' : 'Retry'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function shortPath(p: string) {
  // users/<uid>/bookings/<id> → bookings/<id>
  const parts = p.split('/');
  if (parts[0] === 'users' && parts.length >= 4) {
    return parts.slice(2).join('/');
  }
  return p;
}
