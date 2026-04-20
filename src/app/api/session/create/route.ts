import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name =
      typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim() : "";
    const planCode =
      typeof body?.planCode === "string" ? body.planCode.trim() : "free";

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const sessionPayload = {
      userId: email,
      email,
      name: name || email.split("@")[0] || "User",
      planCode: planCode || "free",
    };

    const res = NextResponse.json({
      ok: true,
      user: sessionPayload,
    });

    res.cookies.set(
      "dubles_session",
      encodeURIComponent(JSON.stringify(sessionPayload)),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }
    );

    return res;
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Session creation failed",
      },
      { status: 500 }
    );
  }
}