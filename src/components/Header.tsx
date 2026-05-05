import { useNow } from '../lib/now';

export function Header() {
  const now = useNow();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="safe-top sticky top-0 z-20 -mx-4 mb-4 bg-ink-950/80 px-4 pb-3 pt-3 backdrop-blur-md sm:mx-0 sm:rounded-none">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
            {dateStr}
          </p>
          <h1 className="truncate text-[22px] font-semibold leading-tight text-white">
            Hey, Alex <span aria-hidden>·</span>{' '}
            <span className="text-white/50 font-normal">Lensbook</span>
          </h1>
        </div>
        <button
          type="button"
          aria-label="Account"
          className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 ring-1 ring-white/10"
        >
          <span className="text-sm font-semibold">A</span>
        </button>
      </div>
    </header>
  );
}
