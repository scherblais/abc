import { useRecordSyncStatus, type RecordEntry } from '../lib/sync-status';

const TEXT: Record<RecordEntry['state'], (savedAtRel: string) => string> = {
  pending: () => 'Pending sync',
  saving: () => 'Saving…',
  saved: (rel) => `Saved ${rel}`,
  error: () => 'Save failed',
};

const TONE: Record<RecordEntry['state'], string> = {
  pending: 'text-amber-700 dark:text-amber-300',
  saving: 'text-neutral-500 dark:text-neutral-400',
  saved: 'text-neutral-500 dark:text-neutral-400',
  error: 'text-red-600 dark:text-red-400',
};

/**
 * Tiny status pill rendered next to a record's title or below an
 * auto-saving card. Returns null when there's no sync state to show
 * (brand-new record before its first save, or signed-out mode).
 */
export function RecordSyncLabel({
  path,
  className = '',
}: {
  path: string | undefined;
  className?: string;
}) {
  const entry = useRecordSyncStatus(path);
  if (!path || !entry) return null;
  const rel = relativeTime(entry.savedAt);
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 text-[11.5px]',
        TONE[entry.state],
        className,
      ].join(' ')}
      aria-live="polite"
    >
      <Dot state={entry.state} />
      {TEXT[entry.state](rel)}
      {entry.state === 'error' && entry.retry && (
        <button
          type="button"
          onClick={() => {
            void entry.retry?.();
          }}
          className="tap ml-1 rounded px-1.5 py-0.5 text-[11.5px] font-medium text-red-700 dark:text-red-300 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      )}
    </span>
  );
}

function Dot({ state }: { state: RecordEntry['state'] }) {
  const cls =
    state === 'saved'
      ? 'bg-emerald-500'
      : state === 'pending'
        ? 'bg-amber-500'
        : state === 'saving'
          ? 'bg-amber-500 animate-pulse'
          : 'bg-red-500';
  return (
    <span aria-hidden className={`block h-1.5 w-1.5 rounded-full ${cls}`} />
  );
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - ts) / 1000));
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
