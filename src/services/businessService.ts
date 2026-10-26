import { del, get, post, put } from "@/api/axiosInstance";
import type { Business, Paginated } from "@/types/domain";

export interface BusinessListParams {
  page?: number;
  limit?: number;
  name?: string;
  industry?: string;
  email?: string;
}

export interface BusinessPayload {
  name: string;
  industry: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
}

export const businessService = {
  /** GET /api/businesses — paginated, tenant-scoped by the backend. */
  async list(params: BusinessListParams = {}): Promise<Paginated<Business>> {
    const response = await get<Business[]>("/businesses", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  /** GET /api/businesses/:id — ownership enforced by `requireResourceOwner`. */
  async getById(id: string, signal?: AbortSignal): Promise<Business> {
    const response = await get<Business>(`/businesses/${id}`, undefined, signal ? { signal } : undefined);
    return response.data;
  },

  /** POST /api/businesses — SUPERADMIN only. */
  async create(payload: BusinessPayload): Promise<Business> {
    const response = await post<Business>("/businesses", payload);
    return response.data;
  },

  /** PUT /api/businesses/:id — SUPERADMIN or the owning BUSINESS_ADMIN. */
  async update(id: string, payload: Partial<BusinessPayload>): Promise<Business> {
    const response = await put<Business>(`/businesses/${id}`, payload);
    return response.data;
  },

  /** DELETE /api/businesses/:id — SUPERADMIN only. */
  async remove(id: string): Promise<void> {
    await del<null>(`/businesses/${id}`);
  },
};
