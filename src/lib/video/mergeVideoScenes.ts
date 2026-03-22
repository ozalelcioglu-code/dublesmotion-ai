import fs from "fs";
import path from "path";
import os from "os";
import { exec as execCb } from "child_process";
import { promisify } from "util";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const exec = promisify(execCb);

async function downloadFile(url: string, filePath: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Dosya indirilemedi: ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  fs.writeFileSync(filePath, uint8);
}

async function uploadFinalVideo(localPath: string) {
  // Burayı kendi storage sistemine bağlayacağız.
  // Örn: S3, Cloudflare R2, Vercel Blob vs.
  return `https://example.com/final/${path.basename(localPath)}`;
}

export async function mergeVideoScenes(videoId: string) {
  const client = await pool.connect();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-merge-"));

  try {
    const result = await client.query(
      `
      select video_url
      from scenes
      where video_id = $1
      order by order_index asc
      `,
      [videoId]
    );

    const sceneUrls = result.rows.map((row) => row.video_url).filter(Boolean);

    if (!sceneUrls.length) {
      throw new Error("Birleştirilecek scene videosu bulunamadı.");
    }

    const localFiles: string[] = [];

    for (let i = 0; i < sceneUrls.length; i++) {
      const localPath = path.join(tempDir, `scene-${i}.mp4`);
      await downloadFile(sceneUrls[i], localPath);
      localFiles.push(localPath);
    }

    const listFilePath = path.join(tempDir, "inputs.txt");
    const listFileContent = localFiles.map((file) => `file '${file}'`).join("\n");
    fs.writeFileSync(listFilePath, listFileContent);

    const outputPath = path.join(tempDir, `final-${videoId}.mp4`);

    await exec(
      `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`
    );

    const finalVideoUrl = await uploadFinalVideo(outputPath);

    await client.query(
      `
      update videos
      set final_video_url = $1, status = $2, updated_at = now()
      where id = $3
      `,
      [finalVideoUrl, "done", videoId]
    );

    return { ok: true, finalVideoUrl };
  } finally {
    client.release();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}