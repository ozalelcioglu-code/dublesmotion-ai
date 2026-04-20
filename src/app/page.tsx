import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

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

const tools = [
  "Yapay zeka video oluşturma",
  "Metinden görsel üretimi",
  "Resimden video",
  "AI müzik ve vokal üretimi",
  "Konuşan avatar ve sesli sohbet",
  "Video klonlama",
  "Canlı web destekli AI araştırma",
  "Proje ajanı ile kod ve dosya yardımı",
];

const useCases = [
  "İçerik üreticileri için hızlı video, görsel ve müzik üretimi",
  "Markalar için reklam, sosyal medya ve ürün tanıtım içerikleri",
  "Ekipler için araştırma, fikir geliştirme ve üretim otomasyonu",
  "Geliştiriciler için proje ajanı, dosya analizi ve kod yardımı",
];

export default function HomePage() {
  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.brandRow}>
          <Image
            src="/dubles-logo.png"
            alt="Duble-S Motion AI"
            width={52}
            height={52}
            style={styles.logo}
          />
          <div>
            <div style={styles.brand}>Duble-S Motion AI</div>
            <div style={styles.subBrand}>AI Creative Platform</div>
          </div>
        </div>

        <h1 style={styles.title}>
          Yapay zeka ile video, görsel, müzik, avatar ve araştırma üretimini tek
          platformda topla.
        </h1>

        <p style={styles.description}>
          Duble-S Motion AI; üreticiler, markalar, ekipler ve geliştiriciler
          için AI video generator, AI image generator, image-to-video, AI music,
          talking avatar, video clone, live web research ve project agent
          araçlarını bir araya getirir.
        </p>

        <div style={styles.actions}>
          <Link href="/chat" style={styles.primaryButton}>
            AI sohbete başla
          </Link>
          <Link href="/text-to-video" style={styles.secondaryButton}>
            Video üret
          </Link>
        </div>
      </section>

      <section style={styles.section} aria-labelledby="tools-title">
        <h2 id="tools-title" style={styles.sectionTitle}>
          Yapay zeka üretim araçları
        </h2>
        <div style={styles.grid}>
          {tools.map((tool) => (
            <article key={tool} style={styles.card}>
              {tool}
            </article>
          ))}
        </div>
      </section>

      <section style={styles.section} aria-labelledby="research-title">
        <h2 id="research-title" style={styles.sectionTitle}>
          AI araştırma ve üretim otomasyonu
        </h2>
        <p style={styles.bodyText}>
          Platform; canlı web destekli araştırma, derin araştırma modu, proje
          ajanı, dosya analizi ve sohbet içinden üretim başlatma akışlarıyla
          fikirden çıktıya kadar olan süreci hızlandırır.
        </p>
        <div style={styles.grid}>
          {useCases.map((useCase) => (
            <article key={useCase} style={styles.card}>
              {useCase}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#f8fafc",
    color: "#111827",
    padding: "40px 20px 56px",
  },
  hero: {
    width: "min(1040px, 100%)",
    margin: "0 auto",
    padding: "36px 0 28px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 26,
  },
  logo: {
    borderRadius: 8,
    boxShadow: "0 12px 28px rgba(15,23,42,0.14)",
  },
  brand: {
    fontSize: 18,
    fontWeight: 900,
    letterSpacing: 0,
  },
  subBrand: {
    marginTop: 2,
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
  },
  title: {
    maxWidth: 880,
    margin: 0,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: 0,
    fontWeight: 950,
  },
  description: {
    maxWidth: 820,
    margin: "22px 0 0",
    color: "#334155",
    fontSize: 18,
    lineHeight: 1.65,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 28,
  },
  primaryButton: {
    minHeight: 44,
    padding: "0 18px",
    borderRadius: 8,
    background: "#111827",
    color: "#ffffff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 900,
  },
  secondaryButton: {
    minHeight: 44,
    padding: "0 18px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 900,
  },
  section: {
    width: "min(1040px, 100%)",
    margin: "34px auto 0",
  },
  sectionTitle: {
    margin: "0 0 14px",
    fontSize: 28,
    lineHeight: 1.2,
    letterSpacing: 0,
    fontWeight: 900,
  },
  bodyText: {
    maxWidth: 820,
    margin: "0 0 18px",
    color: "#334155",
    fontSize: 16,
    lineHeight: 1.7,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  card: {
    minHeight: 72,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    padding: 16,
    color: "#1f2937",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 800,
    boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
  },
};
