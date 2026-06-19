import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClientsScreen } from './ClientsScreen';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
vi.mock('../api/hooks/useClients', () => ({
  useClients: () => ({
    isLoading: false, isError: false,
    data: { pages: [{ data: [{ id: 'c1', name: 'Greenwood High', status: 'active', tier: 'gold', plan_name: 'Gold', mrr: 50000, last_active_days: 1 }], next_cursor: null }] },
    hasNextPage: false, fetchNextPage: vi.fn(), isFetchingNextPage: false,
  }),
}));

describe('ClientsScreen', () => {
  it('renders a client row from the first page', () => {
    render(<ClientsScreen />);
    expect(screen.getByText('Greenwood High')).toBeInTheDocument();
  });
});
