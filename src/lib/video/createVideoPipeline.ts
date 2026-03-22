import { pool } from "@/lib/db";
import { generateScenesFromPrompt } from "./generateScenes";
import { checkVideoLimits } from "./checkLimits";

type CreateVideoPipelineInput = {
  userId: string;
  userPlan: "free" | "pro";
  prompt: string;
};

export async function createVideoPipeline({
  userId,
  userPlan,
  prompt,
}: CreateVideoPipelineInput) {
  const scenes = generateScenesFromPrompt(prompt);
  const totalDurationSec = scenes.reduce((sum, scene) => sum + scene.durationSec, 0);

  const limit = checkVideoLimits(userPlan, totalDurationSec);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const videoResult = await client.query(
      `
      insert into videos (
        user_id,
        prompt,
        mode,
        duration_sec,
        is_paid,
        downloadable,
        status
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *
      `,
      [
        userId,
        prompt,
        limit.mode,
        totalDurationSec,
        limit.isPaid,
        limit.downloadable,
        "processing",
      ]
    );

    const video = videoResult.rows[0];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];

      await client.query(
        `
        insert into scenes (
          video_id,
          order_index,
          prompt,
          duration_sec,
          status
        )
        values ($1, $2, $3, $4, $5)
        `,
        [video.id, i, scene.prompt, scene.durationSec, "pending"]
      );
    }

    await client.query("COMMIT");

    return video;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}