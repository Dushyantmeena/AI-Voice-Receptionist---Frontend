import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_HOME } from "@/constants/domain";
import { PATHS } from "@/routes/paths";
import { Icon } from "@/components/ui/Icon";

export function PublicLayout() {
  const { user, status } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === PATHS.home;

  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link className="public-nav__brand" to={PATHS.home}>
          <span className="public-nav__mark" aria-hidden="true">
            <Icon name="mic" size={16} />
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
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <span className="landing-footer__mark" aria-hidden="true">
              <Icon name="phone-call" size={14} />
            </span>
            <p className="landing-footer__text">
              AI Voice Receptionist
              <br />
              Conversational booking for service businesses
            </p>
          </div>

          <div className="landing-footer__meta">
            <Link to={PATHS.login}>Staff sign in</Link>
            <a href="#how-it-works">How it works</a>
            <span>Platform build · 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
