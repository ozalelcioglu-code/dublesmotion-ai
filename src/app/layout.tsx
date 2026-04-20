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
  "Duble-S Motion AI is an advanced AI platform for AI video generation, AI image creation, image-to-video, AI music, AI voice, avatar video, video cloning, and deep AI research workflows for creators, teams, marketers, and businesses.";
const seoTitle =
  "Duble-S Motion AI | AI Video Generator, AI Image, AI Music & Deep Research Platform";
const seoKeywords = [
  "AI",
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
      logo: `${siteUrl}/favicon.ico`,
      sameAs: [siteUrl],
    },
    {
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      description: siteDescription,
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
        "AI image generation",
        "Image to video",
        "AI music generation",
        "AI voice workflows",
        "Avatar video",
        "Video clone",
        "Deep AI research",
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
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: seoTitle,
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: siteDescription,
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script
          id="website-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SessionProvider>
          <LanguageProvider defaultLanguage="en">
            {children}
          </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}