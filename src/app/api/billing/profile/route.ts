import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureUserProfile, getResolvedUserPlan } from "@/lib/user-profile-repository";
import {
  reconcileCheckoutSessionPlan,
  reconcilePendingBillingForUser,
} from "@/lib/server/billing-plan-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppSession = {
  userId: string;
  email: string;
  name?: string;
  planCode?: string;
};

async function getAppSessionFromCookie(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("dubles_session")?.value;

  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    if (!parsed?.userId || !parsed?.email) {
      return null;
    }

    return {
      userId: String(parsed.userId),
      email: String(parsed.email),
      name: parsed.name ? String(parsed.name) : undefined,
      planCode: parsed.planCode ? String(parsed.planCode) : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const session = await getAppSessionFromCookie();

    if (!session?.userId || !session?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureUserProfile({
      userId: session.userId,
      email: session.email,
      fullName: session.name ?? null,
    });

    const url = new URL(req.url);
    const checkoutSessionId = url.searchParams.get("session_id");

    if (checkoutSessionId) {
      await reconcileCheckoutSessionPlan({
        sessionId: checkoutSessionId,
        userId: session.userId,
        userEmail: session.email,
        requireUserMatch: true,
      });
    }

    await reconcilePendingBillingForUser({
      userId: session.userId,
      userEmail: session.email,
    });

    const resolved = await getResolvedUserPlan(session.userId);

    return NextResponse.json({
      ok: true,
      profile: {
        userId: session.userId,
        email: session.email,
        planCode: resolved.plan,
        planLabel: resolved.planLabel,
        pendingPlanCode: resolved.pendingPlanCode,
        paymentStatus: resolved.paymentStatus,
        stripeCustomerId: resolved.stripeCustomerId,
        stripeSubscriptionId: resolved.stripeSubscriptionId,
        credits: resolved.remainingCredits,
        monthlyCredits: resolved.monthlyCredits,
        usedThisMonth: resolved.usedThisMonth,
      },
    });
  } catch (error: unknown) {
    console.error("Billing profile read failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Billing profile read failed",
      },
      { status: 500 }
    );
  }
}
