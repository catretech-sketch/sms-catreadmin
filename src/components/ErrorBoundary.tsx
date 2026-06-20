import React from 'react';
import { Empty } from './index';
import { Icon } from '../lib/icons';

interface Props { children: React.ReactNode; onReset?: () => void; }
interface State { error: Error | null; }

/* Catches render-time crashes in a screen so one bad component can't blank the
   whole app (sidebar + topbar included). Shows the error instead of a white page. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // surface in the console for debugging; the UI shows a friendly fallback
    console.error('Screen crashed:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="page">
          <Empty
            icon={Icon.warn}
            title="This screen hit an error"
            action={
              <button className="btn btn-default" onClick={this.reset}>Try again</button>
            }
          >
            {this.state.error.message}
          </Empty>
        </div>
      );
    }
    return this.props.children;
  }
}
