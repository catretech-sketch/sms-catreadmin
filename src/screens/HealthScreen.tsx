import React from 'react';
import { useDashboardOverview } from '../api/hooks/useDashboardOverview';
import { QueryBoundary } from '../components/QueryBoundary';
import { HealthPanel } from './DashboardScreen';

export function HealthScreen(): React.ReactElement {
  const q = useDashboardOverview();
  return (
    <div className="page">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>System health</h1>
      <QueryBoundary isLoading={q.isLoading} isError={q.isError} error={q.error}>
        {q.data && <HealthPanel items={q.data.system_health} />}
      </QueryBoundary>
    </div>
  );
}
