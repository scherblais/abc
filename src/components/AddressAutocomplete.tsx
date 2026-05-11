import { useEffect, useRef, useState } from 'react';
import { googlePlacesAutocomplete, type PlaceSuggestion } from '../lib/google';
import type { LatLon } from '../types';

type Props = {
  value: string;
  onChange: (v: string) => void;
  apiKey?: string;
  bias?: LatLon;
  placeholder?: string;
  inputClassName?: string;
  autoFocus?: boolean;
};

export function AddressAutocomplete({
  value,
  onChange,
  apiKey,
  bias,
  placeholder,
  inputClassName,
  autoFocus,
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  // Prevent suggestions from firing immediately after a user selects one.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [autoFocus]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const trimmed = value.trim();
    if (!apiKey || trimmed.length < 3) {
      setSuggestions([]);
      setError(null);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const r = await googlePlacesAutocomplete(trimmed, apiKey, bias);
      if (r.ok) {
        setSuggestions(r.value);
        setError(null);
        setActive(0);
      } else {
        setSuggestions([]);
        setError(r.error);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, apiKey, bias?.lat, bias?.lon]);

  const handleSelect = (s: PlaceSuggestion) => {
    justSelectedRef.current = true;
    onChange(s.text);
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const showDropdown = open && focused && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          // Delay so click on a suggestion fires before we hide the menu.
          setTimeout(() => setFocused(false), 150);
        }}
        onKeyDown={(e) => {
          if (!showDropdown) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            if (suggestions[active]) {
              e.preventDefault();
              handleSelect(suggestions[active]);
            }
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="words"
        className={inputClassName}
      />
      {showDropdown && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg">
          {suggestions.map((s, i) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                onMouseEnter={() => setActive(i)}
                className={[
                  'block w-full px-3.5 py-2.5 text-left text-[14px]',
                  i === active ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
                ].join(' ')}
              >
                <span className="block font-medium text-neutral-900 dark:text-neutral-100">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="block text-[12px] text-neutral-500 dark:text-neutral-400">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && apiKey && value.trim().length >= 3 && !showDropdown && (
        <p
          className="mt-1.5 line-clamp-2 px-0.5 text-[11px] leading-snug text-neutral-500 dark:text-neutral-400"
          aria-live="polite"
        >
          Suggestions unavailable: {error}
        </p>
      )}
    </div>
  );
}
