"use client";

import type { CSSProperties } from "react";
import { useLanguage } from "../../provider/LanguageProvider";

export default function RefundPolicyPage() {
  const { language } = useLanguage();

  const content =
    language === "tr"
      ? {
          title: "İade Politikası",
          updated: "Son güncelleme: 21.03.2026",
          sections: [
            {
              heading: "1. Genel Kural",
              paragraphs: [
                "Abonelikler, kullanım kredileri ve dijital hizmet ödemeleri, aksi yasal olarak zorunlu olmadıkça genel olarak iade edilmez.",
              ],
            },
            {
              heading: "2. İade Değerlendirilebilecek Durumlar",
              bullets: [
                "Aynı ödeme için mükerrer tahsilat yapılması",
                "Doğrulanmış teknik bir arıza nedeniyle satın alınan hizmetin sunulamaması",
                "Yanlış tutarda faturalandırma yapılması",
                "Mevzuat gereği iade hakkı doğması",
              ],
            },
            {
              heading: "3. Genel Olarak İade Dışı Durumlar",
              bullets: [
                "Abonelik döneminin kısmen kullanılmış olması",
                "Kullanıcı girdisine bağlı kalite memnuniyetsizliği",
                "Kredilerin kullanıcı tarafından tüketilmiş olması",
                "Üçüncü taraf kesintileri veya kullanıcı kaynaklı hatalar",
              ],
            },
            {
              heading: "4. Başvuru Süreci",
              paragraphs: [
                "İade talepleri için info@dublestechnology.com adresine ödeme tarihi, hesap e-postası ve gerekçeniz ile birlikte başvurabilirsiniz.",
              ],
            },
          ],
        }
      : language === "de"
      ? {
          title: "Rückerstattungsrichtlinie",
          updated: "Zuletzt aktualisiert: 21.03.2026",
          sections: [
            {
              heading: "1. Allgemeine Regel",
              paragraphs: [
                "Zahlungen für Abonnements, Nutzungsguthaben und digitale Dienstleistungen sind grundsätzlich nicht erstattungsfähig, sofern gesetzlich nichts anderes vorgeschrieben ist.",
              ],
            },
            {
              heading: "2. Fälle, die geprüft werden können",
              bullets: [
                "Doppelte Abbuchungen",
                "Bestätigter technischer Fehler, durch den der gekaufte Dienst nicht erbracht werden konnte",
                "Fehlerhafte Rechnungsstellung",
                "Rückerstattungsansprüche nach geltendem Recht",
              ],
            },
            {
              heading: "3. Im Regelfall nicht erstattungsfähig",
              bullets: [
                "Teilweise genutzte Abonnementzeiträume",
                "Unzufriedenheit aufgrund von Nutzereingaben oder subjektiven Ergebniserwartungen",
                "Bereits verbrauchte Credits",
                "Ausfälle Dritter oder nutzerseitige Fehler",
              ],
            },
            {
              heading: "4. Antragsverfahren",
              paragraphs: [
                "Rückerstattungsanfragen können an info@dublestechnology.com mit Zahlungsdatum, Kontaktemail und Begründung gesendet werden.",
              ],
            },
          ],
        }
      : {
          title: "Refund Policy",
          updated: "Last updated: 21.03.2026",
          sections: [
            {
              heading: "1. General Rule",
              paragraphs: [
                "Payments for subscriptions, usage credits and digital services are generally non-refundable unless required by law.",
              ],
            },
            {
              heading: "2. Cases We May Review",
              bullets: [
                "Duplicate charges",
                "Verified technical failure preventing delivery of the purchased service",
                "Incorrect billing amount",
                "Refund rights arising under applicable law",
              ],
            },
            {
              heading: "3. Generally Non-Refundable Cases",
              bullets: [
                "Partial use of a subscription period",
                "Dissatisfaction caused by user inputs or subjective output expectations",
                "Credits already used by the account",
                "Third-party outages or user-side errors",
              ],
            },
            {
              heading: "4. Request Process",
              paragraphs: [
                "Refund requests may be sent to info@dublestechnology.com together with the payment date, account email and reason for the request.",
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