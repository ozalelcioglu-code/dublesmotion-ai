import type { Metadata } from "next";
import "../styles/global.css";
import { LanguageProvider } from "../provider/LanguageProvider";
import { SessionProvider } from "../provider/SessionProvider";



export const metadata: Metadata = {
  metadataBase: new URL("https://dublesmotion.com"),

  title: {
    default: "Duble-S Motion AI",
    template: "%s | Duble-S Motion AI",
  },

  description:
    "AI video generation platform for creating cinematic ads, animated scenes and marketing videos.",

  icons: {
    icon: "/Dubleslogo.png",
    shortcut: "/Dubleslogo.png",
    apple: "/Dubleslogo.png",
  },

  openGraph: {
    title: "Duble-S Motion AI",
    description:
      "Create cinematic AI videos, animated scenes and advertising content.",
    url: "https://dublesmotion.com",
    siteName: "Duble-S Motion AI",
    images: [
      {
        url: "/Dubleslogo.png",
        width: 512,
        height: 512,
      },
    ],
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="page-shell">
        <SessionProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}