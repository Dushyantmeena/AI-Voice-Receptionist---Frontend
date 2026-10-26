import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { PATHS } from "@/routes/paths";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function UnauthorizedPage() {
  const { user } = useAuth();
  useDocumentTitle("Access denied");

  return (
    <div className="status-page">
      <div className="status-page__inner">
        <span className="confirm-dialog__icon" style={{ marginInline: "auto" }}>
          <ShieldAlert size={20} aria-hidden="true" />
        </span>
        <p className="status-page__code">403</p>
        <h1 className="status-page__title">This area is outside your role</h1>
        <p className="status-page__text">
          {user
            ? `You are signed in as ${user.name}. The page you tried to open belongs to a different workspace.`
            : "Your session does not have permission to open this page."}
        </p>
        <div className="status-page__actions">
          {user ? (
            <Link className="btn btn--primary" to={ROLE_HOME[user.role]}>
              Go to my dashboard
            </Link>
          ) : (
            <Link className="btn btn--primary" to={PATHS.login}>
              Sign in
            </Link>
          )}
          <Link className="btn btn--secondary" to={PATHS.home}>
            Public site
          </Link>
        </div>
      </div>
    </div>
  );
}
