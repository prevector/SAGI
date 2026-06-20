// Local error boundary so a WebGL/three.js failure inside the visual can never
// crash the rest of the dashboard. The app has no shared boundary to reuse, so
// this one is scoped to the visual module (PLAN-3D.md §1 boundary rules).

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of children when something throws. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class VisualErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface for debugging; never rethrow (would bubble to the app).
    console.error("[session-visual] render failed:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
