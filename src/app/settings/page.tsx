import { headers } from "next/headers";
import  AppPageShell  from "../../components/AppPageShell";

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
    title: "Ayarlar",
    subtitle: "Çalışma alanınızı ve platform tercihlerinizi kişiselleştirin.",
    workspaceName: "Çalışma Alanı Adı",
    defaultBrand: "Varsayılan Marka",
    exportRatio: "Varsayılan Video Formatı",
    square: "Kare (1:1)",
  },

  en: {
    title: "Settings",
    subtitle: "Personalize your workspace and future platform preferences.",
    workspaceName: "Workspace Name",
    defaultBrand: "Default Brand",
    exportRatio: "Default Export Ratio",
    square: "Square (1:1)",
  },

  de: {
    title: "Einstellungen",
    subtitle: "Personalisieren Sie Ihren Arbeitsbereich und zukünftige Plattformpräferenzen.",
    workspaceName: "Workspace Name",
    defaultBrand: "Standardmarke",
    exportRatio: "Standard-Videoformat",
    square: "Quadrat (1:1)",
  },
};

export default async function SettingsPage() {
  const h = await headers();
  const lang = getLanguageFromHeaders(h) as "tr" | "en" | "de";
  const t = TEXT[lang];

  const card: React.CSSProperties = {
    background: "rgba(10,18,33,0.82)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    maxWidth: 760,
  };

  const field: React.CSSProperties = {
    display: "grid",
    gap: 8,
    marginBottom: 14,
  };

  const label: React.CSSProperties = {
    fontSize: 12,
    color: "rgba(231,238,249,0.74)",
    fontWeight: 800,
    textTransform: "uppercase",
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(4,10,20,0.65)",
    color: "#e7eef9",
    outline: "none",
  };

  return (
    <AppPageShell title={t.title} subtitle={t.subtitle}>
      <div style={card}>
        <div style={field}>
          <div style={label}>{t.workspaceName}</div>
          <input style={input} defaultValue="Duble-S Motion AI" />
        </div>

        <div style={field}>
          <div style={label}>{t.defaultBrand}</div>
          <input style={input} defaultValue="Duble-S Technology" />
        </div>

        <div style={field}>
          <div style={label}>{t.exportRatio}</div>
          <input style={input} defaultValue={t.square} />
        </div>
      </div>
    </AppPageShell>
  );
}