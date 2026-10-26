import axios, { type AxiosRequestConfig } from "axios";
import { apiConfig } from "./apiConfig";
import { ApiClientError, toApiClientError } from "./apiError";
import { clearToken, getToken } from "./tokenStorage";
import type { ApiEnvelope } from "@/types/domain";

/** Broadcast when the backend rejects the stored token. */
export const AUTH_UNAUTHORIZED_EVENT = "avr:unauthorized";

export const http = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isUnauthorized = axios.isAxiosError(error) && error.response?.status === 401;
    // A failed login attempt must not be treated as an expired session.
    const isAuthEndpoint = axios.isAxiosError(error) && error.config?.url?.includes("/auth/login");

    if (isUnauthorized && !isAuthEndpoint) {
      clearToken();
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  },
);

interface RequestOptions {
  /** Overrides the default timeout (used by LLM-backed chat turns). */
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Executes a request and unwraps the backend envelope.
 *
 * Every backend route returns `{ success, data, ... }`; `success: false` would
 * be a contract violation, so it is treated as an error even on a 2xx status.
 */
export async function apiRequest<T>(
  config: AxiosRequestConfig,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  try {
    const response = await http.request<ApiEnvelope<T>>({
      ...config,
      ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });

    const body = response.data;

    if (!body || typeof body !== "object" || body.success === false) {
      throw new ApiClientError(
        "unknown",
        "The server returned an unexpected response.",
        response.status,
      );
    }

    return body;
  } catch (error) {
    throw toApiClientError(error);
  }
}

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  options?: RequestOptions,
): Promise<ApiEnvelope<T>> {
  return apiRequest<T>({ method: "GET", url, params }, options);
}

export async function post<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiEnvelope<T>> {
  return apiRequest<T>({ method: "POST", url, data }, options);
}

export async function put<T>(
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<ApiEnvelope<T>> {
  return apiRequest<T>({ method: "PUT", url, data }, options);
}

export async function del<T>(url: string, options?: RequestOptions): Promise<ApiEnvelope<T>> {
  return apiRequest<T>({ method: "DELETE", url }, options);
}
