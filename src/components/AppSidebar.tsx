"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useSession } from "../provider/SessionProvider";
import { useLanguage } from "../provider/LanguageProvider";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";

type NavItem = {
  key: NavKey;
  label: string;
  icon: string;
  badge?: boolean;
};

const navItems: NavItem[] = [
  { key: "tool", label: "Tool", icon: "⌘" },
  { key: "apps", label: "Apps", icon: "◫" },
  { key: "chat", label: "Chat", icon: "✦" },
  { key: "flow", label: "Flow", icon: "⇄" },
  { key: "live", label: "Live", icon: "◉", badge: true },
];

export default function AppSidebar({
  activeKey,
  onSelect,
}: {
  activeKey?: NavKey;
  onSelect?: (key: NavKey) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, clearSession } = useSession();
  const { language } = useLanguage();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 980);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, activeKey]);

  const userInitial = useMemo(() => {
    return (user?.name?.[0] || user?.email?.[0] || "D").toUpperCase();
  }, [user?.name, user?.email]);

  const remainingCreditsText =
    user?.remainingCredits === null
      ? "Unlimited"
      : `${user?.remainingCredits ?? 0}`;

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Sidebar logout failed:", error);
    } finally {
      clearSession();
      router.replace("/login");
      router.refresh();
    }
  };

  const handleNavClick = (key: NavKey) => {
    if (pathname === "/") {
      onSelect?.(key);
      if (isMobile) setMobileOpen(false);
      return;
    }

    if (key === "tool") {
      router.push("/");
    } else {
      router.push(`/?tab=${key}`);
    }

    if (isMobile) setMobileOpen(false);
  };

  const navContent = (
    <div style={styles.navSection}>
      <div style={styles.sectionLabel}>Workspace</div>

      <div style={styles.navGroup}>
        {navItems.map((item) => {
          const isActive = item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item.key)}
              style={{
                ...styles.navButton,
                ...(isActive ? styles.navButtonActive : {}),
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navText}>{item.label}</span>
              {item.badge ? <span style={styles.badgeDot} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const userPanel = (
    <div style={styles.userPanel}>
      <div style={styles.userPanelTitle}>User Panel</div>

      <div style={styles.userCard}>
        <div style={styles.userAvatar}>{userInitial}</div>

        <div style={styles.userMeta}>
          <div style={styles.userName}>
            {isAuthenticated ? user?.name || "User" : "Guest"}
          </div>
          <div style={styles.userPlan}>
            {user?.planLabel || "Free Plan"}
          </div>
          <div style={styles.userEmail}>
            {isAuthenticated ? user?.email || "-" : "Not signed in"}
          </div>
        </div>
      </div>

      <div style={styles.statsCard}>
        <div style={styles.statRow}>
          <span style={styles.statLabel}>Plan</span>
          <strong style={styles.statValue}>{user?.planLabel || "Free"}</strong>
        </div>

        <div style={styles.statRow}>
          <span style={styles.statLabel}>Credits</span>
          <strong style={styles.statValue}>{remainingCreditsText}</strong>
        </div>

        <div style={styles.statRow}>
          <span style={styles.statLabel}>Max Duration</span>
          <strong style={styles.statValue}>{user?.maxDurationSec ?? 10}s</strong>
        </div>

        <div style={styles.statRow}>
          <span style={styles.statLabel}>Language</span>
          <strong style={styles.statValue}>{language.toUpperCase()}</strong>
        </div>
      </div>

      <div style={styles.actionGroup}>
        <button
          type="button"
          style={styles.primaryAction}
          onClick={() => router.push("/billing")}
        >
          Manage Billing
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            style={styles.secondaryAction}
            onClick={handleLogout}
          >
            Log Out
          </button>
        ) : (
          <button
            type="button"
            style={styles.secondaryAction}
            onClick={() => router.push("/login")}
          >
            Log In
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div style={styles.mobileTopBar}>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            style={styles.mobileMenuButton}
            aria-label="Open menu"
          >
            ☰
          </button>

          <button
            type="button"
            onClick={() => router.push("/")}
            style={styles.mobileLogoButton}
            title="Home"
          >
            <div style={styles.mobileLogoImageWrap}>
              <Image
                src="/Dubleslogo.png"
                alt="Duble-S Technology"
                fill
                sizes="140px"
                style={{ objectFit: "contain" }}
              />
            </div>
          </button>

          <button
            type="button"
            style={styles.mobileBillingButton}
            onClick={() => router.push("/billing")}
          >
            Billing
          </button>
        </div>

        {mobileOpen ? (
          <>
            <div
              style={styles.mobileOverlay}
              onClick={() => setMobileOpen(false)}
            />

            <aside style={styles.mobileDrawer}>
              <div style={styles.mobileDrawerHeader}>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  style={styles.mobileDrawerLogoButton}
                  title="Home"
                >
                  <div style={styles.mobileDrawerLogoWrap}>
                    <Image
                      src="/Dubleslogo.png"
                      alt="Duble-S Technology"
                      fill
                      sizes="150px"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  style={styles.mobileCloseButton}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {navContent}
              {userPanel}
            </aside>
          </>
        ) : null}
      </>
    );
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.topBlock}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={styles.logoButton}
          title="Home"
        >
          <div style={styles.logoImageWrap}>
            <Image
              src="/Dubleslogo.png"
              alt="Duble-S Technology"
              fill
              sizes="170px"
              style={{ objectFit: "contain" }}
            />
          </div>
        </button>

        <div style={styles.brandTextWrap}>
          <div style={styles.companyName}>Duble-S Technology</div>
          <div style={styles.platformName}>Dublesmotion AI</div>
        </div>
      </div>

      {navContent}
      {userPanel}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 296,
    minWidth: 296,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "18px 16px",
    background:
      "linear-gradient(180deg, rgba(244,246,248,0.96) 0%, rgba(227,231,236,0.98) 100%)",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "inset -1px 0 0 rgba(255,255,255,0.55)",
    backdropFilter: "blur(14px)",
    zIndex: 40,
  },

  topBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },

  logoButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    justifyContent: "flex-start",
  },

  logoImageWrap: {
    position: "relative",
    width: 176,
    height: 52,
  },

  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  companyName: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    color: "#64748b",
    textTransform: "uppercase",
  },

  platformName: {
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: -0.3,
  },

  navSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#64748b",
    padding: "0 4px",
  },

  navGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  navButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 16,
    border: "1px solid transparent",
    background: "transparent",
    color: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    padding: "0 14px",
    cursor: "pointer",
    position: "relative",
    transition: "all 0.2s ease",
    textAlign: "left",
  },

  navButtonActive: {
    background: "linear-gradient(180deg, #ffffff 0%, #edf1f5 100%)",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#0f172a",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  },

  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(15,23,42,0.06)",
    fontSize: 14,
    flexShrink: 0,
  },

  navText: {
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.2,
  },

  badgeDot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#7c5cff",
    boxShadow: "0 0 0 4px rgba(124,92,255,0.14)",
  },

  userPanel: {
    marginTop: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingTop: 14,
    borderTop: "1px solid rgba(15,23,42,0.08)",
  },

  userPanelTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#64748b",
    padding: "0 4px",
  },

  userCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    background: "linear-gradient(180deg, #ffffff 0%, #edf1f5 100%)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  },

  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #8d96a3 0%, #bcc5cf 100%)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 18,
    flexShrink: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
  },

  userMeta: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: 3,
  },

  userName: {
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  userPlan: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 700,
  },

  userEmail: {
    fontSize: 11,
    color: "#64748b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  statsCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(15,23,42,0.08)",
  },

  statRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 700,
  },

  statValue: {
    fontSize: 12,
    color: "#0f172a",
    fontWeight: 900,
  },

  actionGroup: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 10,
  },

  primaryAction: {
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "linear-gradient(180deg, #ffffff 0%, #e7ebf0 100%)",
    color: "#0f172a",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
  },

  secondaryAction: {
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#ffffff",
    color: "#334155",
    fontWeight: 800,
    cursor: "pointer",
  },

  mobileTopBar: {
    position: "sticky",
    top: 0,
    zIndex: 60,
    width: "100%",
    height: 70,
    padding: "10px 14px",
    background: "rgba(244,246,248,0.94)",
    backdropFilter: "blur(14px)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  mobileMenuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
  },

  mobileLogoButton: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
  },

  mobileLogoImageWrap: {
    position: "relative",
    width: 140,
    height: 42,
  },

  mobileBillingButton: {
    height: 42,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  mobileOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.36)",
    zIndex: 69,
  },

  mobileDrawer: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    maxWidth: "88vw",
    background:
      "linear-gradient(180deg, rgba(244,246,248,0.98) 0%, rgba(227,231,236,1) 100%)",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
    zIndex: 70,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
  },

  mobileDrawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  mobileDrawerLogoButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },

  mobileDrawerLogoWrap: {
    position: "relative",
    width: 156,
    height: 44,
  },

  mobileCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#0f172a",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
  },
};