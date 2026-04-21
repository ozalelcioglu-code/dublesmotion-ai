import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const siteUrl = "https://www.dublesmotion.com";
const title =
  "Duble-S Motion AI - Yapay Zeka Video, Görsel, Müzik ve Araştırma Platformu";
const description =
  "Duble-S Motion AI; yapay zeka video oluşturma, görsel üretimi, resimden video, AI müzik, konuşan avatar, video klonlama, canlı sohbet, derin araştırma ve proje ajanı araçlarını tek platformda birleştirir.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: siteUrl,
    languages: {
      tr: siteUrl,
      en: siteUrl,
      de: siteUrl,
      ku: siteUrl,
    },
  },
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: "Duble-S Motion AI",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Duble-S Motion AI logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/icon-512.png"],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
