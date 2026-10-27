import type { Role } from "@/types/domain";
import { PATHS } from "@/routes/paths";

export interface NavItem {
  label: string;
  to: string;
  /** File name (without extension) of the SVG in `src/assets`. */
  asset: string;
  /** Match the path exactly (used for dashboard roots). */
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  SUPERADMIN: [
    {
      label: "Platform",
      items: [
        { label: "Overview", to: PATHS.admin, asset: "layout-dashboard", end: true },
        { label: "Businesses", to: PATHS.adminBusinesses, asset: "building-complex" },
        { label: "Conversations", to: PATHS.adminConversations, asset: "messages-square" },
        { label: "User access", to: PATHS.adminAccess, asset: "user-round-cog" },
      ],
    },
  ],
  BUSINESS_ADMIN: [
    {
      label: "Operations",
      items: [
        { label: "Overview", to: PATHS.dashboard, asset: "layout-dashboard", end: true },
        { label: "Appointments", to: PATHS.appointments, asset: "calendar-days" },
        { label: "AI conversations", to: PATHS.conversations, asset: "messages-square" },
      ],
    },
    {
      label: "Manage",
      items: [
        { label: "Staff", to: PATHS.staffDirectory, asset: "users" },
        { label: "Services", to: PATHS.services, asset: "briefcase-business" },
        { label: "Customers", to: PATHS.customers, asset: "circle-user-round" },
        { label: "Availability", to: PATHS.availability, asset: "clock" },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Business profile", to: PATHS.businessProfile, asset: "columns-3-cog" },
      ],
    },
  ],
  STAFF: [
    {
      label: "My workspace",
      items: [
        { label: "Overview", to: PATHS.staff, asset: "layout-dashboard", end: true },
        { label: "My appointments", to: PATHS.staffAppointments, asset: "calendar-days" },
        { label: "My schedule", to: PATHS.staffSchedule, asset: "clock" },
        { label: "Profile", to: PATHS.staffProfile, asset: "circle-user-round" },
      ],
    },
  ],
};

/** Finds the nav entry that best matches the current path (longest prefix wins). */
export function findNavItem(role: Role, pathname: string): NavItem | null {
  const items = NAV_BY_ROLE[role].flatMap((section) => section.items);
  const matches = items
    .filter((item) =>
      item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
    )
    .sort((a, b) => b.to.length - a.to.length);
  return matches[0] ?? null;
}
