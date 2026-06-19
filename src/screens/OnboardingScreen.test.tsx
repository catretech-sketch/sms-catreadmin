import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingScreen } from './OnboardingScreen';
import { NavCtx, ToastCtx } from '../components';

vi.mock('../api/hooks/useOnboarding', () => ({ useOnboarding: () => ({ isLoading: false, isError: false, data: { data: [
  { id: 'o1', name: 'Greenwood', value: 50000, owner: 'Ravi K', age: 3, stage: 'trial', checklist: [{ label: 'Kickoff', done: true }, { label: 'Import', done: false }] },
] } }) }));
vi.mock('../api/hooks/useOnboardingMutations', () => ({
  useAdvanceOnboarding: () => ({ mutate: vi.fn() }),
  usePatchChecklist: () => ({ mutate: vi.fn() }),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ can: () => true }) }));

describe('OnboardingScreen', () => {
  it('renders cards grouped into stage columns', () => {
    render(<NavCtx.Provider value={{ route: { name: 'onboarding', params: {} }, go: () => {} }}>
      <ToastCtx.Provider value={() => {}}><OnboardingScreen /></ToastCtx.Provider></NavCtx.Provider>);
    expect(screen.getByText('Greenwood')).toBeInTheDocument();
    expect(screen.getByText('Trial')).toBeInTheDocument(); // column header
  });
});
