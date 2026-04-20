"use client";

import type { ReactNode } from "react";
import { LanguageProvider } from "../provider/languageProvider";
import { SessionProvider } from "../provider/SessionProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>{children}</SessionProvider>
    </LanguageProvider>
  );
}