import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupportScreen } from './SupportScreen';
import { NavCtx, ToastCtx } from '../components';

vi.mock('../api/hooks/useTickets', () => ({
  useTickets: () => ({
    isLoading: false,
    isError: false,
    data: {
      pages: [{
        data: [{
          id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          subject: 'Login broken',
          tenant_id: 'c1',
          tenant_name: 'Greenwood',
          status: 'open',
          priority: 'high',
          assignee: 'Ravi',
          created: '2026-07-01',
          updated: new Date().toISOString(),
          messages_count: 2,
        }],
        next_cursor: null,
      }],
    },
  }),
}));

vi.mock('../api/hooks/useDashboardOverview', () => ({
  useDashboardOverview: () => ({
    isLoading: false,
    data: { system_health: [{ name: 'API', status: 'operational', latency: '12ms', uptime: '99.9%' }] },
  }),
}));

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NavCtx.Provider value={{ route: { name: 'support', params: {} }, go: () => {} }}>
        <ToastCtx.Provider value={() => {}}><SupportScreen /></ToastCtx.Provider>
      </NavCtx.Provider>
    </QueryClientProvider>,
  );
}

describe('SupportScreen', () => {
  it('renders ticket list and health sidebar', () => {
    wrap();
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByText('Login broken')).toBeInTheDocument();
    expect(screen.getByText('Greenwood')).toBeInTheDocument();
    expect(screen.getByText('All systems operational')).toBeInTheDocument();
  });
});
