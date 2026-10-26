import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { Spinner } from "@/components/ui/Feedback";
import { PATHS } from "./paths";
import type { Role } from "@/types/domain";

export function FullPageLoader({ label = "Preparing your workspace…" }: { label?: string }) {
  return (
    <div className="status-page" role="status" aria-live="polite">
      <div className="status-page__inner">
        <Spinner size="lg" />
        <p className="status-page__text" style={{ marginTop: "16px" }}>
          {label}
        </p>
      </div>
    </div>
  );
}

interface RequireAuthProps {
  children: ReactNode;
  /** When omitted, any authenticated role is allowed. */
  roles?: Role[];
}

/**
 * Blocks unauthenticated users and role mismatches.
 *
 * While the stored token is being exchanged for a profile the app shows a
 * loader rather than flashing the login screen.
 */
export function RequireAuth({ children, roles }: RequireAuthProps) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === "restoring") {
    return <FullPageLoader />;
  }

  if (status !== "authenticated" || !user) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to={PATHS.login} replace state={{ from }} />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={PATHS.unauthorized} replace />;
  }

  return <>{children}</>;
}

/** Sends signed-in users away from the login screen. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();

  if (status === "restoring") {
    return <FullPageLoader label="Restoring your session…" />;
  }

  if (status === "authenticated" && user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }

  return <>{children}</>;
}
