import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSql } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId is required" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_APP_URL) {
      return NextResponse.json(
        { ok: false, error: "Missing NEXT_PUBLIC_APP_URL" },
        { status: 500 }
      );
    }

    const sql = getSql();

    const rows = await sql`
      select stripe_customer_id
      from subscriptions
      where user_id = ${userId}
      and stripe_customer_id is not null
      order by created_at desc
      limit 1
    `;

    const customerId = rows?.[0]?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json(
        { ok: false, error: "No Stripe customer found" },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create portal session",
      },
      { status: 500 }
    );
  }
}