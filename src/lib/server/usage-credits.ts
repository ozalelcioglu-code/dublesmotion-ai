import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "@/lib/user-profile-repository";

export type AppUsageSession = {
  userId: string;
  email: string;
  name?: string | null;
};

export type ResolvedUsageSession = AppUsageSession & {
  planInfo: Awaited<ReturnType<typeof getResolvedUserPlan>>;
};

function getSessionFromHeaders(req: Request): AppUsageSession | null {
  const userId = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");
  const name = req.headers.get("x-user-name");

  if (!userId || !email) return null;

  return {
    userId,
    email,
    name: name || null,
  };
}

async function getSessionFromCookie(): Promise<AppUsageSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("dubles_session")?.value;

    if (!raw) return null;

    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    if (!parsed?.userId || !parsed?.email) return null;

    return {
      userId: String(parsed.userId),
      email: String(parsed.email),
      name: parsed.name ? String(parsed.name) : null,
    };
  } catch {
    return null;
  }
}

export async function getUsageSession(
  req: Request
): Promise<AppUsageSession | null> {
  return getSessionFromHeaders(req) || (await getSessionFromCookie());
}

export async function resetMonthlyUsageIfNeeded(userId: string) {
  await sql`
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
  `;
}

export async function resolveUsageSession(
  req: Request
): Promise<ResolvedUsageSession | null> {
  const session = await getUsageSession(req);

  if (!session) return null;

  await ensureUserProfile({
    userId: session.userId,
    email: session.email,
    fullName: session.name ?? null,
  });
  await resetMonthlyUsageIfNeeded(session.userId);

  return {
    ...session,
    planInfo: await getResolvedUserPlan(session.userId),
  };
}

export async function tryConsumeUserCredits(userId: string, amount: number) {
  if (!amount || amount <= 0) {
    return { ok: true };
  }

  const plan = await getResolvedUserPlan(userId);

  const rows = (await sql`
    update user_profiles
    set
      monthly_video_count = coalesce(monthly_video_count, 0) + ${amount},
      updated_at = now()
    where user_id = ${userId}::text
      and ${amount} <= ${plan.monthlyCredits} - coalesce(monthly_video_count, 0)
    returning monthly_video_count
  `) as Array<{ monthly_video_count: number }>;

  return {
    ok: Boolean(rows[0]),
  };
}

export async function refundUserCredits(userId: string, amount: number) {
  if (!amount || amount <= 0) return;

  await sql`
    update user_profiles
    set
      monthly_video_count = greatest(0, coalesce(monthly_video_count, 0) - ${amount}),
      updated_at = now()
    where user_id = ${userId}::text
  `;
}

export function buildPlanLimitPayload(
  planInfo: Awaited<ReturnType<typeof getResolvedUserPlan>>
) {
  return {
    ok: false,
    code: "PLAN_LIMIT_REACHED",
    error: `Your ${planInfo.planLabel} plan credits have been exhausted.`,
    plan: {
      code: planInfo.plan,
      label: planInfo.planLabel,
      usedThisMonth: planInfo.usedThisMonth,
      remainingCredits: planInfo.remainingCredits,
      monthlyCredits: planInfo.monthlyCredits,
    },
  };
}
