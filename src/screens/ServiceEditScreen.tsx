import { useEffect, useRef, useState } from 'react';
import type { DraftService, Service } from '../types';
import { Field } from '../components/Field';

type Props = {
  initial?: Service;
  onSave: (draft: DraftService) => void;
  onDelete?: () => void;
  onCancel: () => void;
};

const empty = (): DraftService => ({
  name: '',
  durationMin: 60,
  price: 295,
  description: '',
});

const fromService = (s: Service): DraftService => ({
  name: s.name,
  durationMin: s.durationMin,
  price: s.price,
  description: s.description ?? '',
});

export function ServiceEditScreen({ initial, onSave, onDelete, onCancel }: Props) {
  const [draft, setDraft] = useState<DraftService>(() =>
    initial ? fromService(initial) : empty(),
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => nameRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [initial]);

  const canSave = draft.name.trim().length > 0 && draft.durationMin > 0 && draft.price >= 0;

  const save = () =>
    canSave &&
    onSave({
      name: draft.name.trim(),
      durationMin: draft.durationMin,
      price: draft.price,
      description: draft.description?.trim() || undefined,
    });

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between bg-ink-950/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onCancel}
          className="tap -ml-1 rounded-lg px-2 py-1.5 text-[15px] text-white/70 hover:text-white"
        >
          Cancel
        </button>
        <h1 className="text-[15px] font-semibold">{initial ? 'Edit service' : 'New service'}</h1>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={[
            'tap rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors',
            canSave ? 'bg-accent text-white' : 'bg-white/10 text-white/40',
          ].join(' ')}
        >
          Save
        </button>
      </header>

      <div className="flex-1 pb-12 pt-2">
        <Field label="Name">
          <input
            ref={nameRef}
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Photo + Drone"
            autoCapitalize="words"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-[16px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:bg-white/[0.06] focus:outline-none focus:ring-accent/60"
          />
        </Field>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <label className="rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-inset ring-white/10">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/45">
              Duration (min)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={draft.durationMin}
              onChange={(e) =>
                setDraft((p) => ({ ...p, durationMin: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-white focus:outline-none"
            />
          </label>
          <label className="rounded-2xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-inset ring-white/10">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/45">
              Price ($)
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              value={draft.price}
              onChange={(e) =>
                setDraft((p) => ({ ...p, price: Math.max(0, Number(e.target.value) || 0) }))
              }
              className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-white focus:outline-none"
            />
          </label>
        </div>

        <Field label="Description" hint="optional">
          <input
            value={draft.description ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Shown on the booking screen"
            className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-accent/60"
          />
        </Field>

        {initial && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="tap mt-4 w-full rounded-2xl bg-rose-500/10 py-3 text-[14px] font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/20"
          >
            Remove from catalog
          </button>
        )}
      </div>
    </div>
  );
}
