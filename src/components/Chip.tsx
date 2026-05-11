import type { ReactNode } from 'react';

type Props = {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  size?: 'sm' | 'md';
};

export function Chip({ selected, onClick, children, size = 'md' }: Props) {
  const padding = size === 'sm' ? 'px-3 py-1.5 text-[12.5px]' : 'px-3.5 py-2 text-[13.5px]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tap rounded-full font-medium ring-1 ring-inset transition-colors',
        padding,
        selected
          ? 'bg-accent text-white ring-accent'
          : 'bg-white/[0.04] text-white/80 ring-white/10 hover:bg-white/[0.07]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
