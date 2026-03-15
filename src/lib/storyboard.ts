import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStoryboard } from "./ai/openai";
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

const normalizeStoryboard = (
  raw: any,
  input: z.infer<typeof RequestSchema>
) => {
  const ratio = raw?.ratio ?? input.ratio;
  const title = raw?.title ?? `${input.brand} Video`;

  const rawScenes = Array.isArray(raw?.scenes) ? raw.scenes : [];

  const safeScenes = rawScenes.map((scene: any, index: number) => ({
    id:
      typeof scene?.id === "string" && scene.id.trim()
        ? scene.id
        : `scene-${index + 1}`,
    title:
      typeof scene?.title === "string" && scene.title.trim()
        ? scene.title
        : `Scene ${index + 1}`,
    prompt:
      typeof scene?.prompt === "string" && scene.prompt.trim()
        ? scene.prompt
        : `${input.idea} - scene ${index + 1}`,
    onScreenText:
      typeof scene?.onScreenText === "string" && scene.onScreenText.trim()
        ? scene.onScreenText
        : undefined,
    durationSec:
      typeof scene?.durationSec === "number" &&
      Number.isFinite(scene.durationSec)
        ? scene.durationSec
        : 3,
    imageUrl:
      typeof scene?.imageUrl === "string" && scene.imageUrl.trim()
        ? scene.imageUrl
        : undefined,
    videoUrl:
      typeof scene?.videoUrl === "string" && scene.videoUrl.trim()
        ? scene.videoUrl
        : undefined,
  }));

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
    scenes: safeScenes,
  };
};

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const input = RequestSchema.parse(json);

    const storyboardRaw = await generateStoryboard(input);
    const storyboard = normalizeStoryboard(storyboardRaw, input);

    return NextResponse.json(
      {
        ok: true,
        storyboard,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Storyboard generation failed",
      },
      { status: 500 }
    );
  }
}