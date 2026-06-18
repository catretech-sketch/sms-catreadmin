import React from 'react';
import { ApiError } from '../api/ApiError';
import { Empty } from './index';
import { Icon } from '../lib/icons';

interface QueryBoundaryProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  skeleton?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: React.ReactNode;
  children: React.ReactNode;
}

export function QueryBoundary({
  isLoading, isError, error, isEmpty, skeleton, emptyTitle, emptyMessage, children,
}: QueryBoundaryProps): React.ReactElement {
  if (isLoading) return <>{skeleton ?? <div className="muted" style={{ padding: 24 }}>Loading…</div>}</>;
  if (isError) {
    const msg = error instanceof ApiError ? error.message : 'Something went wrong';
    return (
      <Empty icon={Icon.warn} title="Couldn't load this">
        {msg}
      </Empty>
    );
  }
  if (isEmpty) return <Empty title={emptyTitle ?? 'Nothing here yet'}>{emptyMessage}</Empty>;
  return <>{children}</>;
}
