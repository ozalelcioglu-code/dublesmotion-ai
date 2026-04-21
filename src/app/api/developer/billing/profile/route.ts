import { NextResponse } from "next/server";
import {
  DEVELOPER_API_PRICES,
  DEVELOPER_API_TOPUP_PACKS,
  getDeveloperApiWallet,
  listDeveloperApiLedger,
  reconcileDeveloperApiTopupSession,
} from "@/lib/server/developer-api-billing";
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

    const url = new URL(req.url);
    const checkoutSessionId = url.searchParams.get("session_id");

    if (checkoutSessionId) {
      await reconcileDeveloperApiTopupSession({
        sessionId: checkoutSessionId,
        userId: session.userId,
        userEmail: session.email,
        requireUserMatch: true,
      });
    }

    const wallet = await getDeveloperApiWallet({
      userId: session.userId,
      email: session.email,
    });
    const ledger = await listDeveloperApiLedger({
      userId: session.userId,
      limit: 20,
    });

    return NextResponse.json({
      ok: true,
      wallet,
      prices: DEVELOPER_API_PRICES,
      packs: DEVELOPER_API_TOPUP_PACKS,
      ledger,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Developer API billing profile could not be read",
      },
      { status: 500 }
    );
  }
}
