import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import type { ApiClientError } from "@/api/apiError";
import { cn } from "@/utils/cn";
import { Button } from "./Button";

type IconComponent = typeof AlertTriangle;

// ─── Spinner / skeleton ───────────────────────────────────────────────────────
export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={cn("spinner", size !== "md" && `spinner--${size}`)} role="status" aria-label="Loading" />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="spinner-center">
      <Spinner size="lg" />
      <p className="text-sm text-muted" style={{ marginTop: "12px" }}>
        {label}
      </p>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}

// ─── Empty / error states ────────────────────────────────────────────────────
interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: IconComponent;
  action?: ReactNode;
}

export function EmptyState({ title, message, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="state">
      <span className="state__icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="state__title">{title}</p>
      {message ? <p className="state__message">{message}</p> : null}
      {action ? <div className="state__actions">{action}</div> : null}
    </div>
  );
}

function iconForError(error: ApiClientError): IconComponent {
  switch (error.kind) {
    case "network":
    case "timeout":
      return WifiOff;
    case "auth":
    case "forbidden":
      return ShieldAlert;
    default:
      return AlertTriangle;
  }
}

interface ErrorStateProps {
  error: ApiClientError;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {
  const Icon = iconForError(error);
  const defaultTitle =
    error.kind === "network"
      ? "Cannot reach the API"
      : error.kind === "forbidden"
        ? "Access denied"
        : "Something went wrong";

  return (
    <div className="state state--error" role="alert">
      <span className="state__icon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <p className="state__title">{title ?? defaultTitle}</p>
      <p className="state__message">{error.message}</p>
      {error.kind === "network" ? (
        <p className="state__message">
          The frontend is calling <code className="text-mono">{import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api"}</code>.
        </p>
      ) : null}
      {onRetry ? (
        <div className="state__actions">
          <Button variant="secondary" size="sm" leadingIcon={<RefreshCw size={15} />} onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Inline alert ────────────────────────────────────────────────────────────
interface AlertProps {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
}

export function Alert({ tone = "info", title, children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : "note"}>
      <div>
        {title ? <p className="alert__title">{title}</p> : null}
        <div className="alert__body">{children}</div>
      </div>
    </div>
  );
}
