import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";
import { buildCinematicPlan } from "./cinematic-prompt-engine";
import { analyzePromptKind } from "./prompt-guardrails";

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

function getSceneCount(durationSec: number, plan?: string, promptKind?: string) {
  if (promptKind === "logo_animation" || promptKind === "text_animation") {
    return 1;
  }

  const p = (plan || "free").toLowerCase();

  if (p === "free") return 1;
  if (p === "starter") return 2;
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
  sceneNegativePrompt?: string
) {
  const defaults = [
    "low quality",
    "blurry",
    "text",
    "letters",
    "watermark",
    "duplicate subject",
    "extra objects",
    "bad composition",
    "deformed structure",
    "unstable motion",
    "distorted face",
    "distorted hands",
  ].join(", ");

  if (baseNegativePrompt?.trim() && sceneNegativePrompt?.trim()) {
    return `${baseNegativePrompt.trim()}, ${sceneNegativePrompt.trim()}, ${defaults}`;
  }

  if (baseNegativePrompt?.trim()) {
    return `${baseNegativePrompt.trim()}, ${defaults}`;
  }

  if (sceneNegativePrompt?.trim()) {
    return `${sceneNegativePrompt.trim()}, ${defaults}`;
  }

  return defaults;
}

function buildShortVideoPrompt(input: {
  subjectOrScene: string;
  action?: string;
  cameraMotion?: string;
}) {
  const parts = [
    input.subjectOrScene,
    input.action || "realistic motion",
    input.cameraMotion || "stable camera",
  ];

  return parts
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateSceneAssets(
  input: GenerateContentInput,
  prompt: string,
  durationSec: number
) {
  const promptInfo = analyzePromptKind(prompt);
  const safePrompt = promptInfo.safePrompt;
  const sceneCount = getSceneCount(durationSec, input.plan, promptInfo.kind);

  // Logo/text-like promptlarda tek güvenli sahne
  if (promptInfo.kind === "logo_animation" || promptInfo.kind === "text_animation") {
    const imagePrompt = [
      safePrompt,
      "ultra realistic",
      "clean composition",
      "premium lighting",
      "minimal background",
    ].join(", ");

    const videoPrompt = buildShortVideoPrompt({
      subjectOrScene: "clean cinematic logo reveal",
      action: "subtle glow and particles",
      cameraMotion: "slow zoom in",
    });

    const imageUrl = await generateTextToImage({
      prompt: imagePrompt,
      negativePrompt: mergeNegativePrompts(
        input.negativePrompt,
        "fire, explosion, distorted logo, broken text"
      ),
      ratio: "horizontal",
    });

    return {
      scenePrompts: [videoPrompt],
      sceneImages: [imageUrl],
      sceneNegativePrompts: [
        mergeNegativePrompts(
          input.negativePrompt,
          "fire, explosion, distorted logo, broken text"
        ),
      ],
    };
  }

  const cinematicPlan = buildCinematicPlan({
    prompt: safePrompt,
    plan: input.plan || "free",
    mode: input.mode,
    sceneCount,
  });

  // İlk sahneyi hero'a yakın tutmak için establishing yerine ana özneyi görünür kılan promptlar
  const scenePrompts = cinematicPlan.scenes.map((scene) =>
    buildShortVideoPrompt({
      subjectOrScene:
        scene.shotType === "establishing"
          ? scene.imagePrompt.split(",").slice(0, 3).join(", ")
          : scene.videoPrompt.split(",").slice(0, 2).join(", "),
      action:
        scene.shotType === "detail"
          ? "subtle close detail motion"
          : scene.shotType === "action"
          ? "clear realistic action"
          : "realistic motion",
      cameraMotion: scene.cameraMotion,
    })
  );

  const sceneImages = await Promise.all(
    cinematicPlan.scenes.map((scene) =>
      generateTextToImage({
        prompt: scene.imagePrompt,
        negativePrompt: mergeNegativePrompts(
          input.negativePrompt,
          scene.negativePrompt
        ),
        ratio: "horizontal",
      })
    )
  );

  const sceneNegativePrompts = cinematicPlan.scenes.map((scene) =>
    mergeNegativePrompts(input.negativePrompt, scene.negativePrompt)
  );

  return {
    scenePrompts,
    sceneImages,
    sceneNegativePrompts,
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

      const { scenePrompts, sceneImages, sceneNegativePrompts } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? image,
            prompt: scenePrompt,
            negativePrompt: sceneNegativePrompts[index],
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

      const { scenePrompts, sceneImages, sceneNegativePrompts } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index] ?? image,
            prompt: scenePrompt,
            negativePrompt: sceneNegativePrompts[index],
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

      const { scenePrompts, sceneImages, sceneNegativePrompts } =
        await generateSceneAssets(input, prompt, durationSec);

      const imageUrl = await generateTextToImage({
        prompt: sceneImages[0] ? undefined as never : prompt,
        negativePrompt: sceneNegativePrompts[0],
        ratio: "horizontal",
      }).catch(async () => {
        return sceneImages[0];
      });

      return {
        mode: "text_to_image",
        imageUrl: imageUrl || sceneImages[0],
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

      const { scenePrompts, sceneImages, sceneNegativePrompts } =
        await generateSceneAssets(input, prompt, durationSec);

      const requestedSceneDuration = getRequestedSceneDuration(
        durationSec,
        scenePrompts.length
      );

      const sceneVideoUrls = await Promise.all(
        scenePrompts.map((scenePrompt, index) =>
          generateImageToVideo({
            image: sceneImages[index],
            prompt: scenePrompt,
            negativePrompt: sceneNegativePrompts[index],
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