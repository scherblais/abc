import type { ReactNode } from 'react';
import { SyncIndicator } from './SyncIndicator';
import { NavMenu } from './NavMenu';

type Props = {
  /** Left-aligned content (back button, monogram, etc.). */
  left?: ReactNode;
  /** Centered title. Omit to let the right column hug the left content
   *  (HomeScreen layout). */
  title?: ReactNode;
  /** Right-aligned content. The SyncIndicator always appears at the very
   *  right of this group; pass any other action buttons through `right`
   *  and they'll sit beside it. */
  right?: ReactNode;
  /** Tighter top/bottom padding (used on HomeScreen). */
  dense?: boolean;
};

/**
 * Shared sticky header for every screen. Reproduces the existing visual
 * shell so swapping `<header>` blocks for `<ScreenHeader>` is a no-pixel-
 * diff change, and mounts the SyncIndicator in a consistent spot. The
 * title (when provided) is absolutely-centered so it stays in the middle
 * regardless of left/right content widths.
 */
export function ScreenHeader({ left, title, right, dense }: Props) {
  return (
    <header
      className={[
        'safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/85 dark:bg-neutral-900/85 px-4 backdrop-blur-md',
        dense ? 'py-2' : 'py-3',
        title ? 'relative' : '',
      ].join(' ')}
    >
      <div className="flex min-w-0 items-center">{left}</div>
      {title && (
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 truncate text-[15px] font-semibold tracking-tightish text-neutral-900 dark:text-neutral-100">
          {title}
        </h1>
      )}
      <div className="flex shrink-0 items-center gap-1.5">
        {right}
        <SyncIndicator />
        <NavMenu />
      </div>
    </header>
  );
}
