import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanEditModal } from './PlanEditModal';

const seed = { name: '', band: '', pricing: 'flat' as const, price: 0, per_student: 10, min_students: 100,
  period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 }, features: [], feature_tiers: {},
  visibility: 'draft' as const, audience: 'all' as const, offer: null };

describe('PlanEditModal', () => {
  it('disables Save until a name is entered, then calls onSave with the body', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={seed} onClose={() => {}} onSave={onSave} />);
    const save = screen.getByText('Save plan');
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/plan name|e\.g\./i) ?? screen.getAllByRole('textbox')[0], { target: { value: 'Diamond' } });
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].name).toBe('Diamond');
  });
});
