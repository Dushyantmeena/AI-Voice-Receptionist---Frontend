import { get, post } from "@/api/axiosInstance";
import type { LoginResponse, UserProfile } from "@/types/auth";

export const authService = {
  /** POST /api/auth/login — public. */
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await post<LoginResponse>("/auth/login", { email, password });
    return response.data;
  },

  /**
   * GET /api/auth/me — requires a valid token.
   * Doubles as the session-restore probe on page load.
   */
  async getCurrentUser(signal?: AbortSignal): Promise<UserProfile> {
    const response = await get<UserProfile>("/auth/me", undefined, signal ? { signal } : undefined);
    return response.data;
  },
};
