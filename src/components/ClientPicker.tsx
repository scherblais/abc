import { useEffect, useMemo, useRef, useState } from 'react';
import type { Agent, Company } from '../types';

type Props = {
  companies: Company[];
  agents: Agent[];
  companyId?: string;
  agentId?: string;
  onChange: (companyId: string | undefined, agentId: string | undefined) => void;
  onCreateCompany: (name: string) => Company;
  onCreateAgent: (companyId: string, name: string) => Agent;
};

export function ClientPicker({
  companies,
  agents,
  companyId,
  agentId,
  onChange,
  onCreateCompany,
  onCreateAgent,
}: Props) {
  const company = companies.find((c) => c.id === companyId);
  const agent = agents.find((a) => a.id === agentId);

  return (
    <div className="space-y-2">
      <Combobox
        kind="company"
        label="Brokerage"
        placeholder="Select or add a brokerage"
        items={companies}
        selectedId={companyId}
        onSelect={(id) => onChange(id, undefined)}
        onClear={() => onChange(undefined, undefined)}
        onCreate={(name) => {
          const c = onCreateCompany(name);
          onChange(c.id, undefined);
        }}
        getLabel={(c) => c.name}
      />
      <Combobox
        kind="agent"
        label="Agent"
        placeholder={company ? `Agent at ${company.name}` : 'Pick a brokerage first'}
        items={companyId ? agents.filter((a) => a.companyId === companyId) : []}
        selectedId={agentId}
        disabled={!companyId}
        onSelect={(id) => onChange(companyId, id)}
        onClear={() => onChange(companyId, undefined)}
        onCreate={
          companyId
            ? (name) => {
                const a = onCreateAgent(companyId, name);
                onChange(companyId, a.id);
              }
            : undefined
        }
        getLabel={(a) => a.name}
        emptyHint={
          companyId && agents.filter((a) => a.companyId === companyId).length === 0
            ? `No agents yet at ${company?.name ?? 'this brokerage'} — type a name to add one.`
            : undefined
        }
      />
      {agent && (
        <ContactSummary phone={agent.phone} email={agent.email} />
      )}
    </div>
  );
}

type ComboboxProps<T extends { id: string }> = {
  kind: string;
  label: string;
  placeholder: string;
  items: T[];
  selectedId?: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onClear: () => void;
  onCreate?: (name: string) => void;
  getLabel: (item: T) => string;
  emptyHint?: string;
};

function Combobox<T extends { id: string }>({
  kind,
  label,
  placeholder,
  items,
  selectedId,
  disabled,
  onSelect,
  onClear,
  onCreate,
  getLabel,
  emptyHint,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = items.find((i) => i.id === selectedId);

  // When the selection changes from outside (e.g. user cleared), reset the query.
  useEffect(() => {
    if (!selected) setQuery('');
  }, [selected]);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    if (!trimmed) return items.slice(0, 8);
    const q = trimmed.toLowerCase();
    return items
      .filter((i) => getLabel(i).toLowerCase().includes(q))
      .slice(0, 8);
  }, [items, trimmed, getLabel]);

  const exactMatch = filtered.some(
    (i) => getLabel(i).toLowerCase() === trimmed.toLowerCase(),
  );
  const canCreate = !!onCreate && trimmed.length > 0 && !exactMatch;
  const showDropdown = !disabled && open && focused && !selected;

  // If already selected, render the compact "chip" view.
  if (selected) {
    return (
      <div>
        <label className="mb-1 block px-0.5 text-[11.5px] font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2.5">
          <span className="flex-1 truncate text-[15px] text-neutral-900 dark:text-neutral-100">
            {getLabel(selected)}
          </span>
          <button
            type="button"
            onClick={() => {
              onClear();
              setQuery('');
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="tap rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 hover:text-neutral-900 dark:hover:text-white"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="mb-1 block px-0.5 text-[11.5px] font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={(e) => {
          if (!showDropdown) return;
          const total = filtered.length + (canCreate ? 1 : 0);
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, total - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active < filtered.length) {
              onSelect(filtered[active].id);
            } else if (canCreate) {
              onCreate!(trimmed);
            }
            setQuery('');
            setOpen(false);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="words"
        disabled={disabled}
        className={
          'input' +
          (disabled ? ' cursor-not-allowed bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500' : '')
        }
      />
      {showDropdown && (filtered.length > 0 || canCreate || emptyHint) && (
        <ul
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg"
          role="listbox"
        >
          {filtered.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(item.id);
                  setQuery('');
                  setOpen(false);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  'block w-full px-3.5 py-2.5 text-left text-[14px] text-neutral-900 dark:text-neutral-100',
                  i === active ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
                ].join(' ')}
              >
                {getLabel(item)}
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onCreate!(trimmed);
                  setQuery('');
                  setOpen(false);
                }}
                onMouseEnter={() => setActive(filtered.length)}
                className={[
                  'block w-full border-t border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left text-[14px]',
                  active === filtered.length
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60',
                ].join(' ')}
              >
                + Add new {kind} <span className="font-medium">"{trimmed}"</span>
              </button>
            </li>
          )}
          {!canCreate && filtered.length === 0 && emptyHint && (
            <li className="px-3.5 py-2.5 text-[12.5px] leading-snug text-neutral-500 dark:text-neutral-400">
              {emptyHint}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ContactSummary({ phone, email }: { phone?: string; email?: string }) {
  if (!phone && !email) return null;
  return (
    <p className="px-0.5 text-[11.5px] leading-snug text-neutral-500 dark:text-neutral-400">
      {phone}
      {phone && email ? ' · ' : ''}
      {email}
    </p>
  );
}
