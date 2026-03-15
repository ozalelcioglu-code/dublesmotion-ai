import Stripe from "stripe";
import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { getSql } from "../../../../lib/db";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../../../lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BETTER_AUTH_URL ||
  "http://localhost:3000";

const stripe = new Stripe(stripeSecretKey);

type PlanCode = "starter" | "pro" | "agency";

const PRICE_BY_PLAN: Record<PlanCode, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
};

function isValidPlan(plan: unknown): plan is PlanCode {
  return plan === "starter" || plan === "pro" || plan === "agency";
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "You must be logged in to start checkout.",
        },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const plan = body?.plan;

    if (!isValidPlan(plan)) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PLAN",
          error: "Missing or invalid plan.",
        },
        { status: 400 }
      );
    }

    const priceId = PRICE_BY_PLAN[plan];

    if (!priceId) {
      return NextResponse.json(
        {
          ok: false,
          code: "MISSING_PRICE_CONFIG",
          error: `Stripe price id is missing for plan: ${plan}`,
        },
        { status: 500 }
      );
    }

    await ensureUserProfile({
      userId: session.user.id,
      email: session.user.email,
      fullName: session.user.name ?? null,
    });

    const currentPlan = await getResolvedUserPlan(session.user.id);

    if (currentPlan?.plan === plan) {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_ON_PLAN",
          error: `You are already on the ${currentPlan.planLabel ?? plan} plan.`,
        },
        { status: 400 }
      );
    }

    const sql = getSql();

    const userProfileRows = await sql<{
      stripe_customer_id: string | null;
    }>`
      select stripe_customer_id
      from user_profiles
      where user_id = ${session.user.id}
      limit 1
    `;

    let stripeCustomerId = userProfileRows[0]?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      stripeCustomerId = customer.id;

      await sql`
        update user_profiles
        set
          stripe_customer_id = ${stripeCustomerId},
          updated_at = now()
        where user_id = ${session.user.id}
      `;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      allow_promotion_codes: true,
      client_reference_id: session.user.id,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      metadata: {
        userId: session.user.id,
        plan,
        email: session.user.email,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
          email: session.user.email,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          ok: false,
          code: "NO_CHECKOUT_URL",
          error: "Stripe checkout URL was not created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
    });
  } catch (err: any) {
    console.error("Create checkout session failed:", err);

    return NextResponse.json(
      {
        ok: false,
        code: "CHECKOUT_SESSION_FAILED",
        error: err?.message ?? "Failed to create checkout session.",
      },
      { status: 500 }
    );
  }
}