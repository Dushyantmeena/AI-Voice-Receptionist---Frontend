import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last-resort guard so an unexpected render error never blanks the app. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.error) {
      return (
        <div className="status-page">
          <div className="status-page__inner">
            <span className="confirm-dialog__icon" style={{ marginInline: "auto" }}>
              <AlertTriangle size={20} aria-hidden="true" />
            </span>
            <p className="status-page__title">The interface hit an unexpected error</p>
            <p className="status-page__text">
              {this.state.error.message || "An unknown error occurred while rendering this screen."}
            </p>
            <div className="status-page__actions">
              <Button onClick={this.handleReload}>Reload the app</Button>
              <Button variant="secondary" onClick={() => window.location.assign("/")}>
                Back to start
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
