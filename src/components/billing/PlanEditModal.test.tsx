import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlanEditModal } from './PlanEditModal';

const blank = { name: '', band: '', pricing: 'flat' as const, price: 0, per_student: 0, min_students: 0,
  period: 'month', limits: { students: 0, staff: 0, storage_gb: 0 }, features: [], feature_tiers: {},
  visibility: 'draft' as const, audience: 'all' as const, offer: null };

const valid = { ...blank, name: 'Gold', band: 'Under 200', price: 9999,
  limits: { students: 1000, staff: 100, storage_gb: 40 } };

describe('PlanEditModal validation', () => {
  it('blocks Save and shows errors when required fields are blank', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={blank} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).not.toHaveBeenCalled();
    // at least one inline error is shown
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
  });

  it('flags a numeric field left at 0 as needing input', () => {
    const onSave = vi.fn();
    // everything valid except the staff limit
    render(<PlanEditModal plan={{ ...valid, limits: { students: 1000, staff: 0, storage_gb: 40 } }}
      onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves when all required fields are valid', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={valid} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].name).toBe('Gold');
  });

  it('clears the error once the user fixes the field', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={blank} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(screen.getAllByText('Required').length).toBeGreaterThan(0);
    const nameInput = screen.getAllByRole('textbox')[0];
    fireEvent.change(nameInput, { target: { value: 'Diamond' } });
    // the name error is gone; band still required so onSave stays blocked
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('PlanEditModal numeric text fields', () => {
  it('renders Price as text and saves the typed value', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={valid} onClose={() => {}} onSave={onSave} />);
    const price = screen.getByDisplayValue('9999'); // text input, not a number spinner
    fireEvent.change(price, { target: { value: '12000' } });
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].price).toBe(12000);
  });

  it('shows a numeric field as blank (not 0) when unset', () => {
    render(<PlanEditModal plan={{ ...valid, price: 0 }} onClose={() => {}} onSave={() => {}} />);
    // a 0 value renders empty, so no field displays "0"
    expect(screen.queryByDisplayValue('0')).toBeNull();
  });
});

describe('PlanEditModal tier', () => {
  it('sends a tier in the saved body, defaulting to silver with no features', () => {
    const onSave = vi.fn();
    render(<PlanEditModal plan={valid} onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0].tier).toBe('silver');
  });

  it('derives the highest tier among selected features', () => {
    const onSave = vi.fn();
    // attendance = silver, ops.library = gold, attendance.geo = platinum
    render(<PlanEditModal plan={{ ...valid, features: ['attendance', 'ops.library', 'attendance.geo'] }}
      onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave.mock.calls[0][0].tier).toBe('platinum');
  });

  it('respects a per-feature tier override when deriving', () => {
    const onSave = vi.fn();
    // attendance defaults to silver, but overridden to gold here
    render(<PlanEditModal plan={{ ...valid, features: ['attendance'], feature_tiers: { attendance: 'gold' } }}
      onClose={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByText('Save plan'));
    expect(onSave.mock.calls[0][0].tier).toBe('gold');
  });
});
