import {
  Building2,
  CalendarDays,
  Clock3,
  Contact,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Scissors,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/domain";
import { PATHS } from "@/routes/paths";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
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
        { label: "Overview", to: PATHS.admin, icon: LayoutDashboard, end: true },
        { label: "Businesses", to: PATHS.adminBusinesses, icon: Building2 },
        { label: "Conversations", to: PATHS.adminConversations, icon: MessagesSquare },
        { label: "User access", to: PATHS.adminAccess, icon: KeyRound },
      ],
    },
  ],
  BUSINESS_ADMIN: [
    {
      label: "Operations",
      items: [
        { label: "Overview", to: PATHS.dashboard, icon: LayoutDashboard, end: true },
        { label: "Appointments", to: PATHS.appointments, icon: CalendarDays },
        { label: "AI conversations", to: PATHS.conversations, icon: MessagesSquare },
      ],
    },
    {
      label: "Manage",
      items: [
        { label: "Staff", to: PATHS.staffDirectory, icon: Users },
        { label: "Services", to: PATHS.services, icon: Scissors },
        { label: "Customers", to: PATHS.customers, icon: Contact },
        { label: "Availability", to: PATHS.availability, icon: Clock3 },
      ],
    },
    {
      label: "Workspace",
      items: [{ label: "Business profile", to: PATHS.businessProfile, icon: Settings }],
    },
  ],
  STAFF: [
    {
      label: "My workspace",
      items: [
        { label: "Overview", to: PATHS.staff, icon: LayoutDashboard, end: true },
        { label: "My appointments", to: PATHS.staffAppointments, icon: CalendarDays },
        { label: "My schedule", to: PATHS.staffSchedule, icon: Clock3 },
        { label: "Profile", to: PATHS.staffProfile, icon: UserCog },
      ],
    },
  ],
};

/** Finds the nav entry that best matches the current path (longest prefix wins). */
export function findNavItem(role: Role, pathname: string): NavItem | null {
  const items = NAV_BY_ROLE[role].flatMap((section) => section.items);
  const matches = items
    .filter((item) => (item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)))
    .sort((a, b) => b.to.length - a.to.length);
  return matches[0] ?? null;
}
