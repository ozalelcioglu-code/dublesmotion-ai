"use client";

import { useLanguage } from "../provider/LanguageProvider";

type Props = {
  name?: string | null;
  email?: string | null;
  planLabel?: string | null;
  remainingCredits?: number | null;
};

export function UserPanel({
  name,
  email,
  planLabel,
  remainingCredits,
}: Props) {
  const { t } = useLanguage();

  const styles = {
    wrap: {
      display: "grid",
      gap: 10,
      padding: 16,
      borderRadius: 18,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
    } as React.CSSProperties,
    name: {
      color: "#f5f9ff",
      fontWeight: 800,
      fontSize: 15,
      marginBottom: 4,
    } as React.CSSProperties,
    email: {
      color: "rgba(231,238,249,0.62)",
      fontSize: 12,
      wordBreak: "break-word" as const,
      marginBottom: 8,
    } as React.CSSProperties,
    meta: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap" as const,
    } as React.CSSProperties,
    badge: {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "rgba(59,130,246,0.14)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#d7ebff",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.wrap}>
      <div>
        <div style={styles.name}>{name || t.common.signedInUser}</div>
        <div style={styles.email}>{email || "-"}</div>
      </div>

      <div style={styles.meta}>
        <div style={styles.badge}>{planLabel || t.common.freePlan}</div>
        <div style={styles.badge}>
          {remainingCredits === null
            ? t.common.unlimitedCredits
            : `${remainingCredits} ${t.common.creditsLeft}`}
        </div>
      </div>
    </div>
  );
}