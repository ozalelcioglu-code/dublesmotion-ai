import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { LanguageProvider } from "@/provider/languageProvider";
import { SessionProvider } from "@/provider/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Duble-S Motion AI",
  description: "AI Creative Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <LanguageProvider defaultLanguage="en">
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}