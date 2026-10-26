export const PATHS = {
  home: "/",
  login: "/login",
  unauthorized: "/unauthorized",

  // SuperAdmin
  admin: "/admin",
  adminBusinesses: "/admin/businesses",
  adminBusinessNew: "/admin/businesses/new",
  adminBusiness: (id: string) => `/admin/businesses/${id}`,
  adminConversations: "/admin/conversations",
  adminAccess: "/admin/access",

  // Business Admin
  dashboard: "/dashboard",
  appointments: "/dashboard/appointments",
  staffDirectory: "/dashboard/staff",
  services: "/dashboard/services",
  customers: "/dashboard/customers",
  availability: "/dashboard/availability",
  conversations: "/dashboard/conversations",
  businessProfile: "/dashboard/profile",

  // Staff
  staff: "/staff",
  staffAppointments: "/staff/appointments",
  staffSchedule: "/staff/schedule",
  staffProfile: "/staff/profile",

  // Public
  chat: (businessId: string) => `/c/${businessId}`,
} as const;
