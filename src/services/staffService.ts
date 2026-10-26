import { del, get, post, put } from "@/api/axiosInstance";
import type { Availability, DayOfWeek, Paginated, Staff } from "@/types/domain";

export interface StaffListParams {
  page?: number;
  limit?: number;
  businessId?: string;
  role?: string;
  isActive?: boolean;
}

export interface StaffPayload {
  businessId: string;
  name: string;
  role: string;
  bio?: string | null;
  isActive?: boolean;
}

export interface ProvisionStaffPayload {
  businessId: string;
  name: string;
  role: string;
  bio?: string | null;
  email?: string;
  password?: string;
  serviceIds?: string[];
}

export interface AvailabilitySlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export const staffService = {
  /** GET /api/staff — tenant-scoped. */
  async list(params: StaffListParams = {}): Promise<Paginated<Staff>> {
    const response = await get<Staff[]>("/staff", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  async getById(id: string, signal?: AbortSignal): Promise<Staff> {
    const response = await get<Staff>(`/staff/${id}`, undefined, signal ? { signal } : undefined);
    return response.data;
  },

  /** POST /api/staff — creates a roster entry without a login. */
  async create(payload: StaffPayload): Promise<Staff> {
    const response = await post<Staff>("/staff", payload);
    return response.data;
  },

  /** PUT /api/staff/:id */
  async update(id: string, payload: Partial<Omit<StaffPayload, "businessId">>): Promise<Staff> {
    const response = await put<Staff>(`/staff/${id}`, payload);
    return response.data;
  },

  /** DELETE /api/staff/:id */
  async remove(id: string): Promise<void> {
    await del<null>(`/staff/${id}`);
  },

  /** POST /api/staff/provision — staff profile plus optional STAFF login. */
  async provision(payload: ProvisionStaffPayload): Promise<{ staff: Staff; user: unknown }> {
    const response = await post<{ staff: Staff; user: unknown }>("/staff/provision", payload);
    return response.data;
  },

  /** GET /api/staff/me/availability — STAFF self-service. */
  async getMyAvailability(): Promise<Availability[]> {
    const response = await get<Availability[]>("/staff/me/availability");
    return response.data;
  },

  /** PUT /api/staff/me/availability — replaces the whole weekly schedule. */
  async updateMyAvailability(slots: AvailabilitySlotInput[]): Promise<Availability[]> {
    const response = await put<Availability[]>("/staff/me/availability", { availabilities: slots });
    return response.data;
  },
};
