"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  getCommonI18n,
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  type AppLanguage,
} from "@/lib/i18n";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";
import { useIsMobile } from "@/lib/useIsMobile";

type AppShellProps = {
  currentPath?: string;
  pageTitle?: string;
  pageDescription?: string;
  children: ReactNode;
};

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 3v6h6" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function AppShell({
  currentPath,
  pageTitle,
  pageDescription,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, availableLanguages } = useLanguage();
  const { user, isAuthenticated, signOut } = useSession();
  const isMobile = useIsMobile(900);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const common = getCommonI18n(language);

  const activePath = currentPath || pathname || "/chat";

  const remainingCredits = user?.remainingCredits ?? 0;
  const monthlyCredits = user?.monthlyCredits ?? null;
  const usedThisMonth =
    typeof user?.usedThisMonth === "number"
      ? user.usedThisMonth
      : typeof monthlyCredits === "number"
      ? Math.max(0, monthlyCredits - remainingCredits)
      : 0;

  const navItems = useMemo(
    () => [
      { href: "/chat", label: common.nav.chat },
      { href: "/music", label: common.nav.music },
      { href: "/text-to-image", label: common.nav.textToImage },
      { href: "/text-to-video", label: common.nav.textToVideo },
      { href: "/image-to-video", label: common.nav.imageToVideo },
      { href: "/video-clone", label: common.nav.videoClone },
      { href: "/history", label: common.nav.history },
      { href: "/editor", label: common.nav.editor },
      { href: "/billing", label: common.nav.billing },
    ],
    [common]
  );

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      console.error(error);
    } finally {
      router.push("/login");
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div
          style={{
            ...styles.headerInner,
            ...(isMobile ? styles.headerInnerMobile : null),
          }}
        >
          <div
            style={{
              ...styles.topRow,
              ...(isMobile ? styles.topRowMobile : null),
            }}
          >
            <div style={styles.leftZone}>
              <Link href="/chat" style={styles.brand}>
                <div style={styles.logoWrap}>
                  <img src="/dubles-logo.png" alt={common.appName} style={styles.logo} />
                </div>

                <div style={styles.brandText}>
                  <div style={styles.brandTitle}>{common.appName}</div>
                  {!isMobile ? (
                    <div style={styles.brandSubtitle}>{common.appSubtitle}</div>
                  ) : null}
                </div>
              </Link>
            </div>

            <div
              style={{
                ...styles.centerZone,
                ...(isMobile ? styles.hideOnMobile : null),
              }}
            >
              <nav style={styles.nav}>
                {navItems.map((item) => {
                  const active =
                    activePath === item.href ||
                    (item.href !== "/chat" && activePath.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        ...styles.navLink,
                        ...(active ? styles.navLinkActive : null),
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div
              style={{
                ...styles.rightZone,
                ...(isMobile ? styles.rightZoneMobile : null),
              }}
            >
              <div
                style={{
                  ...styles.languageArea,
                  ...(isMobile ? styles.languageAreaMobile : null),
                }}
              >
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                  style={styles.languageSelect}
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang]}
                    </option>
                  ))}
                </select>

                <img
                  src={LANGUAGE_FLAGS[language]}
                  alt={language}
                  style={styles.flag}
                />
              </div>

              {!isMobile ? (
                <>
                  <Link href="/history" style={styles.iconLink} title={common.nav.history}>
                    <HistoryIcon />
                  </Link>

                  <Link href="/billing" style={styles.iconLink} title={common.nav.billing}>
                    <BillingIcon />
                  </Link>

                  <div style={styles.userArea}>
                    <div style={styles.userIcon}>
                      <UserIcon />
                    </div>

                    <div style={styles.userText}>
                      <div style={styles.userMainLine}>
                        <div style={styles.userName}>
                          {user?.name || user?.email?.split("@")[0] || common.user.guest}
                        </div>

                        <div style={styles.planText}>
                          {user?.planLabel || common.user.freePlan}
                        </div>
                      </div>

                      <div style={styles.userMeta}>
                        <span style={styles.creditText}>
                          Kalan: {remainingCredits}
                        </span>
                        <span style={styles.metaDot}>•</span>
                        <span style={styles.creditText}>
                          Harcanan: {usedThisMonth}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={styles.logoutButton}
                  title={common.user.logout}
                >
                  <LogoutIcon />
                </button>
              ) : null}

              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  style={styles.mobileMenuButton}
                  aria-expanded={mobileNavOpen}
                >
                  Menu
                </button>
              ) : null}
            </div>
          </div>

          {isMobile && mobileNavOpen ? (
            <nav style={styles.mobileNav}>
              {navItems.map((item) => {
                const active =
                  activePath === item.href ||
                  (item.href !== "/chat" && activePath.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    style={{
                      ...styles.mobileNavLink,
                      ...(active ? styles.mobileNavLinkActive : null),
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </header>

      <main
        style={{
          ...styles.main,
          ...(isMobile ? styles.mainMobile : null),
        }}
      >
        {activePath !== "/chat" && (pageTitle || pageDescription) ? (
          <div style={styles.pageIntro}>
            {pageTitle ? <h1 style={styles.pageTitle}>{pageTitle}</h1> : null}
            {pageDescription ? (
              <p style={styles.pageDescription}>{pageDescription}</p>
            ) : null}
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#f7f7f8",
    color: "#202123",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    background: "#f7f7f8",
    borderBottom: "1px solid #e5e7eb",
  },

  headerInner: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 24px 12px",
    boxSizing: "border-box",
  },

  headerInnerMobile: {
    padding: "10px 12px",
  },

  topRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 20,
    width: "100%",
  },

  topRowMobile: {
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
  },

  leftZone: {
    display: "flex",
    justifyContent: "flex-start",
    minWidth: 0,
  },

  centerZone: {
    display: "flex",
    justifyContent: "center",
    minWidth: 0,
  },

  rightZone: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flexWrap: "wrap",
  },

  rightZoneMobile: {
    gap: 6,
    flexWrap: "nowrap",
  },

  hideOnMobile: {
    display: "none",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "inherit",
  },

  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    background: "#fff",
    flexShrink: 0,
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  brandText: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  brandTitle: {
    fontSize: 17,
    fontWeight: 600,
    lineHeight: 1.1,
    color: "#111827",
  },

  brandSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 400,
  },

  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    flexWrap: "wrap",
  },

  navLink: {
    textDecoration: "none",
    color: "#374151",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },

  navLinkActive: {
    color: "#2563eb",
  },

  languageArea: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 10px",
    height: 36,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
  },

  languageAreaMobile: {
    maxWidth: 118,
    padding: "0 8px",
  },

  mobileMenuButton: {
    height: 36,
    padding: "0 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#fff",
    color: "#111827",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  mobileNav: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #e5e7eb",
  },

  mobileNavLink: {
    minHeight: 38,
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "0 10px",
    fontSize: 13,
    fontWeight: 600,
  },

  mobileNavLinkActive: {
    borderColor: "#bfdbfe",
    background: "#eff6ff",
    color: "#2563eb",
  },

  languageSelect: {
    border: "none",
    background: "transparent",
    outline: "none",
    fontSize: 13,
    color: "#111827",
    fontWeight: 400,
    cursor: "pointer",
    minWidth: 0,
  },

  flag: {
    width: 18,
    height: 18,
    borderRadius: 999,
    objectFit: "cover",
    border: "1px solid rgba(0,0,0,0.08)",
  },

  iconLink: {
    width: 36,
    height: 36,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    background: "#fff",
    color: "#4b5563",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minHeight: 36,
    padding: "0 6px 0 2px",
  },

  userIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#4b5563",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  userText: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    alignItems: "flex-start",
  },

  userMainLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexWrap: "wrap",
  },

  userName: {
    fontSize: 13,
    color: "#111827",
    fontWeight: 500,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 140,
  },

  userMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    flexWrap: "wrap",
  },

  planText: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: 600,
  },

  creditText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: 500,
  },

  metaDot: {
    fontSize: 11,
    color: "#9ca3af",
    lineHeight: 1,
  },

  logoutButton: {
    width: 36,
    height: 36,
    border: "1px solid #fecaca",
    borderRadius: 12,
    background: "#fff",
    color: "#ef4444",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  main: {
    width: "100%",
    maxWidth: "100%",
    padding: "14px 24px 24px",
    boxSizing: "border-box",
  },

  mainMobile: {
    padding: "12px",
  },

  pageIntro: {
    marginBottom: 14,
  },

  pageTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.2,
  },

  pageDescription: {
    margin: "4px 0 0",
    fontSize: 14,
    lineHeight: 1.55,
    color: "#4b5563",
    fontWeight: 400,
  },
};
