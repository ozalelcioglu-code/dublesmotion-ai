import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath as string);


if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} 

async function downloadFile(url: string, targetPath: string) {
  const res = await fetch(url);

  if (!res.ok || !res.body) {
    throw new Error(`Failed to download scene video: ${url}`);
  }

  const fileStream = createWriteStream(targetPath);
  await pipeline(res.body as any, fileStream as any);
}

export async function mergeSceneVideos(sceneVideoUrls: string[]) {
  if (!sceneVideoUrls.length) {
    throw new Error("No scene videos to merge");
  }

  if (sceneVideoUrls.length === 1) {
    return sceneVideoUrls[0];
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dubles-merge-"));

  try {
    const inputPaths: string[] = [];

    for (let i = 0; i < sceneVideoUrls.length; i++) {
      const inputPath = path.join(tempDir, `scene-${i + 1}.mp4`);
      await downloadFile(sceneVideoUrls[i], inputPath);
      inputPaths.push(inputPath);
    }

    const concatFilePath = path.join(tempDir, "concat.txt");
    const concatContent = inputPaths
      .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
      .join("\n");

    await fs.writeFile(concatFilePath, concatContent, "utf8");

    const outputPath = path.join(tempDir, "merged.mp4");

    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(concatFilePath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions([
          "-c:v libx264",
          "-preset veryfast",
          "-crf 22",
          "-pix_fmt yuv420p",
          "-c:a aac",
          "-movflags +faststart",
        ])
        .save(outputPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err));
    });

    const buffer = await fs.readFile(outputPath);

    const uploadRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL}/api/upload-merged-video`,
      {
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-upload-filename": `merged-${Date.now()}.mp4`,
        },
        body: new Uint8Array(buffer),
      }
    );

    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok || !uploadJson?.ok || !uploadJson?.videoUrl) {
      throw new Error(uploadJson?.error || "Merged video upload failed");
    }

    return uploadJson.videoUrl as string;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}