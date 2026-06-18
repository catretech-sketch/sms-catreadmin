import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryBoundary } from './QueryBoundary';
import { ApiError } from '../api/ApiError';

describe('QueryBoundary', () => {
  it('shows the skeleton while loading', () => {
    render(<QueryBoundary isLoading isError={false} skeleton={<div>skel</div>}><div>body</div></QueryBoundary>);
    expect(screen.getByText('skel')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('shows the ApiError message on error', () => {
    const err = new ApiError(404, 'not_found', 'Not available yet', null);
    render(<QueryBoundary isLoading={false} isError error={err}><div>body</div></QueryBoundary>);
    expect(screen.getByText('Not available yet')).toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('shows the empty state when isEmpty', () => {
    render(<QueryBoundary isLoading={false} isError={false} isEmpty emptyTitle="No clients"><div>body</div></QueryBoundary>);
    expect(screen.getByText('No clients')).toBeInTheDocument();
  });

  it('renders children when loaded', () => {
    render(<QueryBoundary isLoading={false} isError={false}><div>body</div></QueryBoundary>);
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
