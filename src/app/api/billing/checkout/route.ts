import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sql } from "@/lib/db";
import { ensureUserProfile } from "@/lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(stripeSecretKey);

const PRICE_MAP = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
  starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "",
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  agency_monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || "",
  agency_yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || "",
} as const;

type CheckoutPlan = keyof typeof PRICE_MAP;

type AppSession = {
  userId: string;
  email: string;
  name?: string;
  planCode?: string;
};

type CheckoutProfileRow = {
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_code: string | null;
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
      planCode: parsed.planCode ? String(parsed.planCode) : undefined,
    };
  } catch {
    return null;
  }
}

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

function isCheckoutPlan(value: unknown): value is CheckoutPlan {
  return (
    value === "starter_monthly" ||
    value === "starter_yearly" ||
    value === "pro_monthly" ||
    value === "pro_yearly" ||
    value === "agency_monthly" ||
    value === "agency_yearly"
  );
}

export async function POST(req: Request) {
  try {
    const appSession = await getAppSessionFromCookie();

    if (!appSession?.userId || !appSession?.email) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await ensureUserProfile({
      userId: appSession.userId,
      email: appSession.email,
      fullName: appSession.name ?? null,
    });

    const body = await req.json().catch(() => null);
    const plan = body?.plan;

    if (!isCheckoutPlan(plan)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bu plan için ödeme akışı tanımlı değil.",
        },
        { status: 400 }
      );
    }

    const priceId = PRICE_MAP[plan];

    if (!priceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Stripe price ID eksik.",
        },
        { status: 400 }
      );
    }

    const existingRows = (await sql`
      select
        user_id,
        email,
        stripe_customer_id,
        stripe_subscription_id,
        plan_code
      from user_profiles
      where user_id = ${appSession.userId}::text
         or email = ${appSession.email}
      order by updated_at desc
      limit 1
    `) as CheckoutProfileRow[];

    const profileRow = existingRows[0] ?? null;

    if (!profileRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kullanıcı profili bulunamadı.",
        },
        { status: 404 }
      );
    }

    const dbUserId = String(profileRow.user_id);
    const dbEmail = String(profileRow.email);
    let stripeCustomerId = profileRow.stripe_customer_id || null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: dbEmail,
        name: appSession.name || undefined,
        metadata: {
          userId: dbUserId,
          userEmail: dbEmail,
        },
      });

      stripeCustomerId = customer.id;

      await sql`
        update user_profiles
        set
          stripe_customer_id = ${stripeCustomerId},
          updated_at = now()
        where user_id = ${dbUserId}::text
      `;
    }

    const baseUrl = getBaseUrl(req);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing?checkout=cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: dbUserId,
      metadata: {
        userId: dbUserId,
        userEmail: dbEmail,
        selectedPlan: plan,
      },
      subscription_data: {
        metadata: {
          userId: dbUserId,
          userEmail: dbEmail,
          selectedPlan: plan,
        },
      },
    });

    await sql`
      update user_profiles
      set
        pending_plan_code = ${plan},
        payment_status = 'pending',
        stripe_checkout_session_id = ${checkoutSession.id},
        stripe_customer_id = ${stripeCustomerId},
        updated_at = now()
      where user_id = ${dbUserId}::text
    `;

    return NextResponse.json({
      ok: true,
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("Checkout session creation failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Checkout session creation failed",
      },
      { status: 500 }
    );
  }
}
