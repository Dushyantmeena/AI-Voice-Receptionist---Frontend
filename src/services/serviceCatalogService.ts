import { del, get, post, put } from "@/api/axiosInstance";
import type { Paginated, Service } from "@/types/domain";

export interface ServiceListParams {
  page?: number;
  limit?: number;
  businessId?: string;
  name?: string;
  isActive?: boolean;
}

export interface ServicePayload {
  businessId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive?: boolean;
}

export const serviceCatalogService = {
  /** GET /api/services — tenant-scoped. */
  async list(params: ServiceListParams = {}): Promise<Paginated<Service>> {
    const response = await get<Service[]>("/services", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<Service> {
    const response = await get<Service>(`/services/${id}`);
    return response.data;
  },

  /** POST /api/services */
  async create(payload: ServicePayload): Promise<Service> {
    const response = await post<Service>("/services", payload);
    return response.data;
  },

  /** PUT /api/services/:id */
  async update(id: string, payload: Partial<Omit<ServicePayload, "businessId">>): Promise<Service> {
    const response = await put<Service>(`/services/${id}`, payload);
    return response.data;
  },

  /** DELETE /api/services/:id */
  async remove(id: string): Promise<void> {
    await del<null>(`/services/${id}`);
  },
};
