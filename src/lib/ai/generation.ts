import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";
import { buildCinematicPlan } from "./cinematic-prompt-engine";

export type GenerationMode =
  | "text_to_image"
  | "text_to_video"
  | "url_to_video"
  | "image_to_video";

export type GenerateContentInput = {
  mode: GenerationMode;
  prompt?: string;
  negativePrompt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  durationSec?: number;
  plan?: string;
};

export type GenerateContentResult =
  | {
      mode: "image_to_video" | "url_to_video";
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

function getSceneCountFromDuration(durationSec: number) {
  if (durationSec >= 30) return 3;
  if (durationSec >= 20) return 2;
  return 1;
}

function getRequestedSceneDuration(totalDurationSec: number, sceneCount: number) {
  return Math.max(5, Math.round(totalDurationSec / Math.max(sceneCount, 1)));
}

function mergeNegativePrompts(
  baseNegativePrompt?: string,
  sceneNegativePrompt?: string
) {
  if (baseNegativePrompt?.trim() && sceneNegativePrompt?.trim()) {
    return `${baseNegativePrompt.trim()}, ${sceneNegativePrompt.trim()}`;
  }

  return baseNegativePrompt?.trim() || sceneNegativePrompt?.trim() || undefined;
}

async function generateSceneAssets(
  input: GenerateContentInput,
  prompt: string,
  durationSec: number
) {
  const sceneCount = getSceneCountFromDuration(durationSec);

  const cinematicPlan = buildCinematicPlan({
    prompt,
    plan: input.plan || "free",
    mode: input.mode,
    sceneCount,
  });

  const scenePrompts = cinematicPlan.scenes.map((scene) => scene.videoPrompt);

  const sceneImages = await Promise.all(
    cinematicPlan.scenes.map((scene) =>
      generateTextToImage({
        prompt: scene.imagePrompt,
        negativePrompt: mergeNegativePrompts(
          input.negativePrompt,
          scene.negativePrompt
        ),
        ratio: "square",
      })
    )
  );

  return {
    cinematicPlan,
    scenePrompts,
    sceneImages,
  };
}

export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  const durationSec = normalizeDurationSec(input.durationSec);

  switch (input.mode) {
    case "image_to_video": {
      const prompt = requirePrompt(input.prompt);
      const image = resolveImageSource(input);

      const { cinematicPlan, scenePrompts, sceneImages } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        cinematicPlan.scenes.length
      );

      const sceneVideoUrls = await Promise.all(
        cinematicPlan.scenes.map((scene, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? image,
            prompt: scene.videoPrompt,
            negativePrompt: mergeNegativePrompts(
              input.negativePrompt,
              scene.negativePrompt
            ),
            durationSec: requestedSceneDuration,
          })
        )
      );

      const videoUrl = sceneVideoUrls[0];

      return {
        mode: "image_to_video",
        imageUrl: image,
        videoUrl,
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

      const { cinematicPlan, scenePrompts, sceneImages } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        cinematicPlan.scenes.length
      );

      const sceneVideoUrls = await Promise.all(
        cinematicPlan.scenes.map((scene, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? image,
            prompt: scene.videoPrompt,
            negativePrompt: mergeNegativePrompts(
              input.negativePrompt,
              scene.negativePrompt
            ),
            durationSec: requestedSceneDuration,
          })
        )
      );

      const videoUrl = sceneVideoUrls[0];

      return {
        mode: "url_to_video",
        imageUrl: image,
        videoUrl,
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

      const { cinematicPlan, scenePrompts, sceneImages } =
        await generateSceneAssets(input, prompt, durationSec);

      const heroScene = cinematicPlan.scenes[0];

      const imageUrl = await generateTextToImage({
        prompt: heroScene?.imagePrompt || prompt,
        negativePrompt: mergeNegativePrompts(
          input.negativePrompt,
          heroScene?.negativePrompt
        ),
      });

      return {
        mode: "text_to_image",
        imageUrl,
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

      const { cinematicPlan, scenePrompts, sceneImages } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        cinematicPlan.scenes.length
      );

      const sceneVideoUrls = await Promise.all(
        cinematicPlan.scenes.map((scene, index) =>
          generateImageToVideo({
            image: sceneImages[index],
            prompt: scene.videoPrompt,
            negativePrompt: mergeNegativePrompts(
              input.negativePrompt,
              scene.negativePrompt
            ),
            durationSec: requestedSceneDuration,
          })
        )
      );

      const imageUrl = sceneImages[0];
      const videoUrl = sceneVideoUrls[0];

      return {
        mode: "text_to_video",
        imageUrl,
        videoUrl,
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