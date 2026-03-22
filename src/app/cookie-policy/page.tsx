"use client";

import type { CSSProperties } from "react";
import { useLanguage } from "../../provider/LanguageProvider";

export default function CookiePolicyPage() {
  const { language } = useLanguage();

  const content =
    language === "tr"
      ? {
          title: "Çerez Politikası",
          updated: "Son güncelleme: 21.03.2026",
          sections: [
            {
              heading: "1. Çerez Nedir",
              paragraphs: [
                "Çerezler, web sitesini kullandığınızda cihazınıza kaydedilen küçük metin dosyalarıdır.",
              ],
            },
            {
              heading: "2. Çerezleri Neden Kullanıyoruz",
              bullets: [
                "Oturum ve giriş işlemlerini sürdürmek",
                "Hesap ve güvenlik kontrollerini sağlamak",
                "Dil ve tercihleri hatırlamak",
                "Performans ve kullanım analizi yapmak",
              ],
            },
            {
              heading: "3. Çerez Türleri",
              bullets: [
                "Zorunlu çerezler",
                "Tercih çerezleri",
                "Analitik / performans çerezleri",
              ],
            },
            {
              heading: "4. Kontrol",
              paragraphs: [
                "Tarayıcı ayarlarınız üzerinden çerezleri yönetebilir veya engelleyebilirsiniz. Ancak bazı çerezleri devre dışı bırakmak platformun çalışmasını etkileyebilir.",
              ],
            },
          ],
        }
      : language === "de"
      ? {
          title: "Cookie-Richtlinie",
          updated: "Zuletzt aktualisiert: 21.03.2026",
          sections: [
            {
              heading: "1. Was sind Cookies",
              paragraphs: [
                "Cookies sind kleine Textdateien, die beim Besuch einer Website auf Ihrem Gerät gespeichert werden.",
              ],
            },
            {
              heading: "2. Warum wir Cookies verwenden",
              bullets: [
                "Zur Aufrechterhaltung von Sitzungen und Login-Zuständen",
                "Zur Unterstützung von Konto- und Sicherheitsfunktionen",
                "Zum Speichern von Sprache und Einstellungen",
                "Zur Analyse von Leistung und Nutzung",
              ],
            },
            {
              heading: "3. Arten von Cookies",
              bullets: [
                "Notwendige Cookies",
                "Präferenz-Cookies",
                "Analyse- / Performance-Cookies",
              ],
            },
            {
              heading: "4. Kontrolle",
              paragraphs: [
                "Sie können Cookies über Ihre Browsereinstellungen verwalten oder blockieren. Das Deaktivieren bestimmter Cookies kann jedoch die Funktionalität der Plattform beeinträchtigen.",
              ],
            },
          ],
        }
      : {
          title: "Cookie Policy",
          updated: "Last updated: 21.03.2026",
          sections: [
            {
              heading: "1. What Are Cookies",
              paragraphs: [
                "Cookies are small text files stored on your device when you use a website.",
              ],
            },
            {
              heading: "2. Why We Use Cookies",
              bullets: [
                "To maintain sessions and sign-in state",
                "To support account and security controls",
                "To remember language and preferences",
                "To analyze performance and usage",
              ],
            },
            {
              heading: "3. Types of Cookies",
              bullets: [
                "Essential cookies",
                "Preference cookies",
                "Analytics / performance cookies",
              ],
            },
            {
              heading: "4. Control",
              paragraphs: [
                "You may manage or block cookies through your browser settings. Disabling certain cookies may affect platform functionality.",
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

              {section.paragraphs?.map((paragraph, pIndex) => (
                <p key={pIndex} style={styles.paragraph}>
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul style={styles.list}>
                  {section.bullets.map((bullet, bIndex) => (
                    <li key={bIndex} style={styles.listItem}>
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
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
  },
  list: {
    margin: 0,
    paddingLeft: 22,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 1.7,
    color: "#334155",
  },
};