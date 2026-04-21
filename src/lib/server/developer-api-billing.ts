import crypto from "node:crypto";
import Stripe from "stripe";
import { sql } from "@/lib/db";

export type DeveloperApiWallet = {
  userId: string;
  email: string;
  balanceCents: number;
  totalPurchasedCents: number;
  totalSpentCents: number;
  updatedAt: string;
};

export type DeveloperApiPrice = {
  mode: string;
  label: string;
  unitCents: number;
};

export type DeveloperApiTopupPack = {
  id: string;
  label: string;
  amountCents: number;
  bonusCents: number;
};

type WalletRow = {
  user_id: string;
  email: string;
  balance_cents: number | null;
  total_purchased_cents: number | null;
  total_spent_cents: number | null;
  updated_at: string;
};

let billingTablesReadyPromise: Promise<void> | null = null;
let stripeClient: Stripe | null | undefined;

function readPriceCents(envName: string, fallbackCents: number) {
  const raw = process.env[envName];
  const parsed = raw ? Number(raw) : NaN;

  if (Number.isFinite(parsed) && parsed >= 0) {
    return Math.round(parsed);
  }

  return fallbackCents;
}

export const DEVELOPER_API_PRICES: DeveloperApiPrice[] = [
  {
    mode: "text_to_image",
    label: "Text to image",
    unitCents: readPriceCents("DMS_API_PRICE_TEXT_TO_IMAGE_CENTS", 30),
  },
  {
    mode: "text_to_video",
    label: "Text to video",
    unitCents: readPriceCents("DMS_API_PRICE_TEXT_TO_VIDEO_CENTS", 300),
  },
  {
    mode: "image_to_video",
    label: "Image to video",
    unitCents: readPriceCents("DMS_API_PRICE_IMAGE_TO_VIDEO_CENTS", 250),
  },
  {
    mode: "logo_to_video",
    label: "Logo to video",
    unitCents: readPriceCents("DMS_API_PRICE_LOGO_TO_VIDEO_CENTS", 200),
  },
  {
    mode: "music",
    label: "Music generation",
    unitCents: readPriceCents("DMS_API_PRICE_MUSIC_CENTS", 150),
  },
  {
    mode: "video_clone",
    label: "Video clone",
    unitCents: readPriceCents("DMS_API_PRICE_VIDEO_CLONE_CENTS", 600),
  },
];

export const DEVELOPER_API_TOPUP_PACKS: DeveloperApiTopupPack[] = [
  { id: "api-1000", label: "API Starter", amountCents: 1000, bonusCents: 0 },
  { id: "api-2500", label: "API Builder", amountCents: 2500, bonusCents: 250 },
  { id: "api-5000", label: "API Growth", amountCents: 5000, bonusCents: 750 },
  { id: "api-10000", label: "API Scale", amountCents: 10000, bonusCents: 2000 },
];

function mapWallet(row: WalletRow): DeveloperApiWallet {
  return {
    userId: row.user_id,
    email: row.email,
    balanceCents: Number(row.balance_cents || 0),
    totalPurchasedCents: Number(row.total_purchased_cents || 0),
    totalSpentCents: Number(row.total_spent_cents || 0),
    updatedAt: row.updated_at,
  };
}

function getStripeClient() {
  if (stripeClient !== undefined) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY || "";
  stripeClient = secretKey ? new Stripe(secretKey) : null;
  return stripeClient;
}

function getSigningSecret() {
  return (
    process.env.BETTER_AUTH_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.DATABASE_URL ||
    "dublesmotion-local-dev"
  );
}

export function centsToDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function getDeveloperApiTopupPack(id: string) {
  return DEVELOPER_API_TOPUP_PACKS.find((pack) => pack.id === id) || null;
}

export function getDeveloperApiPriceForMode(mode?: string, preview?: boolean) {
  if (preview) return 0;
  return DEVELOPER_API_PRICES.find((item) => item.mode === mode)?.unitCents ?? 0;
}

export function createInternalApiBillingSignature(apiKeyId: string) {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(apiKeyId)
    .digest("hex");
}

export function verifyInternalApiBillingSignature(
  apiKeyId?: string | null,
  signature?: string | null
) {
  if (!apiKeyId || !signature) return false;

  const expected = createInternalApiBillingSignature(apiKeyId);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export async function ensureDeveloperApiBillingTables() {
  if (!billingTablesReadyPromise) {
    billingTablesReadyPromise = (async () => {
      await sql`
        create table if not exists developer_api_wallets (
          user_id text primary key,
          email text not null,
          balance_cents integer not null default 0,
          total_purchased_cents integer not null default 0,
          total_spent_cents integer not null default 0,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists developer_api_ledger (
          id text primary key,
          user_id text not null,
          api_key_id text,
          kind text not null,
          amount_cents integer not null,
          balance_after_cents integer,
          request_mode text,
          description text,
          provider_event_id text,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create unique index if not exists developer_api_ledger_provider_event_idx
        on developer_api_ledger (provider_event_id)
        where provider_event_id is not null
      `;

      await sql`
        create index if not exists developer_api_ledger_user_created_idx
        on developer_api_ledger (user_id, created_at desc)
      `;
    })();
  }

  return billingTablesReadyPromise;
}

export async function ensureDeveloperApiWallet(input: {
  userId: string;
  email: string;
}) {
  await ensureDeveloperApiBillingTables();

  const rows = (await sql`
    insert into developer_api_wallets (
      user_id,
      email,
      balance_cents,
      total_purchased_cents,
      total_spent_cents,
      created_at,
      updated_at
    )
    values (
      ${input.userId}::text,
      ${input.email},
      0,
      0,
      0,
      now(),
      now()
    )
    on conflict (user_id) do update
    set
      email = excluded.email,
      updated_at = developer_api_wallets.updated_at
    returning
      user_id,
      email,
      balance_cents,
      total_purchased_cents,
      total_spent_cents,
      updated_at
  `) as WalletRow[];

  return rows[0] ? mapWallet(rows[0]) : null;
}

export async function getDeveloperApiWallet(input: {
  userId: string;
  email: string;
}) {
  return ensureDeveloperApiWallet(input);
}

export async function applyDeveloperApiTopup(input: {
  userId: string;
  email: string;
  amountCents: number;
  bonusCents?: number;
  providerEventId?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureDeveloperApiWallet({
    userId: input.userId,
    email: input.email,
  });

  const totalCents = Math.max(0, Math.round(input.amountCents + (input.bonusCents || 0)));
  if (totalCents <= 0) {
    throw new Error("Top-up amount must be greater than zero.");
  }

  const ledgerId = crypto.randomUUID();
  const insertedLedger = (await sql`
    insert into developer_api_ledger (
      id,
      user_id,
      kind,
      amount_cents,
      description,
      provider_event_id,
      metadata
    )
    values (
      ${ledgerId},
      ${input.userId}::text,
      'topup',
      ${totalCents},
      ${input.description || "API balance top-up"},
      ${input.providerEventId ?? null},
      ${JSON.stringify(input.metadata || {})}::jsonb
    )
    on conflict (provider_event_id) where provider_event_id is not null
    do nothing
    returning id
  `) as Array<{ id: string }>;

  if (!insertedLedger[0]) {
    return {
      wallet: await ensureDeveloperApiWallet({
        userId: input.userId,
        email: input.email,
      }),
      applied: false,
    };
  }

  const rows = (await sql`
    update developer_api_wallets
    set
      email = ${input.email},
      balance_cents = balance_cents + ${totalCents},
      total_purchased_cents = total_purchased_cents + ${totalCents},
      updated_at = now()
    where user_id = ${input.userId}::text
    returning
      user_id,
      email,
      balance_cents,
      total_purchased_cents,
      total_spent_cents,
      updated_at
  `) as WalletRow[];

  const wallet = rows[0] ? mapWallet(rows[0]) : null;

  if (wallet) {
    await sql`
      update developer_api_ledger
      set balance_after_cents = ${wallet.balanceCents}
      where id = ${ledgerId}
    `;
  }

  return { wallet, applied: true };
}

export async function reserveDeveloperApiUsage(input: {
  userId: string;
  email: string;
  apiKeyId: string;
  amountCents: number;
  requestMode?: string | null;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  await ensureDeveloperApiWallet({
    userId: input.userId,
    email: input.email,
  });

  const amount = Math.max(0, Math.round(input.amountCents));
  if (amount <= 0) {
    return {
      ok: true,
      usageId: null as string | null,
      wallet: await ensureDeveloperApiWallet({
        userId: input.userId,
        email: input.email,
      }),
    };
  }

  const rows = (await sql`
    update developer_api_wallets
    set
      balance_cents = balance_cents - ${amount},
      total_spent_cents = total_spent_cents + ${amount},
      updated_at = now()
    where user_id = ${input.userId}::text
      and balance_cents >= ${amount}
    returning
      user_id,
      email,
      balance_cents,
      total_purchased_cents,
      total_spent_cents,
      updated_at
  `) as WalletRow[];

  if (!rows[0]) {
    return {
      ok: false,
      usageId: null,
      wallet: await ensureDeveloperApiWallet({
        userId: input.userId,
        email: input.email,
      }),
    };
  }

  const wallet = mapWallet(rows[0]);
  const usageId = crypto.randomUUID();

  await sql`
    insert into developer_api_ledger (
      id,
      user_id,
      api_key_id,
      kind,
      amount_cents,
      balance_after_cents,
      request_mode,
      description,
      metadata
    )
    values (
      ${usageId},
      ${input.userId}::text,
      ${input.apiKeyId},
      'usage',
      ${-amount},
      ${wallet.balanceCents},
      ${input.requestMode ?? null},
      ${input.description || "API generation request"},
      ${JSON.stringify(input.metadata || {})}::jsonb
    )
  `;

  return { ok: true, usageId, wallet };
}

export async function refundDeveloperApiUsage(input: {
  userId: string;
  email: string;
  apiKeyId: string;
  usageId?: string | null;
  amountCents: number;
  requestMode?: string | null;
  description?: string;
}) {
  const amount = Math.max(0, Math.round(input.amountCents));
  if (amount <= 0) return null;

  const rows = (await sql`
    update developer_api_wallets
    set
      balance_cents = balance_cents + ${amount},
      total_spent_cents = greatest(0, total_spent_cents - ${amount}),
      updated_at = now()
    where user_id = ${input.userId}::text
    returning
      user_id,
      email,
      balance_cents,
      total_purchased_cents,
      total_spent_cents,
      updated_at
  `) as WalletRow[];

  const wallet = rows[0] ? mapWallet(rows[0]) : null;

  await sql`
    insert into developer_api_ledger (
      id,
      user_id,
      api_key_id,
      kind,
      amount_cents,
      balance_after_cents,
      request_mode,
      description,
      metadata
    )
    values (
      ${crypto.randomUUID()},
      ${input.userId}::text,
      ${input.apiKeyId},
      'refund',
      ${amount},
      ${wallet?.balanceCents ?? null},
      ${input.requestMode ?? null},
      ${input.description || "API generation refund"},
      ${JSON.stringify({ usageId: input.usageId ?? null })}::jsonb
    )
  `;

  return wallet;
}

export async function listDeveloperApiLedger(input: {
  userId: string;
  limit?: number;
}) {
  await ensureDeveloperApiBillingTables();

  const limit = Math.max(1, Math.min(100, Math.round(input.limit ?? 30)));

  return sql`
    select
      id,
      api_key_id,
      kind,
      amount_cents,
      balance_after_cents,
      request_mode,
      description,
      provider_event_id,
      created_at
    from developer_api_ledger
    where user_id = ${input.userId}::text
    order by created_at desc
    limit ${limit}
  `;
}

export async function reconcileDeveloperApiTopupSession(input: {
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  requireUserMatch?: boolean;
}) {
  const stripe = getStripeClient();

  if (!stripe || !input.sessionId.startsWith("cs_")) {
    return { ok: false, reason: "Stripe is not configured or session id is invalid." };
  }

  const session = await stripe.checkout.sessions.retrieve(input.sessionId);

  if (session.metadata?.kind !== "api_topup") {
    return { ok: false, reason: "Checkout session is not an API top-up." };
  }

  const metadataUserId = session.metadata?.userId || null;
  const metadataEmail = session.metadata?.userEmail || null;

  if (
    input.requireUserMatch &&
    !(
      (input.userId && metadataUserId === input.userId) ||
      (input.userEmail && metadataEmail === input.userEmail)
    )
  ) {
    return { ok: false, reason: "Checkout session does not belong to user." };
  }

  const canApply =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!canApply) {
    return { ok: false, reason: "Checkout session is not paid." };
  }

  const userId = input.userId || metadataUserId;
  const email = input.userEmail || metadataEmail;
  const amountCents = Number(session.metadata?.amountCents || 0);
  const bonusCents = Number(session.metadata?.bonusCents || 0);

  if (!userId || !email || !amountCents) {
    return { ok: false, reason: "Checkout session metadata is incomplete." };
  }

  const result = await applyDeveloperApiTopup({
    userId,
    email,
    amountCents,
    bonusCents,
    providerEventId: session.id,
    description: "Stripe API balance top-up",
    metadata: {
      stripeSessionId: session.id,
      packId: session.metadata?.packId || null,
      paidAmountCents: session.amount_total || null,
      currency: session.currency || "usd",
    },
  });

  return { ok: Boolean(result.wallet), ...result };
}
