import { getSql } from "./db";
import { getRemainingCredits, PLAN_RULES, type PlanName } from "./plans";

type StripeManagedPlan = "starter" | "pro" | "agency";

type UserProfileRow = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  plan: PlanName | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_current_period_end: string | null;
  monthly_video_count: number | null;
  monthly_video_reset_at: string | null;
  created_at: string;
  updated_at: string;
};

const PRICE_ID_TO_PLAN: Record<string, StripeManagedPlan> = {
  [process.env.STRIPE_PRICE_STARTER || ""]: "starter",
  [process.env.STRIPE_PRICE_PRO || ""]: "pro",
  [process.env.STRIPE_PRICE_AGENCY || ""]: "agency",
};

function resolvePlanFromPriceId(priceId?: string | null): PlanName {
  if (!priceId) return "free";
  return PRICE_ID_TO_PLAN[priceId] || "free";
}

export async function ensureUserProfile(input: {
  userId: string;
  email: string;
  fullName?: string | null;
}) {
  const sql = getSql();

  const rows: any[] = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan,
      monthly_video_count,
      monthly_video_reset_at
    )
    values (
      ${input.userId}::text,
      ${input.email},
      ${input.fullName ?? null},
      'free',
      0,
      now()
    )
    on conflict (user_id)
    do update set
      email = excluded.email,
      full_name = coalesce(excluded.full_name, user_profiles.full_name),
      updated_at = now()
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function getUserProfileByUserId(userId: string) {
  const sql = getSql();

  const rows: any[] = await sql`
    select *
    from user_profiles
    where user_id = ${userId}::text
    limit 1
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function setStripeCustomerForUser(input: {
  userId: string;
  stripeCustomerId: string;
}) {
  const sql = getSql();

  const rows: any[] = await sql`
    update user_profiles
    set
      stripe_customer_id = ${input.stripeCustomerId},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function setSubscriptionForUser(input: {
  userId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  plan?: PlanName | null;
}) {
  const sql = getSql();

  const resolvedPlan =
    input.plan ?? resolvePlanFromPriceId(input.stripePriceId ?? null) ?? "free";

  const rows: any[] = await sql`
    update user_profiles
    set
      stripe_subscription_id = ${input.stripeSubscriptionId ?? null},
      stripe_price_id = ${input.stripePriceId ?? null},
      stripe_current_period_end = ${input.stripeCurrentPeriodEnd ?? null}::timestamptz,
      plan = ${resolvedPlan},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function setSubscriptionByCustomerId(input: {
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  plan?: PlanName | null;
}) {
  const sql = getSql();

  const resolvedPlan =
    input.plan ?? resolvePlanFromPriceId(input.stripePriceId ?? null) ?? "free";

  const rows: any[] = await sql`
    update user_profiles
    set
      stripe_subscription_id = ${input.stripeSubscriptionId ?? null},
      stripe_price_id = ${input.stripePriceId ?? null},
      stripe_current_period_end = ${input.stripeCurrentPeriodEnd ?? null}::timestamptz,
      plan = ${resolvedPlan},
      updated_at = now()
    where stripe_customer_id = ${input.stripeCustomerId}
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function clearSubscriptionByCustomerId(stripeCustomerId: string) {
  const sql = getSql();

  const rows: any[] = await sql`
    update user_profiles
    set
      stripe_subscription_id = null,
      stripe_price_id = null,
      stripe_current_period_end = null,
      plan = 'free',
      updated_at = now()
    where stripe_customer_id = ${stripeCustomerId}
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function incrementMonthlyVideoCount(userId: string) {
  const sql = getSql();

  const rows: any[] = await sql`
    update user_profiles
    set
      monthly_video_count = coalesce(monthly_video_count, 0) + 1,
      updated_at = now()
    where user_id = ${userId}::text
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function resetMonthlyUsageIfNeeded(userId: string) {
  const sql = getSql();

  const rows: any[] = await sql`
    update user_profiles
    set
      monthly_video_count = 0,
      monthly_video_reset_at = now(),
      updated_at = now()
    where user_id = ${userId}::text
      and (
        monthly_video_reset_at is null
        or monthly_video_reset_at < now() - interval '1 month'
      )
    returning *
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function getResolvedUserPlan(userId: string) {
  const profile = await getUserProfileByUserId(userId);

  const plan = ((profile?.plan || "free") as PlanName) ?? "free";
  const rules = PLAN_RULES[plan];
  const usedThisMonth = profile?.monthly_video_count ?? 0;
  const remainingCredits = getRemainingCredits(plan, usedThisMonth);

  return {
    plan,
    planLabel: rules.label,
    usedThisMonth,
    remainingCredits,
    maxDurationSec: rules.maxDurationSec,
    monthlyVideoLimit: rules.monthlyVideoLimit,
  };
}

/* ---------------------------------------
   Backward-compatible exports
---------------------------------------- */

export const getUserProfile = getUserProfileByUserId;

export async function updateUserStripeCustomerId(input: {
  userId: string;
  stripeCustomerId: string;
}) {
  return setStripeCustomerForUser(input);
}

export async function updateUserSubscription(input: {
  userId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  plan?: PlanName | null;
}) {
  return setSubscriptionForUser(input);
}

export async function updateUserSubscriptionByCustomerId(input: {
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: string | null;
  plan?: PlanName | null;
}) {
  return setSubscriptionByCustomerId(input);
}

export async function updateUserPlan(input: {
  userId: string;
  plan: PlanName;
}) {
  const sql = getSql();

  const rows: any[] = await sql`
    update user_profiles
    set
      plan = ${input.plan},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning *
  `;

  return rows[0] ?? null;
}