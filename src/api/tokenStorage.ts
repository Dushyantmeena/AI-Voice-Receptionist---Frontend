import { apiConfig } from "./apiConfig";

/**
 * Access-token persistence.
 *
 * The backend issues a stateless JWT (`JWT_EXPIRES_IN`, default 7d) and has no
 * refresh endpoint, so the token must survive a page reload. localStorage is
 * the only viable store here; an in-memory cache keeps reads cheap and lets the
 * auth layer clear state instantly on sign-out.
 */
let memoryToken: string | null = null;

export function getToken(): string | null {
  if (memoryToken) {
    return memoryToken;
  }

  try {
    memoryToken = window.localStorage.getItem(apiConfig.tokenStorageKey);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    memoryToken = null;
  }

  return memoryToken;
}

export function setToken(token: string): void {
  memoryToken = token;
  try {
    window.localStorage.setItem(apiConfig.tokenStorageKey, token);
  } catch {
    // Non-fatal: the session simply won't survive a reload.
  }
}

export function clearToken(): void {
  memoryToken = null;
  try {
    window.localStorage.removeItem(apiConfig.tokenStorageKey);
  } catch {
    // Ignore.
  }
}
