"use client";

import { useMemo, useState } from "react";

type PlanName = "free" | "starter" | "pro" | "agency";

type Props = {
  currentPlan: PlanName;
  currentPlanLabel: string;
  usedThisMonth: number;
  remainingCredits: number | null;
  maxDurationSec: number;
  monthlyVideoLimit: number | null;
};

const PLAN_CARDS: Array<{
  plan: PlanName;
  title: string;
  price: string;
  description: string;
  limitLabel: string;
  durationLabel: string;
  cta: string;
  isPaid: boolean;
}> = [
  {
    plan: "free",
    title: "Free",
    price: "$0",
    description: "For testing the platform before upgrading.",
    limitLabel: "1 video / month",
    durationLabel: "Up to 10 seconds",
    cta: "Use Free",
    isPaid: false,
  },
  {
    plan: "starter",
    title: "Starter",
    price: "$19",
    description: "For solo creators and small businesses.",
    limitLabel: "20 videos / month",
    durationLabel: "Up to 20 seconds",
    cta: "Choose Starter",
    isPaid: true,
  },
  {
    plan: "pro",
    title: "Pro",
    price: "$49",
    description: "For creators producing more frequent campaigns.",
    limitLabel: "50 videos / month",
    durationLabel: "Up to 30 seconds",
    cta: "Choose Pro",
    isPaid: true,
  },
  {
    plan: "agency",
    title: "Agency",
    price: "$149",
    description: "For teams and agencies needing scale.",
    limitLabel: "Unlimited videos",
    durationLabel: "Up to 30 seconds",
    cta: "Choose Agency",
    isPaid: true,
  },
];

export function BillingClient(props: Props) {
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);
  const [message, setMessage] = useState("");

  const styles = {
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 18,
      marginBottom: 18,
    } as React.CSSProperties,
    card: (active: boolean) =>
      ({
        background: "rgba(10,18,33,0.82)",
        border: active
          ? "1px solid rgba(59,130,246,0.35)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: 18,
        boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
      }) as React.CSSProperties,
    title: {
      fontSize: 20,
      fontWeight: 900,
      color: "#e7eef9",
      marginBottom: 6,
    } as React.CSSProperties,
    price: {
      fontSize: 34,
      fontWeight: 950,
      color: "#ffffff",
      marginBottom: 10,
    } as React.CSSProperties,
    desc: {
      color: "rgba(231,238,249,0.64)",
      fontSize: 13,
      lineHeight: 1.5,
      marginBottom: 14,
    } as React.CSSProperties,
    feature: {
      color: "#dce8f8",
      fontSize: 14,
      marginBottom: 8,
    } as React.CSSProperties,
    button: (active: boolean, disabled: boolean) =>
      ({
        width: "100%",
        marginTop: 14,
        padding: "12px 14px",
        borderRadius: 14,
        border: active
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(59,130,246,0.35)",
        background: active
          ? "rgba(255,255,255,0.06)"
          : disabled
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(180deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6))",
        color: "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 900,
      }) as React.CSSProperties,
    summary: {
      background: "rgba(10,18,33,0.82)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 22,
      padding: 18,
      boxShadow: "0 16px 40px rgba(0,0,0,0.28)",
    } as React.CSSProperties,
    summaryRow: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 14,
    } as React.CSSProperties,
    stat: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 14,
    } as React.CSSProperties,
    statLabel: {
      fontSize: 12,
      color: "rgba(231,238,249,0.62)",
      marginBottom: 6,
      textTransform: "uppercase",
      fontWeight: 800,
    } as React.CSSProperties,
    statValue: {
      fontSize: 24,
      fontWeight: 950,
      color: "#fff",
    } as React.CSSProperties,
    message: {
      marginTop: 14,
      fontSize: 14,
      color: "#d7ebff",
    } as React.CSSProperties,
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: "rgba(59,130,246,0.14)",
      border: "1px solid rgba(59,130,246,0.22)",
      color: "#d7ebff",
      marginBottom: 12,
    } as React.CSSProperties,
  };

  const currentPlanCard = useMemo(() => {
    return PLAN_CARDS.find((item) => item.plan === props.currentPlan);
  }, [props.currentPlan]);

  const handlePlanAction = async (plan: PlanName, isPaid: boolean) => {
    setMessage("");
    setLoadingPlan(plan);

    try {
      if (isPaid) {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan }),
        });

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? "Checkout start failed");
        }

        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        throw new Error("Checkout URL not returned");
      }

      const res = await fetch("/api/billing/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Plan update failed");
      }

      setMessage("Plan updated successfully. Refreshing...");
      window.location.reload();
    } catch (err: any) {
      setMessage(err?.message ?? "Billing action failed");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <div style={styles.summary}>
        <div style={styles.badge}>Stripe Billing</div>

        <div style={styles.summaryRow}>
          <div style={styles.stat}>
            <div style={styles.statLabel}>Current Plan</div>
            <div style={styles.statValue}>{props.currentPlanLabel}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Used This Month</div>
            <div style={styles.statValue}>{props.usedThisMonth}</div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Remaining Credits</div>
            <div style={styles.statValue}>
              {props.remainingCredits === null
                ? "∞"
                : props.remainingCredits}
            </div>
          </div>

          <div style={styles.stat}>
            <div style={styles.statLabel}>Max Duration</div>
            <div style={styles.statValue}>{props.maxDurationSec}s</div>
          </div>
        </div>

        {message ? <div style={styles.message}>{message}</div> : null}
      </div>

      <div style={{ height: 18 }} />

      <div style={styles.grid}>
        {PLAN_CARDS.map((item) => {
          const active = item.plan === props.currentPlan;
          const loading = loadingPlan === item.plan;

          return (
            <div key={item.plan} style={styles.card(active)}>
              <div style={styles.title}>{item.title}</div>
              <div style={styles.price}>{item.price}</div>
              <div style={styles.desc}>{item.description}</div>

              <div style={styles.feature}>{item.limitLabel}</div>
              <div style={styles.feature}>{item.durationLabel}</div>

              <button
                style={styles.button(active, loading)}
                disabled={active || loading}
                onClick={() => handlePlanAction(item.plan, item.isPaid)}
              >
                {active
                  ? "Current Plan"
                  : loading
                    ? "Please wait..."
                    : item.cta}
              </button>
            </div>
          );
        })}
      </div>

      {currentPlanCard ? (
        <div style={{ color: "rgba(231,238,249,0.62)", fontSize: 13 }}>
          Active plan: {currentPlanCard.title}
        </div>
      ) : null}
    </>
  );
}