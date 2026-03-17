import type { Metadata } from "next";
import Script from "next/script";
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
    "AI video generation platform for creating cinematic ads, animated scenes, storyboard-based videos, and marketing content.",

  applicationName: "Duble-S Motion AI",

  keywords: [
    "AI video generator",
    "text to video",
    "image to video",
    "animated video generator",
    "cinematic ad video",
    "storyboard video AI",
    "Duble-S Motion AI",
  ],

  authors: [{ name: "Duble-S Technology" }],
  creator: "Duble-S Technology",
  publisher: "Duble-S Technology",

  robots: {
    index: true,
    follow: true,
  },

  icons: {
    icon: [{ url: "/Dubleslogo.png", type: "image/png" }],
    shortcut: ["/Dubleslogo.png"],
    apple: ["/Dubleslogo.png"],
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
        alt: "Duble-S Motion AI",
      },
    ],
    locale: "tr_TR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Duble-S Motion AI",
    description:
      "Create cinematic AI videos, animated scenes and advertising content.",
    images: ["/Dubleslogo.png"],
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
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Duble-S Motion AI",
              url: "https://dublesmotion.com",
              logo: "https://dublesmotion.com/Dubleslogo.png",
            }),
          }}
        />
        <SessionProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}