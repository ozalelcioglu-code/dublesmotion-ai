import Stripe from "stripe";
import { sql } from "@/lib/db";

export type FinalPlanCode = "free" | "starter" | "pro" | "agency";
export type CheckoutPlanCode =
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly"
  | "agency_monthly"
  | "agency_yearly";

type ProfileMatch = {
  userId?: string | null;
  userEmail?: string | null;
  customerId?: string | null;
};

type ProfileUpdateRow = {
  user_id: string;
  email: string;
  plan_code: FinalPlanCode | null;
  plan_label: string | null;
  pending_plan_code: string | null;
  payment_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  updated_at: string;
};

let stripeClient: Stripe | null | undefined;

function getStripeClient() {
  if (stripeClient !== undefined) return stripeClient;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
  stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
  return stripeClient;
}

function getObjectId(value: unknown) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }

  return null;
}

function isActiveSubscription(subscription?: Stripe.Subscription | null) {
  return subscription?.status === "active" || subscription?.status === "trialing";
}

function getPlanPriceMap() {
  return {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || "",
    starter_yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || "",
    pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
    agency_monthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || "",
    agency_yearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || "",
  } satisfies Record<CheckoutPlanCode, string>;
}

export function normalizeCheckoutPlanCode(
  value?: string | null
): CheckoutPlanCode | FinalPlanCode | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace("_montly", "_monthly");

  if (
    normalized === "starter_monthly" ||
    normalized === "starter_yearly" ||
    normalized === "pro_monthly" ||
    normalized === "pro_yearly" ||
    normalized === "agency_monthly" ||
    normalized === "agency_yearly" ||
    normalized === "starter" ||
    normalized === "pro" ||
    normalized === "agency" ||
    normalized === "free"
  ) {
    return normalized as CheckoutPlanCode | FinalPlanCode;
  }

  return null;
}

export function mapSelectedPlanToPlanCode(
  selectedPlan?: string | null
): FinalPlanCode {
  const normalized = normalizeCheckoutPlanCode(selectedPlan);

  if (!normalized) return "free";
  if (normalized === "starter" || normalized.startsWith("starter_")) {
    return "starter";
  }
  if (normalized === "pro" || normalized.startsWith("pro_")) return "pro";
  if (normalized === "agency" || normalized.startsWith("agency_")) {
    return "agency";
  }

  return "free";
}

export function mapPlanCodeToLabel(planCode: FinalPlanCode) {
  switch (planCode) {
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

function mapPriceIdToSelectedPlan(priceId?: string | null) {
  if (!priceId) return null;

  const entries = Object.entries(getPlanPriceMap()) as Array<
    [CheckoutPlanCode, string]
  >;

  return entries.find(([, envPriceId]) => envPriceId === priceId)?.[0] ?? null;
}

function getSelectedPlanFromSubscription(
  subscription?: Stripe.Subscription | null
) {
  const metadataPlan = normalizeCheckoutPlanCode(
    subscription?.metadata?.selectedPlan
  );

  if (metadataPlan) return metadataPlan;

  const priceId = subscription?.items?.data?.[0]?.price?.id ?? null;
  return mapPriceIdToSelectedPlan(priceId);
}

async function resolveSubscription(
  stripe: Stripe,
  subscriptionValue: Stripe.Checkout.Session["subscription"]
) {
  const subscriptionId = getObjectId(subscriptionValue);
  if (!subscriptionId) return null;

  if (
    subscriptionValue &&
    typeof subscriptionValue === "object" &&
    "status" in subscriptionValue
  ) {
    return subscriptionValue as Stripe.Subscription;
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

async function updateProfileAsPending(input: {
  match: ProfileMatch;
  selectedPlan: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
}) {
  const rows: ProfileUpdateRow[] = [];

  if (input.match.userId) {
    const userRows = (await sql`
      update user_profiles
      set
        pending_plan_code = ${input.selectedPlan},
        payment_status = 'pending',
        stripe_customer_id = coalesce(${input.customerId ?? null}, stripe_customer_id),
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where user_id = ${input.match.userId}::text
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...userRows);
  }

  if (rows.length === 0 && input.match.userEmail) {
    const emailRows = (await sql`
      update user_profiles
      set
        pending_plan_code = ${input.selectedPlan},
        payment_status = 'pending',
        stripe_customer_id = coalesce(${input.customerId ?? null}, stripe_customer_id),
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where email = ${input.match.userEmail}
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...emailRows);
  }

  if (rows.length === 0 && input.match.customerId) {
    const customerRows = (await sql`
      update user_profiles
      set
        pending_plan_code = ${input.selectedPlan},
        payment_status = 'pending',
        stripe_customer_id = ${input.match.customerId},
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where stripe_customer_id = ${input.match.customerId}
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...customerRows);
  }

  return rows;
}

async function activateProfilePlan(input: {
  match: ProfileMatch;
  selectedPlan: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
}) {
  const finalPlanCode = mapSelectedPlanToPlanCode(input.selectedPlan);
  const finalPlanLabel = mapPlanCodeToLabel(finalPlanCode);
  const rows: ProfileUpdateRow[] = [];

  if (input.match.userId) {
    const userRows = (await sql`
      update user_profiles
      set
        plan_code = ${finalPlanCode},
        plan_label = ${finalPlanLabel},
        pending_plan_code = null,
        payment_status = 'paid',
        stripe_customer_id = coalesce(${input.customerId ?? null}, stripe_customer_id),
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where user_id = ${input.match.userId}::text
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...userRows);
  }

  if (rows.length === 0 && input.match.userEmail) {
    const emailRows = (await sql`
      update user_profiles
      set
        plan_code = ${finalPlanCode},
        plan_label = ${finalPlanLabel},
        pending_plan_code = null,
        payment_status = 'paid',
        stripe_customer_id = coalesce(${input.customerId ?? null}, stripe_customer_id),
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where email = ${input.match.userEmail}
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...emailRows);
  }

  if (rows.length === 0 && input.match.customerId) {
    const customerRows = (await sql`
      update user_profiles
      set
        plan_code = ${finalPlanCode},
        plan_label = ${finalPlanLabel},
        pending_plan_code = null,
        payment_status = 'paid',
        stripe_customer_id = ${input.match.customerId},
        stripe_subscription_id = coalesce(${input.subscriptionId ?? null}, stripe_subscription_id),
        stripe_checkout_session_id = coalesce(${input.checkoutSessionId ?? null}, stripe_checkout_session_id),
        updated_at = now()
      where stripe_customer_id = ${input.match.customerId}
      returning
        user_id,
        email,
        plan_code,
        plan_label,
        pending_plan_code,
        payment_status,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_checkout_session_id,
        updated_at
    `) as ProfileUpdateRow[];

    rows.push(...customerRows);
  }

  return rows;
}

function checkoutSessionBelongsToUser(
  session: Stripe.Checkout.Session,
  userId?: string | null,
  userEmail?: string | null
) {
  const metadataUserId =
    typeof session.metadata?.userId === "string" ? session.metadata.userId : null;
  const metadataEmail =
    typeof session.metadata?.userEmail === "string"
      ? session.metadata.userEmail
      : null;

  return (
    (userId && (metadataUserId === userId || session.client_reference_id === userId)) ||
    (userEmail && metadataEmail === userEmail)
  );
}

export async function reconcileCheckoutSessionPlan(input: {
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  fallbackSelectedPlan?: string | null;
  requireUserMatch?: boolean;
}) {
  const stripe = getStripeClient();

  if (!stripe || !input.sessionId.startsWith("cs_")) {
    return { ok: false, reason: "Stripe is not configured or session id is invalid." };
  }

  const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
    expand: ["subscription"],
  });

  if (
    input.requireUserMatch &&
    !checkoutSessionBelongsToUser(session, input.userId, input.userEmail)
  ) {
    return { ok: false, reason: "Checkout session does not belong to user." };
  }

  const subscription = await resolveSubscription(stripe, session.subscription);
  const selectedPlan =
    normalizeCheckoutPlanCode(session.metadata?.selectedPlan) ||
    getSelectedPlanFromSubscription(subscription) ||
    normalizeCheckoutPlanCode(input.fallbackSelectedPlan);

  if (!selectedPlan) {
    return { ok: false, reason: "Checkout session has no selected plan." };
  }

  const customerId = getObjectId(session.customer);
  const subscriptionId = getObjectId(session.subscription);
  const match = {
    userId:
      input.userId ||
      (typeof session.metadata?.userId === "string" ? session.metadata.userId : null),
    userEmail:
      input.userEmail ||
      (typeof session.metadata?.userEmail === "string"
        ? session.metadata.userEmail
        : null),
    customerId,
  };

  const canActivate =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required" ||
    isActiveSubscription(subscription);

  const rows = canActivate
    ? await activateProfilePlan({
        match,
        selectedPlan,
        customerId,
        subscriptionId,
        checkoutSessionId: session.id,
      })
    : await updateProfileAsPending({
        match,
        selectedPlan,
        customerId,
        subscriptionId,
        checkoutSessionId: session.id,
      });

  return {
    ok: rows.length > 0,
    activated: canActivate,
    selectedPlan,
    rows,
  };
}

export async function syncPlanFromSubscription(
  subscription: Stripe.Subscription,
  fallbackSelectedPlan?: string | null
) {
  const customerId = getObjectId(subscription.customer);
  const selectedPlan =
    getSelectedPlanFromSubscription(subscription) ||
    normalizeCheckoutPlanCode(fallbackSelectedPlan);

  if (!customerId || !selectedPlan) {
    return { ok: false, reason: "Subscription is missing customer or plan." };
  }

  const match = {
    userId:
      typeof subscription.metadata?.userId === "string"
        ? subscription.metadata.userId
        : null,
    userEmail:
      typeof subscription.metadata?.userEmail === "string"
        ? subscription.metadata.userEmail
        : null,
    customerId,
  };

  const rows = isActiveSubscription(subscription)
    ? await activateProfilePlan({
        match,
        selectedPlan,
        customerId,
        subscriptionId: subscription.id,
      })
    : await updateProfileAsPending({
        match,
        selectedPlan,
        customerId,
        subscriptionId: subscription.id,
      });

  return {
    ok: rows.length > 0,
    activated: isActiveSubscription(subscription),
    selectedPlan,
    rows,
  };
}

export async function syncPlanFromSubscriptionId(
  subscriptionId: string,
  fallbackSelectedPlan?: string | null
) {
  const stripe = getStripeClient();

  if (!stripe || !subscriptionId) {
    return { ok: false, reason: "Stripe is not configured or subscription id is empty." };
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return syncPlanFromSubscription(subscription, fallbackSelectedPlan);
}

export async function activatePlanFromInvoice(invoice: Stripe.Invoice) {
  const invoiceRecord = invoice as unknown as Record<string, unknown>;
  let subscriptionId = getObjectId(invoiceRecord.subscription);

  if (!subscriptionId) {
    const lines = invoiceRecord.lines as
      | { data?: Array<Record<string, unknown>> }
      | undefined;
    const firstLine = lines?.data?.[0];
    subscriptionId = getObjectId(firstLine?.subscription);
  }

  if (!subscriptionId) {
    const customerId = getObjectId(invoice.customer);

    if (customerId) {
      const rows = (await sql`
        select stripe_subscription_id
        from user_profiles
        where stripe_customer_id = ${customerId}
        limit 1
      `) as Array<{ stripe_subscription_id: string | null }>;

      subscriptionId = rows[0]?.stripe_subscription_id ?? null;
    }
  }

  if (!subscriptionId) {
    return { ok: false, reason: "Invoice has no subscription id." };
  }

  return syncPlanFromSubscriptionId(subscriptionId);
}

export async function downgradeToFreeByCustomerId(customerId: string) {
  const rows = (await sql`
    update user_profiles
    set
      plan_code = 'free',
      plan_label = 'Free',
      pending_plan_code = null,
      payment_status = 'unpaid',
      stripe_customer_id = ${customerId},
      updated_at = now()
    where stripe_customer_id = ${customerId}
    returning
      user_id,
      email,
      plan_code,
      plan_label,
      pending_plan_code,
      payment_status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      updated_at
  `) as ProfileUpdateRow[];

  return { ok: rows.length > 0, rows };
}

export async function reconcilePendingBillingForUser(input: {
  userId: string;
  userEmail: string;
}) {
  const rows = (await sql`
    select
      user_id,
      email,
      pending_plan_code,
      payment_status,
      stripe_checkout_session_id,
      stripe_subscription_id
    from user_profiles
    where user_id = ${input.userId}::text
       or email = ${input.userEmail}
    order by updated_at desc
    limit 1
  `) as Array<{
    user_id: string;
    email: string;
    pending_plan_code: string | null;
    payment_status: string | null;
    stripe_checkout_session_id: string | null;
    stripe_subscription_id: string | null;
  }>;

  const profile = rows[0];
  if (!profile?.pending_plan_code && profile?.payment_status !== "pending") {
    return { ok: false, reason: "No pending billing state." };
  }

  if (profile.stripe_checkout_session_id) {
    return reconcileCheckoutSessionPlan({
      sessionId: profile.stripe_checkout_session_id,
      userId: profile.user_id,
      userEmail: profile.email,
      fallbackSelectedPlan: profile.pending_plan_code,
    });
  }

  if (profile.stripe_subscription_id) {
    return syncPlanFromSubscriptionId(
      profile.stripe_subscription_id,
      profile.pending_plan_code
    );
  }

  return { ok: false, reason: "No checkout session or subscription to reconcile." };
}
