"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { useLanguage } from "../../provider/LanguageProvider";
import { useSession } from "../../provider/SessionProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { refreshSession } = useSession();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const session = await authClient.getSession();

        if (!cancelled && session?.data?.session) {
          router.replace("/");
          router.refresh();
        }
      } catch (error) {
        console.warn("Login page session check skipped:", error);
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (result.error) {
          setMsg(result.error.message || t.auth.signupFailed);
        } else {
          await refreshSession();
          router.replace("/");
          router.refresh();
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setMsg(result.error.message || t.auth.loginFailed);
        } else {
          await refreshSession();
          router.replace("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      setMsg(err?.message || t.auth.authFailed);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      background:
        "linear-gradient(135deg, #f8fbff 0%, #eef4ff 38%, #f7f2ff 100%)",
      color: "#0f172a",
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      position: "relative" as const,
      overflow: "hidden",
    } as React.CSSProperties,

    backgroundGlowA: {
      position: "absolute" as const,
      top: -120,
      left: -80,
      width: 420,
      height: 420,
      borderRadius: "50%",
      background: "rgba(109,93,252,0.12)",
      filter: "blur(60px)",
      pointerEvents: "none" as const,
    } as React.CSSProperties,

    backgroundGlowB: {
      position: "absolute" as const,
      top: 40,
      right: -80,
      width: 360,
      height: 360,
      borderRadius: "50%",
      background: "rgba(77,182,255,0.14)",
      filter: "blur(56px)",
      pointerEvents: "none" as const,
    } as React.CSSProperties,

    hero: {
      padding: "48px 42px",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      gap: 24,
      borderRight: "1px solid rgba(15,23,42,0.08)",
      position: "relative" as const,
      zIndex: 1,
    } as React.CSSProperties,

    heroLogo: {
      display: "flex",
      alignItems: "center",
      gap: 14,
    } as React.CSSProperties,

    logo: {
      width: 64,
      height: 64,
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid rgba(15,23,42,0.08)",
      boxShadow: "0 16px 40px rgba(15,23,42,0.12)",
      background: "#fff",
    } as React.CSSProperties,

    heroTitle: {
      fontSize: 46,
      fontWeight: 950,
      lineHeight: 1.06,
      letterSpacing: -1.2,
      margin: 0,
      maxWidth: 620,
      color: "#0f172a",
    } as React.CSSProperties,

    heroText: {
      fontSize: 15,
      lineHeight: 1.7,
      color: "#64748b",
      maxWidth: 620,
    } as React.CSSProperties,

    featureList: {
      display: "grid",
      gap: 12,
      maxWidth: 560,
    } as React.CSSProperties,

    featureItem: {
      padding: "14px 16px",
      borderRadius: 16,
      background: "rgba(255,255,255,0.72)",
      border: "1px solid rgba(15,23,42,0.08)",
      color: "#334155",
      fontWeight: 700,
      boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    } as React.CSSProperties,

    authWrap: {
      padding: 24,
      display: "grid",
      placeItems: "center",
      position: "relative" as const,
      zIndex: 1,
    } as React.CSSProperties,

    card: {
      width: "100%",
      maxWidth: 460,
      background: "rgba(255,255,255,0.82)",
      border: "1px solid rgba(15,23,42,0.08)",
      borderRadius: 24,
      padding: 24,
      boxShadow: "0 18px 44px rgba(15,23,42,0.10)",
      backdropFilter: "blur(12px)",
    } as React.CSSProperties,

    cardTitle: {
      fontSize: 28,
      fontWeight: 900,
      margin: 0,
      color: "#0f172a",
    } as React.CSSProperties,

    sub: {
      marginTop: 8,
      color: "#64748b",
      fontSize: 14,
      lineHeight: 1.6,
    } as React.CSSProperties,

    tabs: {
      display: "flex",
      gap: 10,
      marginTop: 20,
      marginBottom: 18,
    } as React.CSSProperties,

    tab: (active: boolean) =>
      ({
        flex: 1,
        padding: "12px 14px",
        borderRadius: 14,
        border: active
          ? "1px solid transparent"
          : "1px solid rgba(15,23,42,0.08)",
        background: active
          ? "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)"
          : "#ffffff",
        color: active ? "#fff" : "#334155",
        cursor: "pointer",
        fontWeight: 800,
        boxShadow: active ? "0 12px 24px rgba(77,182,255,0.16)" : "none",
      }) as React.CSSProperties,

    field: {
      display: "grid",
      gap: 8,
      marginBottom: 14,
    } as React.CSSProperties,

    label: {
      fontSize: 12,
      fontWeight: 800,
      color: "#475569",
      textTransform: "uppercase" as const,
    } as React.CSSProperties,

    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.08)",
      background: "#ffffff",
      color: "#0f172a",
      outline: "none",
      boxShadow: "inset 0 1px 2px rgba(15,23,42,0.02)",
    } as React.CSSProperties,

    button: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: 14,
      border: "1px solid transparent",
      background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 900,
      marginTop: 8,
      boxShadow: "0 14px 28px rgba(77,182,255,0.18)",
    } as React.CSSProperties,

    msg: {
      marginTop: 12,
      fontSize: 13,
      color: "#dc2626",
      lineHeight: 1.5,
      background: "rgba(254,226,226,0.9)",
      border: "1px solid rgba(239,68,68,0.16)",
      borderRadius: 12,
      padding: "10px 12px",
    } as React.CSSProperties,

    mobileNote: {
      fontSize: 12,
      color: "#64748b",
      marginTop: 10,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={styles.backgroundGlowA} />
      <div style={styles.backgroundGlowB} />

      <section style={styles.hero}>
        <div style={styles.heroLogo}>
          <div style={styles.logo}>
            <img
              src="/Professional Emblem Logo in Blue and Silver.png"
              alt="Duble-S Motion AI"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
              Duble-S Motion AI
            </div>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              {t.header.workspace}
            </div>
          </div>
        </div>

        <h1 style={styles.heroTitle}>{t.auth.title}</h1>
        <div style={styles.heroText}>{t.auth.description}</div>

        <div style={styles.featureList}>
          <div style={styles.featureItem}>{t.auth.feature1}</div>
          <div style={styles.featureItem}>{t.auth.feature2}</div>
          <div style={styles.featureItem}>{t.auth.feature3}</div>
        </div>
      </section>

      <section style={styles.authWrap}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            {mode === "login" ? t.auth.welcomeBack : t.auth.createNewAccount}
          </h2>

          <div style={styles.sub}>{t.auth.subtitle}</div>

          <div style={styles.tabs}>
            <button
              type="button"
              style={styles.tab(mode === "login")}
              onClick={() => setMode("login")}
            >
              {t.common.login}
            </button>

            <button
              type="button"
              style={styles.tab(mode === "signup")}
              onClick={() => setMode("signup")}
            >
              {t.common.signup}
            </button>
          </div>

          <form onSubmit={onSubmit}>
            {mode === "signup" && (
              <div style={styles.field}>
                <div style={styles.label}>{t.auth.fullName}</div>
                <input
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div style={styles.field}>
              <div style={styles.label}>{t.auth.email}</div>
              <input
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>{t.auth.password}</div>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
              />
            </div>

            <button style={styles.button} type="submit" disabled={loading}>
              {loading
                ? t.auth.pleaseWait
                : mode === "login"
                ? t.common.login
                : t.auth.createAccount}
            </button>
          </form>

          {msg ? <div style={styles.msg}>{msg}</div> : null}

          <div style={styles.mobileNote}>
            Giriş yaptıktan sonra ana ekrana yönlendirilirsin.
          </div>
        </div>
      </section>
    </div>
  );
}