import React from 'react';
import { useDashboardOverview } from '../api/hooks/useDashboardOverview';
import { QueryBoundary } from '../components/QueryBoundary';
import { HealthPanel } from './DashboardScreen';
import { useNav } from '../components';
import { Icon } from '../lib/icons';

export function HealthScreen(): React.ReactElement {
  const nav = useNav();
  const q = useDashboardOverview();
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <button className="row gap6 muted tiny" style={{ marginBottom: 14, fontWeight: 600 }} onClick={() => nav.go('support')}>
        <Icon.chevLeft size={14} /> Support
      </button>
      <h1 className="page-title" style={{ marginBottom: 6 }}>System health</h1>
      <p className="page-desc" style={{ marginBottom: 20 }}>Live status of platform services.</p>
      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}>
        {q.data && <HealthPanel items={q.data.system_health} />}
      </QueryBoundary>
    </div>
  );
}
