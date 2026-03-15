"use client";

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

  const handleTopClick = (key: NavKey | "menu") => {
    if (key === "menu") {
      router.push("/");
      return;
    }

    if (pathname === "/") {
      onSelect?.(key);
      return;
    }

    if (key === "tool") {
      router.push("/");
      return;
    }

    router.push(`/?tab=${key}`);
  };

  return (
    <aside style={styles.sidebar} className="desktop-only">
      <div style={styles.logoWrap}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={styles.logoButton}
          title="Home"
        >
          <div style={styles.logo}>D</div>
        </button>
      </div>

      <div style={styles.navGroup}>
        {topItems.map((item) => {
          const isActive = item.key !== "menu" && item.key === activeKey;

          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() => handleTopClick(item.key)}
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
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "76px",
    minWidth: "76px",
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

  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: 900,
    background:
      "linear-gradient(135deg, rgba(106,90,255,1) 0%, rgba(74,201,255,1) 100%)",
    boxShadow: "0 10px 30px rgba(76,121,255,0.28)",
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
    width: 54,
    minHeight: 54,
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
};