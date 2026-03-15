import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../../lib/user-profile-repository";

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        {
          ok: false,
          user: null,
        },
        { status: 200 }
      );
    }

    await ensureUserProfile({
      userId: session.user.id,
      email: session.user.email,
      fullName: session.user.name ?? null,
    });

    const planInfo = await getResolvedUserPlan(session.user.id);

    return NextResponse.json({
      ok: true,
      user: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        plan: planInfo.plan,
        planLabel: planInfo.planLabel,
        remainingCredits: planInfo.remainingCredits,
        usedThisMonth: planInfo.usedThisMonth,
        maxDurationSec: planInfo.maxDurationSec,
        monthlyVideoLimit: planInfo.monthlyVideoLimit,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to load user",
      },
      { status: 500 }
    );
  }
}