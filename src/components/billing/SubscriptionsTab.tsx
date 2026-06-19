import React from 'react';
import { useSubscriptions } from '../../api/hooks/useSubscriptions';
import { useNav, Avatar, StatusBadge, fmt } from '../index';
import { Icon } from '../../lib/icons';
import { QueryBoundary } from '../QueryBoundary';
import type { Subscription } from '../../api/types';

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
              {subs.map(sub => (
                <tr
                  key={sub.id}
                  className="clickable"
                  onClick={() => nav.go('client', { id: sub.tenant_id })}
                >
                  <td>
                    <div className="row gap10">
                      <Avatar name={sub.tenant_name} size={28} square={true} />
                      <span style={{ fontWeight: 600 }}>{sub.tenant_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${sub.tier === 'gold' ? 'amber' : sub.tier === 'platinum' ? 'violet' : 'slate'}`}>
                      {sub.plan_name}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="tiny muted mono">
                    {sub.current_period_start} – {sub.current_period_end}
                  </td>
                  <td className="num">
                    {sub.next_charge != null ? fmt.money(sub.next_charge) : <span className="muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Icon.chevRight size={15} style={{ color: 'var(--text-faint)' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </QueryBoundary>
  );
}
