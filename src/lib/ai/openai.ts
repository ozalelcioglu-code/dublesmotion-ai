import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";

export type Ratio = "square" | "vertical" | "horizontal";

export const StoryboardSchema = z
  .object({
    language: z.enum(["en", "tr"]).default("en"),
    title: z.string().min(3).max(80),
    brand_tone: z
      .object({
        keywords: z.array(z.string().min(2).max(24)).min(3).max(8),
        vibe: z.enum(["premium", "modern", "friendly", "bold", "minimal"]),
      })
      .strict(),
    script: z
      .object({
        hook: z.string().min(5).max(140),
        body: z.array(z.string().min(5).max(160)).min(2).max(6),
        cta: z.string().min(3).max(80),
      })
      .strict(),
    scenes: z
      .array(
        z
          .object({
            title: z.string().min(3).max(60),
            prompt: z.string().min(10).max(420),
            image_prompt: z.string().min(10).max(500),
            on_screen_text: z.string().min(0).max(60),
            duration_sec: z.number().int().min(2).max(10),
          })
          .strict()
      )
      .min(3)
      .max(7),
  })
  .strict();

export type Storyboard = z.infer<typeof StoryboardSchema>;

export type GeneratedSceneImage = {
  mimeType: string;
  base64: string;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const openai = new OpenAI({
  apiKey: mustEnv("OPENAI_API_KEY"),
});

const getImageSizeFromRatio = (
  ratio: Ratio
): "1024x1024" | "1024x1536" | "1536x1024" => {
  switch (ratio) {
    case "vertical":
      return "1024x1536";
    case "horizontal":
      return "1536x1024";
    case "square":
    default:
      return "1024x1024";
  }
};

export async function generateStoryboard(input: {
  idea: string;
  brand: string;
  ratio: Ratio;
  durationSec: number;
  language?: "en" | "tr";
}): Promise<Storyboard> {
  const idea = input.idea.trim();
  if (!idea) throw new Error("idea is required");

  const brand = (input.brand || "Brand").trim();
  const ratio = input.ratio ?? "square";
  const durationSec = Number.isFinite(input.durationSec) ? input.durationSec : 24;
  const language = input.language ?? "en";

  const system = [
    "You are an award-winning ad director and storyboard artist.",
    "Create a realistic, cinematic advertising storyboard as structured JSON.",
    "Keep it production-ready: short scenes, clear camera motion, lighting, lens style, composition, mood, and continuity.",
    "Every scene must include BOTH:",
    "- a cinematic motion prompt in `prompt` for video composition",
    "- a high-quality still-image generation prompt in `image_prompt` for creating the background keyframe of that scene",
    "The `image_prompt` must describe subject, environment, lighting, lens, composition, materials, realism/stylization, and color mood.",
    "Keep visual consistency across all scenes.",
    "Do NOT mention AI tools, software names, subtitles, captions, watermarks, UI, split screens, or text overlays inside image_prompt.",
    "Return ONLY data that matches the provided JSON schema.",
  ].join(" ");

  const user = [
    `Brand: ${brand}`,
    `Video aspect ratio: ${ratio} (square=1:1, vertical=9:16, horizontal=16:9)`,
    `Target duration: ${durationSec} seconds total`,
    `Language: ${language}`,
    "",
    `Idea: ${idea}`,
    "",
    "Requirements:",
    "- 3 to 7 scenes.",
    "- Each scene duration 2-10 seconds.",
    "- Scene prompts must be cinematic and realistic: camera movement, lens, lighting, depth of field, subtle film grain.",
    "- image_prompt must be optimized for a single high-quality still frame that represents the scene.",
    "- Use a consistent visual language across scenes.",
    "- Include a strong hook and a clear CTA.",
    "- Keep the ad premium and production-ready.",
  ].join("\n");

  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: zodResponseFormat(StoryboardSchema, "storyboard"),
  });

  const parsed = completion.choices?.[0]?.message?.parsed;
  if (!parsed) throw new Error("No storyboard returned from OpenAI");

  return parsed;
}

export async function generateSceneImage(input: {
  imagePrompt: string;
  ratio: Ratio;
}): Promise<GeneratedSceneImage> {
  const imagePrompt = input.imagePrompt.trim();
  if (!imagePrompt) {
    throw new Error("imagePrompt is required");
  }

  const size = getImageSizeFromRatio(input.ratio);

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt: imagePrompt,
      size,
    });

    const image = response.data?.[0];

    const base64 =
      typeof image?.b64_json === "string" && image.b64_json.length > 0
        ? image.b64_json
        : null;

    if (!base64) {
      throw new Error(
        `No base64 image returned. Raw first image keys: ${JSON.stringify(
          image ? Object.keys(image) : null
        )}`
      );
    }

    return {
      mimeType: "image/png",
      base64,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown image generation error";
    throw new Error(`generateSceneImage failed: ${message}`);
  }
}