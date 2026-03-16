import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";
import { generateStoryboard } from "./storyboard";
import { applyStyle, type VideoStyle } from "./style-engine";
import { createCharacterContinuity } from "./character-engine";

export type GenerationMode =
  | "text_to_image"
  | "text_to_video"
  | "url_to_video"
  | "image_to_video"
  | "logo_to_video";

export type GenerateContentInput = {
  mode: GenerationMode;
  prompt?: string;
  negativePrompt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  durationSec?: number;
  plan?: string;
  style?: VideoStyle;
};

export type GenerateContentResult =
  | {
      mode: "image_to_video" | "url_to_video" | "logo_to_video";
      imageUrl: string;
      videoUrl: string;
      provider: "replicate";
      model: string;
      durationSec: number;
      sceneImages: string[];
      scenePrompts: string[];
      sceneVideoUrls: string[];
      actualClipDurationSec: number;
    }
  | {
      mode: "text_to_image";
      imageUrl: string;
      provider: "replicate";
      model: string;
      durationSec: number;
      sceneImages: string[];
      scenePrompts: string[];
      sceneVideoUrls: string[];
      actualClipDurationSec: number;
    }
  | {
      mode: "text_to_video";
      imageUrl: string;
      videoUrl: string;
      provider: "replicate";
      model: string;
      durationSec: number;
      sceneImages: string[];
      scenePrompts: string[];
      sceneVideoUrls: string[];
      actualClipDurationSec: number;
    };

function requirePrompt(prompt?: string) {
  if (!prompt?.trim()) {
    throw new Error("prompt is required");
  }
  return prompt.trim();
}

function resolveImageSource(input: GenerateContentInput): string {
  const direct = input.imageUrl?.trim();
  const source = input.sourceUrl?.trim();

  if (direct) return direct;
  if (source) return source;

  throw new Error("imageUrl or sourceUrl is required");
}

function normalizeDurationSec(durationSec?: number) {
  if (durationSec && durationSec >= 30) return 30;
  if (durationSec && durationSec >= 20) return 20;
  return 10;
}

function getSceneCount(durationSec: number, plan?: string) {
  const p = (plan || "free").toLowerCase();

  if (p === "free") return 1;
  if (p === "starter") return durationSec >= 20 ? 2 : 1;
  if (p === "pro") return durationSec >= 30 ? 3 : 2;
  if (p === "agency") return durationSec >= 30 ? 4 : 3;

  if (durationSec >= 30) return 3;
  if (durationSec >= 20) return 2;
  return 1;
}

function getRequestedSceneDuration(totalDurationSec: number, sceneCount: number) {
  return Math.max(5, Math.round(totalDurationSec / Math.max(sceneCount, 1)));
}

function mergeNegativePrompts(
  baseNegativePrompt?: string,
  extraNegativePrompt?: string
) {
  const defaults = [
    "low quality",
    "blurry",
    "distorted face",
    "distorted body",
    "bad anatomy",
    "warped objects",
    "text artifacts",
    "watermark",
    "cropped subject",
    "deformed hands",
    "duplicate character",
    "inconsistent character",
    "messy background",
  ].join(", ");

  const parts = [
    baseNegativePrompt?.trim(),
    extraNegativePrompt?.trim(),
    defaults,
  ].filter(Boolean);

  return parts.join(", ");
}

async function buildStoryScenes(input: {
  prompt: string;
  sceneCount: number;
  style: VideoStyle;
}) {
  const storyboard = await generateStoryboard(input.prompt, input.sceneCount);
  const continuity = createCharacterContinuity(input.prompt);

  const scenePrompts = storyboard.map((scene, index) => {
    const linkedPrompt =
      index === 0
        ? `${scene.prompt}, beginning of the story`
        : index === storyboard.length - 1
        ? `${scene.prompt}, final part of the same story`
        : `${scene.prompt}, continuation of the same story`;

    return applyStyle(
      `${linkedPrompt}, ${continuity.continuityPrompt}, preserve the same main subject and environment continuity`,
      input.style
    );
  });

  return {
    scenePrompts,
  };
}

async function generateSceneImages(
  scenePrompts: string[],
  negativePrompt?: string,
  ratio: "horizontal" | "square" = "horizontal"
) {
  return Promise.all(
    scenePrompts.map((scenePrompt) =>
      generateTextToImage({
        prompt: scenePrompt,
        negativePrompt: mergeNegativePrompts(negativePrompt),
        ratio,
      })
    )
  );
}

export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  const durationSec = normalizeDurationSec(input.durationSec);
  const style = input.style ?? "cinematic";

  switch (input.mode) {
    case "logo_to_video": {
      const image = resolveImageSource(input);

      const logoPrompt = applyStyle(
        "clean cinematic logo reveal, subtle glow animation, smooth premium brand intro, elegant motion, stable composition",
        style === "realistic" ? "cinematic" : style
      );

      const logoNegativePrompt = mergeNegativePrompts(
        input.negativePrompt,
        "fire, explosion, broken logo, distorted text, messy animation"
      );

      const videoUrl = await generateImageToVideo({
        image,
        prompt: logoPrompt,
        negativePrompt: logoNegativePrompt,
        durationSec: Math.min(durationSec, 10),
      });

      return {
        mode: "logo_to_video",
        imageUrl: image,
        videoUrl,
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec: Math.min(durationSec, 10),
        sceneImages: [image],
        scenePrompts: [logoPrompt],
        sceneVideoUrls: [videoUrl],
        actualClipDurationSec: Math.min(durationSec, 10),
      };
    }

    case "image_to_video": {
      const prompt = requirePrompt(input.prompt);
      const baseImage = resolveImageSource(input);
      const sceneCount = getSceneCount(durationSec, input.plan);

      const { scenePrompts } = await buildStoryScenes({
        prompt,
        sceneCount,
        style,
      });

      const sceneImages = await generateSceneImages(
        scenePrompts,
        input.negativePrompt,
        "horizontal"
      );

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? baseImage,
            prompt: scenePrompt,
            negativePrompt: mergeNegativePrompts(input.negativePrompt),
            durationSec: requestedSceneDuration,
          })
        )
      );

      return {
        mode: "image_to_video",
        imageUrl: baseImage,
        videoUrl: sceneVideoUrls[0],
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls,
        actualClipDurationSec: requestedSceneDuration,
      };
    }

    case "url_to_video": {
      const prompt = requirePrompt(input.prompt);
      const image = resolveImageSource(input);
      const sceneCount = getSceneCount(durationSec, input.plan);

      const { scenePrompts } = await buildStoryScenes({
        prompt,
        sceneCount,
        style,
      });

      const sceneImages = await generateSceneImages(
        scenePrompts,
        input.negativePrompt,
        "horizontal"
      );

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? image,
            prompt: scenePrompt,
            negativePrompt: mergeNegativePrompts(input.negativePrompt),
            durationSec: requestedSceneDuration,
          })
        )
      );

      return {
        mode: "url_to_video",
        imageUrl: image,
        videoUrl: sceneVideoUrls[0],
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls,
        actualClipDurationSec: requestedSceneDuration,
      };
    }

    case "text_to_image": {
      const prompt = requirePrompt(input.prompt);
      const sceneCount = getSceneCount(durationSec, input.plan);

      const { scenePrompts } = await buildStoryScenes({
        prompt,
        sceneCount,
        style,
      });

      const sceneImages = await generateSceneImages(
        scenePrompts,
        input.negativePrompt,
        "horizontal"
      );

      return {
        mode: "text_to_image",
        imageUrl: sceneImages[0],
        provider: "replicate",
        model: "black-forest-labs/flux-schnell",
        durationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls: [],
        actualClipDurationSec: 0,
      };
    }

    case "text_to_video": {
      const prompt = requirePrompt(input.prompt);
      const sceneCount = getSceneCount(durationSec, input.plan);

      const { scenePrompts } = await buildStoryScenes({
        prompt,
        sceneCount,
        style,
      });

      const sceneImages = await generateSceneImages(
        scenePrompts,
        input.negativePrompt,
        "horizontal"
      );

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index],
            prompt: scenePrompt,
            negativePrompt: mergeNegativePrompts(input.negativePrompt),
            durationSec: requestedSceneDuration,
          })
        )
      );

      return {
        mode: "text_to_video",
        imageUrl: sceneImages[0],
        videoUrl: sceneVideoUrls[0],
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls,
        actualClipDurationSec: requestedSceneDuration,
      };
    }

    default:
      throw new Error("Unsupported generation mode");
  }
}