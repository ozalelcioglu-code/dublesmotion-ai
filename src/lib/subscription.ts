import { getSql } from "./db";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (!userId?.trim()) return false;

  const sql = getSql();

  const rows = await sql`
    select status, current_period_end
    from subscriptions
    where user_id = ${userId}
    order by created_at desc
    limit 1
  `;

  const sub = rows?.[0];
  if (!sub) return false;

  const status = String(sub.status ?? "") as SubscriptionStatus;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end)
    : null;

  if (status === "active" || status === "trialing") {
    if (!currentPeriodEnd) return true;
    return currentPeriodEnd.getTime() > Date.now();
  }

  return false;
}

export async function requireActiveSubscription(userId: string) {
  const ok = await hasActiveSubscription(userId);
  if (!ok) {
    throw new Error("Active subscription required");
  }
}