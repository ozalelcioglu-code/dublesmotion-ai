import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { LanguageProvider } from "@/provider/languageProvider";
import { SessionProvider } from "@/provider/SessionProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const siteName = "Duble-S Motion AI";
const siteUrl = "https://www.dublesmotion.com";
const siteDescription =
  "Duble-S Motion AI is an all-in-one artificial intelligence platform for AI video generation, image creation, image-to-video, AI music, voice, talking avatars, video cloning, live chat, deep research, and project agent workflows.";
const siteDescriptionTr =
  "Duble-S Motion AI; yapay zeka video üretimi, görsel oluşturma, resimden video, AI müzik, ses, konuşan avatar, video klonlama, canlı sohbet, derin araştırma ve proje ajanı araçlarını tek platformda sunar.";
const seoTitle =
  "Duble-S Motion AI | Yapay Zeka Video, Görsel, Müzik, Avatar ve Derin Araştırma Platformu";
const seoKeywords = [
  "AI",
  "yapay zeka",
  "yapay zeka platformu",
  "yapay zeka araçları",
  "yapay zeka araştırma",
  "yapay zeka video oluşturma",
  "yapay zeka görsel oluşturma",
  "yapay zeka müzik oluşturma",
  "AI araştırma",
  "artificial intelligence",
  "AI platform",
  "AI tools",
  "AI video generator",
  "text to video AI",
  "AI video creation",
  "AI image generator",
  "text to image AI",
  "image to video AI",
  "AI music generator",
  "AI voice generator",
  "AI avatar video",
  "video clone AI",
  "deep research AI",
  "AI content creation",
  "generative AI platform",
  "creative AI tools",
  "marketing AI tools",
  "AI automation platform",
  "Duble-S Motion AI",
  "Dubles Technology",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Dubles Technology",
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      sameAs: [siteUrl],
    },
    {
      "@type": "WebSite",
      name: siteName,
      alternateName: ["Dublesmotion", "Duble-S Motion", "Dubles Technology AI"],
      url: siteUrl,
      description: siteDescription,
      inLanguage: ["tr", "en", "de", "ku"],
      publisher: {
        "@type": "Organization",
        name: "Dubles Technology",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/chat`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: siteName,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description: siteDescription,
      url: siteUrl,
      creator: {
        "@type": "Organization",
        name: "Dubles Technology",
      },
      featureList: [
        "AI video generation",
        "Text to video AI",
        "AI image generation",
        "Image to video",
        "AI music generation",
        "AI voice workflows",
        "Talking avatar video",
        "AI video clone",
        "Deep AI research",
        "Project agent for code and file workflows",
      ],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seoTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: seoKeywords,
  authors: [{ name: "Dubles Technology" }],
  creator: "Dubles Technology",
  publisher: "Dubles Technology",
  category: "technology",
  alternates: {
    canonical: "/",
    languages: {
      tr: "/",
      en: "/",
      de: "/",
      ku: "/",
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: seoTitle,
    description: siteDescriptionTr,
    locale: "tr_TR",
    alternateLocale: ["en_US", "de_DE"],
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: `${siteName} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: siteDescriptionTr,
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <Script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SessionProvider>
          <LanguageProvider defaultLanguage="tr">
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
