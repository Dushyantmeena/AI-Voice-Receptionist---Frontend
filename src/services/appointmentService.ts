import { del, get, post, put } from "@/api/axiosInstance";
import type { Appointment, AppointmentStatus, Paginated } from "@/types/domain";

export interface AppointmentListParams {
  page?: number;
  limit?: number;
  businessId?: string;
  customerId?: string;
  staffId?: string;
  serviceId?: string;
  status?: AppointmentStatus;
}

/** POST body — `startTime`/`endTime` are ISO 8601 strings. */
export interface AppointmentPayload {
  businessId: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string | null;
}

export const appointmentService = {
  /** GET /api/appointments — tenant-scoped, and staff-isolated for STAFF users. */
  async list(params: AppointmentListParams = {}): Promise<Paginated<Appointment>> {
    const response = await get<Appointment[]>("/appointments", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<Appointment> {
    const response = await get<Appointment>(`/appointments/${id}`);
    return response.data;
  },

  /**
   * Newest-first page.
   *
   * The API sorts appointments ascending by `startTime` and exposes no sort
   * parameter, so the most recent records live on the last backend page. This
   * maps a UI page (1 = newest) onto the matching backend page and reverses
   * the slice so callers can paginate the way users expect.
   */
  async listNewestFirst(params: AppointmentListParams = {}): Promise<Paginated<Appointment>> {
    const limit = params.limit ?? 10;
    const uiPage = params.page ?? 1;

    const probe = await get<Appointment[]>("/appointments", { ...params, page: 1, limit: 1 });
    const total = probe.meta?.total ?? probe.data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const backendPage = Math.max(1, totalPages - (uiPage - 1));

    const response = await get<Appointment[]>("/appointments", { ...params, page: backendPage, limit });

    return {
      data: [...response.data].sort((a, b) => b.startTime.localeCompare(a.startTime)),
      meta: { page: uiPage, limit, total, totalPages },
    };
  },

  async listByStaff(staffId: string, page = 1, limit = 10): Promise<Paginated<Appointment>> {
    const response = await get<Appointment[]>(`/appointments/staff/${staffId}`, { page, limit });
    return {
      data: response.data,
      meta: response.meta ?? { page, limit, total: response.data.length, totalPages: 1 },
    };
  },

  async create(payload: AppointmentPayload): Promise<Appointment> {
    const response = await post<Appointment>("/appointments", payload);
    return response.data;
  },

  async update(id: string, payload: Partial<AppointmentPayload>): Promise<Appointment> {
    const response = await put<Appointment>(`/appointments/${id}`, payload);
    return response.data;
  },

  /** DELETE /api/appointments/:id — hard delete. Use status updates to cancel. */
  async remove(id: string): Promise<void> {
    await del<null>(`/appointments/${id}`);
  },
};
