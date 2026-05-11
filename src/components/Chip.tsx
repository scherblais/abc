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
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
