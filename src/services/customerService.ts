import { del, get, post, put } from "@/api/axiosInstance";
import type { Customer, Paginated } from "@/types/domain";

export interface CustomerListParams {
  page?: number;
  limit?: number;
  name?: string;
  phone?: string;
  email?: string;
}

export interface CustomerPayload {
  name: string;
  phone: string;
  email?: string | null;
}

export const customerService = {
  /**
   * GET /api/customers — paginated.
   *
   * The backend's `Customer` model has no `businessId` column, so this list is
   * not tenant-scoped server-side. The UI therefore avoids presenting it as an
   * authoritative tenant roster — records are cross-referenced through
   * appointments on the business detail views.
   */
  async list(params: CustomerListParams = {}): Promise<Paginated<Customer>> {
    const response = await get<Customer[]>("/customers", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<Customer> {
    const response = await get<Customer>(`/customers/${id}`);
    return response.data;
  },

  async create(payload: CustomerPayload): Promise<Customer> {
    const response = await post<Customer>("/customers", payload);
    return response.data;
  },

  async update(id: string, payload: Partial<CustomerPayload>): Promise<Customer> {
    const response = await put<Customer>(`/customers/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await del<null>(`/customers/${id}`);
  },
};
