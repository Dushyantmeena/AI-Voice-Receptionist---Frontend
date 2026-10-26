import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AudioLines,
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_BY_ROLE, findNavItem } from "@/constants/navigation";
import { ROLE_LABELS } from "@/constants/domain";
import { PATHS } from "@/routes/paths";
import { Avatar, Badge } from "@/components/ui/Badge";
import { cn } from "@/utils/cn";

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  if (!user) return null;

  const current = findNavItem(user.role, location.pathname);
  const tenantName = user.business?.name ?? "Platform";

  const handleLogout = () => {
    logout();
    navigate(PATHS.login, { replace: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className={cn("sidebar", isSidebarOpen && "sidebar--open")} aria-label="Main navigation">
        <div className="sidebar__brand">
          <span className="sidebar__logo" aria-hidden="true">
            <AudioLines size={17} />
          </span>
          <span className="sidebar__brand-text">
            <span className="sidebar__brand-name">Voice Receptionist</span>
            <span className="sidebar__brand-meta">{ROLE_LABELS[user.role]} console</span>
          </span>
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_BY_ROLE[user.role].map((section) => (
            <div className="sidebar__section" key={section.label}>
              <p className="sidebar__section-label">{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn("sidebar__link", isActive && "sidebar__link--active")
                    }
                  >
                    <Icon size={17} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__tenant">
            <p className="sidebar__tenant-label">{user.role === "SUPERADMIN" ? "Scope" : "Workspace"}</p>
            <p className="sidebar__tenant-name">{tenantName}</p>
          </div>
        </div>
      </aside>

      {isSidebarOpen ? (
        <div
          className="sidebar-backdrop"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="app-shell__main">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="topbar__breadcrumb">
            <span>{ROLE_LABELS[user.role]}</span>
            <span aria-hidden="true">/</span>
            <span className="topbar__breadcrumb-current">{current?.label ?? "Workspace"}</span>
          </div>

          <div className="topbar__spacer" />

          <div className="topbar__actions">
            <span className="topbar__role">
              <Badge tone="brand" dot={false}>
                {user.staff?.role ?? ROLE_LABELS[user.role]}
              </Badge>
            </span>

            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu__trigger"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              >
                <Avatar name={user.name} size="sm" />
                <span className="user-menu__meta">
                  <span className="user-menu__name">{user.name}</span>
                  <span className="user-menu__role">{ROLE_LABELS[user.role]}</span>
                </span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {isMenuOpen ? (
                <div className="user-menu__panel" role="menu">
                  <div className="user-menu__header">
                    <p className="user-menu__name">{user.name}</p>
                    <p className="user-menu__email">{user.email}</p>
                  </div>
                  <NavLink className="user-menu__item" to={PATHS.home} role="menuitem">
                    <ExternalLink size={15} />
                    Public site
                  </NavLink>
                  <button
                    type="button"
                    className="user-menu__item user-menu__item--danger"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="page" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
