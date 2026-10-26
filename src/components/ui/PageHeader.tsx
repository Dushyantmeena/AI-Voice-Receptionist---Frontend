import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  useDocumentTitle(title);

  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <p className="page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  meta?: ReactNode;
  tone?: "brand" | "success" | "warning" | "info";
}

export function StatCard({ label, value, icon: Icon, meta, tone = "brand" }: StatCardProps) {
  return (
    <div className={`stat-card${tone === "brand" ? "" : ` stat-card--${tone}`}`}>
      <div className="stat-card__head">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon">
          <Icon size={17} aria-hidden="true" />
        </span>
      </div>
      <p className="stat-card__value">{value}</p>
      {meta ? <p className="stat-card__meta">{meta}</p> : null}
    </div>
  );
}
