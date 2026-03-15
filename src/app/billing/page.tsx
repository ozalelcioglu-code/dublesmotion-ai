"use client";

import { useEffect, useState } from "react";
import AppPageShell from "../../components/AppPageShell";

type Plan = {
  code: string;
  label: string;
  monthlyVideoLimit: number | null;
  usedThisMonth: number;
  remainingCredits: number | null;
  maxDurationSec: number;
};

type PaidPlanCode = "starter" | "pro" | "agency";

export default function BillingPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPlan = async () => {
      try {
        setError("");

        const res = await fetch("/api/me", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok || !data?.user) {
          throw new Error(data?.error || "Failed to load billing info.");
        }

        setPlan({
          code: data.user.plan,
          label: data.user.planLabel,
          monthlyVideoLimit: data.user.monthlyVideoLimit,
          usedThisMonth: data.user.usedThisMonth,
          remainingCredits: data.user.remainingCredits,
          maxDurationSec: data.user.maxDurationSec,
        });
      } catch (err: any) {
        setError(err?.message || "Billing information could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, []);

  const upgrade = async (planCode: PaidPlanCode) => {
    try {
      setError("");
      setCheckoutLoading(planCode);

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planCode }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.url) {
        throw new Error(data?.error || "Could not start Stripe checkout.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Checkout could not be started.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <AppPageShell
      title="Faturalandırma"
      subtitle="Abonelik planınızı, kullanım limitlerinizi ve yükseltme seçeneklerinizi yönetin."
      showSidebar={true}
    >
      <div style={styles.page}>
        {loading ? (
          <div style={styles.infoBox}>Billing bilgileri yükleniyor...</div>
        ) : null}

        {error ? <div style={styles.errorBox}>{error}</div> : null}

        {!loading && plan ? (
          <>
            <div style={styles.stats}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Current Plan</div>
                <div style={styles.statValue}>{plan.label}</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Used This Month</div>
                <div style={styles.statValue}>{plan.usedThisMonth}</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Remaining Credits</div>
                <div style={styles.statValue}>
                  {plan.remainingCredits === null ? "∞" : plan.remainingCredits}
                </div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statLabel}>Max Duration</div>
                <div style={styles.statValue}>{plan.maxDurationSec}s</div>
              </div>
            </div>

            <div style={styles.grid}>
              <PlanCard
                title="Free"
                price="$0"
                desc="Platformu test etmek için."
                videos="1 video / month"
                duration="Up to 10 seconds"
                active={plan.code === "free"}
                disabled
              />

              <PlanCard
                title="Starter"
                price="$19"
                desc="Solo creators and small teams."
                videos="20 videos / month"
                duration="Up to 20 seconds"
                active={plan.code === "starter"}
                loading={checkoutLoading === "starter"}
                disabled={checkoutLoading !== null}
                onClick={() => upgrade("starter")}
              />

              <PlanCard
                title="Pro"
                price="$49"
                desc="Frequent campaign production."
                videos="50 videos / month"
                duration="Up to 30 seconds"
                active={plan.code === "pro"}
                loading={checkoutLoading === "pro"}
                disabled={checkoutLoading !== null}
                onClick={() => upgrade("pro")}
              />

              <PlanCard
                title="Agency"
                price="$149"
                desc="Unlimited production for agencies."
                videos="Unlimited videos"
                duration="Up to 30 seconds"
                active={plan.code === "agency"}
                loading={checkoutLoading === "agency"}
                disabled={checkoutLoading !== null}
                onClick={() => upgrade("agency")}
              />
            </div>
          </>
        ) : null}
      </div>
    </AppPageShell>
  );
}

function PlanCard({
  title,
  price,
  desc,
  videos,
  duration,
  active,
  onClick,
  loading,
  disabled,
}: {
  title: string;
  price: string;
  desc: string;
  videos: string;
  duration: string;
  active?: boolean;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardPrice}>{price}</div>
      <div style={styles.cardText}>{desc}</div>
      <div style={styles.featureList}>
        <div style={styles.featureItem}>{videos}</div>
        <div style={styles.featureItem}>{duration}</div>
      </div>

      {active ? (
        <button style={styles.currentButton} disabled>
          Current Plan
        </button>
      ) : (
        <button
          style={{
            ...styles.primaryButton,
            ...(disabled ? styles.disabledButton : {}),
          }}
          onClick={onClick}
          disabled={disabled}
        >
          {loading ? "Redirecting..." : `Choose ${title}`}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },

  infoBox: {
    padding: 16,
    borderRadius: 16,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#334155",
    fontWeight: 700,
  },

  errorBox: {
    padding: 16,
    borderRadius: 16,
    background: "rgba(254,226,226,0.9)",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#b91c1c",
    fontWeight: 700,
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 16,
  },

  statCard: {
    padding: 18,
    borderRadius: 20,
    background: "rgba(255,255,255,0.80)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  statLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  statValue: {
    fontSize: 30,
    fontWeight: 900,
    color: "#0f172a",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 18,
  },

  card: {
    padding: 22,
    borderRadius: 24,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 20px 44px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
  },

  cardPrice: {
    fontSize: 42,
    fontWeight: 950,
    color: "#0f172a",
  },

  cardText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    minHeight: 42,
  },

  featureList: {
    display: "grid",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },

  featureItem: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.06)",
    color: "#334155",
    fontWeight: 700,
    fontSize: 14,
  },

  primaryButton: {
    marginTop: "auto",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid transparent",
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 14px 28px rgba(77,182,255,0.18)",
  },

  currentButton: {
    marginTop: "auto",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#e2e8f0",
    color: "#334155",
    fontWeight: 900,
    cursor: "default",
  },

  disabledButton: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};