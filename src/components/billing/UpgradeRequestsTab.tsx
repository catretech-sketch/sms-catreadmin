import React, { useMemo, useState } from 'react';
import {
  useApproveUpgradeRequest,
  useRejectUpgradeRequest,
  useUpgradeRequests,
} from '../../api/hooks/useUpgradeRequests';
import { useAuth } from '../../auth/AuthContext';
import { useToast, Btn, ConfirmDialog, StatusBadge, fmt } from '../index';
import { QueryBoundary } from '../QueryBoundary';
import type { ApiError } from '../../api/ApiError';
import type { PlanUpgradeRequest, UpgradeStatus } from '../../api/upgradeRequests';

const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_offline', label: 'Offline' },
  { key: 'paid_pending_approval', label: 'Paid online' },
  { key: 'pending_payment', label: 'Awaiting pay' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const ACTIONABLE = new Set<UpgradeStatus>(['pending_offline', 'paid_pending_approval']);

export function UpgradeRequestsTab(): React.ReactElement {
  const { can } = useAuth();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const [rejectTarget, setRejectTarget] = useState<PlanUpgradeRequest | null>(null);
  const [approveTarget, setApproveTarget] = useState<PlanUpgradeRequest | null>(null);

  const query = useUpgradeRequests(undefined);
  const all = query.data ?? [];
  const rows = filter === 'all' ? all : all.filter(r => r.status === filter);
  const approve = useApproveUpgradeRequest();
  const reject = useRejectUpgradeRequest();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const f of FILTERS) {
      if (f.key === 'all') continue;
      c[f.key] = all.filter(r => r.status === f.key).length;
    }
    return c;
  }, [all]);

  return (
    <div>
      <div className="row gap8" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={'chip' + (filter === f.key ? ' active' : '')}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="tiny" style={{ opacity: 0.6 }}>{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>School</th>
                <th>Upgrade</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Requested</th>
                <th style={{ width: 180 }}></th>
              </tr>
            </thead>
            <QueryBoundary
              isLoading={query.isLoading}
              isError={query.isError}
              error={query.error}
              isEmpty={rows.length === 0}
              emptyTitle="No upgrade requests"
            >
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.tenant_name ?? '—'}</td>
                    <td className="muted">
                      {r.from_plan_name ?? r.from_tier ?? '—'} → <b>{r.to_plan_name ?? r.to_tier}</b>
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt.money(r.amount, 2)}</td>
                    <td>
                      <StatusBadge status={r.mode === 'online' ? 'active' : 'trial'} />
                      <span className="tiny muted" style={{ marginLeft: 6 }}>
                        {r.mode === 'online' ? 'Razorpay' : 'Offline'}
                      </span>
                    </td>
                    <td><span className="chip">{r.status.replace(/_/g, ' ')}</span></td>
                    <td className="tiny muted mono">{r.created_at?.slice(0, 10)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {ACTIONABLE.has(r.status) && can('billing.view') && (
                        <div className="row gap6" style={{ justifyContent: 'flex-end' }}>
                          <Btn variant="primary" size="sm" disabled={approve.isPending}
                            onClick={() => setApproveTarget(r)}>Approve</Btn>
                          <Btn variant="default" size="sm" disabled={reject.isPending}
                            onClick={() => setRejectTarget(r)}>Reject</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </QueryBoundary>
          </table>
        </div>
      </div>

      {approveTarget && (
        <ConfirmDialog
          open
          onClose={() => setApproveTarget(null)}
          title="Approve plan upgrade"
          message={`Activate ${approveTarget.to_plan_name} for ${approveTarget.tenant_name}? This updates the school plan, subscription, and marks the invoice paid.`}
          confirmLabel="Approve & activate"
          onConfirm={() => {
            approve.mutate(approveTarget.id, {
              onSuccess: () => {
                toast({ title: 'Plan activated', msg: `${approveTarget.tenant_name} → ${approveTarget.to_plan_name}` });
                setApproveTarget(null);
              },
              onError: (e) => toast({ title: 'Approve failed', msg: (e as ApiError).message, kind: 'error' }),
            });
          }}
        />
      )}

      {rejectTarget && (
        <ConfirmDialog
          open
          onClose={() => setRejectTarget(null)}
          title="Reject upgrade request"
          message={`Reject upgrade to ${rejectTarget.to_plan_name} for ${rejectTarget.tenant_name}?`}
          confirmLabel="Reject"
          danger
          onConfirm={() => {
            reject.mutate({ id: rejectTarget.id }, {
              onSuccess: () => {
                toast({ title: 'Request rejected', msg: rejectTarget.tenant_name ?? '' });
                setRejectTarget(null);
              },
              onError: (e) => toast({ title: 'Reject failed', msg: (e as ApiError).message, kind: 'error' }),
            });
          }}
        />
      )}
    </div>
  );
}
