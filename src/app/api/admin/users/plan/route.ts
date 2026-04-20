import { NextResponse } from "next/server";
import {
  getNormalizedPlanCode,
  manuallyUpdateUserPlan,
} from "@/lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_API_SECRET = process.env.ADMIN_API_SECRET || "";

function isAuthorized(req: Request) {
  const token = req.headers.get("x-admin-secret") || "";
  return Boolean(ADMIN_API_SECRET && token === ADMIN_API_SECRET);
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawPlanCode = typeof body?.planCode === "string" ? body.planCode : "";
  const planCode = getNormalizedPlanCode(rawPlanCode);
  const userId = typeof body?.userId === "string" ? body.userId : null;
  const email = typeof body?.email === "string" ? body.email : null;
  const paymentStatus =
    typeof body?.paymentStatus === "string" ? body.paymentStatus : null;
  const resetMonthlyUsage = Boolean(body?.resetMonthlyUsage);

  if (!userId && !email) {
    return NextResponse.json(
      { ok: false, error: "userId or email is required" },
      { status: 400 }
    );
  }

  if (!rawPlanCode || planCode !== rawPlanCode) {
    return NextResponse.json(
      { ok: false, error: "Invalid planCode" },
      { status: 400 }
    );
  }

  const profile = await manuallyUpdateUserPlan({
    userId,
    email,
    planCode,
    paymentStatus,
    resetMonthlyUsage,
  });

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "User profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    profile: {
      userId: profile.user_id,
      email: profile.email,
      planCode: profile.plan_code,
      planLabel: profile.plan_label,
      paymentStatus: profile.payment_status,
      usedThisMonth: profile.monthly_video_count ?? 0,
      updatedAt: profile.updated_at ?? null,
    },
  });
}
