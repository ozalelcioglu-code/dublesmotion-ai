export type PlanCode = "free" | "starter" | "pro" | "agency";

export type Plan = {
  code: PlanCode;
  label: string;
  priceMonthly: number;
  priceYearly: number;
  creditsMonthly: number;
  highlight?: boolean;
};

export const PLAN_CONFIG: Record<PlanCode, Plan> = {
  free: {
    code: "free",
    label: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    creditsMonthly: 40,
  },

  starter: {
    code: "starter",
    label: "Starter",
    priceMonthly: 29,
    priceYearly: 290, // 2 ay indirim
    creditsMonthly: 450,
  },

  pro: {
    code: "pro",
    label: "Pro",
    priceMonthly: 59,
    priceYearly: 590,
    creditsMonthly: 1600,
    highlight: true, // UI'da "most popular"
  },

  agency: {
    code: "agency",
    label: "Agency",
    priceMonthly: 399,
    priceYearly: 3990,
    creditsMonthly: 14000,
  },
};


// 🔹 Tek plan çek
export function getPlanByCode(code: PlanCode): Plan {
  return PLAN_CONFIG[code];
}

// 🔹 Tüm planları listele (billing page için)
export function getAllPlans(): Plan[] {
  return Object.values(PLAN_CONFIG);
}

// 🔹 kredi sıfırlama (aylık reset için ileride lazım)
export function getPlanCredits(code: PlanCode): number {
  return PLAN_CONFIG[code].creditsMonthly;
}