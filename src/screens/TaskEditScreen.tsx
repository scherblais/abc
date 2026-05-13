import { useEffect, useRef, useState } from 'react';
import type { Agent, Company, DraftTask, Task } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';
import { Field } from '../components/Field';
import { ClientPicker } from '../components/ClientPicker';
import { RecordSyncLabel } from '../components/RecordSyncLabel';
import { recordPath } from '../lib/sync-status';
import { useUid } from '../lib/uid-context';

type Props = {
  initial?: Task;
  companies: Company[];
  agents: Agent[];
  onSave: (draft: DraftTask) => void;
  onDelete?: () => void;
  onSchedule?: () => void;
  onCancel: () => void;
  onCreateCompany: (name: string) => Company;
  onCreateAgent: (companyId: string, name: string) => Agent;
};

const empty = (): DraftTask => ({
  title: '',
});

const fromTask = (t: Task): DraftTask => ({
  title: t.title,
  address: t.address,
  companyId: t.companyId,
  agentId: t.agentId,
  notes: t.notes,
  done: t.done,
});

export function TaskEditScreen({
  initial,
  companies,
  agents,
  onSave,
  onDelete,
  onSchedule,
  onCancel,
  onCreateCompany,
  onCreateAgent,
}: Props) {
  const uid = useUid();
  const [draft, setDraft] = useState<DraftTask>(() =>
    initial ? fromTask(initial) : empty(),
  );
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initial) {
      const t = setTimeout(() => titleRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [initial]);

  const canSave = draft.title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      ...draft,
      title: draft.title.trim(),
      address: draft.address?.trim() || undefined,
      notes: draft.notes?.trim() || undefined,
    });
  };

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
        title={initial ? 'Edit task' : 'New task'}
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
      {initial && uid && (
        <div className="-mx-4 flex justify-center border-b border-neutral-100 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-900/40 px-4 py-1.5">
          <RecordSyncLabel path={recordPath(uid, 'tasks', initial.id)} />
        </div>
      )}

      <div className="flex-1 pb-12 pt-5">
        <Field label="What's the task">
          <input
            ref={titleRef}
            value={draft.title}
            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Follow up with Pascal about Plateau listing"
            autoCapitalize="sentences"
            className="input"
          />
        </Field>

        <Field label="Address" hint="optional">
          <input
            value={draft.address ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            placeholder="123 Main St, Montréal"
            autoCapitalize="words"
            className="input"
          />
        </Field>

        <Field label="Client" hint="optional">
          <ClientPicker
            companies={companies}
            agents={agents}
            companyId={draft.companyId}
            agentId={draft.agentId}
            onChange={(companyId, agentId) =>
              setDraft((p) => ({ ...p, companyId, agentId }))
            }
            onCreateCompany={onCreateCompany}
            onCreateAgent={onCreateAgent}
          />
        </Field>

        <Field label="Notes" hint="optional">
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
            placeholder="Anything else worth remembering"
            rows={3}
            className="input resize-none"
          />
        </Field>

        {initial && onSchedule && (
          <button
            type="button"
            onClick={onSchedule}
            className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-3 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            Schedule a shoot from this task
          </button>
        )}

        {initial && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this task?')) onDelete();
            }}
            className="btn-destructive mt-3"
          >
            Delete task
          </button>
        )}
      </div>
    </div>
  );
}
