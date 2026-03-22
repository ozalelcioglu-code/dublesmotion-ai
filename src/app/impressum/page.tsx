"use client";

import type { CSSProperties } from "react";
import { useLanguage } from "../../provider/LanguageProvider";

export default function ImpressumPage() {
  const { language } = useLanguage();

  const content =
    language === "tr"
      ? {
          title: "Künye / Impressum",
          updated: "Son güncelleme: 21.03.2026",
          sections: [
            {
              heading: "Şirket Bilgileri",
              paragraphs: [
                "Duble-S Technology",
                "LangStrasse 12053 Berlin",
                "Almanya",
              ],
            },
            {
              heading: "Yetkili Kişi",
              paragraphs: ["Özal Elçioğlu"],
            },
            {
              heading: "İletişim",
              paragraphs: [
                "Telefon: +4917632854727",
                "E-posta: info@dublestechnology.com",
                "Yasal / idari iletişim: ozal@dublestechnology.com",
              ],
            },
            {
              heading: "İçerikten Sorumlu Kişi",
              paragraphs: ["Özal Elçioğlu", "LangStrasse 12053 Berlin"],
            },
            {
              heading: "Yasal Açıklama",
              paragraphs: [
                "Bu sayfada yer alan bilgiler, Almanya’daki dijital hizmet sağlayıcılar için geçerli yasal bilgilendirme yükümlülükleri kapsamında sunulmaktadır.",
                "Sitede yer alan içerikler dikkatle hazırlanmış olsa da doğruluk, eksiksizlik ve güncellik konusunda garanti verilmez.",
              ],
            },
            {
              heading: "Harici Bağlantılar",
              paragraphs: [
                "Bu site üçüncü taraf internet sitelerine bağlantılar içerebilir. Bu dış içerikler üzerinde kontrolümüz bulunmadığından bu içeriklerden sorumluluk kabul edilmez.",
              ],
            },
            {
              heading: "Telif Hakkı",
              paragraphs: [
                "Bu sitede yer alan yazılar, görseller, marka ögeleri, tasarımlar ve medya içerikleri aksi belirtilmedikçe telif hakkı ve ilgili fikri mülkiyet hakları kapsamında korunur.",
              ],
            },
          ],
        }
      : language === "de"
      ? {
          title: "Impressum",
          updated: "Zuletzt aktualisiert: 21.03.2026",
          sections: [
            {
              heading: "Unternehmensangaben",
              paragraphs: [
                "Duble-S Technology",
                "LangStrasse 12053 Berlin",
                "Deutschland",
              ],
            },
            {
              heading: "Vertreten durch",
              paragraphs: ["Özal Elçioğlu"],
            },
            {
              heading: "Kontakt",
              paragraphs: [
                "Telefon: +4917632854727",
                "E-Mail: info@dublestechnology.com",
                "Rechtlicher / administrativer Kontakt: ozal@dublestechnology.com",
              ],
            },
            {
              heading: "Verantwortlich für den Inhalt",
              paragraphs: ["Özal Elçioğlu", "LangStrasse 12053 Berlin"],
            },
            {
              heading: "Rechtlicher Hinweis",
              paragraphs: [
                "Die auf dieser Seite bereitgestellten Informationen dienen der Erfüllung gesetzlicher Informationspflichten für digitale Dienste in Deutschland.",
                "Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Gewähr für Richtigkeit, Vollständigkeit und Aktualität der Inhalte.",
              ],
            },
            {
              heading: "Externe Links",
              paragraphs: [
                "Diese Website kann Links zu externen Websites Dritter enthalten. Für deren Inhalte übernehmen wir keine Haftung, da wir darauf keinen Einfluss haben.",
              ],
            },
            {
              heading: "Urheberrecht",
              paragraphs: [
                "Texte, Bilder, Markenelemente, Designs und Medieninhalte auf dieser Website sind, soweit nicht anders angegeben, urheberrechtlich geschützt.",
              ],
            },
          ],
        }
      : {
          title: "Impressum / Legal Notice",
          updated: "Last updated: 21.03.2026",
          sections: [
            {
              heading: "Company Information",
              paragraphs: [
                "Duble-S Technology",
                "LangStrasse 12053 Berlin",
                "Germany",
              ],
            },
            {
              heading: "Authorized Representative",
              paragraphs: ["Özal Elçioğlu"],
            },
            {
              heading: "Contact",
              paragraphs: [
                "Phone: +4917632854727",
                "Email: info@dublestechnology.com",
                "Legal / administrative contact: ozal@dublestechnology.com",
              ],
            },
            {
              heading: "Responsible for Content",
              paragraphs: ["Özal Elçioğlu", "LangStrasse 12053 Berlin"],
            },
            {
              heading: "Legal Notice",
              paragraphs: [
                "The information on this page is provided to comply with applicable legal information obligations for digital service providers in Germany.",
                "Although the content has been prepared with care, we do not guarantee accuracy, completeness or timeliness.",
              ],
            },
            {
              heading: "External Links",
              paragraphs: [
                "This website may contain links to third-party websites. We have no control over external content and therefore assume no liability for it.",
              ],
            },
            {
              heading: "Copyright",
              paragraphs: [
                "Unless otherwise stated, texts, visuals, brand elements, designs and media content published on this website are protected by copyright and related intellectual property laws.",
              ],
            },
          ],
        };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{content.title}</h1>
        <div style={styles.updated}>{content.updated}</div>

        <div style={styles.body}>
          {content.sections.map((section, index) => (
            <section key={index} style={styles.section}>
              <h2 style={styles.heading}>{section.heading}</h2>
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: "100%",
    minHeight: "100vh",
    padding: "32px 20px",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.55), transparent 28%), linear-gradient(135deg, #d9dde2 0%, #cfd5dc 42%, #b9c1cb 100%)",
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    borderRadius: 18,
    padding: "28px 24px",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    border: "1px solid rgba(15,23,42,0.10)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.7), 0 10px 30px rgba(15,23,42,0.08)",
  },
  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.15,
    fontWeight: 900,
    color: "#0f172a",
  },
  updated: {
    marginTop: 10,
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
  },
  body: {
    marginTop: 26,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  heading: {
    margin: 0,
    fontSize: 21,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "#334155",
  },
  paragraph: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.75,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
};