import { sql } from "./db";
import { getPlanCredits, PLAN_CONFIG, type PlanCode } from "./plans";

type UserProfileRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  plan_code: PlanCode | null;
  plan_label: string | null;
  pending_plan_code: string | null;
  payment_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  monthly_video_count: number | null;
  monthly_video_reset_at: string | null;
  created_at?: string;
  updated_at?: string;
};

function normalizePlanCode(value?: string | null): PlanCode {
  if (value === "starter" || value === "pro" || value === "agency") {
    return value;
  }
  return "free";
}

function resolvePlanLabel(planCode: PlanCode): string {
  return PLAN_CONFIG[planCode].label;
}

export async function ensureUserProfile(input: {
  userId: string;
  email: string;
  fullName?: string | null;
}) {
  const existingByUserId: any[] = await sql`
    select
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
    from user_profiles
    where user_id = ${input.userId}::text
    limit 1
  `;

  if (existingByUserId[0]) {
    const updatedRows: any[] = await sql`
      update user_profiles
      set
        email = ${input.email},
        full_name = coalesce(${input.fullName ?? null}, full_name),
        updated_at = now()
      where user_id = ${input.userId}::text
      returning
        user_id,
        email,
        full_name,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        monthly_video_count,
        monthly_video_reset_at,
        created_at,
        updated_at
    `;

    return (updatedRows[0] ?? null) as UserProfileRow | null;
  }

  const existingByEmail: any[] = await sql`
    select
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
    from user_profiles
    where email = ${input.email}
    limit 1
  `;

  if (existingByEmail[0]) {
    const updatedRows: any[] = await sql`
      update user_profiles
      set
        user_id = ${input.userId}::text,
        full_name = coalesce(${input.fullName ?? null}, full_name),
        updated_at = now()
      where email = ${input.email}
      returning
        user_id,
        email,
        full_name,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        monthly_video_count,
        monthly_video_reset_at,
        created_at,
        updated_at
    `;

    return (updatedRows[0] ?? null) as UserProfileRow | null;
  }

  const insertedRows: any[] = await sql`
    insert into user_profiles (
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
    )
    values (
      ${input.userId}::text,
      ${input.email},
      ${input.fullName ?? null},
      'free',
      'Free',
      null,
      'unpaid',
      0,
      now(),
      now(),
      now()
    )
    returning
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
  `;

  return (insertedRows[0] ?? null) as UserProfileRow | null;
}

export async function getUserProfileByUserId(userId: string) {
  const rows: any[] = await sql`
    select
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
    from user_profiles
    where user_id = ${userId}::text
    limit 1
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function getUserProfileByEmail(email: string) {
  const rows: any[] = await sql`
    select
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
    from user_profiles
    where email = ${email}
    limit 1
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function updateUserStripeCustomerId(input: {
  userId: string;
  stripeCustomerId: string;
}) {
  const rows: any[] = await sql`
    update user_profiles
    set
      stripe_customer_id = ${input.stripeCustomerId},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function incrementMonthlyVideoCount(userId: string) {
  const rows: any[] = await sql`
    update user_profiles
    set
      monthly_video_count = coalesce(monthly_video_count, 0) + 1,
      updated_at = now()
    where user_id = ${userId}::text
    returning
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function resetMonthlyVideoCount(userId: string) {
  const rows: any[] = await sql`
    update user_profiles
    set
      monthly_video_count = 0,
      monthly_video_reset_at = now(),
      updated_at = now()
    where user_id = ${userId}::text
    returning
      user_id,
      email,
      full_name,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      monthly_video_count,
      monthly_video_reset_at,
      created_at,
      updated_at
  `;

  return (rows[0] ?? null) as UserProfileRow | null;
}

export async function getResolvedUserPlan(userId: string) {
  const profile = await getUserProfileByUserId(userId);

  const plan = normalizePlanCode(profile?.plan_code);
  const used = Number(profile?.monthly_video_count ?? 0);
  const totalCredits = getPlanCredits(plan);
  const remainingCredits = Math.max(0, totalCredits - used);

  return {
    plan,
    planLabel: profile?.plan_label || resolvePlanLabel(plan),
    pendingPlanCode: profile?.pending_plan_code || null,
    paymentStatus: profile?.payment_status || "unpaid",
    usedThisMonth: used,
    remainingCredits,
    monthlyCredits: totalCredits,
    stripeCustomerId: profile?.stripe_customer_id || null,
    stripeSubscriptionId: profile?.stripe_subscription_id || null,
  };
}