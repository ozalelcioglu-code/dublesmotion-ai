"use client";

import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { LANGUAGE_LABELS, type AppLanguage } from "../lib/i18n";
import { useLanguage } from "../provider/LanguageProvider";
import { useSession } from "../provider/SessionProvider";

export function AppHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  const { language, setLanguage, t } = useLanguage();
  const { user, isLoading } = useSession();

  const styles = {
    wrap: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 18,
      marginBottom: 22,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    left: {
      display: "grid",
      gap: 8,
      minWidth: 280,
    } as React.CSSProperties,
    title: {
      fontSize: 30,
      fontWeight: 950,
      margin: 0,
      letterSpacing: -0.5,
      color: "#e7eef9",
    } as React.CSSProperties,
    subtitle: {
      fontSize: 14,
      lineHeight: 1.5,
      color: "rgba(231,238,249,0.68)",
      maxWidth: 760,
    } as React.CSSProperties,
    right: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap" as const,
      justifyContent: "flex-end",
      marginLeft: "auto",
    } as React.CSSProperties,
    languageSelect: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(4,10,20,0.65)",
      color: "#e7eef9",
      outline: "none",
      fontSize: 14,
      minWidth: 136,
    } as React.CSSProperties,
    cta: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "11px 14px",
      borderRadius: 14,
      border: "1px solid rgba(59,130,246,0.35)",
      background:
        "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 900,
    } as React.CSSProperties,
    ghost: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "11px 14px",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      color: "#e7eef9",
      textDecoration: "none",
      fontWeight: 800,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.left}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle ? <div style={styles.subtitle}>{subtitle}</div> : null}
      </div>

      <div style={styles.right}>
        {rightSlot}

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as AppLanguage)}
          style={styles.languageSelect}
          aria-label={t.common.language}
        >
          <option value="tr">{LANGUAGE_LABELS.tr}</option>
          <option value="en">{LANGUAGE_LABELS.en}</option>
          <option value="de">{LANGUAGE_LABELS.de}</option>
        </select>

        {!isLoading && !user?.email ? (
          <>
            <Link href="/login" style={styles.ghost}>
              {t.common.login}
            </Link>
            <Link href="/login" style={styles.cta}>
              {t.common.signup}
            </Link>
          </>
        ) : null}

        {user?.email ? <UserMenu /> : null}
      </div>
    </div>
  );
}