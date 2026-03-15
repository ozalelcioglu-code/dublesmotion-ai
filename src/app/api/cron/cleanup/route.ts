import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { getSql } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const sql = getSql();

  try {
    const expiredVideos = await sql`
      select id, video_url, thumbnail_url
      from videos
      where expires_at is not null
      and expires_at < now()
      limit 100
    `;

    const expiredScenes = await sql`
      select id, image_url, video_url
      from scene_generations
      where expires_at is not null
      and expires_at < now()
      limit 100
    `;

    const blobUrls: string[] = [];

    for (const row of expiredVideos) {
      if (row.video_url && String(row.video_url).startsWith("http")) {
        blobUrls.push(String(row.video_url));
      }
      if (row.thumbnail_url && String(row.thumbnail_url).startsWith("http")) {
        blobUrls.push(String(row.thumbnail_url));
      }
    }

    for (const row of expiredScenes) {
      if (row.image_url && String(row.image_url).startsWith("http")) {
        blobUrls.push(String(row.image_url));
      }
      if (row.video_url && String(row.video_url).startsWith("http")) {
        blobUrls.push(String(row.video_url));
      }
    }

    if (blobUrls.length) {
      await del(blobUrls);
    }

    const expiredVideoIds = expiredVideos.map((row: any) => row.id);
    const expiredSceneIds = expiredScenes.map((row: any) => row.id);

    if (expiredVideoIds.length) {
      await sql`
        delete from videos
        where id = any(${expiredVideoIds})
      `;
    }

    if (expiredSceneIds.length) {
      await sql`
        delete from scene_generations
        where id = any(${expiredSceneIds})
      `;
    }

    return NextResponse.json({
      ok: true,
      deletedVideos: expiredVideoIds.length,
      deletedScenes: expiredSceneIds.length,
      deletedBlobs: blobUrls.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 }
    );
  }
}