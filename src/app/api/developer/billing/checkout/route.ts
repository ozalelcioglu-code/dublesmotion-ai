import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getDeveloperApiTopupPack,
  centsToDollars,
} from "@/lib/server/developer-api-billing";
import { resolveUsageSession } from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

function getBaseUrl(req: Request) {
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "";

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
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
    const packId = typeof body?.packId === "string" ? body.packId : "";
    const pack = getDeveloperApiTopupPack(packId);

    if (!pack) {
      return NextResponse.json(
        { ok: false, error: "Invalid API balance pack" },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: session.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pack.amountCents,
            product_data: {
              name: `Duble-S Motion ${pack.label}`,
              description: `${centsToDollars(
                pack.amountCents + pack.bonusCents
              )} API balance`,
              metadata: {
                kind: "api_topup",
                packId: pack.id,
              },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/developers?api_topup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/developers?api_topup=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: session.userId,
      metadata: {
        kind: "api_topup",
        packId: pack.id,
        userId: session.userId,
        userEmail: session.email,
        amountCents: String(pack.amountCents),
        bonusCents: String(pack.bonusCents),
      },
    });

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "API balance checkout could not be started",
      },
      { status: 500 }
    );
  }
}
