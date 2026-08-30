import { Component, type ErrorInfo, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Site error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error">
        <p className="eyebrow">Application error</p>
        <h1>Something went wrong</h1>
        <p className="muted">{this.state.error.message || "The page could not finish loading."}</p>
        <button className="button" onClick={() => window.location.reload()}>Reload page</button>
      </main>
    );
  }
}
