import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: number;
  onChange: (n: number) => void;
  /** Minimum, default 0. Values below clamp to it. */
  min?: number;
  /** Step (for arrow keys / mobile keyboard hints). */
  step?: number;
  /** If true, allow decimals; uses inputMode="decimal". Otherwise integers. */
  decimal?: boolean;
};

/**
 * Number input that displays a string while the user is editing so an
 * emptied field stays empty (instead of snapping to "0") and typing the
 * new value doesn't leave a leading "0". Commits to the parent on each
 * valid keystroke; on blur, normalizes an empty field back to "0" or the
 * current parent value so the visible state isn't stranded.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  step = 1,
  decimal,
  ...rest
}: Props) {
  const [text, setText] = useState<string>(() => String(value ?? min));
  const editingRef = useRef(false);

  // Sync external changes when the user isn't actively editing — so a fresh
  // mount or a parent-driven reset reflects in the field, but mid-type
  // updates don't get clobbered.
  useEffect(() => {
    if (editingRef.current) return;
    setText(String(value ?? min));
  }, [value, min]);

  return (
    <input
      type="number"
      inputMode={decimal ? 'decimal' : 'numeric'}
      step={step}
      min={min}
      value={text}
      onFocus={() => {
        editingRef.current = true;
      }}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === '') {
          // User cleared the field — report the floor but keep the input
          // visually empty so they can type fresh.
          onChange(min);
          return;
        }
        const n = Number(t);
        if (Number.isFinite(n) && n >= min) onChange(n);
      }}
      onBlur={() => {
        editingRef.current = false;
        // Normalize a stranded empty field back to a visible value.
        if (text === '') setText(String(value ?? min));
      }}
      {...rest}
    />
  );
}
