"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PlanCode = "free" | "starter" | "pro" | "agency";

const PLAN_MAP: Record<
  PlanCode,
  {
    title: string;
    price: string;
    description: string;
  }
> = {
  free: {
    title: "Free",
    price: "$0",
    description: "Platformu test etmek için başlangıç planı.",
  },
  starter: {
    title: "Starter",
    price: "$19",
    description: "Başlangıç düzeyi içerik üretimi için uygun plan.",
  },
  pro: {
    title: "Pro",
    price: "$49",
    description: "Düzenli üretim yapan profesyoneller için.",
  },
  agency: {
    title: "Agency",
    price: "$249",
    description: "Ajans ve yüksek hacimli kullanım için.",
  },
};

export default function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plan = (searchParams.get("plan") || "free") as PlanCode;

  const selectedPlan = useMemo(() => {
    return PLAN_MAP[plan] || PLAN_MAP.free;
  }, [plan]);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Checkout başlatılamadı.");
      }

      if (!data?.url) {
        throw new Error("Stripe checkout URL dönmedi.");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.root}>
      <div style={styles.card}>
        <div style={styles.badge}>CHECKOUT</div>
        <h1 style={styles.title}>{selectedPlan.title} Plan</h1>
        <div style={styles.price}>{selectedPlan.price}</div>
        <p style={styles.desc}>{selectedPlan.description}</p>

        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span>Seçilen plan</span>
            <strong>{selectedPlan.title}</strong>
          </div>
          <div style={styles.infoRow}>
            <span>Ödeme</span>
            <strong>{selectedPlan.price}</strong>
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() => router.push("/billing")}
          >
            Geri Dön
          </button>

          <button
            type="button"
            style={{
              ...styles.primaryBtn,
              ...(loading ? styles.primaryBtnDisabled : {}),
            }}
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? "Yönlendiriliyor..." : "Stripe ile Devam Et"}
          </button>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 20,
    background:
      "linear-gradient(135deg, #f8fbff 0%, #eef4ff 38%, #f7f2ff 100%)",
  },

  card: {
    width: "100%",
    maxWidth: 560,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.06)",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
  },

  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 12,
  },

  title: {
    margin: 0,
    fontSize: 34,
    lineHeight: 1.1,
    fontWeight: 900,
    color: "#0f172a",
  },

  price: {
    marginTop: 12,
    fontSize: 56,
    lineHeight: 1,
    fontWeight: 900,
    color: "#0f172a",
  },

  desc: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 1.6,
    color: "#64748b",
  },

  infoBox: {
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 14,
    color: "#334155",
  },

  error: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    background: "rgba(254,226,226,0.9)",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: 700,
  },

  actions: {
    marginTop: 22,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  secondaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  },

  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  primaryBtnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
};