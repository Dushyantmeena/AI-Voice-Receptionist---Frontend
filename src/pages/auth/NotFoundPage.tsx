import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { PATHS } from "@/routes/paths";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function NotFoundPage() {
  const { user } = useAuth();
  const location = useLocation();
  useDocumentTitle("Page not found");

  return (
    <div className="status-page">
      <div className="status-page__inner">
        <span className="state__icon" style={{ marginInline: "auto" }}>
          <Compass size={22} aria-hidden="true" />
        </span>
        <p className="status-page__code">404</p>
        <h1 className="status-page__title">We could not find that page</h1>
        <p className="status-page__text">
          <code className="text-mono">{location.pathname}</code> does not match any screen in this
          application.
        </p>
        <div className="status-page__actions">
          <Link className="btn btn--primary" to={user ? ROLE_HOME[user.role] : PATHS.home}>
            {user ? "Back to my dashboard" : "Back to the home page"}
          </Link>
          {user ? null : (
            <Link className="btn btn--secondary" to={PATHS.login}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
