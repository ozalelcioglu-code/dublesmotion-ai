"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

import AppShell from "@/components/layout/AppShell";
import { getSafeLanguage, type AppLanguage } from "@/lib/i18n";
import { useSession } from "@/provider/SessionProvider";
import { useLanguage } from "@/provider/languageProvider";
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

const BILLING_TEXTS: Record<
  AppLanguage,
  {
    pageTitle: string;
    pageDescription: string;
    profileError: string;
    signInRequired: string;
    freePlanInfo: string;
    missingCheckout: string;
    checkoutError: string;
    checkoutStartError: string;
    currentPlan: string;
    currentPlanDescription: string;
    pendingPlan: string;
    remainingCredits: string;
    remainingCreditsDescription: string;
    billing: string;
    billingDescription: string;
    monthly: string;
    yearly: string;
    popular: string;
    month: string;
    year: string;
    creditsPerMonth: string;
    features: string[];
    proFeature: string;
    agencyFeature: string;
    activePlan: string;
    openingCheckout: string;
    currentFreePlan: string;
    upgradeWithPayment: string;
    addonTitle: string;
    addonDescription: string;
    credits: string;
    buyPack: string;
    addonPending: string;
  }
> = {
  tr: {
    pageTitle: "Planlar",
    pageDescription: "Planını yönet, kalan kredilerini gör ve ihtiyacına göre yükselt.",
    profileError: "Profil bilgisi alınamadı.",
    signInRequired: "Önce giriş yapman gerekiyor.",
    freePlanInfo: "Free plan zaten ödeme gerektirmeden kullanılabilir.",
    missingCheckout: "Bu plan için ödeme akışı tanımlı değil.",
    checkoutError: "Ödeme oturumu başlatılamadı.",
    checkoutStartError: "Plan başlatılırken hata oluştu.",
    currentPlan: "Mevcut Plan",
    currentPlanDescription: "Aktif kullanım paketin burada görünür.",
    pendingPlan: "Bekleyen plan",
    remainingCredits: "Kalan Kredi",
    remainingCreditsDescription: "Üretimlerde düşecek kredi bakiyesi.",
    billing: "Faturalama",
    billingDescription: "Görüntülenen fiyat modu.",
    monthly: "Aylık",
    yearly: "Yıllık",
    popular: "En Popüler",
    month: "ay",
    year: "yıl",
    creditsPerMonth: "kredi / ay",
    features: [
      "Duble-S Chat erişimi",
      "Modüller arası akıllı akış",
      "History ve Editor bağlantısı",
      "Kredi bazlı üretim sistemi",
    ],
    proFeature: "Gelişmiş video ve klon erişimi",
    agencyFeature: "Yüksek hacimli kullanım ve ekip seviyesi yapı",
    activePlan: "Aktif Plan",
    openingCheckout: "Ödeme sayfası açılıyor...",
    currentFreePlan: "Mevcut ücretsiz plan",
    upgradeWithPayment: "Ödeme ile yükselt",
    addonTitle: "Ek Kredi Paketleri",
    addonDescription: "Plan kredin yetmezse anında ek kredi satın alabileceğin paketler.",
    credits: "kredi",
    buyPack: "Paketi Al",
    addonPending: "Bu paket daha sonra ödeme sistemiyle bağlanacak.",
  },
  en: {
    pageTitle: "Plans",
    pageDescription: "Manage your plan, view remaining credits, and upgrade when needed.",
    profileError: "Could not load profile information.",
    signInRequired: "You need to sign in first.",
    freePlanInfo: "The Free plan is already available without payment.",
    missingCheckout: "Checkout flow is not configured for this plan.",
    checkoutError: "Could not start the checkout session.",
    checkoutStartError: "Something went wrong while starting the plan.",
    currentPlan: "Current Plan",
    currentPlanDescription: "Your active usage package appears here.",
    pendingPlan: "Pending plan",
    remainingCredits: "Remaining Credits",
    remainingCreditsDescription: "Credit balance used by generations.",
    billing: "Billing",
    billingDescription: "Displayed pricing mode.",
    monthly: "Monthly",
    yearly: "Yearly",
    popular: "Most Popular",
    month: "month",
    year: "year",
    creditsPerMonth: "credits / month",
    features: [
      "Duble-S Chat access",
      "Smart flow between modules",
      "History and Editor connection",
      "Credit-based generation system",
    ],
    proFeature: "Advanced video and clone access",
    agencyFeature: "High-volume usage and team-level setup",
    activePlan: "Active Plan",
    openingCheckout: "Opening checkout...",
    currentFreePlan: "Current free plan",
    upgradeWithPayment: "Upgrade with payment",
    addonTitle: "Extra Credit Packs",
    addonDescription: "Add credits instantly when your plan credits are not enough.",
    credits: "credits",
    buyPack: "Buy Pack",
    addonPending: "This pack will be connected to payments later.",
  },
  de: {
    pageTitle: "Pläne",
    pageDescription: "Verwalte deinen Plan, sieh deine Credits und upgrade bei Bedarf.",
    profileError: "Profilinformationen konnten nicht geladen werden.",
    signInRequired: "Du musst dich zuerst anmelden.",
    freePlanInfo: "Der Free-Plan ist bereits ohne Zahlung verfügbar.",
    missingCheckout: "Für diesen Plan ist kein Checkout-Ablauf definiert.",
    checkoutError: "Checkout-Sitzung konnte nicht gestartet werden.",
    checkoutStartError: "Beim Starten des Plans ist ein Fehler aufgetreten.",
    currentPlan: "Aktueller Plan",
    currentPlanDescription: "Dein aktives Nutzungspaket erscheint hier.",
    pendingPlan: "Ausstehender Plan",
    remainingCredits: "Verbleibende Credits",
    remainingCreditsDescription: "Credit-Guthaben für deine Generierungen.",
    billing: "Abrechnung",
    billingDescription: "Angezeigter Preismodus.",
    monthly: "Monatlich",
    yearly: "Jährlich",
    popular: "Am beliebtesten",
    month: "Monat",
    year: "Jahr",
    creditsPerMonth: "Credits / Monat",
    features: [
      "Zugang zu Duble-S Chat",
      "Intelligenter Ablauf zwischen Modulen",
      "Verbindung zu Verlauf und Editor",
      "Credit-basiertes Generierungssystem",
    ],
    proFeature: "Erweiterter Video- und Clone-Zugang",
    agencyFeature: "Nutzung mit hohem Volumen und Teamstruktur",
    activePlan: "Aktiver Plan",
    openingCheckout: "Checkout wird geöffnet...",
    currentFreePlan: "Aktueller Free-Plan",
    upgradeWithPayment: "Mit Zahlung upgraden",
    addonTitle: "Zusätzliche Credit-Pakete",
    addonDescription: "Kaufe zusätzliche Credits, wenn dein Planguthaben nicht reicht.",
    credits: "Credits",
    buyPack: "Paket kaufen",
    addonPending: "Dieses Paket wird später mit dem Zahlungssystem verbunden.",
  },
  ku: {
    pageTitle: "Plan",
    pageDescription: "Plana xwe rêve bibe, kreditên mayî bibîne û heke pêwîst be bilind bike.",
    profileError: "Agahiyên profîlê nehatin standin.",
    signInRequired: "Pêşî divê têkeve hesabê xwe.",
    freePlanInfo: "Plana Free jixwe bê pere tê bikaranîn.",
    missingCheckout: "Ji bo vê planê herikîna pere danê tune.",
    checkoutError: "Rûniştina pere danê dest pê nekir.",
    checkoutStartError: "Di destpêkirina planê de xeletî çêbû.",
    currentPlan: "Plana Heyî",
    currentPlanDescription: "Pakêta bikaranîna çalak li vir xuya dibe.",
    pendingPlan: "Plana bendewar",
    remainingCredits: "Kreditên Mayî",
    remainingCreditsDescription: "Balansa kreditê ku di hilberînan de tê bikaranîn.",
    billing: "Fature",
    billingDescription: "Moda bihayê ya tê nîşandan.",
    monthly: "Mehane",
    yearly: "Salane",
    popular: "Herî populer",
    month: "meh",
    year: "sal",
    creditsPerMonth: "kredit / meh",
    features: [
      "Gihîştina Duble-S Chat",
      "Herikîna jîr di navbera modulan de",
      "Girêdana History û Editor",
      "Pergala hilberînê ya bi kredit",
    ],
    proFeature: "Gihîştina pêşketî ya vîdyo û clone",
    agencyFeature: "Bikaranîna mezin û avahiya asta tîmê",
    activePlan: "Plana Çalak",
    openingCheckout: "Rûpela pere danê tê vekirin...",
    currentFreePlan: "Plana belaş a heyî",
    upgradeWithPayment: "Bi pere danê bilind bike",
    addonTitle: "Pakêtên Kreditên Zêde",
    addonDescription: "Heke kreditên planê têr nekin, dikarî kreditên zêde bikirî.",
    credits: "kredit",
    buyPack: "Pakêtê bikire",
    addonPending: "Ev pakêt dê paşê bi pergala pere danê ve girêdayî bibe.",
  },
};

export default function BillingPage() {
  const { isAuthenticated, refreshSession } = useSession();
  const { language } = useLanguage();
  const t = BILLING_TEXTS[getSafeLanguage(language)];

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
        throw new Error(data?.error || t.profileError);
      }

      setBillingProfile(data.profile as BillingProfile);
      await refreshSession();
    } catch (error: unknown) {
      console.error(error);
      setProfileError(
        error instanceof Error ? error.message : t.profileError
      );
    } finally {
      setProfileLoading(false);
    }
  }, [refreshSession, t.profileError]);

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
      alert(t.signInRequired);
      return;
    }

    if (planCode === "free") {
      alert(t.freePlanInfo);
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
        throw new Error(t.missingCheckout);
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
        throw new Error(data?.error || t.checkoutError);
      }

      window.location.href = data.url;
    } catch (error: unknown) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : t.checkoutStartError
      );
    } finally {
      setProcessingPlan(null);
    }
  }

  return (
    <AppShell
      currentPath="/billing"
      pageTitle={t.pageTitle}
      pageDescription={t.pageDescription}
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
            <div style={styles.summaryLabel}>{t.currentPlan}</div>
            <div style={styles.summaryValue}>{currentPlanLabel}</div>
            <div style={styles.summarySub}>
              {t.currentPlanDescription}
            </div>
            {billingProfile?.pendingPlanCode ? (
              <div style={styles.pendingText}>
                {t.pendingPlan}: {billingProfile.pendingPlanCode}
              </div>
            ) : null}
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>{t.remainingCredits}</div>
            <div style={styles.summaryValue}>{remainingCredits}</div>
            <div style={styles.summarySub}>
              {t.remainingCreditsDescription}
            </div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>{t.billing}</div>
            <div style={styles.summaryValue}>
              {cycle === "monthly" ? t.monthly : t.yearly}
            </div>
            <div style={styles.summarySub}>{t.billingDescription}</div>
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
              {t.monthly}
            </button>

            <button
              type="button"
              onClick={() => setCycle("yearly")}
              style={{
                ...styles.toggleButton,
                ...(cycle === "yearly" ? styles.toggleButtonActive : {}),
              }}
            >
              {t.yearly}
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
                      <span style={styles.popularBadge}>{t.popular}</span>
                    ) : null}
                  </div>

                  <div style={styles.planPriceRow}>
                    <span style={styles.planPrice}>${price}</span>
                    <span style={styles.planPeriod}>
                      / {cycle === "monthly" ? t.month : t.year}
                    </span>
                  </div>

                  <div style={styles.planCredits}>
                    {plan.creditsMonthly} {t.creditsPerMonth}
                  </div>
                </div>

                <div style={styles.planFeatures}>
                  {t.features.map((feature) => (
                    <div key={feature} style={styles.featureItem}>
                      • {feature}
                    </div>
                  ))}

                  {plan.code === "pro" || plan.code === "agency" ? (
                    <div style={styles.featureItem}>
                      • {t.proFeature}
                    </div>
                  ) : null}

                  {plan.code === "agency" ? (
                    <div style={styles.featureItem}>
                      • {t.agencyFeature}
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
                    ? t.activePlan
                    : processingPlan === plan.code
                    ? t.openingCheckout
                    : plan.code === "free"
                    ? t.currentFreePlan
                    : t.upgradeWithPayment}
                </button>
              </article>
            );
          })}
        </section>

        <section style={styles.addonSection}>
          <div style={styles.sectionTitle}>{t.addonTitle}</div>
          <div style={styles.sectionSub}>
            {t.addonDescription}
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
                <div style={styles.addonCredits}>
                  {pack.credits} {t.credits}
                </div>
                <div style={styles.addonPrice}>${pack.price}</div>

                <button
                  type="button"
                  style={styles.addonButton}
                  onClick={() => alert(t.addonPending)}
                >
                  {t.buyPack}
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
