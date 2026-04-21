import crypto from "node:crypto";
import { sql } from "@/lib/db";

export type DeveloperApiKey = {
  id: string;
  userId: string;
  email: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  requestCount: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type DeveloperApiKeyRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  request_count: number | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type ValidatedApiKeyRow = DeveloperApiKeyRow & {
  key_hash: string;
};

let tableReadyPromise: Promise<void> | null = null;

function mapApiKey(row: DeveloperApiKeyRow): DeveloperApiKey {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    keyPrefix: row.key_prefix,
    scopes: row.scopes || [],
    requestCount: Number(row.request_count || 0),
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export async function ensureDeveloperApiKeysTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = (async () => {
      await sql`
        create table if not exists developer_api_keys (
          id text primary key,
          user_id text not null,
          email text not null,
          name text not null,
          key_prefix text not null,
          key_hash text not null unique,
          scopes text[] not null default array['generate']::text[],
          request_count integer not null default 0,
          last_used_at timestamptz,
          revoked_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists developer_api_keys_user_created_idx
        on developer_api_keys (user_id, created_at desc)
      `;

      await sql`
        create index if not exists developer_api_keys_active_hash_idx
        on developer_api_keys (key_hash)
        where revoked_at is null
      `;
    })();
  }

  return tableReadyPromise;
}

export async function createDeveloperApiKey(input: {
  userId: string;
  email: string;
  name: string;
  scopes?: string[];
}) {
  await ensureDeveloperApiKeysTable();

  const secret = `dms_live_${crypto.randomBytes(28).toString("base64url")}`;
  const keyPrefix = `${secret.slice(0, 15)}...`;
  const scopes = input.scopes?.length ? input.scopes : ["generate"];
  const id = crypto.randomUUID();

  const rows = (await sql`
    insert into developer_api_keys (
      id,
      user_id,
      email,
      name,
      key_prefix,
      key_hash,
      scopes
    )
    values (
      ${id},
      ${input.userId}::text,
      ${input.email},
      ${input.name},
      ${keyPrefix},
      ${hashSecret(secret)},
      ${scopes}::text[]
    )
    returning
      id,
      user_id,
      email,
      name,
      key_prefix,
      scopes,
      request_count,
      last_used_at,
      revoked_at,
      created_at
  `) as DeveloperApiKeyRow[];

  return {
    key: rows[0] ? mapApiKey(rows[0]) : null,
    secret,
  };
}

export async function listDeveloperApiKeys(userId: string) {
  await ensureDeveloperApiKeysTable();

  const rows = (await sql`
    select
      id,
      user_id,
      email,
      name,
      key_prefix,
      scopes,
      request_count,
      last_used_at,
      revoked_at,
      created_at
    from developer_api_keys
    where user_id = ${userId}::text
    order by created_at desc
  `) as DeveloperApiKeyRow[];

  return rows.map(mapApiKey);
}

export async function revokeDeveloperApiKey(input: {
  userId: string;
  id: string;
}) {
  await ensureDeveloperApiKeysTable();

  const rows = (await sql`
    update developer_api_keys
    set revoked_at = coalesce(revoked_at, now())
    where user_id = ${input.userId}::text
      and id = ${input.id}
    returning
      id,
      user_id,
      email,
      name,
      key_prefix,
      scopes,
      request_count,
      last_used_at,
      revoked_at,
      created_at
  `) as DeveloperApiKeyRow[];

  return rows[0] ? mapApiKey(rows[0]) : null;
}

export async function validateDeveloperApiKey(secret: string) {
  await ensureDeveloperApiKeysTable();

  const cleanSecret = secret.trim();
  if (!cleanSecret.startsWith("dms_live_")) return null;

  const rows = (await sql`
    select
      id,
      user_id,
      email,
      name,
      key_prefix,
      key_hash,
      scopes,
      request_count,
      last_used_at,
      revoked_at,
      created_at
    from developer_api_keys
    where key_hash = ${hashSecret(cleanSecret)}
      and revoked_at is null
    limit 1
  `) as ValidatedApiKeyRow[];

  return rows[0] ? mapApiKey(rows[0]) : null;
}

export async function markDeveloperApiKeyUsed(id: string) {
  await ensureDeveloperApiKeysTable();

  await sql`
    update developer_api_keys
    set
      request_count = request_count + 1,
      last_used_at = now()
    where id = ${id}
      and revoked_at is null
  `;
}
