import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";
import { buildCinematicPlan } from "./cinematic-prompt-engine";
import { analyzePromptKind } from "./prompt-guardrails";

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
    "text distortion",
    "letters deformation",
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
  return [
    input.subjectOrScene,
    input.action || "realistic motion",
    input.cameraMotion || "stable camera",
  ]
    .filter(Boolean)
    .join(", ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLogoPrompt(userPrompt?: string) {
  const cleanUserPrompt = userPrompt?.trim();

  return {
    imagePrompt: [
      "clean premium technology logo on dark background",
      "minimal cinematic lighting",
      "soft reflections",
      "subtle glow",
      cleanUserPrompt || "modern brand identity",
      "center composition",
      "high contrast",
      "ultra clean edges",
    ].join(", "),
    videoPrompt: [
      "clean cinematic logo reveal",
      "subtle glow animation",
      "soft particles",
      "slow push in",
      "stable camera",
      "premium technology brand intro",
    ].join(", "),
    negativePrompt: [
      "fire",
      "explosion",
      "burning building",
      "destroyed structure",
      "distorted logo",
      "broken text",
      "warped letters",
      "duplicate logo",
      "messy background",
      "cheap CGI",
      "blurry",
    ].join(", "),
  };
}

async function generateSceneAssets(
  input: GenerateContentInput,
  prompt: string,
  durationSec: number
) {
  const promptInfo = analyzePromptKind(prompt);
  const safePrompt = promptInfo.safePrompt;
  const sceneCount = getSceneCount(durationSec, input.plan, promptInfo.kind);

  if (promptInfo.kind === "logo_animation" || promptInfo.kind === "text_animation") {
    const logoPreset = buildLogoPrompt(prompt);

    const imageUrl = await generateTextToImage({
      prompt: logoPreset.imagePrompt,
      negativePrompt: mergeNegativePrompts(
        input.negativePrompt,
        logoPreset.negativePrompt
      ),
      ratio: "horizontal",
    });

    return {
      scenePrompts: [logoPreset.videoPrompt],
      sceneImages: [imageUrl],
      sceneNegativePrompts: [
        mergeNegativePrompts(input.negativePrompt, logoPreset.negativePrompt),
      ],
    };
  }

  const cinematicPlan = buildCinematicPlan({
    prompt: safePrompt,
    plan: input.plan || "free",
    mode: input.mode,
    sceneCount,
  });

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
    case "logo_to_video": {
      const image = resolveImageSource(input);

      const logoVideoPrompt = [
        "clean cinematic logo reveal",
        "subtle glow animation",
        "soft particles",
        "slow push in",
        "stable camera",
        "premium technology brand intro",
      ].join(", ");

      const logoNegativePrompt = mergeNegativePrompts(
        input.negativePrompt,
        "fire, explosion, distorted logo, broken text, messy background, warped letters"
      );

      const videoUrl = await generateImageToVideo({
        image,
        prompt: logoVideoPrompt,
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
        scenePrompts: [logoVideoPrompt],
        sceneVideoUrls: [videoUrl],
        actualClipDurationSec: Math.min(durationSec, 10),
      };
    }

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

      const { scenePrompts, sceneImages } =
        await generateSceneAssets(input, prompt, durationSec);

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