import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSql } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!stripeWebhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey);

const PRICE_TO_PLAN: Record<string, "starter" | "pro" | "agency"> = {
  [process.env.STRIPE_PRICE_STARTER || "price_starter"]: "starter",
  [process.env.STRIPE_PRICE_PRO || "price_pro"]: "pro",
  [process.env.STRIPE_PRICE_AGENCY || "price_agency"]: "agency",
};

function resolvePlanFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return "free";
  return PRICE_TO_PLAN[priceId] || "free";
}

function resolvePlanLabel(plan: string) {
  switch (plan) {
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "agency":
      return "Agency";
    default:
      return "Free";
  }
}

async function updateUserPlanByCustomerId(params: {
  stripeCustomerId: string;
  plan: "free" | "starter" | "pro" | "agency";
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const sql = getSql();

  await sql`
    update user_profiles
    set
      plan = ${params.plan},
      plan_label = ${resolvePlanLabel(params.plan)},
      stripe_customer_id = ${params.stripeCustomerId},
      stripe_subscription_id = ${params.subscriptionId ?? null},
      subscription_status = ${params.subscriptionStatus ?? null},
      current_period_ends_at = ${params.currentPeriodEnd ?? null},
      updated_at = now()
    where stripe_customer_id = ${params.stripeCustomerId}
  `;
}

async function updateUserPlanByUserId(params: {
  userId: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  plan: "free" | "starter" | "pro" | "agency";
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  const sql = getSql();

  await sql`
    insert into user_profiles (
      user_id,
      email,
      plan,
      plan_label,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      current_period_ends_at,
      updated_at
    )
    values (
      ${params.userId},
      ${params.email ?? null},
      ${params.plan},
      ${resolvePlanLabel(params.plan)},
      ${params.stripeCustomerId ?? null},
      ${params.subscriptionId ?? null},
      ${params.subscriptionStatus ?? null},
      ${params.currentPeriodEnd ?? null},
      now()
    )
    on conflict (user_id)
    do update set
      email = coalesce(excluded.email, user_profiles.email),
      plan = excluded.plan,
      plan_label = excluded.plan_label,
      stripe_customer_id = coalesce(excluded.stripe_customer_id, user_profiles.stripe_customer_id),
      stripe_subscription_id = excluded.stripe_subscription_id,
      subscription_status = excluded.subscription_status,
      current_period_ends_at = excluded.current_period_ends_at,
      updated_at = now()
  `;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId =
    typeof session.metadata?.userId === "string" ? session.metadata.userId : null;

  const email =
    typeof session.customer_details?.email === "string"
      ? session.customer_details.email
      : typeof session.customer_email === "string"
      ? session.customer_email
      : null;

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId || !stripeCustomerId || !subscriptionId) {
    console.warn("checkout.session.completed missing userId/customer/subscription");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const plan = resolvePlanFromPriceId(priceId) as
    | "free"
    | "starter"
    | "pro"
    | "agency";

  const currentPeriodEnd =
    typeof subscription.items.data[0]?.current_period_end === "number"
      ? new Date(subscription.items.data[0].current_period_end * 1000)
      : typeof (subscription as any).current_period_end === "number"
      ? new Date((subscription as any).current_period_end * 1000)
      : null;

  await updateUserPlanByUserId({
    userId,
    email,
    stripeCustomerId,
    plan,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!stripeCustomerId) return;

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price?.id ?? null;
  const plan = resolvePlanFromPriceId(priceId) as
    | "free"
    | "starter"
    | "pro"
    | "agency";

  const currentPeriodEnd =
    typeof subscription.items.data[0]?.current_period_end === "number"
      ? new Date(subscription.items.data[0].current_period_end * 1000)
      : typeof (subscription as any).current_period_end === "number"
      ? new Date((subscription as any).current_period_end * 1000)
      : null;

  await updateUserPlanByCustomerId({
    stripeCustomerId,
    plan,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!stripeCustomerId) return;

  await updateUserPlanByCustomerId({
    stripeCustomerId,
    plan: "free",
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: null,
  });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing stripe-signature header",
        },
        { status: 400 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }

      default: {
        console.log(`Unhandled Stripe event: ${event.type}`);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Stripe webhook failed:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Webhook failed",
      },
      { status: 400 }
    );
  }
}