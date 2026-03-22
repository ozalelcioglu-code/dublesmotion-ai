import { pool } from "@/lib/db";

type RenderClipResult = {
  videoUrl: string;
};

async function generateVideoFromPrompt(
  prompt: string,
  durationSec: number
): Promise<RenderClipResult> {
  // TODO:
  // Burayı senin mevcut gerçek video üretim servisine bağla.
  // Örnek mantık:
  //
  // const result = await yourVideoProvider.generate({
  //   prompt,
  //   durationSec,
  // });
  //
  // if (!result?.videoUrl) {
  //   throw new Error("Provider video URL döndürmedi.");
  // }
  //
  // return { videoUrl: result.videoUrl };

  throw new Error(
    "generateVideoFromPrompt henüz gerçek provider'a bağlanmadı."
  );
}

export async function renderScenesForVideo(videoId: string) {
  const client = await pool.connect();

  try {
    const scenesResult = await client.query(
      `
      select id, prompt, duration_sec, order_index
      from scenes
      where video_id = $1
      order by order_index asc
      `,
      [videoId]
    );

    const scenes = scenesResult.rows;

    if (!scenes.length) {
      throw new Error("Bu video için render edilecek scene bulunamadı.");
    }

    await client.query(
      `
      update videos
      set status = $1, updated_at = now()
      where id = $2
      `,
      ["rendering_clips", videoId]
    );

    for (const scene of scenes) {
      try {
        await client.query(
          `
          update scenes
          set status = $1
          where id = $2
          `,
          ["rendering", scene.id]
        );

        const result = await generateVideoFromPrompt(
          scene.prompt,
          scene.duration_sec
        );

        if (!result?.videoUrl) {
          throw new Error("Scene için video URL alınamadı.");
        }

        await client.query(
          `
          update scenes
          set video_url = $1, status = $2
          where id = $3
          `,
          [result.videoUrl, "done", scene.id]
        );
      } catch (sceneError) {
        await client.query(
          `
          update scenes
          set status = $1
          where id = $2
          `,
          ["failed", scene.id]
        );

        await client.query(
          `
          update videos
          set status = $1, updated_at = now()
          where id = $2
          `,
          ["failed", videoId]
        );

        throw sceneError;
      }
    }

    await client.query(
      `
      update videos
      set status = $1, updated_at = now()
      where id = $2
      `,
      ["clips_ready", videoId]
    );

    return { ok: true };
  } finally {
    client.release();
  }
}