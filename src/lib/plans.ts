export type PlanName = "free" | "starter" | "pro" | "agency";

export const PLAN_RULES: Record<
  PlanName,
  {
    label: string;
    monthlyVideoLimit: number | null;
    maxDurationSec: number;
  }
> = {
  free: {
    label: "Free",
    monthlyVideoLimit: 1,
    maxDurationSec: 10,
  },
  starter: {
    label: "Starter",
    monthlyVideoLimit: 20,
    maxDurationSec: 20,
  },
  pro: {
    label: "Pro",
    monthlyVideoLimit: 50,
    maxDurationSec: 30,
  },
  agency: {
    label: "Agency",
    monthlyVideoLimit: null, // unlimited
    maxDurationSec: 30,
  },
};

export function getRemainingCredits(
  plan: PlanName,
  usedThisMonth: number
): number | null {
  const rule = PLAN_RULES[plan];

  if (rule.monthlyVideoLimit === null) {
    return null;
  }

  return Math.max(rule.monthlyVideoLimit - usedThisMonth, 0);
}