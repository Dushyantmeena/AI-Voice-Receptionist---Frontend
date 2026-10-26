import { post } from "@/api/axiosInstance";
import type { Business } from "@/types/domain";

export interface RegisterBusinessPayload {
  name: string;
  industry: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  description?: string | null;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * POST /api/admin/businesses — SUPERADMIN only.
 *
 * Creates the business and its first BUSINESS_ADMIN in a single transaction.
 * The response contains both records; the backend returns
 * `{ business, admin }` but only `business` is required by the UI.
 */
export const adminService = {
  async registerBusiness(payload: RegisterBusinessPayload): Promise<Business> {
    const response = await post<{ business?: Business } | Business>("/admin/businesses", payload);
    const data = response.data;

    // Defensive: accept either the wrapped or the bare business object.
    if (data && typeof data === "object" && "id" in data && "name" in data) {
      return data as Business;
    }

    const business = (data as { business?: Business }).business;
    if (!business) {
      throw new Error("Business was created but the response could not be read.");
    }
    return business;
  },
};
