import React from 'react';
import { useClient } from '../api/hooks/useClient';
import { useClientUsage, useClientActivity } from '../api/hooks/useClients';
import { QueryBoundary } from '../components/QueryBoundary';
import { useNav, StatusBadge, UsageBar, fmt } from '../components';
import { Icon } from '../lib/icons';

export function ClientDetailScreen(): React.ReactElement {
  const { route, go } = useNav();
  const id = String(route.params.id ?? '');
  const detail = useClient(id);
  const usage = useClientUsage(id);
  const activity = useClientActivity(id);

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => go('clients')} style={{ marginBottom: 12 }}>
        <Icon.chevLeft size={14} /> Back to clients
      </button>

      <QueryBoundary isLoading={detail.isLoading} isError={detail.isError} error={detail.error}>
        {detail.data && (
          <>
            <div className="row jb">
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>{detail.data.name}</h1>
                <div className="muted tiny" style={{ marginTop: 4 }}>{detail.data.country} · CSM {detail.data.csm}</div>
              </div>
              <StatusBadge status={detail.data.status} />
            </div>

            <div className="kpi-grid" style={{ marginTop: 16 }}>
              <Stat label="Plan" value={detail.data.plan_name} />
              <Stat label="MRR" value={fmt.money(detail.data.mrr)} />
              <Stat label="Health" value={String(detail.data.health_score)} />
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Usage</b>
              <QueryBoundary isLoading={usage.isLoading} isError={usage.isError} error={usage.error}>
                {usage.data && (
                  <div style={{ marginTop: 10 }}>
                    <UsageBar label="Students" value={usage.data.students_count} limit={usage.data.limits.students ?? usage.data.students_count} />
                    <div className="row gap16 muted tiny" style={{ marginTop: 8 }}>
                      <span>Staff {fmt.num(usage.data.staff_count)}</span>
                      <span>Storage {usage.data.storage_gb} GB</span>
                      <span>{usage.data.usage_pct}% of plan</span>
                    </div>
                  </div>
                )}
              </QueryBoundary>
            </div>

            <div className="card" style={{ marginTop: 16, padding: 16 }}>
              <b>Activity</b>
              <QueryBoundary
                isLoading={activity.isLoading} isError={activity.isError} error={activity.error}
                isEmpty={!activity.isLoading && (activity.data?.data.length ?? 0) === 0}
                emptyTitle="No activity yet">
                {activity.data && activity.data.data.map(a => (
                  <div key={a.id} className="row jb" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span>{a.action}</span>
                    <span className="muted tiny">{a.actor_name}</span>
                  </div>
                ))}
              </QueryBoundary>
            </div>

            {/* Student/staff roster intentionally hidden — Phase-2 / impersonation (handoff §8.3). */}
          </>
        )}
      </QueryBoundary>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="muted tiny">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
