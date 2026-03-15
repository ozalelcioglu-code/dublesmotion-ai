import { headers } from "next/headers";
import { AppPageShell } from "../../components/AppPageShell";

function getLanguageFromHeaders(h: Headers) {
  const cookie = h.get("cookie") || "";

  const match = cookie.match(/app-language=(tr|en|de)/);
  if (match) return match[1];

  const accept = h.get("accept-language") || "";

  if (accept.startsWith("tr")) return "tr";
  if (accept.startsWith("de")) return "de";

  return "en";
}

const TEXT = {
  tr: {
    title: "Şablonlar",
    subtitle:
      "Ürün reklamları, sinematik promosyonlar ve sosyal medya videoları için hazır stiller.",
    cinematic: {
      title: "Sinematik Reklam",
      text: "Premium görseller, akıcı geçişler ve güçlü marka hissi.",
    },
    product: {
      title: "Ürün Tanıtımı",
      text: "Ürünler, öne çıkan özellikler ve CTA için e-ticaret odaklı düzen.",
    },
    social: {
      title: "Sosyal Reel",
      text: "TikTok, Reels ve Shorts için hızlı ve mobil odaklı video formatı.",
    },
  },

  en: {
    title: "Templates",
    subtitle:
      "Prebuilt styles for product ads, cinematic promos, and social reels.",
    cinematic: {
      title: "Cinematic Ad",
      text: "Premium visuals, smooth transitions, strong brand feel.",
    },
    product: {
      title: "Product Promo",
      text: "E-commerce friendly layout for items, highlights, and CTA.",
    },
    social: {
      title: "Social Reel",
      text: "Fast-cut mobile-first format for TikTok, Reels, and Shorts.",
    },
  },

  de: {
    title: "Vorlagen",
    subtitle:
      "Vorgefertigte Stile für Produktanzeigen, cineastische Promotion und Social-Media-Reels.",
    cinematic: {
      title: "Cinematic Werbung",
      text: "Premium-Visuals, fließende Übergänge und starkes Markengefühl.",
    },
    product: {
      title: "Produkt Promo",
      text: "E-Commerce-freundliches Layout für Produkte, Highlights und CTA.",
    },
    social: {
      title: "Social Reel",
      text: "Schneller Mobile-First-Stil für TikTok, Reels und Shorts.",
    },
  },
};

export default async function TemplatesPage() {
  const h = await headers();

  const lang = getLanguageFromHeaders(h) as "tr" | "en" | "de";
  const t = TEXT[lang];

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 16,
  };

  const card: React.CSSProperties = {
    background: "rgba(10,18,33,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 18,
    minHeight: 160,
    boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
  };

  const title: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
    marginBottom: 8,
  };

  const muted: React.CSSProperties = {
    color: "rgba(231,238,249,0.62)",
    fontSize: 13,
    lineHeight: 1.5,
  };

  return (
    <AppPageShell title={t.title} subtitle={t.subtitle}>
      <div style={grid}>
        <div style={card}>
          <div style={title}>{t.cinematic.title}</div>
          <div style={muted}>{t.cinematic.text}</div>
        </div>

        <div style={card}>
          <div style={title}>{t.product.title}</div>
          <div style={muted}>{t.product.text}</div>
        </div>

        <div style={card}>
          <div style={title}>{t.social.title}</div>
          <div style={muted}>{t.social.text}</div>
        </div>
      </div>
    </AppPageShell>
  );
}