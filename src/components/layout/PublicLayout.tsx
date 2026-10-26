import { Link, Outlet, useLocation } from "react-router-dom";
import { AudioLines } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { PATHS } from "@/routes/paths";

export function PublicLayout() {
  const { user, status } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === PATHS.home;

  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link className="public-nav__brand" to={PATHS.home}>
          <span className="sidebar__logo" style={{ width: 28, height: 28 }} aria-hidden="true">
            <AudioLines size={15} />
          </span>
          Voice Receptionist
        </Link>

        <nav className="public-nav__links" aria-label="Product">
          {isHome ? (
            <>
              <a href="#how-it-works">How it works</a>
              <a href="#capabilities">Capabilities</a>
              <a href="#businesses">For businesses</a>
            </>
          ) : null}
        </nav>

        <div className="public-nav__spacer" />

        {status === "restoring" ? null : user ? (
          <Link className="btn btn--primary btn--sm" to={ROLE_HOME[user.role]}>
            Open console
          </Link>
        ) : (
          <Link className="btn btn--secondary btn--sm" to={PATHS.login}>
            Sign in
          </Link>
        )}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="landing-footer">
        AI Voice Receptionist · Conversational booking for service businesses
      </footer>
    </div>
  );
}
