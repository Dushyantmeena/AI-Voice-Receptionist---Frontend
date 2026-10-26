import type { Role } from "./domain";

// ─── Auth ────────────────────────────────────────────────────────────────────
// Shape of `user` returned by POST /api/auth/login — the backend selects only
// these fields, so anything else must be treated as absent.

export interface AuthBusinessSummary {
  id: string;
  name: string;
  industry: string;
}

export interface AuthStaffSummary {
  id: string;
  name: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  staffId: string | null;
  business: AuthBusinessSummary | null;
  staff: AuthStaffSummary | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// Shape returned by GET /api/auth/me — richer than the login payload.
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  businessId: string | null;
  staffId: string | null;
  isActive: boolean;
  createdAt: string;
  business: {
    id: string;
    name: string;
    industry: string;
    phone: string | null;
    email: string | null;
  } | null;
  staff: {
    id: string;
    name: string;
    role: string;
    bio: string | null;
    /** Only populated for STAFF accounts — the backend includes availabilities here. */
    availabilities: {
      id: string;
      staffId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      createdAt: string;
      updatedAt: string;
    }[];
  } | null;
}
