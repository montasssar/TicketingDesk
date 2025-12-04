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

type AuthUser = ApiUser | null;

export interface AuthContextValue {
  user: AuthUser;
  token: string | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "helpdesk_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);

  // Rehydrate auth from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) return;

    setToken(storedToken);
    setLoading(true);

    getProfile(storedToken)
      .then(setUser)
      .catch(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (payload: LoginPayload) => {
    setLoading(true);
    try {
      const { token: newToken, user: loggedUser } = await loginRequest(
        payload,
      );

      setUser(loggedUser);
      setToken(newToken);

      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, newToken);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const refreshProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const updated = await getProfile(token);
      setUser(updated);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
