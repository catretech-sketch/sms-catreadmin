import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TicketDetailScreen } from './TicketDetailScreen';
import { NavCtx, ToastCtx } from '../components';
vi.mock('../api/hooks/useTicket', () => ({ useTicket: () => ({ isLoading: false, isError: false, data: {
  id: 'TKT-1', subject: 'Login broken', tenant_id: 'c1', tenant_name: 'Greenwood', status: 'open', priority: 'high',
  assignee: 'Priya', created: '2026-06-01', updated: '2026-06-02', messages_count: 2,
  messages: [{ id: 'm1', author: 'Admin', role: 'client', body: 'It is down', created: '2d ago' }] } }) }));
vi.mock('../api/hooks/useTicketMutations', () => ({ usePatchTicket: () => ({ mutate: vi.fn() }), usePostMessage: () => ({ mutate: vi.fn() }) }));
vi.mock('../api/hooks/useTeam', () => ({ useTeam: () => ({ data: { data: [] } }) }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));
describe('TicketDetailScreen', () => {
  it('renders the subject and a thread message', () => {
    render(<NavCtx.Provider value={{ route: { name: 'support', params: {} }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><TicketDetailScreen id="TKT-1" onBack={() => {}} /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Login broken')).toBeInTheDocument();
    expect(screen.getByText('It is down')).toBeInTheDocument();
  });
});
