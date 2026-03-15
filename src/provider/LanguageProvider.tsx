"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getInitialLanguage,
  persistLanguage,
  translations,
  type AppLanguage,
} from "../lib/i18n";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (typeof translations)[AppLanguage];
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

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return ctx;
}