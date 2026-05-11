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

const INPUT = 'input';

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
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onCancel}
          className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 hover:text-neutral-900"
        >
          Cancel
        </button>
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900">
          {initial ? 'Edit service' : 'New service'}
        </h1>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={[
            'tap rounded-md px-3 py-1.5 text-[14px] font-medium',
            canSave
              ? 'bg-neutral-900 text-white hover:bg-black'
              : 'bg-neutral-100 text-neutral-400',
          ].join(' ')}
        >
          Save
        </button>
      </header>

      <div className="flex-1 pb-12 pt-4">
        <Field label="Name">
          <input
            ref={nameRef}
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Photo + Drone"
            autoCapitalize="words"
            className={INPUT}
          />
        </Field>

        <div className="mb-5 grid grid-cols-2 gap-2">
          <label className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
            <span className="block text-[11px] font-medium text-neutral-500">Duration (min)</span>
            <input
              type="number"
              inputMode="numeric"
              min={5}
              step={5}
              value={draft.durationMin}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  durationMin: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 focus:outline-none"
            />
          </label>
          <label className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
            <span className="block text-[11px] font-medium text-neutral-500">Price ($)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              value={draft.price}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  price: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-0.5 w-full bg-transparent text-[16px] font-semibold tabular-nums text-neutral-900 focus:outline-none"
            />
          </label>
        </div>

        <Field label="Description" hint="optional">
          <input
            value={draft.description ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Shown on the booking screen"
            className={INPUT}
          />
        </Field>

        {initial && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="tap mt-6 w-full rounded-lg border border-neutral-200 bg-white py-2.5 text-[14px] font-medium text-neutral-700 hover:border-neutral-300 hover:text-neutral-900"
          >
            Remove from catalog
          </button>
        )}
      </div>
    </div>
  );
}
