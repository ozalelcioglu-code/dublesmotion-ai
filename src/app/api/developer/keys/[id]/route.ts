import { NextResponse } from "next/server";
import { revokeDeveloperApiKey } from "@/lib/server/developer-api-keys";
import { resolveUsageSession } from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await resolveUsageSession(req);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const key = await revokeDeveloperApiKey({
      userId: session.userId,
      id,
    });

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, key });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "API key could not be revoked",
      },
      { status: 500 }
    );
  }
}
