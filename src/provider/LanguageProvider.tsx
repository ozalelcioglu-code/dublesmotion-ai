"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getInitialLanguage,
  persistLanguage,
  translations,
  type AppLanguage,
} from "../lib/i18n";

type TranslationMap = typeof translations;
type TranslationValue = TranslationMap[keyof TranslationMap];

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: TranslationValue;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("en");

  useEffect(() => {
    const initial = getInitialLanguage();
    setLanguageState(initial);
    persistLanguage(initial);
  }, []);

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    persistLanguage(next);
  };

  const safeTranslations = useMemo<TranslationValue>(() => {
    return (
      translations[language as keyof typeof translations] ??
      translations.en
    );
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: safeTranslations,
    }),
    [language, safeTranslations]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}