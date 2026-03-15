import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  ensureUserProfile,
  updateUserPlan,
} from "../../../../lib/user-profile-repository";
import type { PlanName } from "../../../../lib/plans";

const ALLOWED_PLANS: PlanName[] = ["free", "starter", "pro", "agency"];

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const userName = session?.user?.name;

    if (!userId || !userEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = body?.plan as PlanName;

    if (!ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid plan",
        },
        { status: 400 }
      );
    }

    const billingMode = process.env.BILLING_MODE ?? "test";

    await ensureUserProfile({
      userId,
      email: userEmail,
      fullName: userName ?? null,
    });

    if (billingMode === "test") {
      const updated = await updateUserPlan({
  userId,
  plan,
});
      return NextResponse.json(
        {
          ok: true,
          mode: "test",
          message: "Plan updated in test mode.",
          profile: updated,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Direct plan update is disabled in live billing mode.",
      },
      { status: 403 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Plan update failed",
      },
      { status: 500 }
    );
  }
}