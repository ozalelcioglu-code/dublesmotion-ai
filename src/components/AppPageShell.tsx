"use client";

import React from "react";
import AppSidebar from "./AppSidebar";

export default function AppPageShell({
  title,
  subtitle,
  children,
  rightSlot,
  showSidebar = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  showSidebar?: boolean;
}) {
  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f6f8ff",
      color: "#0f172a",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
    } as React.CSSProperties,

    layout: {
      display: "grid",
      gridTemplateColumns: showSidebar ? "76px 1fr" : "1fr",
      minHeight: "100vh",
    } as React.CSSProperties,

    main: {
      padding: 22,
      background:
        "radial-gradient(1000px 500px at 15% -10%, rgba(59,130,246,0.08), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(139,92,246,0.08), transparent 55%), linear-gradient(180deg, #f8fbff 0%, #f5f7ff 100%)",
    } as React.CSSProperties,

    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      marginBottom: 18,
      flexWrap: "wrap",
    } as React.CSSProperties,

    titleWrap: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 6,
    } as React.CSSProperties,

    title: {
      margin: 0,
      fontSize: 28,
      lineHeight: 1.1,
      fontWeight: 900,
      color: "#0f172a",
    } as React.CSSProperties,

    subtitle: {
      margin: 0,
      fontSize: 14,
      color: "#64748b",
      lineHeight: 1.5,
    } as React.CSSProperties,

    right: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        {showSidebar ? <AppSidebar activeKey="tool" onSelect={() => {}} /> : null}

        <main style={styles.main}>
          <div style={styles.header}>
            <div style={styles.titleWrap}>
              <h1 style={styles.title}>{title}</h1>
              {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
            </div>

            {rightSlot ? <div style={styles.right}>{rightSlot}</div> : null}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}