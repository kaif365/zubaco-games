import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center px-6">
          <div className="text-center flex flex-col gap-4 max-w-sm">
            <p className="text-lg font-bold text-destructive">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{this.state.message}</p>
            <button
              type="button"
              onClick={() => { globalThis.location.reload(); }}
              className="mx-auto rounded-xl bg-primary text-primary-foreground px-6 py-2 text-sm font-bold"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
