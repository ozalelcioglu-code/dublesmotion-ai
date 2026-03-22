"use client";

import type { CSSProperties } from "react";

export default function AppFooter() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div style={styles.brandBlock}>
            <div style={styles.companyName}>DUBLE-S TECHNOLOGY</div>
            <div style={styles.platformName}>Dublesmotion AI</div>
            <div style={styles.description}>
              Advanced AI platform for video, voice, music, and creative media
              generation.
            </div>
            <div style={styles.companyMeta}>
              <div>LangStrasse 12053 Berlin</div>
              <div>Authorized Representative: Duble-S Technology</div>
              
            </div>
          </div>

          <div style={styles.linkGroup}>
            <div style={styles.groupTitle}>Platform</div>
            <a href="/about" style={styles.link}>
              About
            </a>
            <a href="/pricing" style={styles.link}>
              Pricing
            </a>
            <a href="/faqs" style={styles.link}>
              FAQs
            </a>
            <a href="/contact" style={styles.link}>
              Contact
            </a>
          </div>

          <div style={styles.linkGroup}>
            <div style={styles.groupTitle}>Legal</div>
            <a href="/impressum" style={styles.link}>
              Impressum
            </a>
            <a href="/privacy-policy" style={styles.link}>
              Privacy Policy
            </a>
            <a href="/terms-of-service" style={styles.link}>
              Terms of Service
            </a>
            <a href="/refund-policy" style={styles.link}>
              Refund Policy
            </a>
            <a href="/cookie-policy" style={styles.link}>
              Cookie Policy
            </a>
          </div>

          <div style={styles.contactBlock}>
            <div style={styles.groupTitle}>Contact</div>
            <div style={styles.contactText}>info@dublestechnology.com</div>
            

            <div style={styles.socials}>
              <a href="#" style={styles.social} aria-label="Facebook">
                f
              </a>
              <a href="#" style={styles.social} aria-label="X">
                𝕏
              </a>
              <a href="#" style={styles.social} aria-label="YouTube">
                ▶
              </a>
              <a href="#" style={styles.social} aria-label="LinkedIn">
                in
              </a>
            </div>
          </div>
        </div>

        <div style={styles.bottomRow}>
          <div style={styles.bottomLeft}>
            © {new Date().getFullYear()} Duble-S Technology. All rights
            reserved.
          </div>
          <div style={styles.bottomRight}>
            Dublesmotion AI is a platform product by Duble-S Technology.
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, CSSProperties> = {
  footer: {
    width: "100%",
    marginTop: 28,
    padding: "22px 20px 18px",
    background:
      "linear-gradient(180deg, rgba(244,246,248,0.96) 0%, rgba(225,229,235,0.98) 100%)",
    borderTop: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
  },

  container: {
    maxWidth: 1480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  topRow: {
    display: "grid",
    gridTemplateColumns:
      "minmax(280px, 1.6fr) minmax(160px, 0.9fr) minmax(180px, 1fr) minmax(240px, 1fr)",
    gap: 24,
    alignItems: "start",
  },

  brandBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },

  companyName: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 0.8,
    color: "#0f172a",
  },

  platformName: {
    fontSize: 20,
    fontWeight: 900,
    color: "#334155",
    letterSpacing: -0.3,
  },

  description: {
    fontSize: 13,
    lineHeight: 1.6,
    color: "#64748b",
    maxWidth: 420,
  },

  companyMeta: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 1.7,
    color: "#475569",
  },

  linkGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  groupTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#475569",
    marginBottom: 2,
  },

  link: {
    color: "#334155",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.5,
  },

  contactBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },

  contactText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },

  socials: {
    display: "flex",
    gap: 10,
    marginTop: 6,
    flexWrap: "wrap",
  },

  social: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #ffffff 0%, #e8ecf1 100%)",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#334155",
    textDecoration: "none",
    fontWeight: 800,
    fontSize: 13,
    boxShadow: "0 4px 10px rgba(15,23,42,0.05)",
  },

  bottomRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    paddingTop: 14,
    borderTop: "1px solid rgba(15,23,42,0.08)",
  },

  bottomLeft: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5,
  },

  bottomRight: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5,
    textAlign: "right",
  },
};