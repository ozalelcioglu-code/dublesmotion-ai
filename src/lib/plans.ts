export type PlanName = "free" | "starter" | "pro" | "agency";

export const PLAN_RULES: Record<
  PlanName,
  {
    label: string;
    monthlyVideoLimit: number | null;
    maxDurationSec: number;
    limitScope: "lifetime" | "monthly";
  }
> = {
  free: {
    label: "Free",
    monthlyVideoLimit: 1,
    maxDurationSec: 10,
    limitScope: "lifetime",
  },
  starter: {
    label: "Starter",
    monthlyVideoLimit: 20,
    maxDurationSec: 20,
    limitScope: "monthly",
  },
  pro: {
    label: "Pro",
    monthlyVideoLimit: 50,
    maxDurationSec: 30,
    limitScope: "monthly",
  },
  agency: {
    label: "Agency",
    monthlyVideoLimit: null,
    maxDurationSec: 30,
    limitScope: "monthly",
  },
};

export function getRemainingCredits(
  plan: PlanName,
  usedInScope: number
): number | null {
  const rule = PLAN_RULES[plan];

  if (rule.monthlyVideoLimit === null) {
    return null;
  }

  return Math.max(rule.monthlyVideoLimit - usedInScope, 0);
}