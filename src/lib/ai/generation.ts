import { uploadRemoteVideoToCloudinary } from "../server/cloudinary-video";

type GenerationMode =
  | "image_to_video"
  | "text_to_image"
  | "text_to_video"
  | "logo_to_video";

type VideoStyle =
  | "realistic"
  | "cinematic"
  | "3d_animation"
  | "anime"
  | "pixar"
  | "cartoon";

export type GenerateContentInput = {
  mode: GenerationMode;
  prompt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  durationSec: number;
  ratio?: "1:1" | "16:9" | "9:16";
  plan: string;
  style?: VideoStyle;
  preview?: boolean;
};

type ReplicatePredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

type ReplicatePrediction = {
  id: string;
  status: ReplicatePredictionStatus;
  error?: string | null;
  output?: unknown;
};

type ImageGenerationResult = {
  ok: true;
  mode: "text_to_image";
  provider: "replicate";
  model: string;
  imageUrl: string;
  durationSec: 0;
};

type VideoGenerationResult = {
  ok: true;
  mode: "text_to_video" | "image_to_video" | "logo_to_video";
  provider: "replicate";
  model: string;
  videoUrl: string;
  durationSec: number;
  actualClipDurationSec: number;
  sceneImages: string[];
  scenePrompts: string[];
  sceneVideoUrls: string[];
};

export type GenerateContentResult =
  | ImageGenerationResult
  | VideoGenerationResult;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";

const TEXT_VIDEO_MODEL =
  process.env.REPLICATE_TEXT_TO_VIDEO_MODEL ||
  process.env.REPLICATE_TEXT_VIDEO_MODEL ||
  "minimax/hailuo-2.3";

const IMAGE_VIDEO_MODEL =
  process.env.REPLICATE_IMAGE_TO_VIDEO_MODEL ||
  process.env.REPLICATE_IMAGE_VIDEO_MODEL ||
  "minimax/hailuo-2.3";

const TEXT_IMAGE_MODEL =
  process.env.REPLICATE_TEXT_IMAGE_MODEL ||
  "black-forest-labs/flux-schnell";

function ensureEnv() {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }
}

function parseModel(model: string) {
  const [owner, name] = model.split("/");

  if (!owner || !name) {
    throw new Error(`Invalid Replicate model: ${model}`);
  }

  return { owner, name };
}

function normalizeAspectRatio(ratio?: string): "1:1" | "16:9" | "9:16" {
  if (ratio === "1:1" || ratio === "16:9" || ratio === "9:16") {
    return ratio;
  }

  return "16:9";
}

function normalizeDuration(durationSec?: number): number {
  if (typeof durationSec !== "number" || !Number.isFinite(durationSec)) {
    return 8;
  }

  return Math.max(5, Math.min(120, Math.round(durationSec)));
}

function normalizePrompt(
  prompt?: string,
  fallback = "Create a cinematic result."
): string {
  const value = typeof prompt === "string" ? prompt.trim() : "";
  return value || fallback;
}

function normalizeStyle(style?: string): VideoStyle | undefined {
  if (!style) return undefined;

  switch (style) {
    case "realistic":
      return "realistic";
    case "cinematic":
      return "cinematic";
    case "3d_animation":
    case "3d_render":
    case "3d":
      return "3d_animation";
    case "anime":
      return "anime";
    case "pixar":
      return "pixar";
    case "cartoon":
      return "cartoon";
    default:
      return "cinematic";
  }
}

async function replicateRequest<T>(path: string, init?: RequestInit) {
  ensureEnv();

  const res = await fetch(`https://api.replicate.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        data?.message ||
        `Replicate request failed: ${res.status}`
    );
  }

  return data as T;
}

async function createPrediction(
  model: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction> {
  const { owner, name } = parseModel(model);

  return replicateRequest<ReplicatePrediction>(
    `/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      body: JSON.stringify({ input }),
    }
  );
}

async function getPrediction(id: string): Promise<ReplicatePrediction> {
  return replicateRequest<ReplicatePrediction>(`/predictions/${id}`, {
    method: "GET",
  });
}

async function waitPrediction(id: string): Promise<ReplicatePrediction> {
  const startedAt = Date.now();
  const timeoutMs = 1000 * 60 * 10;
  const intervalMs = 2500;

  while (true) {
    const prediction = await getPrediction(id);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || "Prediction failed");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Prediction timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function pickUrl(output: unknown): string {
  if (!output) {
    throw new Error("Replicate returned empty output");
  }

  if (typeof output === "string") {
    return output;
  }

  if (Array.isArray(output)) {
    const first = output[0];

    if (typeof first === "string") {
      return first;
    }

    if (first && typeof first === "object") {
      const maybeUrl =
        (first as { url?: string }).url ||
        (first as { href?: string }).href ||
        null;

      if (maybeUrl) {
        return maybeUrl;
      }
    }
  }

  if (typeof output === "object" && output) {
    const obj = output as Record<string, unknown>;

    if (typeof obj.url === "string") {
      return obj.url;
    }

    if (typeof obj.output === "string") {
      return obj.output;
    }
  }

  throw new Error("Could not parse Replicate output URL");
}

function buildImagePrompt(prompt: string, ratio: string) {
  return {
    prompt,
    aspect_ratio: ratio,
    output_format: "png",
    safety_tolerance: 2,
  };
}

function buildVideoPrompt(input: {
  prompt: string;
  ratio: string;
  durationSec: number;
  style?: VideoStyle;
  imageUrl?: string;
}) {
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    duration: input.durationSec,
    aspect_ratio: input.ratio,
  };

  if (input.imageUrl) {
    payload.first_frame_image = input.imageUrl;
  }

  if (input.style) {
    payload.style = input.style;
  }

  return payload;
}

async function generateImage(params: {
  prompt: string;
  ratio: "1:1" | "16:9" | "9:16";
}) {
  const prediction = await createPrediction(
    TEXT_IMAGE_MODEL,
    buildImagePrompt(params.prompt, params.ratio)
  );

  if (!prediction.id) {
    throw new Error("Replicate image prediction id missing");
  }

  const done = await waitPrediction(prediction.id);
  const imageUrl = pickUrl(done.output);

  return {
    provider: "replicate" as const,
    model: TEXT_IMAGE_MODEL,
    imageUrl,
  };
}

async function generateVideo(params: {
  model: string;
  prompt: string;
  imageUrl?: string;
  durationSec: number;
  ratio: "1:1" | "16:9" | "9:16";
  style?: VideoStyle;
}) {
  const prediction = await createPrediction(
    params.model,
    buildVideoPrompt({
      prompt: params.prompt,
      ratio: params.ratio,
      durationSec: params.durationSec,
      style: params.style,
      imageUrl: params.imageUrl,
    })
  );

  if (!prediction.id) {
    throw new Error("Replicate video prediction id missing");
  }

  const done = await waitPrediction(prediction.id);
  const videoUrl = pickUrl(done.output);

  return {
    provider: "replicate" as const,
    model: params.model,
    videoUrl,
  };
}

async function finalizeVideoUrl(
  sourceVideoUrl: string,
  preview: boolean | undefined
): Promise<string> {
  if (preview) {
    return sourceVideoUrl;
  }

  const uploaded = await uploadRemoteVideoToCloudinary({
    videoUrl: sourceVideoUrl,
    folder: "dubles/generated",
    resourceType: "video",
  });

  if (!uploaded?.secureUrl) {
    throw new Error("Cloudinary upload did not return secureUrl");
  }

  return uploaded.secureUrl;
}

export async function generateContent(
  input: GenerateContentInput
): Promise<GenerateContentResult> {
  const mode = input.mode;
  const ratio = normalizeAspectRatio(input.ratio);
  const durationSec = normalizeDuration(input.durationSec);
  const preview = input.preview === true;
  const style = normalizeStyle(input.style);

  if (mode === "text_to_image") {
    const prompt = normalizePrompt(
      input.prompt,
      "Create a polished cinematic image."
    );

    const image = await generateImage({
      prompt,
      ratio,
    });

    return {
      ok: true,
      mode: "text_to_image",
      provider: image.provider,
      model: image.model,
      imageUrl: image.imageUrl,
      durationSec: 0,
    };
  }

  if (mode === "image_to_video" && !input.imageUrl) {
    throw new Error("imageUrl is required for image_to_video");
  }

  if (mode === "logo_to_video" && !input.imageUrl && !input.sourceUrl) {
    throw new Error("imageUrl or sourceUrl is required for logo_to_video");
  }

  const prompt =
    mode === "logo_to_video"
      ? normalizePrompt(input.prompt, "Create a clean premium logo reveal animation.")
      : mode === "image_to_video"
      ? normalizePrompt(input.prompt, "Animate the uploaded image with smooth cinematic motion.")
      : normalizePrompt(input.prompt, "Create a cinematic AI video.");

  const model =
    mode === "image_to_video" || mode === "logo_to_video"
      ? IMAGE_VIDEO_MODEL
      : TEXT_VIDEO_MODEL;

  const sourceImage = input.imageUrl || input.sourceUrl;

  const video = await generateVideo({
    model,
    prompt,
    imageUrl: sourceImage,
    durationSec,
    ratio,
    style,
  });

  const finalVideoUrl = await finalizeVideoUrl(video.videoUrl, preview);

  return {
    ok: true,
    mode,
    provider: video.provider,
    model: video.model,
    videoUrl: finalVideoUrl,
    durationSec,
    actualClipDurationSec: durationSec,
    sceneImages: sourceImage ? [sourceImage] : [],
    scenePrompts: [prompt],
    sceneVideoUrls: [finalVideoUrl],
  };
}