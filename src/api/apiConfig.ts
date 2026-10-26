/**
 * Central API configuration.
 *
 * The only place the backend origin is defined — everything else goes through
 * the shared axios instance. Override with `VITE_API_BASE_URL` in `.env`.
 */
const DEFAULT_BASE_URL = "http://localhost:5000/api";

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const baseUrl = (configured && configured.trim()) || DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export const apiConfig = {
  /** e.g. http://localhost:5000/api */
  baseUrl: resolveBaseUrl(),
  /** Standard request budget. */
  timeoutMs: 20_000,
  /**
   * Chat turns invoke an LLM (the backend aborts its own provider call at 30s),
   * so they need a wider client-side budget.
   */
  chatTimeoutMs: 60_000,
  tokenStorageKey: "avr.auth.token",
} as const;
