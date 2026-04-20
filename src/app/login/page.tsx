"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";
import { getCommonI18n } from "@/lib/i18n";

const LOGIN_TEXTS = {
  tr: {
    heroBadge: "AI Creative Platform",
    welcomeBack: "Tekrar hoş geldin",
    heroText:
      "Sohbet, müzik, görsel, video ve editör modüllerine tek hesapla eriş. Platform içi geçmişini ve üretim akışını koru.",
    features: {
      chat: "Duble-S Chat erişimi",
      flow: "Modüller arası akıllı yönlendirme",
      history: "History + Editor bağlantısı",
    },
    formSub: "Hesabına giriş yap ve kaldığın yerden devam et.",
    email: "E-posta",
    emailPlaceholder: "ornek@mail.com",
    password: "Şifre",
    passwordPlaceholder: "••••••••",
    signIn: "Giriş Yap",
    signingIn: "Giriş yapılıyor...",
    noAccount: "Hesabın yok mu?",
    signUp: "Kayıt Ol",
    loginLabel: "Giriş",
    error: "Giriş sırasında bir hata oluştu.",
    sessionError: "Session oluşturulamadı.",
  },
  en: {
    heroBadge: "AI Creative Platform",
    welcomeBack: "Welcome back",
    heroText:
      "Access chat, music, image, video, and editor modules with one account. Keep your platform history and generation flow.",
    features: {
      chat: "Duble-S Chat access",
      flow: "Smart routing between modules",
      history: "History + Editor integration",
    },
    formSub: "Sign in to your account and continue where you left off.",
    email: "Email",
    emailPlaceholder: "example@mail.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    signIn: "Sign In",
    signingIn: "Signing in...",
    noAccount: "Don’t have an account?",
    signUp: "Sign Up",
    loginLabel: "Login",
    error: "An error occurred during sign in.",
    sessionError: "Session could not be created.",
  },
  de: {
    heroBadge: "AI Creative Platform",
    welcomeBack: "Willkommen zurück",
    heroText:
      "Greife mit einem Konto auf Chat-, Musik-, Bild-, Video- und Editor-Module zu. Behalte Verlauf und Produktionsfluss.",
    features: {
      chat: "Duble-S Chat Zugriff",
      flow: "Intelligente Weiterleitung zwischen Modulen",
      history: "History + Editor Verbindung",
    },
    formSub: "Melde dich an und fahre dort fort, wo du aufgehört hast.",
    email: "E-Mail",
    emailPlaceholder: "beispiel@mail.com",
    password: "Passwort",
    passwordPlaceholder: "••••••••",
    signIn: "Anmelden",
    signingIn: "Anmeldung läuft...",
    noAccount: "Noch kein Konto?",
    signUp: "Registrieren",
    loginLabel: "Login",
    error: "Beim Anmelden ist ein Fehler aufgetreten.",
    sessionError: "Session konnte nicht erstellt werden.",
  },
  ku: {
    heroBadge: "AI Creative Platform",
    welcomeBack: "Bi xêr hatî vegerî",
    heroText:
      "Bi yek hesabê bigihîje modulên chat, muzîk, wêne, vîdyo û editor. Dîroka platformê û herikîna çêkirinê biparêze.",
    features: {
      chat: "Gihîştina Duble-S Chat",
      flow: "Rêberiya zîrek di navbera modulan de",
      history: "Girêdana History + Editor",
    },
    formSub: "Têkeve hesabê xwe û ji cihê ku rawestiyabûyî bidomîne.",
    email: "E-name",
    emailPlaceholder: "mînak@mail.com",
    password: "Şîfre",
    passwordPlaceholder: "••••••••",
    signIn: "Têkeve",
    signingIn: "Têketin tê kirin...",
    noAccount: "Hesab tune ye?",
    signUp: "Tomar bibe",
    loginLabel: "Têketin",
    error: "Di têketinê de xeletiyek çêbû.",
    sessionError: "Session nehate çêkirin.",
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const common = getCommonI18n(language);
  const t = LOGIN_TEXTS[language] ?? LOGIN_TEXTS.en;
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= 980);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const canSubmit = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const sessionRes = await fetch("/api/session/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: email.split("@")[0] || "User",
          email,
          planCode: "free",
        }),
      });

      const sessionData = await sessionRes.json().catch(() => null);

      if (!sessionRes.ok || !sessionData?.ok) {
        throw new Error(sessionData?.error || t.sessionError);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      signIn({
        name: email.split("@")[0] || common.user.guest,
        email,
        planCode: "free",
      });

      router.push("/chat");
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowA} />
      <div style={styles.glowB} />

      <div
        style={{
          ...styles.shell,
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1fr) minmax(380px, 460px)",
        }}
      >
        <div style={styles.left}>
          <Link href="/chat" style={styles.brand}>
            <div style={styles.logoWrap}>
              <img
                src="/dubles-logo.png"
                alt="Duble-S Motion AI Logo"
                style={styles.logo}
              />
            </div>

            <div style={styles.brandTextWrap}>
              <div style={styles.brandTitle}>{common.appName}</div>
              <div style={styles.brandSub}>{common.appSubtitle}</div>
            </div>
          </Link>

          <div style={styles.heroCard}>
            <div style={styles.heroBadge}>{t.heroBadge}</div>
            <h1
              style={{
                ...styles.heroTitle,
                fontSize: isMobile ? 30 : 40,
              }}
            >
              {t.welcomeBack}
            </h1>
            <p style={styles.heroText}>{t.heroText}</p>

            <div style={styles.featureList}>
              <div style={styles.featureItem}>• {t.features.chat}</div>
              <div style={styles.featureItem}>• {t.features.flow}</div>
              <div style={styles.featureItem}>• {t.features.history}</div>
            </div>
          </div>
        </div>

        <div style={styles.right}>
          <form style={styles.formCard} onSubmit={handleSubmit}>
            <div style={styles.formTop}>
              <div style={styles.formEyebrow}>{t.loginLabel}</div>
              <h2 style={styles.formTitle}>{t.welcomeBack}</h2>
              <p style={styles.formSub}>{t.formSub}</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={styles.input}
                autoComplete="email"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>{t.password}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                style={styles.input}
                autoComplete="current-password"
              />
            </div>

            {error ? <div style={styles.errorBox}>{error}</div> : null}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              style={{
                ...styles.primaryButton,
                ...((!canSubmit || submitting) ? styles.disabledButton : {}),
              }}
            >
              {submitting ? t.signingIn : t.signIn}
            </button>

            <div style={styles.bottomText}>
              {t.noAccount}{" "}
              <Link href="/register" style={styles.inlineLink}>
                {t.signUp}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "100dvh",
    overflow: "hidden",
    background:
      "linear-gradient(180deg, #f8fbff 0%, #f3f7fc 45%, #eef4ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },

  glowA: {
    position: "absolute",
    top: -120,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: "50%",
    background: "rgba(37,99,235,0.10)",
    filter: "blur(70px)",
    pointerEvents: "none",
  },

  glowB: {
    position: "absolute",
    right: -100,
    bottom: -120,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "rgba(99,102,241,0.10)",
    filter: "blur(80px)",
    pointerEvents: "none",
  },

  shell: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1180,
    display: "grid",
    gap: 24,
    alignItems: "stretch",
  },

  left: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 0,
  },

  right: {
    minWidth: 0,
    display: "flex",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    textDecoration: "none",
    color: "inherit",
    width: "fit-content",
    maxWidth: "100%",
  },

  logoWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
    flexShrink: 0,
  },

  logo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },

  brandTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.1,
    wordBreak: "break-word",
  },

  brandSub: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 600,
    lineHeight: 1.4,
  },

  heroCard: {
    flex: 1,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 20px 48px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 16,
  },

  heroBadge: {
    width: "fit-content",
    minHeight: 34,
    padding: "0 14px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    background: "#e0ecff",
    color: "#1d4ed8",
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid rgba(37,99,235,0.12)",
  },

  heroTitle: {
    margin: 0,
    lineHeight: 1.06,
    fontWeight: 800,
    color: "#0f172a",
  },

  heroText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.75,
    color: "#64748b",
    maxWidth: 620,
  },

  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 8,
  },

  featureItem: {
    fontSize: 15,
    color: "#334155",
    fontWeight: 600,
    lineHeight: 1.6,
  },

  formCard: {
    width: "100%",
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 20px 48px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    justifyContent: "center",
  },

  formTop: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 4,
  },

  formEyebrow: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#1d4ed8",
  },

  formTitle: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.15,
    fontWeight: 800,
    color: "#0f172a",
  },

  formSub: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.65,
    color: "#64748b",
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  label: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: "#475569",
  },

  input: {
    height: 52,
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#ffffff",
    padding: "0 16px",
    fontSize: 15,
    outline: "none",
    color: "#0f172a",
  },

  primaryButton: {
    marginTop: 8,
    minHeight: 52,
    borderRadius: 16,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(37,99,235,0.22)",
  },

  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  errorBox: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#fef2f2",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 1.55,
  },

  bottomText: {
    marginTop: 2,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 1.6,
  },

  inlineLink: {
    color: "#2563eb",
    fontWeight: 700,
    textDecoration: "none",
  },
};
