"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authClient } from "../lib/auth-client";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  planLabel?: string | null;
  remainingCredits?: number | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const session = await authClient.getSession();

      const sessionUser = session?.data?.user ?? null;
      const hasSession = !!session?.data?.session;

      if (!hasSession || !sessionUser) {
        setUser(null);
        return;
      }

      // Önce session bilgisini hemen yaz
      setUser({
        name: sessionUser.name ?? null,
        email: sessionUser.email ?? null,
        planLabel: null,
        remainingCredits: null,
      });

      // Sonra ek kullanıcı bilgisini çek
      try {
        const res = await fetch("/api/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) return;

        const data = await res.json().catch(() => null);

        if (data?.ok && data?.user) {
          setUser({
            name: data.user.name ?? sessionUser.name ?? null,
            email: data.user.email ?? sessionUser.email ?? null,
            planLabel: data.user.planLabel ?? null,
            remainingCredits:
              typeof data.user.remainingCredits === "number" ||
              data.user.remainingCredits === null
                ? data.user.remainingCredits
                : null,
          });
        }
      } catch (meError) {
        console.warn("/api/me failed, using session user:", meError);
      }
    } catch (error) {
      console.warn("refreshSession failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user?.email,
      isLoading,
      refreshSession,
      clearSession,
    }),
    [user, isLoading, refreshSession, clearSession]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}