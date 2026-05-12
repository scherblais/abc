import { useEffect, useRef, useState } from 'react';
import type { DraftService, Service } from '../types';
import { Field } from '../components/Field';
import { NumberField } from '../components/NumberField';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  initial?: Service;
  onSave: (draft: DraftService) => void;
  onDelete?: () => void;
  onCancel: () => void;
};

const empty = (): DraftService => ({
  name: '',
  price: 295,
  description: '',
});

const fromService = (s: Service): DraftService => ({
  name: s.name,
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

  const canSave = draft.name.trim().length > 0 && draft.price >= 0;

  const save = () =>
    canSave &&
    onSave({
      name: draft.name.trim(),
      price: draft.price,
      description: draft.description?.trim() || undefined,
    });

  return (
    <div className="flex h-full min-h-full flex-col">
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onCancel}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Cancel
          </button>
        }
        title={initial ? 'Edit service' : 'New service'}
        right={
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className={[
              'tap rounded-md px-3 py-1.5 text-[14px] font-medium',
              canSave
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500',
            ].join(' ')}
          >
            Save
          </button>
        }
      />

      <div className="flex-1 pb-12 pt-5">
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

        <Field label="Price">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] text-neutral-400 dark:text-neutral-500">
              $
            </span>
            <NumberField
              min={0}
              step={5}
              value={draft.price}
              onChange={(n) => setDraft((p) => ({ ...p, price: n }))}
              className={INPUT + ' pl-7 tabular-nums'}
            />
          </div>
        </Field>

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
            className="btn-destructive mt-8"
          >
            Remove from catalog
          </button>
        )}
      </div>
    </div>
  );
}
