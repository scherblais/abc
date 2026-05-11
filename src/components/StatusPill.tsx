import type { InvoiceStatus } from '../types';

const VARIANT: Record<InvoiceStatus, string> = {
  draft:
    'border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300',
  sent: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  void: 'border-neutral-200 bg-neutral-50 text-neutral-400 line-through dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-600',
};

const LABEL: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  void: 'Void',
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  return <span className={`pill-status ${VARIANT[status]}`}>{LABEL[status]}</span>;
}

export { LABEL as INVOICE_STATUS_LABEL };
