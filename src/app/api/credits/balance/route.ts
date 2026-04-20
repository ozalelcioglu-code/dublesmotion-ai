import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "@/lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppSession = {
  userId: string;
  email: string;
  name?: string;
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
    };
  } catch {
    return null;
  }
}

export async function GET() {
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

    const resolved = await getResolvedUserPlan(session.userId);

    return NextResponse.json({
      ok: true,
      balance: resolved.remainingCredits,
      remainingCredits: resolved.remainingCredits,
      monthlyCredits: resolved.monthlyCredits,
      usedThisMonth: resolved.usedThisMonth,
      planCode: resolved.plan,
      planLabel: resolved.planLabel,
    });
  } catch (error: any) {
    console.error("Credit balance read failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Credit balance read failed",
      },
      { status: 500 }
    );
  }
}