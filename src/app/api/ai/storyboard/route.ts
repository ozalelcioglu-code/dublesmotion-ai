import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import {
  generateSceneImage,
  generateStoryboard,
} from "../../../../lib/ai/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  idea: z.string().min(3),
  brand: z.string().min(1).default("Brand"),
  ratio: z
    .union([z.literal("square"), z.literal("vertical"), z.literal("horizontal")])
    .default("square"),
  durationSec: z.number().min(10).max(60).default(24),
  language: z.enum(["en", "tr"]).default("en"),
});

const uploadSceneImageToBlob = async (
  id: string,
  base64: string,
  mimeType: string
) => {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error("Missing env: BLOB_READ_WRITE_TOKEN");
  }

  const buffer = Buffer.from(base64, "base64");
  const extension =
    mimeType === "image/webp"
      ? "webp"
      : mimeType === "image/jpeg"
      ? "jpg"
      : "png";

  const blob = await put(`storyboard-scenes/${id}.${extension}`, buffer, {
    access: "public",
    token: blobToken,
    contentType: mimeType,
    addRandomSuffix: true,
  });

  return blob.url;
};

const normalizeStoryboard = async (
  raw: any,
  input: z.infer<typeof RequestSchema>
) => {
  const ratio = raw?.ratio ?? input.ratio;
  const title = raw?.title ?? `${input.brand} Video`;

  const rawScenes = Array.isArray(raw?.scenes) ? raw.scenes : [];

  const safeScenes = await Promise.all(
    rawScenes.map(async (scene: any, index: number) => {
      const id =
        typeof scene?.id === "string" && scene.id.trim()
          ? scene.id
          : `scene-${index + 1}`;

      const sceneTitle =
        typeof scene?.title === "string" && scene.title.trim()
          ? scene.title
          : `Scene ${index + 1}`;

      const prompt =
        typeof scene?.prompt === "string" && scene.prompt.trim()
          ? scene.prompt
          : `${input.idea} - scene ${index + 1}`;

      const imagePrompt =
        typeof scene?.image_prompt === "string" && scene.image_prompt.trim()
          ? scene.image_prompt
          : prompt;

      const onScreenText =
        typeof scene?.on_screen_text === "string" && scene.on_screen_text.trim()
          ? scene.on_screen_text
          : undefined;

      const durationSec =
        typeof scene?.duration_sec === "number" &&
        Number.isFinite(scene.duration_sec)
          ? scene.duration_sec
          : 3;

      let imageUrl: string | undefined;

      try {
        const generatedImage = await generateSceneImage({
          imagePrompt,
          ratio,
        });

        imageUrl = await uploadSceneImageToBlob(
          id,
          generatedImage.base64,
          generatedImage.mimeType
        );

        console.log(`Scene image uploaded for ${id}: ${imageUrl}`);
      } catch (error) {
        console.error(`Image generation/upload failed for ${id}:`, error);
        imageUrl = undefined;
      }

      return {
        id,
        title: sceneTitle,
        prompt,
        imagePrompt,
        onScreenText,
        durationSec,
        imageUrl,
        videoUrl: undefined,
      };
    })
  );

  return {
    title,
    ratio,
    brand_tone: {
      vibe:
        typeof raw?.brand_tone?.vibe === "string"
          ? raw.brand_tone.vibe
          : "modern",
      keywords: Array.isArray(raw?.brand_tone?.keywords)
        ? raw.brand_tone.keywords.filter((x: unknown) => typeof x === "string")
        : [],
    },
    script: {
      hook:
        typeof raw?.script?.hook === "string" ? raw.script.hook : "",
      body: Array.isArray(raw?.script?.body)
        ? raw.script.body.filter((x: unknown) => typeof x === "string")
        : [],
      cta:
        typeof raw?.script?.cta === "string" ? raw.script.cta : "",
      captions: Array.isArray(raw?.script?.body)
        ? raw.script.body.filter((x: unknown) => typeof x === "string")
        : [],
    },
    scenes: safeScenes,
  };
};

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = RequestSchema.parse(json);

    const storyboardRaw = await generateStoryboard(input);
    const storyboard = await normalizeStoryboard(storyboardRaw, input);

    console.log("=== STORYBOARD IMAGE CHECK ===");
    console.log("scene count:", storyboard.scenes.length);
    storyboard.scenes.forEach((scene, index) => {
      console.log(`scene[${index}] id:`, scene.id);
      console.log(`scene[${index}] has imageUrl:`, Boolean(scene.imageUrl));
      console.log(`scene[${index}] imageUrl:`, scene.imageUrl ?? "NONE");
    });

    return NextResponse.json(
      {
        ok: true,
        storyboard,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Storyboard generation failed:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Storyboard generation failed",
      },
      { status: 500 }
    );
  }
}