import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";


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

function buildScenePrompts(prompt: string, sceneCount: number, logoMode = false) {
  if (logoMode) {
    return [
      "clean cinematic logo reveal, subtle glow animation, smooth motion, premium brand intro, stable camera",
    ];
  }

  if (sceneCount === 1) {
    return [`${prompt}, cinematic master shot, clear subject, premium ad look`];
  }

  if (sceneCount === 2) {
    return [
      `${prompt}, opening hero shot, cinematic lighting, premium commercial style`,
      `${prompt}, follow-up motion shot, smooth camera move, clear subject, premium commercial style`,
    ];
  }

  if (sceneCount === 3) {
    return [
      `${prompt}, opening wide hero shot, cinematic lighting, premium ad look`,
      `${prompt}, middle motion shot, stronger movement, realistic commercial scene`,
      `${prompt}, final close shot, polished ending frame, premium ad finish`,
    ];
  }

  return [
    `${prompt}, opening hero shot, cinematic premium composition`,
    `${prompt}, second motion scene, realistic product-commercial feel`,
    `${prompt}, third scene, stronger movement, polished ad style`,
    `${prompt}, final closing scene, premium ending frame, brand finish`,
  ];
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

  switch (input.mode) {
    case "logo_to_video": {
      const image = resolveImageSource(input);

      const logoVideoPrompt =
        "clean cinematic logo reveal, subtle glow animation, smooth premium brand intro, stable camera, elegant motion";

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
      const baseImage = resolveImageSource(input);
      const sceneCount = getSceneCount(durationSec, input.plan);

      const scenePrompts = buildScenePrompts(prompt, sceneCount);
      const sceneImages = await generateSceneImages(
        scenePrompts,
        input.negativePrompt,
        "horizontal"
      );

      if (!sceneImages.length) {
        sceneImages.push(baseImage);
      }

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

     const mergedVideoUrl = sceneVideoUrls[0];

      return {
        mode: "image_to_video",
        imageUrl: baseImage,
        videoUrl: mergedVideoUrl,
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

      const scenePrompts = buildScenePrompts(prompt, sceneCount);
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

      const mergedVideoUrl = sceneVideoUrls[0];

      return {
        mode: "url_to_video",
        imageUrl: image,
        videoUrl: mergedVideoUrl,
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

      const scenePrompts = buildScenePrompts(prompt, sceneCount);
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

      const scenePrompts = buildScenePrompts(prompt, sceneCount);
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

     const mergedVideoUrl = sceneVideoUrls[0];

      return {
        mode: "text_to_video",
        imageUrl: sceneImages[0],
        videoUrl: mergedVideoUrl,
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