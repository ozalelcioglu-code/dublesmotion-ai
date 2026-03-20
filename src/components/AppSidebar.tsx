"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useSession } from "../provider/SessionProvider";
import { useLanguage } from "../provider/LanguageProvider";
import type { AppLanguage } from "../lib/i18n";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";

type NavItem = {
  key: NavKey;
  label: string;
  icon: string;
  badge?: boolean;
};

const LANGUAGE_FLAGS: Record<AppLanguage, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  de: "🇩🇪",
};

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
};

const LANGUAGE_OPTIONS: AppLanguage[] = ["tr", "en", "de"];

function getSidebarText(language: string) {
  const tr = {
    brand: "DUBLE-S MOTION",
    tool: "Araç",
    apps: "Uygulamalar",
    chat: "Destek",
    flow: "Akış",
    live: "Canlı",
    userPanel: "KULLANICI PANELİ",
    guestUser: "Misafir",
    guestPlan: "Ücretsiz Üye",
    plan: "Plan",
    credits: "Kredi",
    unlimited: "Sınırsız",
    manageBilling: "Faturayı Yönet",
    editProfile: "Profili Düzenle",
    language: "Dil",
    signOut: "Çıkış Yap",
    logIn: "Giriş Yap",
    billing: "Fatura",
  };

  const de = {
    brand: "DUBLE-S MOTION",
    tool: "Tool",
    apps: "Apps",
    chat: "Support",
    flow: "Ablauf",
    live: "Live",
    userPanel: "BENUTZERBEREICH",
    guestUser: "Gast",
    guestPlan: "Free Mitglied",
    plan: "Plan",
    credits: "Credits",
    unlimited: "Unbegrenzt",
    manageBilling: "Billing verwalten",
    editProfile: "Profil bearbeiten",
    language: "Sprache",
    signOut: "Abmelden",
    logIn: "Anmelden",
    billing: "Billing",
  };

  const en = {
    brand: "DUBLE-S MOTION",
    tool: "Tool",
    apps: "Apps",
    chat: "Support",
    flow: "Flow",
    live: "Live",
    userPanel: "USER PANEL",
    guestUser: "Guest",
    guestPlan: "Free Member",
    plan: "Plan",
    credits: "Credits",
    unlimited: "Unlimited",
    manageBilling: "Manage Billing",
    editProfile: "Edit Profile",
    language: "Language",
    signOut: "Sign Out",
    logIn: "Log In",
    billing: "Billing",
  };

  if (language === "tr") return tr;
  if (language === "de") return de;
  return en;
}

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
  const { language, setLanguage } = useLanguage();

  const ui = getSidebarText(language);

  const navItems: NavItem[] = [
    { key: "tool", label: ui.tool, icon: "⌘" },
    { key: "apps", label: ui.apps, icon: "◫" },
    { key: "chat", label: ui.chat, icon: "✦" },
    { key: "flow", label: ui.flow, icon: "⇄" },
    { key: "live", label: ui.live, icon: "◉", badge: true },
  ];

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 980);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setLanguageMenuOpen(false);
  }, [pathname, activeKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!languageMenuRef.current) return;
      if (!languageMenuRef.current.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userInitial = useMemo(() => {
    return (user?.name?.[0] || user?.email?.[0] || "A").toUpperCase();
  }, [user?.name, user?.email]);

  const remainingCreditsText =
    user?.remainingCredits === null
      ? ui.unlimited
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

  const handleLanguageSelect = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  };

  const navContent = (
    <div style={styles.navList}>
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
            <span style={styles.navButtonIcon}>{item.icon}</span>
            <span style={styles.navButtonLabel}>{item.label}</span>
            {item.badge ? <span style={styles.badgeDot} /> : null}
          </button>
        );
      })}
    </div>
  );

  const userPanel = (
    <div style={styles.userPanelWrap}>
      <div style={styles.userPanelHeader}>{ui.userPanel}</div>

      <div style={styles.profileCard}>
        <div style={styles.profileAvatar}>{userInitial}</div>

        <div style={styles.profileMeta}>
          <div style={styles.profileName}>
            {isAuthenticated ? user?.name || ui.guestUser : ui.guestUser}
          </div>
          <div style={styles.profilePlan}>
            {user?.planLabel || ui.guestPlan}
          </div>
        </div>
      </div>

      <div style={styles.infoLine}>
        <span style={styles.infoArrow}>▸</span>
        <span style={styles.infoText}>
          {ui.plan}: <strong>{user?.planLabel || "Free"}</strong>
        </span>
      </div>

      <div style={styles.infoLine}>
        <span style={styles.infoArrow}>▸</span>
        <span style={styles.infoText}>
          {ui.credits}: <strong>{remainingCreditsText}</strong>
        </span>
      </div>

      <button
        type="button"
        style={styles.sidebarActionButton}
        onClick={() => router.push("/billing")}
      >
        <span>{ui.manageBilling}</span>
        <span style={styles.buttonChevron}>›</span>
      </button>

      <button
        type="button"
        style={styles.sidebarActionButton}
        onClick={() => router.push("/profile")}
      >
        <span>{ui.editProfile}</span>
        <span style={styles.buttonChevron}>›</span>
      </button>

      <div style={styles.languageRow}>
        <div style={styles.languageLabelWrap}>
          <span style={styles.languageIcon}>🌐</span>
          <span style={styles.languageLabel}>{ui.language}</span>
        </div>
        <div style={styles.languagePower}>⏻</div>
      </div>

      <div style={styles.languageSelectWrap} ref={languageMenuRef}>
        <button
          type="button"
          style={styles.languageSelect}
          onClick={() => setLanguageMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={languageMenuOpen}
        >
          <span style={styles.flag}>{LANGUAGE_FLAGS[language]}</span>
          <span style={styles.languageSelectText}>
            {LANGUAGE_LABELS[language]}
          </span>
          <span style={styles.languageCaret}>{languageMenuOpen ? "⌃" : "⌄"}</span>
        </button>

        {languageMenuOpen ? (
          <div style={styles.languageMenu}>
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = option === language;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleLanguageSelect(option)}
                  style={{
                    ...styles.languageOption,
                    ...(selected ? styles.languageOptionActive : {}),
                  }}
                >
                  <span style={styles.flag}>{LANGUAGE_FLAGS[option]}</span>
                  <span style={styles.languageOptionText}>
                    {LANGUAGE_LABELS[option]}
                  </span>
                  {selected ? (
                    <span style={styles.languageOptionCheck}>✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        style={styles.signOutButton}
        onClick={isAuthenticated ? handleLogout : () => router.push("/login")}
      >
        {isAuthenticated ? ui.signOut : ui.logIn}
      </button>
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
            <div style={styles.mobileLogoText}>{ui.brand}</div>
          </button>

          <button
            type="button"
            style={styles.mobileBillingButton}
            onClick={() => router.push("/billing")}
          >
            {ui.billing}
          </button>
        </div>

        {mobileOpen ? (
          <>
            <div
              style={styles.mobileOverlay}
              onClick={() => setMobileOpen(false)}
            />
            <aside style={styles.mobileDrawer}>
              <div style={styles.mobileDrawerTop}>
                <div style={styles.mobileDrawerBrand}>{ui.brand}</div>

                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  style={styles.mobileCloseButton}
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
      <div style={styles.topBrandArea}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={styles.brandButton}
          title="Home"
        >
          <div style={styles.brandTitle}>{ui.brand}</div>
        </button>
      </div>

      {navContent}
      {userPanel}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 280,
    minWidth: 280,
    height: "100vh",
    position: "sticky",
    top: 0,
    display: "flex",
    flexDirection: "column",
    background:
      "linear-gradient(180deg, #dfe3e8 0%, #cfd5dc 42%, #bcc4cd 100%)",
    borderRight: "1px solid rgba(15,23,42,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.7), 4px 0 18px rgba(15,23,42,0.06)",
    zIndex: 40,
    overflow: "hidden",
  },

  topBrandArea: {
    padding: "18px 18px 16px",
    borderBottom: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(240,243,247,0.96) 0%, rgba(214,220,227,0.96) 100%)",
  },

  brandButton: {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },

  brandTitle: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 0.5,
    color: "#4b5563",
  },

  navList: {
    padding: "14px 0 0",
    display: "flex",
    flexDirection: "column",
  },

  navButton: {
    position: "relative",
    width: "100%",
    minHeight: 66,
    border: "none",
    borderTop: "1px solid rgba(255,255,255,0.5)",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    background:
      "linear-gradient(180deg, rgba(236,239,243,0.94) 0%, rgba(212,218,226,0.94) 100%)",
    color: "#4b5563",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 24px",
    cursor: "pointer",
    textAlign: "left",
  },

  navButtonActive: {
    background:
      "linear-gradient(180deg, rgba(245,247,250,0.98) 0%, rgba(218,224,232,0.98) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 10px rgba(104,130,175,0.10)",
    color: "#374151",
  },

  navButtonIcon: {
    width: 28,
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 22,
    color: "#6b7280",
    flexShrink: 0,
  },

  navButtonLabel: {
    fontSize: 18,
    fontWeight: 700,
  },

  badgeDot: {
    position: "absolute",
    right: 22,
    top: "50%",
    transform: "translateY(-50%)",
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#8aa7d3",
    boxShadow: "0 0 0 4px rgba(138,167,211,0.16)",
  },

  userPanelWrap: {
    marginTop: "auto",
    paddingTop: 12,
    borderTop: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(214,220,227,0.98) 0%, rgba(191,199,208,0.98) 100%)",
  },

  userPanelHeader: {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 800,
    color: "#6b7280",
    letterSpacing: 0.4,
    borderBottom: "1px solid rgba(255,255,255,0.45)",
    borderTop: "1px solid rgba(15,23,42,0.08)",
  },

  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 18px",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },

  profileAvatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #7a8088 0%, #626973 100%)",
    color: "#fff",
    fontWeight: 800,
    fontSize: 28,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(15,23,42,0.12)",
    flexShrink: 0,
  },

  profileMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },

  profileName: {
    fontSize: 17,
    fontWeight: 800,
    color: "#374151",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  profilePlan: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: 600,
  },

  infoLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    borderTop: "1px solid rgba(255,255,255,0.35)",
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    color: "#4b5563",
  },

  infoArrow: {
    fontSize: 14,
    color: "#6b7280",
    flexShrink: 0,
  },

  infoText: {
    fontSize: 16,
    lineHeight: 1.2,
  },

  sidebarActionButton: {
    margin: "12px 18px 0",
    minHeight: 48,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
  },

  buttonChevron: {
    fontSize: 24,
    lineHeight: 1,
    color: "#6b7280",
  },

  languageRow: {
    marginTop: 14,
    padding: "12px 18px",
    borderTop: "1px solid rgba(255,255,255,0.35)",
    borderBottom: "1px solid rgba(15,23,42,0.06)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  languageLabelWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  languageIcon: {
    fontSize: 22,
  },

  languageLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: "#4b5563",
  },

  languagePower: {
    fontSize: 24,
    color: "#8b949e",
  },

  languageSelectWrap: {
    position: "relative",
    margin: "14px 18px 0",
  },

  languageSelect: {
    width: "100%",
    minHeight: 48,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    fontSize: 15,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
  },

  flag: {
    fontSize: 22,
    flexShrink: 0,
  },

  languageSelectText: {
    flex: 1,
    textAlign: "left",
  },

  languageCaret: {
    fontSize: 20,
    color: "#6b7280",
  },

  languageMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 8px)",
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(247,249,252,0.99) 0%, rgba(223,229,236,0.99) 100%)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.14)",
    zIndex: 100,
  },

  languageOption: {
    width: "100%",
    minHeight: 46,
    border: "none",
    borderBottom: "1px solid rgba(15,23,42,0.08)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    cursor: "pointer",
    color: "#374151",
    fontSize: 15,
    fontWeight: 700,
    textAlign: "left",
  },

  languageOptionActive: {
    background: "rgba(138,167,211,0.14)",
  },

  languageOptionText: {
    flex: 1,
  },

  languageOptionCheck: {
    fontSize: 16,
    color: "#4b5563",
    fontWeight: 800,
  },

  signOutButton: {
    margin: "18px 18px 18px",
    minHeight: 50,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "linear-gradient(180deg, #6f7781 0%, #555d67 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 17,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 10px rgba(15,23,42,0.10)",
  },

  mobileTopBar: {
    position: "sticky",
    top: 0,
    zIndex: 60,
    width: "100%",
    height: 68,
    padding: "10px 12px",
    background:
      "linear-gradient(180deg, rgba(240,243,247,0.98) 0%, rgba(214,220,227,0.98) 100%)",
    borderBottom: "1px solid rgba(15,23,42,0.12)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  mobileMenuButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
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

  mobileLogoText: {
    fontSize: 18,
    fontWeight: 800,
    color: "#4b5563",
  },

  mobileBillingButton: {
    minWidth: 76,
    height: 42,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  mobileOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.35)",
    zIndex: 69,
  },

  mobileDrawer: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: 310,
    maxWidth: "88vw",
    background:
      "linear-gradient(180deg, #dfe3e8 0%, #cfd5dc 42%, #bcc4cd 100%)",
    borderRight: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "8px 0 30px rgba(15,23,42,0.18)",
    zIndex: 70,
    overflowY: "auto",
  },

  mobileDrawerTop: {
    minHeight: 72,
    padding: "18px 18px 16px",
    borderBottom: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(240,243,247,0.96) 0%, rgba(214,220,227,0.96) 100%)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },

  mobileDrawerBrand: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: 0.5,
    color: "#4b5563",
  },

  mobileCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 800,
    cursor: "pointer",
    flexShrink: 0,
  },
};