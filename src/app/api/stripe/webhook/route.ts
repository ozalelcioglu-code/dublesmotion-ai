import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  activatePlanFromInvoice,
  downgradeToFreeByCustomerId,
  reconcileCheckoutSessionPlan,
  syncPlanFromSubscription,
} from "@/lib/server/billing-plan-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe(stripeSecretKey);

function getCustomerId(
  obj: { customer?: string | { id?: string | null } | null } | null
) {
  if (!obj?.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id ?? null;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing webhook signature", { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log("stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await reconcileCheckoutSessionPlan({
          sessionId: session.id,
          fallbackSelectedPlan: session.metadata?.selectedPlan ?? null,
        });
        console.log("checkout.session.completed plan sync:", result);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const result = await activatePlanFromInvoice(invoice);
        console.log("invoice.paid plan sync:", result);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await syncPlanFromSubscription(subscription);
        console.log(`${event.type} plan sync:`, result);
        break;
      }

      case "invoice.payment_failed":
      case "customer.subscription.deleted": {
        const customerId = getCustomerId(
          event.data.object as {
            customer?: string | { id?: string | null } | null;
          }
        );

        if (customerId) {
          const result = await downgradeToFreeByCustomerId(customerId);
          console.log(`${event.type} downgrade sync:`, result);
        } else {
          console.warn("missing customer id for downgrade event", {
            eventType: event.type,
          });
        }
        break;
      }

      default: {
        console.log("Unhandled Stripe event:", event.type);
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Stripe webhook failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown Stripe webhook error";

    return new NextResponse(`Webhook Error: ${message}`, {
      status: 400,
    });
  }
}
