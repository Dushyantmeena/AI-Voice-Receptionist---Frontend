import { get, post } from "@/api/axiosInstance";
import { apiConfig } from "@/api/apiConfig";
import type { ChatTurnRequest, ChatTurnResponse, Conversation } from "@/types/domain";

/**
 * Public, unauthenticated AI receptionist endpoints.
 *
 * `:businessSlug` in the backend route is resolved by `id`, `biz_<slug>` or a
 * fuzzy name match — the app always passes the business `id` it already holds,
 * which is the only identifier guaranteed to be unique.
 */
export const chatService = {
  /**
   * POST /api/chat/:businessId
   *
   * One conversational turn. The backend runs a tool-calling loop, so the
   * response can take several seconds — it uses a longer timeout than CRUD.
   */
  async send(
    businessId: string,
    payload: ChatTurnRequest,
    signal?: AbortSignal,
  ): Promise<ChatTurnResponse> {
    const response = await post<ChatTurnResponse>(`/chat/${businessId}`, payload, {
      timeoutMs: apiConfig.chatTimeoutMs,
      ...(signal ? { signal } : {}),
    });
    return response.data;
  },

  /** GET /api/chat/:businessId/:conversationId — replays a stored transcript. */
  async getConversation(businessId: string, conversationId: string): Promise<Conversation> {
    const response = await get<Conversation>(`/chat/${businessId}/${conversationId}`);
    return response.data;
  },
};
