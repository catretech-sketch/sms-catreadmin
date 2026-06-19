import React, { useState } from 'react';
import { useClients } from '../api/hooks/useClients';
import { QueryBoundary } from '../components/QueryBoundary';
import { Btn, StatusBadge, Segmented, fmt, SkeletonRows, useNav } from '../components';
import { Icon } from '../lib/icons';
import { useAuth } from '../auth/AuthContext';

const STATUS_OPTS = [
  { value: '', label: 'All' }, { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' }, { value: 'past_due', label: 'Past due' },
  { value: 'suspended', label: 'Suspended' }, { value: 'cancelled', label: 'Cancelled' },
];

export function ClientsScreen(): React.ReactElement {
  const { go } = useNav();
  const { can } = useAuth();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const query = useClients({ status: status || undefined, q: q || undefined, sort: '-mrr' });
  const rows = query.data?.pages.flatMap(p => p.data) ?? [];

  return (
    <div className="page">
      <div className="row jb">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Clients</h1>
        {can('clients.start_trial') && (
          <Btn variant="primary" icon={Icon.plus} onClick={() => go('onboard')}>Onboard client</Btn>
        )}
      </div>

      <div className="row jb" style={{ margin: '16px 0', gap: 12, flexWrap: 'wrap' }}>
        <Segmented options={STATUS_OPTS} value={status} onChange={setStatus} />
        <div className="search-box">
          <Icon.search size={15} />
          <input placeholder="Search clients…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr><th>Name</th><th>Status</th><th>Plan</th><th>MRR</th><th>Last active</th></tr>
          </thead>
          {query.isLoading
            ? <SkeletonRows cols={5} rows={8} />
            : (
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => go('client', { id: c.id })}>
                    <td><b>{c.name}</b></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{c.plan_name}</td>
                    <td className="mono">{fmt.money(c.mrr)}</td>
                    <td className="muted tiny">{c.last_active_days}d ago</td>
                  </tr>
                ))}
              </tbody>
            )}
        </table>

        <QueryBoundary
          isLoading={false}
          isError={query.isError}
          error={query.error}
          isEmpty={!query.isLoading && rows.length === 0}
          emptyTitle="No clients found"
          emptyMessage="Try clearing filters, or this endpoint may not be live yet.">
          <div className="row jb" style={{ padding: '12px 16px' }}>
            <span className="muted tiny">{rows.length} loaded</span>
            {query.hasNextPage && (
              <Btn variant="default" size="sm" disabled={query.isFetchingNextPage}
                onClick={() => query.fetchNextPage()}>
                {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Btn>
            )}
          </div>
        </QueryBoundary>
      </div>
    </div>
  );
}
