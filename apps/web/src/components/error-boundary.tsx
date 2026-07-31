import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Application error", error, info.componentStack);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
          <section className="max-w-md border border-line bg-panel p-6">
            <p className="text-sm font-semibold">CollabCanvas could not load</p>
            <p className="mt-2 text-sm text-muted">
              Refresh the page. If the problem continues, check the local
              configuration.
            </p>
            <button
              className="mt-5 bg-accent px-3 py-2 text-sm font-medium text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
