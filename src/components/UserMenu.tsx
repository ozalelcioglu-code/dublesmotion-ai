"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useLanguage } from "../provider/LanguageProvider";
import { useSession } from "../provider/SessionProvider";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function UserMenu() {
  const { t } = useLanguage();
  const { user, clearSession, refreshSession } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleLogout = async () => {
    try {
      setBusy(true);
      await authClient.signOut();
      clearSession();
      setOpen(false);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setBusy(false);
    }
  };

  if (!user?.email) return null;

  const initials = getInitials(user.name, user.email);

  const styles = {
    wrap: {
      position: "relative" as const,
    },
    trigger: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 10px",
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      cursor: "pointer",
      color: "#e7eef9",
      minWidth: 220,
    } as React.CSSProperties,
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      display: "grid",
      placeItems: "center",
      fontWeight: 900,
      background:
        "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))",
      color: "#fff",
      flexShrink: 0,
    } as React.CSSProperties,
    userMeta: {
      display: "grid",
      gap: 2,
      minWidth: 0,
      flex: 1,
    } as React.CSSProperties,
    name: {
      fontSize: 13,
      fontWeight: 800,
      whiteSpace: "nowrap" as const,
      overflow: "hidden",
      textOverflow: "ellipsis",
    } as React.CSSProperties,
    email: {
      fontSize: 12,
      color: "rgba(231,238,249,0.62)",
      whiteSpace: "nowrap" as const,
      overflow: "hidden",
      textOverflow: "ellipsis",
    } as React.CSSProperties,
    menu: {
      position: "absolute" as const,
      top: "calc(100% + 10px)",
      right: 0,
      width: 290,
      borderRadius: 20,
      background: "rgba(11,18,34,0.98)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      padding: 14,
      zIndex: 50,
    } as React.CSSProperties,
    menuCard: {
      padding: 14,
      borderRadius: 16,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      marginBottom: 12,
    } as React.CSSProperties,
    badgeRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap" as const,
      marginTop: 10,
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
    link: {
      display: "block",
      width: "100%",
      padding: "11px 12px",
      borderRadius: 12,
      color: "#e7eef9",
      textDecoration: "none",
      fontWeight: 700,
      border: "1px solid transparent",
      background: "transparent",
    } as React.CSSProperties,
    logoutBtn: {
      width: "100%",
      padding: "11px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.04)",
      color: "#e7eef9",
      cursor: "pointer",
      fontWeight: 800,
      marginTop: 8,
    } as React.CSSProperties,
  };

  return (
    <div ref={ref} style={styles.wrap}>
      <button type="button" style={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <div style={styles.avatar}>{initials}</div>
        <div style={styles.userMeta}>
          <div style={styles.name}>{user.name || t.common.signedInUser}</div>
          <div style={styles.email}>{user.email}</div>
        </div>
      </button>

      {open && (
        <div style={styles.menu}>
          <div style={styles.menuCard}>
            <div style={{ fontWeight: 900 }}>{user.name || t.common.signedInUser}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "rgba(231,238,249,0.62)" }}>
              {user.email}
            </div>

            <div style={styles.badgeRow}>
              <div style={styles.badge}>{user.planLabel || t.common.freePlan}</div>
              <div style={styles.badge}>
                {user.remainingCredits === null
                  ? t.common.unlimitedCredits
                  : `${user.remainingCredits} ${t.common.creditsLeft}`}
              </div>
            </div>
          </div>

          <Link href="/dashboard" style={styles.link} onClick={() => setOpen(false)}>
            {t.common.dashboard}
          </Link>
          <Link href="/billing" style={styles.link} onClick={() => setOpen(false)}>
            {t.common.billing}
          </Link>
          <Link href="/settings" style={styles.link} onClick={() => setOpen(false)}>
            {t.common.settings}
          </Link>

          <button type="button" style={styles.logoutBtn} onClick={handleLogout} disabled={busy}>
            {busy ? t.common.loading : t.common.logout}
          </button>
        </div>
      )}
    </div>
  );
}