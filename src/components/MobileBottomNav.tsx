"use client";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";

const items: { key: NavKey; label: string; icon: string }[] = [
  { key: "tool", label: "Tool", icon: "⌘" },
  { key: "apps", label: "Apps", icon: "◫" },
  { key: "chat", label: "Chat", icon: "✦" },
  { key: "live", label: "Live", icon: "◉" },
  { key: "flow", label: "Flow", icon: "⇄" },
];

export default function MobileBottomNav({
  activeKey,
  onSelect,
}: {
  activeKey: NavKey;
  onSelect: (key: NavKey) => void;
}) {
  return (
    <nav style={styles.nav} className="mobile-only">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          style={{
            ...styles.item,
            ...(item.key === activeKey ? styles.itemActive : {}),
          }}
        >
          <span style={styles.icon}>{item.icon}</span>
          <span style={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: "fixed",
    left: 12,
    right: 12,
    bottom: 12,
    height: 64,
    borderRadius: 20,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.08)",
    backdropFilter: "blur(14px)",
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    zIndex: 60,
    padding: 6,
    boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
  },

  item: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    cursor: "pointer",
  },

  itemActive: {
    background: "#ffffff",
    color: "#0f172a",
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  },

  icon: {
    fontSize: 16,
    lineHeight: 1,
  },

  label: {
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.1,
  },
};