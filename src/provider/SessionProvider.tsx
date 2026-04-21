"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPlanByCode, type PlanCode } from "../lib/plans";
import {
  consumeCredits as consumeRawCredits,
  getCreditCost,
  hasEnoughCredits,
  refundCredits,
  type CreditAction,
} from "../lib/credits";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  planCode: PlanCode;
  planLabel: string;
  remainingCredits: number | null;
  monthlyCredits: number | null;
  usedThisMonth: number | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  signIn: (payload: {
    name: string;
    email: string;
    planCode?: PlanCode;
  }) => void;
  signOut: () => Promise<void>;
  updatePlan: (planCode: PlanCode) => void;
  refreshSession: () => Promise<void>;
  consumeCredits: (amount: number) => void;
  consumeCreditsByAction: (action: CreditAction) => boolean;
  refundCreditsByAction: (action: CreditAction) => void;
  hasEnoughCreditsFor: (action: CreditAction) => boolean;
  getActionCost: (action: CreditAction) => number;
};

type BillingProfileResponse = {
  ok: boolean;
  profile?: {
    userId: string;
    email: string;
    planCode: string;
    planLabel: string;
    credits: number;
    monthlyCredits?: number;
    usedThisMonth?: number;
  };
};

const SESSION_STORAGE_KEY = "dubles_v2_session";

const SessionContext = createContext<SessionContextValue | null>(null);

function saveSession(nextUser: SessionUser | null) {
  try {
    if (!nextUser) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextUser));
  } catch (error) {
    console.error("Session save error:", error);
  }
}

function normalizePlanCode(value?: string | null): PlanCode {
  if (value === "starter" || value === "pro" || value === "agency") {
    return value;
  }
  return "free";
}

function buildUser(params: {
  name: string;
  email: string;
  planCode?: PlanCode;
}): SessionUser {
  const code = params.planCode ?? "free";
  const plan = getPlanByCode(code);

  return {
    id: `user-${Date.now()}`,
    name: params.name,
    email: params.email,
    planCode: code,
    planLabel: plan.label,
    remainingCredits: plan.creditsMonthly,
    monthlyCredits: plan.creditsMonthly,
    usedThisMonth: 0,
  };
}

function readStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SessionUser;
    return parsed?.email ? parsed : null;
  } catch (error) {
    console.error("Session load error:", error);
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  const persist = useCallback((nextUser: SessionUser | null) => {
    setUser(nextUser);
    saveSession(nextUser);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as BillingProfileResponse | null;

      if (!res.ok || !data?.ok || !data.profile) {
        return;
      }

      setUser((prev) => {
        const normalizedPlan = normalizePlanCode(data.profile?.planCode);
        const fallbackPlan = getPlanByCode(normalizedPlan);

        const nextUser: SessionUser = {
          id: data.profile.userId || prev?.id || `user-${Date.now()}`,
          name: prev?.name || data.profile.email?.split("@")[0] || "User",
          email: data.profile.email || prev?.email || "",
          planCode: normalizedPlan,
          planLabel: data.profile.planLabel || fallbackPlan.label,
          remainingCredits:
            typeof data.profile.credits === "number"
              ? data.profile.credits
              : prev?.remainingCredits ?? fallbackPlan.creditsMonthly,
          monthlyCredits:
            typeof data.profile.monthlyCredits === "number"
              ? data.profile.monthlyCredits
              : prev?.monthlyCredits ?? fallbackPlan.creditsMonthly,
          usedThisMonth:
            typeof data.profile.usedThisMonth === "number"
              ? data.profile.usedThisMonth
              : prev?.usedThisMonth ?? 0,
        };

        saveSession(nextUser);
        return nextUser;
      });
    } catch {
      // Network hiccups during local dev or deploy refresh should not open
      // the Next.js error overlay or block the app shell.
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = readStoredSession();
      if (storedUser) setUser(storedUser);
      void refreshSession();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  useEffect(() => {
    const handleFocus = () => {
      refreshSession();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshSession]);

  const signIn = useCallback((payload: {
    name: string;
    email: string;
    planCode?: PlanCode;
  }) => {
    persist(buildUser(payload));

    setTimeout(() => {
      void refreshSession();
    }, 150);
  }, [persist, refreshSession]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/session/clear", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Session clear error:", error);
    }

    persist(null);
  }, [persist]);

  const updatePlan = useCallback((planCode: PlanCode) => {
    setUser((prev) => {
      if (!prev) return prev;

      const plan = getPlanByCode(planCode);
      const nextUser: SessionUser = {
        ...prev,
        planCode,
        planLabel: plan.label,
        remainingCredits: plan.creditsMonthly,
        monthlyCredits: plan.creditsMonthly,
        usedThisMonth: 0,
      };

      saveSession(nextUser);
      return nextUser;
    });
  }, []);

  const consumeCredits = useCallback((amount: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      if (prev.remainingCredits === null) return prev;

      const nextCredits = Math.max(0, prev.remainingCredits - amount);
      const nextUser: SessionUser = {
        ...prev,
        remainingCredits: nextCredits,
        usedThisMonth: (prev.usedThisMonth ?? 0) + amount,
      };

      saveSession(nextUser);
      return nextUser;
    });
  }, []);

  const hasEnoughCreditsFor = useCallback((action: CreditAction) => {
    if (!user) return false;
    if (user.remainingCredits === null) return true;

    return hasEnoughCredits(user.remainingCredits, action);
  }, [user]);

  const consumeCreditsByAction = useCallback((action: CreditAction) => {
    if (!user) return false;
    if (user.remainingCredits === null) return true;

    const allowed = hasEnoughCredits(user.remainingCredits, action);
    if (!allowed) return false;

    setUser((prev) => {
      if (!prev) return prev;
      if (prev.remainingCredits === null) return prev;

      const cost = getCreditCost(action);
      const nextCredits = consumeRawCredits(prev.remainingCredits, action);
      const nextUser: SessionUser = {
        ...prev,
        remainingCredits: nextCredits,
        usedThisMonth: (prev.usedThisMonth ?? 0) + cost,
      };

      saveSession(nextUser);
      return nextUser;
    });

    return true;
  }, [user]);

  const refundCreditsByAction = useCallback((action: CreditAction) => {
    setUser((prev) => {
      if (!prev) return prev;
      if (prev.remainingCredits === null) return prev;

      const cost = getCreditCost(action);
      const nextCredits = refundCredits(prev.remainingCredits, action);
      const nextUser: SessionUser = {
        ...prev,
        remainingCredits: nextCredits,
        usedThisMonth: Math.max(0, (prev.usedThisMonth ?? 0) - cost),
      };

      saveSession(nextUser);
      return nextUser;
    });
  }, []);

  const getActionCost = useCallback((action: CreditAction) => {
    return getCreditCost(action);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      signIn,
      signOut,
      updatePlan,
      refreshSession,
      consumeCredits,
      consumeCreditsByAction,
      refundCreditsByAction,
      hasEnoughCreditsFor,
      getActionCost,
    }),
    [
      user,
      signIn,
      signOut,
      updatePlan,
      refreshSession,
      consumeCredits,
      consumeCreditsByAction,
      refundCreditsByAction,
      hasEnoughCreditsFor,
      getActionCost,
    ]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }

  return context;
}
