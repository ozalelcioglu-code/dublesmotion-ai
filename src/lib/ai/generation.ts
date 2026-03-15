import { generateImageToVideo } from "./video";
import { generateTextToImage } from "./image";

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
    }
  | {
      mode: "text_to_image";
      imageUrl: string;
      provider: "replicate";
      model: string;
      durationSec: number;
      sceneImages: string[];
      scenePrompts: string[];
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

function buildScenePrompts(prompt: string, durationSec: number) {
  const sceneCount = durationSec >= 30 ? 3 : durationSec >= 20 ? 2 : 1;

  if (sceneCount === 1) {
    return [`${prompt}, cinematic master shot, detailed composition`];
  }

  if (sceneCount === 2) {
    return [
      `${prompt}, opening wide establishing shot, cinematic lighting`,
      `${prompt}, second scene with closer composition and stronger motion`,
    ];
  }

  return [
    `${prompt}, opening establishing shot, cinematic wide composition`,
    `${prompt}, middle action shot, stronger motion and closer framing`,
    `${prompt}, final closing shot, dramatic cinematic ending frame`,
  ];
}

async function generateSceneImages(
  prompt: string,
  negativePrompt: string | undefined,
  durationSec: number
) {
  const scenePrompts = buildScenePrompts(prompt, durationSec);

  const sceneImages = await Promise.all(
    scenePrompts.map((scenePrompt) =>
      generateTextToImage({
        prompt: scenePrompt,
        negativePrompt,
        ratio: "square",
      })
    )
  );

  return { scenePrompts, sceneImages };
}

export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  const durationSec = normalizeDurationSec(input.durationSec);

  switch (input.mode) {
    case "image_to_video": {
      const prompt = requirePrompt(input.prompt);
      const image = resolveImageSource(input);
      const { scenePrompts, sceneImages } = await generateSceneImages(
        prompt,
        input.negativePrompt,
        durationSec
      );

      const videoUrl = await generateImageToVideo({
        image,
        prompt,
        negativePrompt: input.negativePrompt,
        durationSec,
      });

      return {
        mode: "image_to_video",
        imageUrl: image,
        videoUrl,
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
      };
    }

    case "url_to_video": {
      const prompt = requirePrompt(input.prompt);
      const image = resolveImageSource(input);
      const { scenePrompts, sceneImages } = await generateSceneImages(
        prompt,
        input.negativePrompt,
        durationSec
      );

      const videoUrl = await generateImageToVideo({
        image,
        prompt,
        negativePrompt: input.negativePrompt,
        durationSec,
      });

      return {
        mode: "url_to_video",
        imageUrl: image,
        videoUrl,
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
      };
    }

    case "text_to_image": {
      const prompt = requirePrompt(input.prompt);
      const { scenePrompts, sceneImages } = await generateSceneImages(
        prompt,
        input.negativePrompt,
        durationSec
      );

      const imageUrl = await generateTextToImage({
        prompt,
        negativePrompt: input.negativePrompt,
      });

      return {
        mode: "text_to_image",
        imageUrl,
        provider: "replicate",
        model: "black-forest-labs/flux-schnell",
        durationSec,
        sceneImages,
        scenePrompts,
      };
    }

    case "text_to_video": {
      const prompt = requirePrompt(input.prompt);
      const { scenePrompts, sceneImages } = await generateSceneImages(
        prompt,
        input.negativePrompt,
        durationSec
      );

      const imageUrl = sceneImages[0];

      const videoUrl = await generateImageToVideo({
        image: imageUrl,
        prompt,
        negativePrompt: input.negativePrompt,
        durationSec,
      });

      return {
        mode: "text_to_video",
        imageUrl,
        videoUrl,
        provider: "replicate",
        model: "wan-video/wan-2.2-i2v-fast",
        durationSec,
        sceneImages,
        scenePrompts,
      };
    }

    default:
      throw new Error("Unsupported generation mode");
  }
}