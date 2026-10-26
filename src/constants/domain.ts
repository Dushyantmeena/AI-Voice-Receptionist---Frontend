import type { AppointmentStatus, DayOfWeek, Role } from "@/types/domain";

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Super Admin",
  BUSINESS_ADMIN: "Business Admin",
  STAFF: "Staff",
};

export const ROLE_HOME: Record<Role, string> = {
  SUPERADMIN: "/admin",
  BUSINESS_ADMIN: "/dashboard",
  STAFF: "/staff",
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export const DAY_SHORT_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  BOOKED: "Booked",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No show",
};

export const APPOINTMENT_STATUS_TONES: Record<AppointmentStatus, BadgeTone> = {
  BOOKED: "info",
  CANCELLED: "danger",
  COMPLETED: "success",
  NO_SHOW: "warning",
};

export const APPOINTMENT_STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: "BOOKED", label: "Booked" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50];
