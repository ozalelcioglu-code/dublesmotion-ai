"use client";

import type { CSSProperties } from "react";
import { useLanguage } from "../provider/LanguageProvider";
import {
  LEGAL_PAGES,
  type LegalPageKey,
} from "../lib/legal-pages";

export default function LegalPageTemplate({
  pageKey,
}: {
  pageKey: LegalPageKey;
}) {
  const { language } = useLanguage();

  const lang =
    language === "tr" || language === "en" || language === "de"
      ? language
      : "en";

  const content = LEGAL_PAGES[pageKey][lang];

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{content.title}</h1>

        <div style={styles.updated}>
          {content.updatedLabel}: {content.updatedValue}
        </div>

        <div style={styles.body}>
          {content.sections.map((section, index) => (
            <section key={`${pageKey}-${index}`} style={styles.section}>
              {section.heading ? (
                <h2 style={styles.heading}>{section.heading}</h2>
              ) : null}

              {section.paragraphs?.map((paragraph, pIndex) => (
                <p
                  key={`${pageKey}-${index}-p-${pIndex}`}
                  style={styles.paragraph}
                >
                  {paragraph}
                </p>
              ))}

              {section.bullets?.length ? (
                <ul style={styles.list}>
                  {section.bullets.map((bullet, bIndex) => (
                    <li
                      key={`${pageKey}-${index}-b-${bIndex}`}
                      style={styles.listItem}
                    >
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