import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import {
  stripe,
  STRIPE_PRICE_MAP,
  type PaidPlanName,
} from "../../../../lib/stripe";
import {
  ensureUserProfile,
  getUserProfile,
  updateUserStripeCustomerId,
} from "../../../../lib/user-profile-repository";

function isPaidPlan(value: unknown): value is PaidPlanName {
  return value === "starter" || value === "pro" || value === "agency";
}

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
    const rawPlan = body?.plan;

    if (!isPaidPlan(rawPlan)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid paid plan",
        },
        { status: 400 }
      );
    }

    const plan = rawPlan;
    const billingMode = (process.env.BILLING_MODE ?? "stripe").toLowerCase();

    if (billingMode !== "stripe") {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe billing is not enabled.",
        },
        { status: 400 }
      );
    }

    await ensureUserProfile({
      userId,
      email: userEmail,
      fullName: userName ?? null,
    });

    const profile = await getUserProfile(userId);

    let customerId = profile?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName ?? undefined,
        metadata: {
          userId,
        },
      });

      customerId = customer.id;
      await updateUserStripeCustomerId({
  userId,
  stripeCustomerId: customer.id,
});
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "http://localhost:3000";

    const priceId = STRIPE_PRICE_MAP[plan];

    if (!priceId) {
      return NextResponse.json(
        {
          ok: false,
          error: `Missing Stripe price for ${plan}`,
        },
        { status: 500 }
      );
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    if (!checkout.url) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe checkout URL was not returned",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        checkoutUrl: checkout.url,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("STRIPE_CHECKOUT_ERROR:", err?.message || err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Checkout failed",
      },
      { status: 500 }
    );
  }
}