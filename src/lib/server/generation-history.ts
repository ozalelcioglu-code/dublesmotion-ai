import crypto from "node:crypto";
import { sql } from "@/lib/db";

export type GenerationOutputType =
  | "music"
  | "image"
  | "text_video"
  | "image_video"
  | "video_clone";

export type GenerationOutput = {
  id: string;
  userId: string;
  type: GenerationOutputType;
  title: string;
  prompt: string;
  lyrics: string;
  url: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type GenerationOutputRow = {
  id: string;
  user_id: string;
  type: GenerationOutputType;
  title: string;
  prompt: string | null;
  lyrics: string | null;
  url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

let tableReadyPromise: Promise<void> | null = null;

function mapRow(row: GenerationOutputRow): GenerationOutput {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    prompt: row.prompt || "",
    lyrics: row.lyrics || "",
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    durationSec: row.duration_sec,
    provider: row.provider,
    model: row.model,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureGenerationOutputsTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = (async () => {
      await sql`
        create table if not exists generation_outputs (
          id text primary key,
          user_id text not null,
          type text not null,
          title text not null,
          prompt text,
          lyrics text,
          url text not null,
          thumbnail_url text,
          duration_sec integer,
          provider text,
          model text,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists generation_outputs_user_created_idx
        on generation_outputs (user_id, created_at desc)
      `;

      await sql`
        create index if not exists generation_outputs_user_type_created_idx
        on generation_outputs (user_id, type, created_at desc)
      `;
    })();
  }

  return tableReadyPromise;
}

export async function saveGenerationOutput(input: {
  id?: string;
  userId: string;
  type: GenerationOutputType;
  title: string;
  prompt?: string | null;
  lyrics?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  provider?: string | null;
  model?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string | null;
}) {
  await ensureGenerationOutputsTable();

  const id = input.id || crypto.randomUUID();
  const rows = (await sql`
    insert into generation_outputs (
      id,
      user_id,
      type,
      title,
      prompt,
      lyrics,
      url,
      thumbnail_url,
      duration_sec,
      provider,
      model,
      metadata,
      created_at,
      updated_at
    )
    values (
      ${id},
      ${input.userId}::text,
      ${input.type},
      ${input.title},
      ${input.prompt ?? null},
      ${input.lyrics ?? null},
      ${input.url},
      ${input.thumbnailUrl ?? null},
      ${input.durationSec ?? null},
      ${input.provider ?? null},
      ${input.model ?? null},
      ${JSON.stringify(input.metadata ?? {})}::jsonb,
      coalesce(${input.createdAt ?? null}::timestamptz, now()),
      now()
    )
    on conflict (id) do update
    set
      title = excluded.title,
      prompt = excluded.prompt,
      lyrics = excluded.lyrics,
      url = excluded.url,
      thumbnail_url = excluded.thumbnail_url,
      duration_sec = excluded.duration_sec,
      provider = excluded.provider,
      model = excluded.model,
      metadata = excluded.metadata,
      updated_at = now()
    returning
      id,
      user_id,
      type,
      title,
      prompt,
      lyrics,
      url,
      thumbnail_url,
      duration_sec,
      provider,
      model,
      metadata,
      created_at,
      updated_at
  `) as GenerationOutputRow[];

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listGenerationOutputs(input: {
  userId: string;
  type?: GenerationOutputType | null;
  limit?: number;
}) {
  await ensureGenerationOutputsTable();

  const limit = Math.max(1, Math.min(100, Math.round(input.limit ?? 40)));

  const rows = input.type
    ? ((await sql`
        select
          id,
          user_id,
          type,
          title,
          prompt,
          lyrics,
          url,
          thumbnail_url,
          duration_sec,
          provider,
          model,
          metadata,
          created_at,
          updated_at
        from generation_outputs
        where user_id = ${input.userId}::text
          and type = ${input.type}
        order by created_at desc
        limit ${limit}
      `) as GenerationOutputRow[])
    : ((await sql`
        select
          id,
          user_id,
          type,
          title,
          prompt,
          lyrics,
          url,
          thumbnail_url,
          duration_sec,
          provider,
          model,
          metadata,
          created_at,
          updated_at
        from generation_outputs
        where user_id = ${input.userId}::text
        order by created_at desc
        limit ${limit}
      `) as GenerationOutputRow[]);

  return rows.map(mapRow);
}

export async function deleteGenerationOutput(input: {
  userId: string;
  id: string;
}) {
  await ensureGenerationOutputsTable();

  await sql`
    delete from generation_outputs
    where user_id = ${input.userId}::text
      and id = ${input.id}
  `;
}

export async function clearGenerationOutputs(userId: string) {
  await ensureGenerationOutputsTable();

  await sql`
    delete from generation_outputs
    where user_id = ${userId}::text
  `;
}
