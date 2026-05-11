import type { ReactNode } from 'react';

type Props = {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  size?: 'sm' | 'md';
};

export function Chip({ selected, onClick, children, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13.5px]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap rounded-md border font-medium',
        padding,
        selected
          ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-600',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
