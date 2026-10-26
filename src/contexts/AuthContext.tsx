import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AUTH_UNAUTHORIZED_EVENT } from "@/api/axiosInstance";
import { clearToken, getToken, setToken } from "@/api/tokenStorage";
import { authService } from "@/services/authService";
import type { UserProfile } from "@/types/auth";

export type AuthStatus = "restoring" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: UserProfile | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session owner.
 *
 * The backend issues a 7-day JWT with no refresh endpoint, so the token is the
 * only durable piece of session state; the profile is always re-fetched from
 * `GET /auth/me` instead of being trusted from localStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getToken() ? "restoring" : "anonymous"));

  const clearSession = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  // Restore the session on first mount.
  useEffect(() => {
    if (!getToken()) {
      setStatus("anonymous");
      return;
    }

    const controller = new AbortController();
    let active = true;

    authService
      .getCurrentUser(controller.signal)
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        clearToken();
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  // A 401 anywhere in the app terminates the session exactly once.
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("anonymous");
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await authService.login(email, password);
    setToken(token);

    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      setStatus("authenticated");
      return profile;
    } catch (error) {
      clearToken();
      setUser(null);
      setStatus("anonymous");
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      clearSession();
      return;
    }
    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      setStatus("authenticated");
    } catch {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return context;
}
