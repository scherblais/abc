import { useMemo } from 'react';
import type { Agent, Company, Task } from '../types';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = {
  tasks: Task[];
  companies: Company[];
  agents: Agent[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (t: Task) => void;
  onToggleDone: (t: Task) => void;
};

export function TasksScreen({
  tasks,
  companies,
  agents,
  onBack,
  onAdd,
  onEdit,
  onToggleDone,
}: Props) {
  const companyById = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );
  const agentById = useMemo(
    () => new Map(agents.map((a) => [a.id, a.name])),
    [agents],
  );

  const open = useMemo(
    () =>
      tasks
        .filter((t) => !t.done)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  );
  const done = useMemo(
    () =>
      tasks
        .filter((t) => t.done)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  );

  const subtitleFor = (t: Task) => {
    const parts: string[] = [];
    if (t.address) parts.push(t.address);
    const agentName = t.agentId ? agentById.get(t.agentId) : undefined;
    const companyName = t.companyId ? companyById.get(t.companyId) : undefined;
    if (agentName && companyName) parts.push(`${agentName} · ${companyName}`);
    else if (companyName) parts.push(companyName);
    else if (agentName) parts.push(agentName);
    return parts.join(' — ');
  };

  return (
    <div className="flex h-full min-h-full flex-col">
      <ScreenHeader
        left={
          <button
            type="button"
            onClick={onBack}
            className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            ‹ Back
          </button>
        }
        title="Tasks"
        right={
          <button
            type="button"
            onClick={onAdd}
            className="tap rounded-md bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-[13px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
          >
            + New
          </button>
        }
      />

      <main className="flex-1 pb-12 pt-5">
        {tasks.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600 dark:text-neutral-400">
              No tasks yet.
            </p>
            <p className="mt-1 text-[12.5px] text-neutral-500 dark:text-neutral-400">
              Use this for shoots that don't have a date yet so you don't
              forget about them.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="tap mt-4 rounded-md bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-[14px] font-medium text-white dark:text-neutral-900 hover:bg-black dark:hover:bg-neutral-200"
            >
              + Log your first task
            </button>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <section className="mb-5">
                <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
                  Open · {open.length}
                </p>
                <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
                  {open.map((t) => (
                    <Row
                      key={t.id}
                      task={t}
                      subtitle={subtitleFor(t)}
                      onClick={() => onEdit(t)}
                      onToggleDone={() => onToggleDone(t)}
                    />
                  ))}
                </ul>
              </section>
            )}
            {done.length > 0 && (
              <section className="mb-5">
                <p className="mb-2.5 px-0.5 text-[12.5px] font-medium text-neutral-500 dark:text-neutral-400">
                  Done · {done.length}
                </p>
                <ul className="card divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden opacity-70">
                  {done.map((t) => (
                    <Row
                      key={t.id}
                      task={t}
                      subtitle={subtitleFor(t)}
                      onClick={() => onEdit(t)}
                      onToggleDone={() => onToggleDone(t)}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Row({
  task,
  subtitle,
  onClick,
  onToggleDone,
}: {
  task: Task;
  subtitle: string;
  onClick: () => void;
  onToggleDone: () => void;
}) {
  return (
    <li>
      <div className="tap flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={task.done ? 'Mark not done' : 'Mark done'}
          className={[
            'tap grid h-6 w-6 shrink-0 place-items-center rounded-md border',
            task.done
              ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
              : 'border-neutral-300 dark:border-neutral-600',
          ].join(' ')}
        >
          {task.done && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 7.4 5.5 10 11 4" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={[
              'truncate text-[14.5px] font-medium',
              task.done
                ? 'text-neutral-400 line-through dark:text-neutral-500'
                : 'text-neutral-900 dark:text-neutral-100',
            ].join(' ')}
          >
            {task.title}
          </p>
          {subtitle && (
            <p className="truncate text-[12.5px] text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </button>
        <span
          aria-hidden
          className="text-neutral-300 dark:text-neutral-600"
        >
          ›
        </span>
      </div>
    </li>
  );
}
