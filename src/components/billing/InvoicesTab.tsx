import React, { useState } from 'react';
import { useInvoices } from '../../api/hooks/useInvoices';
import { useMarkInvoicePaid, useRefundInvoice } from '../../api/hooks/useInvoiceMutations';
import { downloadInvoicePdf, sendInvoiceEmail } from '../../api/invoices';
import { useAuth } from '../../auth/AuthContext';
import { useToast, Menu, MenuItem, Btn, ConfirmDialog, StatusBadge, fmt } from '../index';
import { Icon } from '../../lib/icons';
import { QueryBoundary } from '../QueryBoundary';
import type { ApiError } from '../../api/ApiError';
import type { Invoice } from '../../api/types';

export function InvoicesTab(): React.ReactElement {
  const { can } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | 'paid' | 'open' | 'past_due'>('all');
  const [refundTarget, setRefundTarget] = useState<Invoice | null>(null);

  // Load all invoices once (the API returns them in a single page — next_cursor is always null),
  // so we can show accurate per-status counts on the chips and filter client-side.
  const query = useInvoices({});
  const all: Invoice[] = query.data?.pages.flatMap(p => p.data) ?? [];
  const counts: Record<string, number> = {
    all: all.length,
    paid: all.filter(i => i.status === 'paid').length,
    open: all.filter(i => i.status === 'open').length,
    past_due: all.filter(i => i.status === 'past_due').length,
  };
  const invoices: Invoice[] = filter === 'all' ? all : all.filter(i => i.status === filter);

  const markPaid = useMarkInvoicePaid();
  const refund = useRefundInvoice();

  return (
    <div>
      <div className="row gap8" style={{ marginBottom: 14 }}>
        {(['all', 'paid', 'open', 'past_due'] as const).map(k => {
          const labels: Record<string, string> = { all: 'All', paid: 'Paid', open: 'Open', past_due: 'Past due' };
          return (
            <button
              key={k}
              className={'chip' + (filter === k ? ' active' : '')}
              onClick={() => setFilter(k)}
            >
              {labels[k]}<span className="tiny" style={{ opacity: 0.6 }}>{counts[k]}</span>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Plan</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Due</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <QueryBoundary
              isLoading={query.isLoading}
              isError={query.isError}
              error={query.error}
              isEmpty={invoices.length === 0}
              emptyTitle="No invoices"
            >
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>{inv.id}</span>
                    </td>
                    <td>{inv.tenant_name}</td>
                    <td className="muted">{inv.plan_name}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt.money(inv.amount, 2)}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="tiny muted mono">{inv.issued}</td>
                    <td
                      className="tiny muted mono"
                      style={{ color: inv.status === 'past_due' ? 'var(--red)' : undefined }}
                    >
                      {inv.due}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row gap6" style={{ justifyContent: 'flex-end' }}>
                        <Btn
                          variant="default"
                          size="sm"
                          icon={Icon.download}
                          onClick={() => downloadInvoicePdf(inv.id).then(
                            () => toast({ title: 'Invoice downloaded', msg: inv.tenant_name }),
                            (e) => toast({ title: 'Download failed', msg: (e as ApiError).message, kind: 'error' }),
                          )}
                        >
                          PDF
                        </Btn>
                        <Menu trigger={<Btn variant="ghost" size="sm" icon={Icon.moreH} />}>
                          <MenuItem
                            icon={Icon.download}
                            onClick={() => downloadInvoicePdf(inv.id).then(
                              () => toast({ title: 'Invoice downloaded', msg: inv.tenant_name }),
                              (e) => toast({ title: 'Download failed', msg: (e as ApiError).message, kind: 'error' }),
                            )}
                          >
                            Download PDF
                          </MenuItem>
                          <MenuItem
                            icon={Icon.mail}
                            onClick={() => sendInvoiceEmail(inv.id).then(
                              () => toast({ title: 'Invoice emailed', msg: 'Sent to school owner contact' }),
                              (e) => toast({ title: 'Send failed', msg: (e as ApiError).message, kind: 'error' }),
                            )}
                          >
                            Email to school
                          </MenuItem>
                          {can('billing.manage_invoice') && inv.status !== 'paid' && (
                            <MenuItem
                              icon={Icon.check}
                              onClick={() => markPaid.mutate(inv.id, {
                                onSuccess: () => toast({ title: 'Invoice marked paid', msg: inv.id }),
                                onError: (e) => toast({ title: 'Error', msg: (e as ApiError).message, kind: 'error' }),
                              })}
                            >
                              Mark as paid
                            </MenuItem>
                          )}
                          {can('billing.refund') && inv.status === 'paid' && (
                            <MenuItem
                              icon={Icon.refund}
                              danger={true}
                              onClick={() => setRefundTarget(inv)}
                            >
                              Refund
                            </MenuItem>
                          )}
                        </Menu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </QueryBoundary>
          </table>
        </div>
      </div>

      {refundTarget && (
        <ConfirmDialog
          open={true}
          onClose={() => setRefundTarget(null)}
          onConfirm={() => refund.mutate(refundTarget.id, {
            onSuccess: () => toast({ title: 'Refund issued', msg: fmt.money(refundTarget.amount) + ' to ' + refundTarget.tenant_name, kind: 'info' }),
            onError: (e) => toast({ title: 'Error', msg: (e as ApiError).message, kind: 'error' }),
          })}
          title="Refund this invoice?"
          message={`A full refund of ${fmt.money(refundTarget.amount)} will be issued to ${refundTarget.tenant_name}. This is logged.`}
          confirmLabel="Issue refund"
          danger={true}
          icon={Icon.refund}
        />
      )}
    </div>
  );
}
