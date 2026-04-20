"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import AppShell from "@/components/layout/AppShell";
import { useSession } from "@/provider/SessionProvider";
import { getAllPlans, type PlanCode } from "@/lib/plans";

type BillingCycle = "monthly" | "yearly";

type BillingProfile = {
  userId: string;
  email: string;
  planCode: string;
  planLabel: string;
  pendingPlanCode: string | null;
  paymentStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  credits: number;
};

const CREDIT_PACKS = [
  {
    id: "pack-100",
    credits: 100,
    price: 12,
    label: "Starter Boost",
  },
  {
    id: "pack-300",
    credits: 300,
    price: 29,
    label: "Creator Pack",
  },
  {
    id: "pack-800",
    credits: 800,
    price: 69,
    label: "Pro Boost",
  },
  {
    id: "pack-2500",
    credits: 2500,
    price: 179,
    label: "Agency Reserve",
  },
];

export default function BillingPage() {
  const { isAuthenticated, refreshSession } = useSession();

  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [processingPlan, setProcessingPlan] = useState<PlanCode | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const [billingProfile, setBillingProfile] = useState<BillingProfile | null>(
    null
  );
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth <= 980);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const plans = useMemo(() => getAllPlans(), []);

  const fetchBillingProfile = useCallback(async (checkoutSessionId?: string | null) => {
    try {
      setProfileError("");

      const query = checkoutSessionId
        ? `?session_id=${encodeURIComponent(checkoutSessionId)}`
        : "";

      const res = await fetch(`/api/billing/profile${query}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.profile) {
        throw new Error(data?.error || "Profil bilgisi alınamadı.");
      }

      setBillingProfile(data.profile as BillingProfile);
      await refreshSession();
    } catch (error: unknown) {
      console.error(error);
      setProfileError(
        error instanceof Error ? error.message : "Profil bilgisi alınamadı."
      );
    } finally {
      setProfileLoading(false);
    }
  }, [refreshSession]);

  useEffect(() => {
    fetchBillingProfile();
  }, [fetchBillingProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const checkoutSessionId = params.get("session_id");

    if (checkout === "success") {
      fetchBillingProfile(checkoutSessionId);

      const timer1 = window.setTimeout(() => {
        fetchBillingProfile(checkoutSessionId);
      }, 2500);

      const timer2 = window.setTimeout(() => {
        fetchBillingProfile(checkoutSessionId);
      }, 5000);

      return () => {
        window.clearTimeout(timer1);
        window.clearTimeout(timer2);
      };
    }
  }, [fetchBillingProfile]);

  const currentPlanCode = (billingProfile?.planCode ?? "free") as PlanCode;
  const currentPlanLabel = billingProfile?.planLabel ?? "Free";
  const remainingCredits = profileLoading
    ? "..."
    : `${billingProfile?.credits ?? 0}`;

  async function handleSelectPlan(planCode: PlanCode) {
    if (!isAuthenticated) {
      alert("Önce giriş yapman gerekiyor.");
      return;
    }

    if (planCode === "free") {
      alert("Free plan zaten ödeme gerektirmeden kullanılabilir.");
      return;
    }

    try {
      setProcessingPlan(planCode);

      const checkoutMap: Record<string, string> = {
        starter: cycle === "monthly" ? "starter_monthly" : "starter_yearly",
        pro: cycle === "monthly" ? "pro_monthly" : "pro_yearly",
        agency: cycle === "monthly" ? "agency_monthly" : "agency_yearly",
      };

      const checkoutPlan = checkoutMap[planCode];

      if (!checkoutPlan) {
        throw new Error("Bu plan için ödeme akışı tanımlı değil.");
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: checkoutPlan,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Ödeme oturumu başlatılamadı.");
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Plan başlatılırken hata oluştu."
      );
    } finally {
      setProcessingPlan(null);
    }
  }

  return (
    <AppShell
      currentPath="/billing"
      pageTitle="Planlar"
      pageDescription="Planını yönet, kalan kredilerini gör ve ihtiyacına göre yükselt."
    >
      <div style={styles.pageWrap}>
        {profileError ? (
          <div style={styles.errorBox}>{profileError}</div>
        ) : null}

        <section
          style={{
            ...styles.topSummaryGrid,
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
          }}
        >
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Mevcut Plan</div>
            <div style={styles.summaryValue}>{currentPlanLabel}</div>
            <div style={styles.summarySub}>
              Aktif kullanım paketin burada görünür.
            </div>
            {billingProfile?.pendingPlanCode ? (
              <div style={styles.pendingText}>
                Bekleyen plan: {billingProfile.pendingPlanCode}
              </div>
            ) : null}
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Kalan Kredi</div>
            <div style={styles.summaryValue}>{remainingCredits}</div>
            <div style={styles.summarySub}>
              Üretimlerde düşecek kredi bakiyesi.
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Faturalama</div>
            <div style={styles.summaryValue}>
              {cycle === "monthly" ? "Aylık" : "Yıllık"}
            </div>
            <div style={styles.summarySub}>Görüntülenen fiyat modu.</div>
          </div>
        </section>

        <section style={styles.toggleWrap}>
          <div style={styles.toggleCard}>
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              style={{
                ...styles.toggleButton,
                ...(cycle === "monthly" ? styles.toggleButtonActive : {}),
              }}
            >
              Aylık
            </button>

            <button
              type="button"
              onClick={() => setCycle("yearly")}
              style={{
                ...styles.toggleButton,
                ...(cycle === "yearly" ? styles.toggleButtonActive : {}),
              }}
            >
              Yıllık
            </button>
          </div>
        </section>

        <section
          style={{
            ...styles.planGrid,
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(4, minmax(0, 1fr))",
          }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const price =
              cycle === "monthly" ? plan.priceMonthly : plan.priceYearly;

            return (
              <article
                key={plan.code}
                style={{
                  ...styles.planCard,
                  ...(plan.highlight ? styles.planCardHighlight : {}),
                  ...(isCurrent ? styles.planCardCurrent : {}),
                }}
              >
                <div style={styles.planTop}>
                  <div style={styles.planHeaderRow}>
                    <div style={styles.planName}>{plan.label}</div>

                    {plan.highlight ? (
                      <span style={styles.popularBadge}>En Popüler</span>
                    ) : null}
                  </div>

                  <div style={styles.planPriceRow}>
                    <span style={styles.planPrice}>${price}</span>
                    <span style={styles.planPeriod}>
                      / {cycle === "monthly" ? "ay" : "yıl"}
                    </span>
                  </div>

                  <div style={styles.planCredits}>
                    {plan.creditsMonthly} kredi / ay
                  </div>
                </div>

                <div style={styles.planFeatures}>
                  <div style={styles.featureItem}>• Duble-S Chat erişimi</div>
                  <div style={styles.featureItem}>
                    • Modüller arası akıllı akış
                  </div>
                  <div style={styles.featureItem}>
                    • History ve Editor bağlantısı
                  </div>
                  <div style={styles.featureItem}>
                    • Kredi bazlı üretim sistemi
                  </div>

                  {plan.code === "pro" || plan.code === "agency" ? (
                    <div style={styles.featureItem}>
                      • Gelişmiş video ve klon erişimi
                    </div>
                  ) : null}

                  {plan.code === "agency" ? (
                    <div style={styles.featureItem}>
                      • Yüksek hacimli kullanım ve ekip seviyesi yapı
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={isCurrent || processingPlan === plan.code}
                  onClick={() => handleSelectPlan(plan.code)}
                  style={{
                    ...styles.planButton,
                    ...(isCurrent ? styles.planButtonCurrent : {}),
                    ...(processingPlan === plan.code
                      ? styles.planButtonDisabled
                      : {}),
                  }}
                >
                  {isCurrent
                    ? "Aktif Plan"
                    : processingPlan === plan.code
                    ? "Ödeme sayfası açılıyor..."
                    : plan.code === "free"
                    ? "Mevcut ücretsiz plan"
                    : "Ödeme ile yükselt"}
                </button>
              </article>
            );
          })}
        </section>

        <section style={styles.addonSection}>
          <div style={styles.sectionTitle}>Ek Kredi Paketleri</div>
          <div style={styles.sectionSub}>
            Plan kredin yetmezse anında ek kredi satın alabileceğin paketler.
          </div>

          <div
            style={{
              ...styles.addonGrid,
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
            }}
          >
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} style={styles.addonCard}>
                <div style={styles.addonLabel}>{pack.label}</div>
                <div style={styles.addonCredits}>{pack.credits} kredi</div>
                <div style={styles.addonPrice}>${pack.price}</div>

                <button
                  type="button"
                  style={styles.addonButton}
                  onClick={() =>
                    alert("Bu paket daha sonra ödeme sistemiyle bağlanacak.")
                  }
                >
                  Paketi Al
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

const styles: Record<string, CSSProperties> = {
  pageWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 22,
  },

  errorBox: {
    padding: "14px 16px",
    borderRadius: 16,
    background: "#fef2f2",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 1.6,
  },

  pendingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: 700,
    color: "#b45309",
  },

  topSummaryGrid: {
    display: "grid",
    gap: 16,
  },

  summaryCard: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 10px 30px rgba(15,23,42,0.05)",
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#64748b",
  },

  summaryValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1.1,
    wordBreak: "break-word",
  },

  summarySub: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#64748b",
  },

  toggleWrap: {
    display: "flex",
    justifyContent: "center",
  },

  toggleCard: {
    display: "inline-flex",
    gap: 8,
    padding: 8,
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 999,
    boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
    flexWrap: "wrap",
  },

  toggleButton: {
    minHeight: 42,
    padding: "0 18px",
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#475569",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  toggleButtonActive: {
    background: "#2563eb",
    color: "#ffffff",
    boxShadow: "0 10px 24px rgba(37,99,235,0.18)",
  },

  planGrid: {
    display: "grid",
    gap: 18,
    alignItems: "stretch",
  },

  planCard: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  planCardHighlight: {
    border: "1px solid rgba(37,99,235,0.18)",
    boxShadow: "0 18px 40px rgba(37,99,235,0.12)",
    transform: "translateY(-4px)",
  },

  planCardCurrent: {
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  },

  planTop: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  planHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },

  planName: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
  },

  popularBadge: {
    minHeight: 28,
    padding: "0 10px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    background: "#e0ecff",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 800,
    border: "1px solid rgba(37,99,235,0.12)",
    whiteSpace: "nowrap",
  },

  planPriceRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 6,
    flexWrap: "wrap",
  },

  planPrice: {
    fontSize: 42,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1,
  },

  planPeriod: {
    fontSize: 14,
    color: "#64748b",
    paddingBottom: 4,
  },

  planCredits: {
    fontSize: 14,
    fontWeight: 700,
    color: "#2563eb",
  },

  planFeatures: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 180,
  },

  featureItem: {
    fontSize: 14,
    lineHeight: 1.6,
    color: "#334155",
  },

  planButton: {
    marginTop: "auto",
    minHeight: 50,
    borderRadius: 16,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: "0 12px 26px rgba(37,99,235,0.18)",
  },

  planButtonCurrent: {
    background: "#e2e8f0",
    color: "#334155",
    boxShadow: "none",
    cursor: "default",
  },

  planButtonDisabled: {
    opacity: 0.7,
    cursor: "not-allowed",
  },

  addonSection: {
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 14px 36px rgba(15,23,42,0.05)",
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
  },

  sectionSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 1.7,
    color: "#64748b",
  },

  addonGrid: {
    marginTop: 18,
    display: "grid",
    gap: 16,
  },

  addonCard: {
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 20,
    padding: 18,
    background: "#f8fbff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  addonLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#334155",
  },

  addonCredits: {
    fontSize: 26,
    fontWeight: 800,
    color: "#0f172a",
  },

  addonPrice: {
    fontSize: 18,
    fontWeight: 800,
    color: "#2563eb",
  },

  addonButton: {
    marginTop: "auto",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    cursor: "pointer",
  },
};
