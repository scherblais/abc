import { useState } from 'react';
import type { Agent, Company } from '../types';

type Props = {
  companies: Company[];
  agents: Agent[];
  onBack: () => void;
  onCreateCompany: (name: string) => Company;
  onUpdateCompany: (id: string, patch: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
  onCreateAgent: (companyId: string, name: string) => Agent;
  onUpdateAgent: (id: string, patch: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
};

const INPUT = 'input-compact';

export function ClientsScreen({
  companies,
  agents,
  onBack,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  onCreateAgent,
  onUpdateAgent,
  onDeleteAgent,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState('');

  const sortedCompanies = [...companies].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const handleAddCompany = () => {
    const name = newCompanyName.trim();
    if (!name) return;
    const c = onCreateCompany(name);
    setNewCompanyName('');
    setExpandedId(c.id);
  };

  return (
    <div className="flex h-full min-h-full flex-col">
      <header className="safe-top sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-neutral-200/80 bg-white/85 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="tap -ml-1 rounded-md px-2 py-1.5 text-[14px] text-neutral-600 hover:text-neutral-900"
        >
          ‹ Back
        </button>
        <h1 className="text-[15px] font-semibold tracking-tightish text-neutral-900">
          Clients
        </h1>
        <span className="w-12" aria-hidden />
      </header>

      <main className="flex-1 pb-12 pt-4">
        <p className="mb-3 px-0.5 text-[12.5px] leading-snug text-neutral-500">
          Brokerages and their agents. Pick a client from these when booking a
          shoot.
        </p>

        <div className="card mb-4 p-3">
          <label className="mb-1 block text-[11.5px] font-medium text-neutral-500">
            New brokerage
          </label>
          <div className="flex gap-2">
            <input
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCompany();
                }
              }}
              placeholder="Royal LePage, ReMax, ..."
              autoCapitalize="words"
              className={INPUT}
            />
            <button
              type="button"
              onClick={handleAddCompany}
              disabled={!newCompanyName.trim()}
              className={[
                'tap shrink-0 rounded-md px-3 text-[13px] font-medium',
                newCompanyName.trim()
                  ? 'bg-neutral-900 text-white hover:bg-black'
                  : 'bg-neutral-100 text-neutral-400',
              ].join(' ')}
            >
              Add
            </button>
          </div>
        </div>

        {sortedCompanies.length === 0 ? (
          <div className="card px-5 py-8 text-center">
            <p className="text-[14px] text-neutral-600">
              No brokerages yet. Add one above to get started.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedCompanies.map((c) => {
              const companyAgents = agents
                .filter((a) => a.companyId === c.id)
                .sort((a, b) => a.name.localeCompare(b.name));
              const expanded = expandedId === c.id;
              return (
                <li key={c.id} className="card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    className="tap flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium text-neutral-900">
                        {c.name}
                      </p>
                      <p className="text-[12px] text-neutral-500">
                        {companyAgents.length}{' '}
                        {companyAgents.length === 1 ? 'agent' : 'agents'}
                      </p>
                    </div>
                    <span
                      className={`text-neutral-400 transition-transform ${
                        expanded ? 'rotate-90' : ''
                      }`}
                      aria-hidden
                    >
                      ›
                    </span>
                  </button>
                  {expanded && (
                    <CompanyDetail
                      company={c}
                      agents={companyAgents}
                      onUpdateCompany={onUpdateCompany}
                      onDeleteCompany={onDeleteCompany}
                      onCreateAgent={onCreateAgent}
                      onUpdateAgent={onUpdateAgent}
                      onDeleteAgent={onDeleteAgent}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function CompanyDetail({
  company,
  agents,
  onUpdateCompany,
  onDeleteCompany,
  onCreateAgent,
  onUpdateAgent,
  onDeleteAgent,
}: {
  company: Company;
  agents: Agent[];
  onUpdateCompany: (id: string, patch: Partial<Company>) => void;
  onDeleteCompany: (id: string) => void;
  onCreateAgent: (companyId: string, name: string) => Agent;
  onUpdateAgent: (id: string, patch: Partial<Agent>) => void;
  onDeleteAgent: (id: string) => void;
}) {
  const [newAgentName, setNewAgentName] = useState('');

  const handleAddAgent = () => {
    const name = newAgentName.trim();
    if (!name) return;
    onCreateAgent(company.id, name);
    setNewAgentName('');
  };

  return (
    <div className="border-t border-neutral-100 bg-neutral-50/50 px-4 py-3">
      <label className="block text-[11px] font-medium text-neutral-500">
        Brokerage name
      </label>
      <input
        value={company.name}
        onChange={(e) => onUpdateCompany(company.id, { name: e.target.value })}
        autoCapitalize="words"
        className={INPUT + ' mt-1'}
      />

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Agents
        </p>
        {agents.length === 0 ? (
          <p className="mb-2 px-0.5 text-[12.5px] text-neutral-500">
            No agents yet at {company.name}.
          </p>
        ) : (
          <ul className="mb-2 space-y-2">
            {agents.map((a) => (
              <AgentRow
                key={a.id}
                agent={a}
                onUpdate={(patch) => onUpdateAgent(a.id, patch)}
                onDelete={() => onDeleteAgent(a.id)}
              />
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input
            value={newAgentName}
            onChange={(e) => setNewAgentName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAgent();
              }
            }}
            placeholder="New agent name"
            autoCapitalize="words"
            className={INPUT}
          />
          <button
            type="button"
            onClick={handleAddAgent}
            disabled={!newAgentName.trim()}
            className={[
              'tap shrink-0 rounded-md px-3 text-[13px] font-medium',
              newAgentName.trim()
                ? 'bg-neutral-900 text-white hover:bg-black'
                : 'bg-neutral-100 text-neutral-400',
            ].join(' ')}
          >
            Add
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (
            confirm(
              `Delete ${company.name} and its ${agents.length} ${
                agents.length === 1 ? 'agent' : 'agents'
              }? Past bookings will keep their record but show "(deleted)".`,
            )
          ) {
            onDeleteCompany(company.id);
          }
        }}
        className="tap mt-4 w-full rounded-md border border-neutral-200 bg-white py-2 text-[13px] font-medium text-neutral-700 hover:border-neutral-300 hover:text-neutral-900"
      >
        Delete brokerage
      </button>
    </div>
  );
}

function AgentRow({
  agent,
  onUpdate,
  onDelete,
}: {
  agent: Agent;
  onUpdate: (patch: Partial<Agent>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-md border border-neutral-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="tap flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-neutral-900">
            {agent.name || '(unnamed)'}
          </p>
          {(agent.phone || agent.email) && (
            <p className="truncate text-[11.5px] text-neutral-500">
              {agent.phone}
              {agent.phone && agent.email ? ' · ' : ''}
              {agent.email}
            </p>
          )}
        </div>
        <span
          className={`text-neutral-400 transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-neutral-100 px-3 py-2.5">
          <input
            value={agent.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Name"
            autoCapitalize="words"
            className={INPUT}
          />
          <input
            value={agent.phone ?? ''}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="Phone"
            type="tel"
            autoComplete="tel"
            className={INPUT}
          />
          <input
            value={agent.email ?? ''}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="Email"
            type="email"
            autoComplete="email"
            className={INPUT}
          />
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remove ${agent.name || 'this agent'}?`)) onDelete();
            }}
            className="tap w-full rounded-md border border-neutral-200 py-1.5 text-[12.5px] text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
          >
            Remove agent
          </button>
        </div>
      )}
    </li>
  );
}
