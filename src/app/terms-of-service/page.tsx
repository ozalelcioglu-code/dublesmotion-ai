"use client";

import type { CSSProperties } from "react";
import { useLanguage } from "../../provider/LanguageProvider";

export default function TermsOfServicePage() {
  const { language } = useLanguage();

  const content =
    language === "tr"
      ? {
          title: "Kullanım Şartları",
          updated: "Son güncelleme: 21.03.2026",
          sections: [
            {
              heading: "1. Kapsam",
              paragraphs: [
                "Bu şartlar, Dublesmotion AI platformuna ve ilişkili hizmetlere erişiminizi ve kullanımınızı düzenler.",
              ],
            },
            {
              heading: "2. Hesaplar",
              paragraphs: [
                "Hesap bilgilerinizin güvenliğinden ve hesabınız üzerinden gerçekleşen tüm işlemlerden siz sorumlusunuz.",
              ],
            },
            {
              heading: "3. Yasaklı Kullanım",
              bullets: [
                "Yasadışı içerik üretmek veya paylaşmak",
                "Sisteme izinsiz erişmeye çalışmak",
                "Kota, kredi veya fiyatlama yapısını kötüye kullanmak",
                "Üçüncü kişilerin haklarını ihlal eden içerik yüklemek",
              ],
            },
            {
              heading: "4. AI Çıktıları",
              paragraphs: [
                "AI tarafından üretilen içerikler hatalı, eksik veya benzer olabilir. Nihai kullanım öncesinde kontrol sorumluluğu kullanıcıya aittir.",
              ],
            },
            {
              heading: "5. Planlar, Ödemeler ve Krediler",
              paragraphs: [
                "Bazı özellikler ücretli plan veya kullanım kredisi gerektirebilir. Fiyatlar, limitler ve paket içerikleri zaman zaman güncellenebilir.",
              ],
            },
            {
              heading: "6. Hizmet Sürekliliği",
              paragraphs: [
                "Hizmeti kesintisiz, hatasız veya sürekli erişilebilir şekilde sunacağımız garanti edilmez.",
              ],
            },
            {
              heading: "7. Askıya Alma / Sonlandırma",
              paragraphs: [
                "Şartların ihlali, güvenlik riski, ödeme problemi veya kötüye kullanım halinde hesabı askıya alma veya sonlandırma hakkımız saklıdır.",
              ],
            },
            {
              heading: "8. Sorumluluk Sınırı",
              paragraphs: [
                "Hizmet, mevzuatın izin verdiği ölçüde 'olduğu gibi' sunulur. Dolaylı zararlar, veri kaybı, gelir kaybı veya iş kesintileri için sorumluluk kabul edilmez.",
              ],
            },
          ],
        }
      : language === "de"
      ? {
          title: "Nutzungsbedingungen",
          updated: "Zuletzt aktualisiert: 21.03.2026",
          sections: [
            {
              heading: "1. Geltungsbereich",
              paragraphs: [
                "Diese Bedingungen regeln Ihren Zugang zur Dublesmotion AI Plattform und deren Nutzung.",
              ],
            },
            {
              heading: "2. Konten",
              paragraphs: [
                "Sie sind für die Sicherheit Ihrer Zugangsdaten und für alle Aktivitäten unter Ihrem Konto verantwortlich.",
              ],
            },
            {
              heading: "3. Verbotene Nutzung",
              bullets: [
                "Erstellung oder Verbreitung rechtswidriger Inhalte",
                "Versuche unbefugten Zugriffs",
                "Missbrauch von Quoten, Credits oder Preisen",
                "Hochladen von Inhalten, die Rechte Dritter verletzen",
              ],
            },
            {
              heading: "4. KI-Ergebnisse",
              paragraphs: [
                "KI-generierte Inhalte können ungenau, unvollständig oder ähnlich zu anderen Ergebnissen sein. Nutzer sind verpflichtet, die Ergebnisse vor der Verwendung zu prüfen.",
              ],
            },
            {
              heading: "5. Pläne, Zahlungen und Credits",
              paragraphs: [
                "Bestimmte Funktionen können kostenpflichtige Tarife oder Nutzungsguthaben erfordern. Preise, Limits und Paketdetails können sich von Zeit zu Zeit ändern.",
              ],
            },
            {
              heading: "6. Verfügbarkeit des Dienstes",
              paragraphs: [
                "Wir garantieren keine unterbrechungsfreie, fehlerfreie oder dauerhafte Verfügbarkeit des Dienstes.",
              ],
            },
            {
              heading: "7. Sperrung / Kündigung",
              paragraphs: [
                "Wir können Konten bei Verstößen gegen diese Bedingungen, Sicherheitsrisiken, Zahlungsproblemen oder Missbrauch sperren oder kündigen.",
              ],
            },
            {
              heading: "8. Haftungsbeschränkung",
              paragraphs: [
                "Soweit gesetzlich zulässig, wird der Dienst 'wie besehen' bereitgestellt. Für indirekte Schäden, Datenverlust, Umsatzausfälle oder Betriebsunterbrechungen übernehmen wir keine Haftung.",
              ],
            },
          ],
        }
      : {
          title: "Terms of Service",
          updated: "Last updated: 21.03.2026",
          sections: [
            {
              heading: "1. Scope",
              paragraphs: [
                "These Terms govern your access to and use of the Dublesmotion AI platform and related services.",
              ],
            },
            {
              heading: "2. Accounts",
              paragraphs: [
                "You are responsible for the security of your account credentials and for all activity under your account.",
              ],
            },
            {
              heading: "3. Prohibited Use",
              bullets: [
                "Creating or sharing unlawful content",
                "Attempting unauthorized access",
                "Abusing quotas, credits or pricing",
                "Uploading content that infringes third-party rights",
              ],
            },
            {
              heading: "4. AI Outputs",
              paragraphs: [
                "AI-generated content may be inaccurate, incomplete or similar to other outputs. Users are responsible for reviewing outputs before use.",
              ],
            },
            {
              heading: "5. Plans, Payments and Credits",
              paragraphs: [
                "Certain features may require paid plans or usage credits. Prices, limits and package details may change from time to time.",
              ],
            },
            {
              heading: "6. Service Availability",
              paragraphs: [
                "We do not guarantee uninterrupted, error-free or permanent availability of the service.",
              ],
            },
            {
              heading: "7. Suspension / Termination",
              paragraphs: [
                "We may suspend or terminate accounts in cases of Terms violations, security risks, payment issues or abuse.",
              ],
            },
            {
              heading: "8. Limitation of Liability",
              paragraphs: [
                "To the extent permitted by law, the service is provided 'as is'. We are not liable for indirect damages, loss of data, loss of revenue or business interruption.",
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