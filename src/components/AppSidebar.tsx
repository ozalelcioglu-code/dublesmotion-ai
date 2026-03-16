"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";

type NavItem = {
  key: NavKey | "menu";
  label: string;
  icon: string;
  badge?: boolean;
};

const topItems: NavItem[] = [
  { key: "menu", label: "Menu", icon: "☰" },
  { key: "tool", label: "Tool", icon: "⌘" },
  { key: "apps", label: "App", icon: "◫" },
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

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth <= 980);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, activeKey]);

  const handleTopClick = (key: NavKey | "menu") => {
    if (key === "menu") {
      if (isMobile) {
        setMobileOpen((prev) => !prev);
        return;
      }
      router.push("/");
      return;
    }

    if (pathname === "/") {
      onSelect?.(key);
      if (isMobile) setMobileOpen(false);
      return;
    }

    if (key === "tool") {
      router.push("/");
      if (isMobile) setMobileOpen(false);
      return;
    }

    router.push(`/?tab=${key}`);
    if (isMobile) setMobileOpen(false);
  };

  const navContent = (
    <div style={styles.navGroup}>
      {topItems
        .filter((item) => (isMobile ? item.key !== "menu" : true))
        .map((item) => {
          const isActive = item.key !== "menu" && item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() => handleTopClick(item.key)}
              style={{
                ...styles.navButton,
                ...(isMobile ? styles.navButtonMobile : {}),
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
                sizes="120px"
                style={{ objectFit: "contain" }}
              />
            </div>
          </button>

          <button
            type="button"
            style={styles.mobilePlanButton}
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
                      sizes="140px"
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
            </aside>
          </>
        ) : null}
      </>
    );
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoWrap}>
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
              sizes="42px"
              style={{ objectFit: "contain" }}
            />
          </div>
        </button>
      </div>

      {navContent}
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "82px",
    minWidth: "82px",
    height: "100vh",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(246,249,255,0.92) 100%)",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "14px 10px 16px",
    position: "sticky",
    top: 0,
    backdropFilter: "blur(14px)",
    zIndex: 40,
  },

  logoWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    paddingTop: 4,
  },

  logoButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },

  logoImageWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 10px 30px rgba(76,121,255,0.16)",
  },

  navGroup: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    marginTop: 14,
    flex: 1,
    paddingTop: 8,
  },

  navButton: {
    width: 56,
    minHeight: 56,
    borderRadius: 16,
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    cursor: "pointer",
    position: "relative",
  },

  navButtonMobile: {
    width: "100%",
    minHeight: 54,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "flex-start",
    padding: "0 14px",
    gap: 10,
  },

  navButtonActive: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#0f172a",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
  },

  navIcon: {
    fontSize: 18,
    lineHeight: 1,
  },

  navText: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.1,
  },

  badgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#7c5cff",
    boxShadow: "0 0 0 4px rgba(124,92,255,0.15)",
  },

  mobileTopBar: {
    position: "sticky",
    top: 0,
    zIndex: 60,
    width: "100%",
    height: 68,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.92)",
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
    width: 132,
    height: 40,
  },

  mobilePlanButton: {
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
    width: 280,
    maxWidth: "82vw",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,249,255,0.98) 100%)",
    borderRight: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
    zIndex: 70,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  mobileDrawerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  mobileDrawerLogoButton: {
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },

  mobileDrawerLogoWrap: {
    position: "relative",
    width: 150,
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