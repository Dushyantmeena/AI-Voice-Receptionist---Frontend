import { del, get, post, put } from "@/api/axiosInstance";
import type { Availability, DayOfWeek, Paginated } from "@/types/domain";

export interface AvailabilityListParams {
  page?: number;
  limit?: number;
  staffId?: string;
  dayOfWeek?: DayOfWeek;
}

export interface AvailabilityPayload {
  staffId: string;
  dayOfWeek: DayOfWeek;
  /** "HH:mm" — the backend validates the exact pattern. */
  startTime: string;
  endTime: string;
}

export const availabilityService = {
  /** GET /api/availability */
  async list(params: AvailabilityListParams = {}): Promise<Paginated<Availability>> {
    const response = await get<Availability[]>("/availability", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  /** GET /api/availability/staff/:staffId */
  async listByStaff(staffId: string, page = 1, limit = 50): Promise<Paginated<Availability>> {
    const response = await get<Availability[]>(`/availability/staff/${staffId}`, { page, limit });
    return {
      data: response.data,
      meta: response.meta ?? { page, limit, total: response.data.length, totalPages: 1 },
    };
  },

  async create(payload: AvailabilityPayload): Promise<Availability> {
    const response = await post<Availability>("/availability", payload);
    return response.data;
  },

  async update(
    id: string,
    payload: Partial<Omit<AvailabilityPayload, "staffId">>,
  ): Promise<Availability> {
    const response = await put<Availability>(`/availability/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await del<null>(`/availability/${id}`);
  },
};
