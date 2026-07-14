import React from 'react';
import { useSubscriptions } from '../../api/hooks/useSubscriptions';
import { useNav, Avatar, StatusBadge, fmt } from '../index';
import { Icon } from '../../lib/icons';
import { QueryBoundary } from '../QueryBoundary';
import type { Subscription } from '../../api/types';

function asDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLeft(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return 'ended';
  if (days === 0) return 'today';
  return `${days}d left`;
}

export function SubscriptionsTab(): React.ReactElement {
  const nav = useNav();
  const query = useSubscriptions();
  const subs: Subscription[] = query.data?.pages.flatMap(p => p.data) ?? [];

  return (
    <QueryBoundary
      isLoading={query.isLoading}
      isError={query.isError}
      error={query.error}
      isEmpty={subs.length === 0}
      emptyTitle="No subscriptions"
    >
      <div className="card">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Current period</th>
                <th style={{ textAlign: 'right' }}>Next charge</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => {
                const left = daysLeft(sub.current_period_end);
                return (
                  <tr
                    key={sub.id}
                    className="clickable"
                    onClick={() => nav.go('client', { id: sub.tenant_id })}
                  >
                    <td>
                      <div className="row gap10">
                        <Avatar name={sub.tenant_name || 'Client'} size={28} square={true} />
                        <span className="cell-name">{sub.tenant_name || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${sub.tier === 'gold' ? 'amber' : sub.tier === 'platinum' ? 'violet' : 'slate'}`}>
                        {sub.plan_name || '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td>
                      <div className="tiny mono">{asDate(sub.current_period_start)} – {asDate(sub.current_period_end)}</div>
                      {left && <div className="tiny muted" style={{ marginTop: 2 }}>{left}</div>}
                    </td>
                    <td className="num">
                      {sub.next_charge != null
                        ? <><span style={{ fontWeight: 600 }}>{fmt.money(sub.next_charge, 2)}</span><span className="tiny muted"> / mo</span></>
                        : <span className="muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Icon.chevRight size={15} style={{ color: 'var(--text-faint)' }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </QueryBoundary>
  );
}
