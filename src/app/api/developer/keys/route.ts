import { NextResponse } from "next/server";
import {
  createDeveloperApiKey,
  listDeveloperApiKeys,
} from "@/lib/server/developer-api-keys";
import { resolveUsageSession } from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await resolveUsageSession(req);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const keys = await listDeveloperApiKeys(session.userId);

    return NextResponse.json({
      ok: true,
      keys,
      plan: session.planInfo,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "API keys could not be read",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await resolveUsageSession(req);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const name =
      typeof body?.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 80)
        : "Production key";

    const result = await createDeveloperApiKey({
      userId: session.userId,
      email: session.email,
      name,
      scopes: ["generate"],
    });

    return NextResponse.json({
      ok: true,
      key: result.key,
      secret: result.secret,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "API key could not be created",
      },
      { status: 500 }
    );
  }
}
