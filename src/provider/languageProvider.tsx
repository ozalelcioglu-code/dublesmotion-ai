"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  APP_LANGUAGES,
  getSafeLanguage,
  type AppLanguage,
} from "@/lib/i18n";

const LANGUAGE_STORAGE_KEY = "dubles_language_v1";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  availableLanguages: AppLanguage[];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  defaultLanguage = "tr",
}: {
  children: ReactNode;
  defaultLanguage?: AppLanguage;
}) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return defaultLanguage;

    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored) return getSafeLanguage(stored);

      const browserLanguage = navigator.language?.slice(0, 2).toLowerCase();
      return getSafeLanguage(browserLanguage || defaultLanguage);
    } catch {
      return defaultLanguage;
    }
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored) {
          setLanguageState(getSafeLanguage(stored));
          return;
        }

        const browserLanguage =
          typeof navigator !== "undefined"
            ? navigator.language?.slice(0, 2).toLowerCase()
            : defaultLanguage;

        setLanguageState(getSafeLanguage(browserLanguage));
      } catch {
        setLanguageState(defaultLanguage);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [defaultLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.lang = language;
    } catch {
      // no-op
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage: AppLanguage) => {
        setLanguageState(getSafeLanguage(nextLanguage));
      },
      availableLanguages: APP_LANGUAGES,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
