import { del, get } from "@/api/axiosInstance";
import type { Conversation, Paginated } from "@/types/domain";

export interface ConversationListParams {
  page?: number;
  limit?: number;
  businessId?: string;
  customerId?: string;
}

/**
 * Conversation records are the platform's call log: every AI chat session is
 * persisted with its transcript, detected intent and tool executions.
 * All routes are restricted to SUPERADMIN and BUSINESS_ADMIN.
 */
export const conversationService = {
  /** GET /api/conversations — tenant-scoped. */
  async list(params: ConversationListParams = {}): Promise<Paginated<Conversation>> {
    const response = await get<Conversation[]>("/conversations", { ...params });
    return {
      data: response.data,
      meta: response.meta ?? { page: 1, limit: 10, total: response.data.length, totalPages: 1 },
    };
  },

  async getById(id: string): Promise<Conversation> {
    const response = await get<Conversation>(`/conversations/${id}`);
    return response.data;
  },

  async listByCustomer(
    customerId: string,
    page = 1,
    limit = 10,
  ): Promise<Paginated<Conversation>> {
    const response = await get<Conversation[]>(`/conversations/customer/${customerId}`, {
      page,
      limit,
    });
    return {
      data: response.data,
      meta: response.meta ?? { page, limit, total: response.data.length, totalPages: 1 },
    };
  },

  async listByBusiness(
    businessId: string,
    page = 1,
    limit = 10,
  ): Promise<Paginated<Conversation>> {
    const response = await get<Conversation[]>(`/conversations/business/${businessId}`, {
      page,
      limit,
    });
    return {
      data: response.data,
      meta: response.meta ?? { page, limit, total: response.data.length, totalPages: 1 },
    };
  },

  /** DELETE /api/conversations/:id — removes the transcript permanently. */
  async remove(id: string): Promise<void> {
    await del<null>(`/conversations/${id}`);
  },
};
