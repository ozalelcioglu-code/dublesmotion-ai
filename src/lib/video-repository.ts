import { getSql } from "./db";

export type CreateVideoInput = {
  userId: string;
  projectId?: string | null;
  title: string;
  mode: "text" | "images" | "product";
  videoUrl: string;
  thumbnailUrl?: string | null;
  status?: "processing" | "ready" | "failed";
  durationSec?: number | null;
  ratio?: "square" | "vertical" | "horizontal" | null;
  prompt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createVideoRecord(input: CreateVideoInput) {
  const sql = getSql();

  const inserted: any[] = await sql`
    insert into videos (
      user_id,
      project_id,
      title,
      mode,
      video_url,
      thumbnail_url,
      status,
      duration_sec,
      ratio,
      prompt,
      metadata
    )
    values (
      ${input.userId}::text,
      ${input.projectId ?? null}::uuid,
      ${input.title},
      ${input.mode},
      ${input.videoUrl},
      ${input.thumbnailUrl ?? null},
      ${input.status ?? "ready"},
      ${input.durationSec ?? null},
      ${input.ratio ?? null},
      ${input.prompt ?? null},
      ${input.metadata ? JSON.stringify(input.metadata) : null}::jsonb
    )
    returning *
  `;

  return inserted[0] ?? null;
}

export async function listVideosByUserId(userId: string) {
  const sql = getSql();

  const rows: any[] = await sql`
    select
      id,
      user_id,
      project_id,
      title,
      mode,
      video_url,
      thumbnail_url,
      status,
      duration_sec,
      ratio,
      prompt,
      metadata,
      created_at
    from videos
    where user_id = ${userId}::text
    order by created_at desc
    limit 100
  `;

  return rows;
}

export async function deleteVideoById(input: {
  videoId: string;
  userId: string;
}) {
  const sql = getSql();

  const deleted: any[] = await sql`
    delete from videos
    where id = ${input.videoId}::uuid
      and user_id = ${input.userId}::text
    returning id
  `;

  return deleted[0] ?? null;
}