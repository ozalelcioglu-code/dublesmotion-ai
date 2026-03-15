import type { Metadata } from "next";
import "../styles/global.css";
import { LanguageProvider } from "../provider/LanguageProvider";
import { SessionProvider } from "../provider/SessionProvider";

export const metadata: Metadata = {
  title: "Duble-S Motion",
  description: "AI video studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <SessionProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}