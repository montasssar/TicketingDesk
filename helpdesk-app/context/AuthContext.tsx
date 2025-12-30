// src/context/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loginRequest,
  getProfile,
  type ApiUser,
  type LoginPayload,
} from "@/lib/api";
import Cookies from "js-cookie";

type AuthUser = ApiUser | null;

export interface AuthContextValue {
  user: AuthUser;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

const TOKEN_KEY = "helpdesk_token";
const USER_KEY = "helpdesk_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Rehydrate auth from cookies/localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Prioritize Cookie for token (middleware compatible), fallback to localStorage if needed
      const storedToken = Cookies.get(TOKEN_KEY) || window.localStorage.getItem(TOKEN_KEY);
      const storedUser = window.localStorage.getItem(USER_KEY);

      if (storedToken) {
        setToken(storedToken);
        // Ensure synchronization if it was missing in one place
        if (!Cookies.get(TOKEN_KEY)) Cookies.set(TOKEN_KEY, storedToken, { expires: 7, path: "/" });
      }

      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as ApiUser;
          setUser(parsed);
        } catch (err) {
          console.warn("Failed to parse stored user", err);
          window.localStorage.removeItem(USER_KEY);
        }
      }
    } catch (err) {
      console.warn("Failed to rehydrate auth from storage", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for 401s from api.ts
  useEffect(() => {
    function onUnauthorized() {
      logout();
    }
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", onUnauthorized);
    };
  }, []);

  async function login(payload: LoginPayload): Promise<void> {
    setLoading(true);
    try {
      const { token: newToken, user: newUser } = await loginRequest(
        payload,
      );

      setToken(newToken);
      setUser(newUser);

      if (typeof window !== "undefined") {
        Cookies.set(TOKEN_KEY, newToken, { expires: 7, path: "/" }); // valid for 7 days
        window.localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      }
    } finally {
      setLoading(false);
    }
  }

  function logout(): void {
    setToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      Cookies.remove(TOKEN_KEY, { path: "/" });
      window.localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Optional: manually refresh the user from the API if /auth/profile
   * exists later. If it 404s or fails, we just log and keep current user.
   */
  async function refreshProfile(): Promise<void> {
    if (!token) return;

    try {
      const nextUser = await getProfile(token);
      setUser(nextUser);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      }
    } catch (err) {
      console.warn("refreshProfile failed:", err);
      // do NOT logout on failure, just keep the old user
    }
  }

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
