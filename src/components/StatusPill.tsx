import type { InvoiceStatus } from '../types';

const VARIANT: Record<InvoiceStatus, string> = {
  draft: 'border-neutral-200 bg-neutral-50 text-neutral-700',
  sent: 'border-amber-200 bg-amber-50 text-amber-800',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  void: 'border-neutral-200 bg-neutral-50 text-neutral-400 line-through',
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
