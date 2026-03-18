"use client";

"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppSidebar from "../../components/AppSidebar";
import { useSession } from "../../provider/SessionProvider";
import { useLanguage } from "../../provider/LanguageProvider";
type BillingPlanCode = "free" | "starter" | "pro" | "agency";

type BillingPlan = {
  code: BillingPlanCode;
  title: string;
  price: string;
  subtitle: string;
  credits: string;
  duration: string;
  popular?: boolean;
};

const BILLING_PLANS: BillingPlan[] = [
  {
    code: "free",
    title: "Free",
    price: "$0",
    subtitle: "Platformu test etmek için.",
    credits: "Sınırlı",
    duration: "10s",
  },
  {
    code: "starter",
    title: "Starter",
    price: "$19",
    subtitle: "Başlangıç düzeyi içerik üretimi için.",
    credits: "Aylık limitli",
    duration: "20s",
  },
  {
    code: "pro",
    title: "Pro",
    price: "$49",
    subtitle: "Düzenli üretim yapan profesyoneller için.",
    credits: "Daha yüksek limit",
    duration: "30s",
    popular: true,
  },
  {
    code: "agency",
    title: "Agency",
    price: "$249",
    subtitle: "Ajans ve yüksek hacimli kullanım için.",
    credits: "Sınırsıza yakın kullanım",
    duration: "30s",
  },
];

export default function BillingPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSession();
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 980);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const currentPlanCode = (user?.planCode || "free") as BillingPlanCode;

  const currentPlan = useMemo(() => {
    return (
      BILLING_PLANS.find((plan) => plan.code === currentPlanCode) ||
      BILLING_PLANS[0]
    );
  }, [currentPlanCode]);

  const remainingCreditsText =
    user?.remainingCredits === null
      ? "∞"
      : String(user?.remainingCredits ?? 0);

  const usedThisMonth =
    typeof user?.usedThisMonth === "number" ? user.usedThisMonth : 0;

  const maxDuration = `${user?.maxDurationSec ?? 10}s`;

  return (
    <div
      style={{
        ...styles.root,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <AppSidebar activeKey="tool" onSelect={() => router.push("/")} />

      <main
        style={{
          ...styles.main,
          padding: isMobile ? 14 : 24,
        }}
      >
        <section
          style={{
            ...styles.hero,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            gap: isMobile ? 12 : 18,
          }}
        >
          <div style={styles.heroBadge}>
            <img
              src="/logo.png"
              alt="Duble-S Motion"
              style={styles.heroLogo}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={styles.kicker}>DUBLE-S MOTION</div>
            <h1
              style={{
                ...styles.title,
                fontSize: isMobile ? 32 : 46,
                lineHeight: isMobile ? 1.05 : 1.02,
              }}
            >
              Faturalandırma
            </h1>
            <p
              style={{
                ...styles.subtitle,
                maxWidth: 760,
              }}
            >
              Abonelik planınızı, kullanım limitlerinizi ve yükseltme
              seçeneklerinizi yönetin.
            </p>
          </div>
        </section>

        <section
          style={{
            ...styles.summaryGrid,
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(4, minmax(0, 1fr))",
          }}
        >
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>CURRENT PLAN</div>
            <div style={styles.summaryValue}>{currentPlan.title}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>USED THIS MONTH</div>
            <div style={styles.summaryValue}>{usedThisMonth}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>REMAINING CREDITS</div>
            <div style={styles.summaryValue}>{remainingCreditsText}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>MAX DURATION</div>
            <div style={styles.summaryValue}>{maxDuration}</div>
          </div>
        </section>

        <section
          style={{
            ...styles.planGrid,
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          {BILLING_PLANS.map((plan) => {
            const isCurrent = currentPlan.code === plan.code;

            return (
              <article
                key={plan.code}
                style={{
                  ...styles.planCard,
                  ...(plan.popular ? styles.planCardPopular : {}),
                  ...(isCurrent ? styles.planCardCurrent : {}),
                }}
              >
                <div style={styles.planTopRow}>
                  <div>
                    <div style={styles.planName}>{plan.title}</div>
                    <div style={styles.planPrice}>{plan.price}</div>
                  </div>

                  {plan.popular ? (
                    <div style={styles.popularBadge}>Popular</div>
                  ) : null}
                </div>

                <div style={styles.planSubtitle}>{plan.subtitle}</div>

                <div style={styles.planMeta}>
                  <div style={styles.planMetaRow}>
                    <span>Kredi</span>
                    <strong>{plan.credits}</strong>
                  </div>
                  <div style={styles.planMetaRow}>
                    <span>Maks. süre</span>
                    <strong>{plan.duration}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  style={{
                    ...styles.planButton,
                    ...(isCurrent ? styles.planButtonDisabled : {}),
                  }}
                  onClick={() => {
                    if (!isAuthenticated) {
                      router.push("/login");
                      return;
                    }
                    router.push(`/checkout?plan=${plan.code}`);
                  }}
                >
                  {isCurrent ? "Aktif Plan" : `${plan.title} Planını Seç`}
                </button>
              </article>
            );
          })}
        </section>

        <section
          style={{
            ...styles.bottomInfoGrid,
            gridTemplateColumns: isMobile ? "1fr" : "1.25fr 0.75fr",
          }}
        >
          <div style={styles.infoCard}>
            <div style={styles.infoTitle}>Plan Bilgileri</div>
            <div style={styles.infoText}>
              Starter, Pro ve Agency planlarıyla daha uzun video süreleri,
              yüksek aylık üretim limiti ve daha güçlü çalışma akışı
              kullanabilirsiniz.
            </div>
          </div>

          <div style={styles.infoCard}>
            <div style={styles.infoTitle}>Destek</div>
            <div style={styles.infoText}>
              Ödeme veya abonelik sorunu yaşarsanız support bölümünden ya da
              iletişim adresinizden bize ulaşabilirsiniz.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f7f9ff 0%, #eef3ff 42%, #f5f3ff 100%)",
    color: "#0f172a",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
  },

  hero: {
    display: "flex",
    padding: 0,
    minWidth: 0,
  },

  heroBadge: {
    width: 84,
    height: 84,
    borderRadius: 22,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  heroLogo: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 12,
  },

  kicker: {
    fontSize: 12,
    fontWeight: 900,
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 6,
  },

  title: {
    margin: 0,
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: -1.2,
  },

  subtitle: {
    margin: "10px 0 0 0",
    fontSize: 15,
    lineHeight: 1.6,
    color: "#64748b",
  },

  summaryGrid: {
    display: "grid",
    gap: 16,
  },

  summaryCard: {
    padding: 28,
    borderRadius: 28,
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
    minWidth: 0,
  },

  summaryLabel: {
    fontSize: 13,
    fontWeight: 900,
    color: "#64748b",
    letterSpacing: 1,
    marginBottom: 18,
  },

  summaryValue: {
    fontSize: 34,
    lineHeight: 1,
    fontWeight: 900,
    color: "#0f172a",
    wordBreak: "break-word",
  },

  planGrid: {
    display: "grid",
    gap: 18,
  },

  planCard: {
    position: "relative",
    padding: 28,
    borderRadius: 28,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 0,
  },

  planCardPopular: {
    border: "1px solid rgba(109,93,252,0.22)",
    boxShadow: "0 16px 36px rgba(109,93,252,0.10)",
  },

  planCardCurrent: {
    outline: "3px solid rgba(15,23,42,0.06)",
  },

  planTopRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },

  planName: {
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 8,
  },

  planPrice: {
    fontSize: 56,
    fontWeight: 900,
    lineHeight: 1,
    color: "#0f172a",
  },

  popularBadge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },

  planSubtitle: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "#64748b",
  },

  planMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 16,
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.05)",
  },

  planMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    fontSize: 14,
    color: "#475569",
  },

  planButton: {
    marginTop: "auto",
    minHeight: 50,
    borderRadius: 16,
    border: "none",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    width: "100%",
  },

  planButtonDisabled: {
    background: "#e2e8f0",
    color: "#475569",
    cursor: "default",
  },

  bottomInfoGrid: {
    display: "grid",
    gap: 16,
  },

  infoCard: {
    padding: 24,
    borderRadius: 24,
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 10px 22px rgba(15,23,42,0.04)",
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 10,
  },

  infoText: {
    fontSize: 14,
    lineHeight: 1.7,
    color: "#64748b",
  },
};