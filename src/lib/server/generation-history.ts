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

export type PublicShowcaseTemplate = {
  id: string;
  generationId: string;
  type: GenerationOutputType;
  title: string;
  prompt: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
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

type PublicShowcaseTemplateRow = {
  id: string;
  generation_id: string;
  type: GenerationOutputType;
  title: string;
  prompt: string | null;
  media_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

let tableReadyPromise: Promise<void> | null = null;
let publicShowcaseTableReadyPromise: Promise<void> | null = null;

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

function mapPublicShowcaseRow(
  row: PublicShowcaseTemplateRow
): PublicShowcaseTemplate {
  return {
    id: row.id,
    generationId: row.generation_id,
    type: row.type,
    title: row.title,
    prompt: row.prompt || "",
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    durationSec: row.duration_sec,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function canPublishToPublicShowcase(output: GenerationOutput) {
  return (
    Boolean(output.url) &&
    (output.type === "image" ||
      output.type === "text_video" ||
      output.type === "image_video")
  );
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

export async function ensurePublicShowcaseTemplatesTable() {
  if (!publicShowcaseTableReadyPromise) {
    publicShowcaseTableReadyPromise = (async () => {
      await ensureGenerationOutputsTable();

      await sql`
        create table if not exists public_showcase_templates (
          id text primary key,
          generation_id text not null unique,
          user_id text not null,
          type text not null,
          title text not null,
          prompt text,
          media_url text not null,
          thumbnail_url text,
          duration_sec integer,
          metadata jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create index if not exists public_showcase_templates_created_idx
        on public_showcase_templates (created_at desc)
      `;

      await sql`
        create index if not exists public_showcase_templates_type_created_idx
        on public_showcase_templates (type, created_at desc)
      `;

      await sql`
        insert into public_showcase_templates (
          id,
          generation_id,
          user_id,
          type,
          title,
          prompt,
          media_url,
          thumbnail_url,
          duration_sec,
          metadata,
          created_at,
          updated_at
        )
        select
          'showcase-' || id,
          id,
          user_id,
          type,
          title,
          coalesce(prompt, title),
          url,
          thumbnail_url,
          duration_sec,
          metadata || '{"source":"auto_generation","publicTemplate":true}'::jsonb,
          created_at,
          now()
        from generation_outputs
        where type in ('image', 'text_video', 'image_video')
          and url is not null
          and url <> ''
        on conflict (generation_id) do nothing
      `;
    })();
  }

  return publicShowcaseTableReadyPromise;
}

async function savePublicShowcaseTemplate(output: GenerationOutput) {
  if (!canPublishToPublicShowcase(output)) return null;

  await ensurePublicShowcaseTemplatesTable();

  const id = `showcase-${output.id}`;
  const rows = (await sql`
    insert into public_showcase_templates (
      id,
      generation_id,
      user_id,
      type,
      title,
      prompt,
      media_url,
      thumbnail_url,
      duration_sec,
      metadata,
      created_at,
      updated_at
    )
    values (
      ${id},
      ${output.id},
      ${output.userId}::text,
      ${output.type},
      ${output.title},
      ${output.prompt || output.title},
      ${output.url},
      ${output.thumbnailUrl ?? null},
      ${output.durationSec ?? null},
      ${JSON.stringify({
        ...(output.metadata ?? {}),
        source: "auto_generation",
        publicTemplate: true,
      })}::jsonb,
      ${output.createdAt}::timestamptz,
      now()
    )
    on conflict (generation_id) do update
    set
      title = excluded.title,
      prompt = excluded.prompt,
      media_url = excluded.media_url,
      thumbnail_url = excluded.thumbnail_url,
      duration_sec = excluded.duration_sec,
      metadata = excluded.metadata,
      updated_at = now()
    returning
      id,
      generation_id,
      type,
      title,
      prompt,
      media_url,
      thumbnail_url,
      duration_sec,
      metadata,
      created_at
  `) as PublicShowcaseTemplateRow[];

  return rows[0] ? mapPublicShowcaseRow(rows[0]) : null;
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

  const output = rows[0] ? mapRow(rows[0]) : null;

  if (output) {
    try {
      await savePublicShowcaseTemplate(output);
    } catch (error) {
      console.error("public showcase template warning:", error);
    }
  }

  return output;
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

export async function listPublicShowcaseTemplates(input?: {
  type?: GenerationOutputType | null;
  limit?: number;
}) {
  await ensurePublicShowcaseTemplatesTable();

  const limit = Math.max(1, Math.min(60, Math.round(input?.limit ?? 18)));
  const type = input?.type ?? null;

  const rows = type
    ? ((await sql`
        select
          id,
          generation_id,
          type,
          title,
          prompt,
          media_url,
          thumbnail_url,
          duration_sec,
          metadata,
          created_at
        from public_showcase_templates
        where type = ${type}
        order by created_at desc
        limit ${limit}
      `) as PublicShowcaseTemplateRow[])
    : ((await sql`
        select
          id,
          generation_id,
          type,
          title,
          prompt,
          media_url,
          thumbnail_url,
          duration_sec,
          metadata,
          created_at
        from public_showcase_templates
        order by created_at desc
        limit ${limit}
      `) as PublicShowcaseTemplateRow[]);

  return rows.map(mapPublicShowcaseRow);
}
