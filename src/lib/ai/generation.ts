import { generateStoryboard } from "./storyboard";
import {
  buildCloudinaryConcatUrl,
  uploadRemoteVideoToCloudinary,
} from "../server/cloudinary-video";

type GenerationMode =
  | "image_to_video"
  | "url_to_video"
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

type GenerateContentInput = {
  mode: GenerationMode;
  prompt?: string;
  negativePrompt?: string;
  imageUrl?: string;
  sourceUrl?: string;
  durationSec: number;
  ratio?: "1:1" | "16:9" | "9:16";
  plan: string;
  style?: VideoStyle;
  preview?: boolean;
  sceneCount?: number;
  language?: "tr" | "en" | "de";
};

type BaseResult = {
  mode: GenerationMode | "text_to_image";
  provider: "replicate";
  model: string;
  durationSec: number;
  sceneImages: string[];
  scenePrompts: string[];
  sceneVideoUrls: string[];
  actualClipDurationSec: number;
};

type VideoResult = BaseResult & {
  videoUrl: string;
  imageUrl?: string | null;
};

type ImageResult = BaseResult & {
  imageUrl: string;
};

type ReplicatePrediction = {
  id: string;
  status:
    | "starting"
    | "processing"
    | "succeeded"
    | "failed"
    | "canceled";
  error?: string | null;
  output?: unknown;
};

type StoryboardScene = {
  title: string;
  prompt: string;
  durationSec?: number;
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";

const TEXT_VIDEO_MODEL =
  process.env.REPLICATE_TEXT_VIDEO_MODEL || "minimax/video-01";
const IMAGE_VIDEO_MODEL =
  process.env.REPLICATE_IMAGE_VIDEO_MODEL || "minimax/video-01-live";
const LOGO_VIDEO_MODEL =
  process.env.REPLICATE_LOGO_VIDEO_MODEL || IMAGE_VIDEO_MODEL;
const TEXT_IMAGE_MODEL =
  process.env.REPLICATE_TEXT_IMAGE_MODEL || "black-forest-labs/flux-schnell";

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

function sanitizePrompt(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function ratioValue(ratio?: string) {
  if (ratio === "1:1") return "1:1";
  if (ratio === "9:16") return "9:16";
  return "16:9";
}

function getSceneCount(plan: string, durationSec: number, mode: GenerationMode) {
  // Image/logo mode: fewer scenes = less identity drift
  if (mode === "image_to_video" || mode === "logo_to_video") {
    if (plan === "free") return 1;
    if (durationSec >= 20) return 2;
    return 1;
  }

  if (plan === "free") return 1;

  if (plan === "starter") {
    if (durationSec >= 20) return 3;
    if (durationSec >= 10) return 2;
    return 1;
  }

  if (plan === "pro") {
    if (durationSec >= 30) return 4;
    if (durationSec >= 20) return 3;
    return 2;
  }

  if (plan === "agency") {
    if (durationSec >= 30) return 4;
    if (durationSec >= 20) return 3;
    return 2;
  }

  if (durationSec >= 30) return 4;
  if (durationSec >= 20) return 3;
  if (durationSec >= 10) return 2;
  return 1;
}

function getSceneDurations(totalDurationSec: number, sceneCount: number) {
  if (sceneCount <= 1) return [totalDurationSec];

  const base = Math.floor(totalDurationSec / sceneCount);
  const remainder = totalDurationSec % sceneCount;

  return Array.from({ length: sceneCount }).map((_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

function getClipDuration(durationSec: number, sceneCount: number) {
  const perScene = Math.round(durationSec / Math.max(sceneCount, 1));

  // Replicate model only accepts 6 or 10
  if (perScene >= 8) return 10;
  return 6;
}

function styleDescriptor(style?: VideoStyle) {
  switch (style) {
    case "realistic":
      return [
        "photorealistic",
        "natural lighting",
        "realistic textures",
        "physically believable motion",
        "stable facial anatomy",
        "authentic depth and perspective",
      ].join(", ");

    case "cinematic":
      return [
        "cinematic premium commercial quality",
        "dramatic but tasteful lighting",
        "high-end camera language",
        "smooth dolly and tracking motion",
        "luxury ad aesthetic",
        "clean depth separation",
      ].join(", ");

    case "3d_animation":
      return [
        "high-end 3D animation",
        "premium render quality",
        "clean geometry",
        "cinematic lighting",
        "smooth motion arcs",
        "stylized but polished realism",
      ].join(", ");

    case "anime":
      return [
        "anime film quality",
        "clean character consistency",
        "expressive framing",
        "rich anime lighting",
        "premium cel-style rendering",
        "stable face and hand details",
      ].join(", ");

    case "pixar":
      return [
        "feature-quality stylized animation",
        "emotional cinematic composition",
        "premium family-film look",
        "beautiful soft lighting",
        "clean character design consistency",
        "polished animation timing",
      ].join(", ");

    case "cartoon":
      return [
        "stylized cartoon quality",
        "clean outlines",
        "vivid polished color",
        "stable design language",
        "smooth animated motion",
        "premium cartoon finish",
      ].join(", ");

    default:
      return [
        "premium cinematic quality",
        "clean motion",
        "high prompt adherence",
      ].join(", ");
  }
}

function buildNegativePrompt(negativePrompt?: string) {
  const base = [
    "low quality",
    "blurry",
    "flicker",
    "distorted anatomy",
    "bad hands",
    "extra fingers",
    "deformed face",
    "warped body",
    "jitter",
    "camera shake",
    "artifacting",
    "duplicate subject",
    "cut off head",
    "mutated limbs",
    "bad proportions",
    "frame inconsistency",
    "washed out image",
    "messy background",
    "identity drift",
    "face change",
    "costume change",
    "background collapse",
    "subject replacement",
    "different person",
    "different object",
    "different logo",
  ].join(", ");

  const custom = sanitizePrompt(negativePrompt);
  return custom ? `${base}, ${custom}` : base;
}

function buildModeHint(input: {
  mode: GenerationMode | "text_to_image";
  sourceUrl?: string;
}) {
  if (input.mode === "logo_to_video") {
    return [
      "clean premium logo reveal",
      "subtle elegant motion graphics",
      "brand-safe animation",
      "minimal luxurious movement",
      "crisp logo edges",
      "no logo distortion",
      "refined intro animation",
      "center composition",
    ].join(", ");
  }

  if (input.mode === "image_to_video") {
    return [
      "preserve the original reference image exactly",
      "same subject identity",
      "same face, same clothes, same hairstyle, same object design",
      "no redesign",
      "no face drift",
      "no costume drift",
      "no background replacement",
      "animate the uploaded image naturally",
      "micro-motion and controlled cinematic movement only",
      "reference image fidelity is critical",
    ].join(", ");
  }

  if (input.mode === "url_to_video") {
    const source = sanitizePrompt(input.sourceUrl);
    return [
      "use source context only as inspiration",
      source ? `source context: ${source}` : "",
      "create a premium marketing-ready visual interpretation",
      "clear narrative direction",
      "strong commercial polish",
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (input.mode === "text_to_image") {
    return [
      "single polished storyboard frame",
      "premium composition",
      "high visual clarity",
      "strong subject focus",
      "storyboard preview frame",
    ].join(", ");
  }

  return [
    "strong story moment",
    "premium visual direction",
    "consistent subject and scene continuity",
    "commercial-grade composition",
  ].join(", ");
}

function buildMasterPrompt(input: {
  mode: GenerationMode | "text_to_image";
  prompt?: string;
  sourceUrl?: string;
  style?: VideoStyle;
}) {
  const userPrompt = sanitizePrompt(input.prompt);
  const style = styleDescriptor(input.style);
  const modeHint = buildModeHint({
    mode: input.mode,
    sourceUrl: input.sourceUrl,
  });

  return [
    userPrompt,
    modeHint,
    style,
    "high prompt adherence",
    "stable subject consistency",
    "smooth camera motion",
    "clean temporal consistency",
    "premium composition",
    "balanced contrast",
    "high detail",
    "no flicker",
    "no anatomy glitches",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildDirectImageScenePrompts(input: {
  mode: GenerationMode;
  masterPrompt: string;
  durationSec: number;
  plan: string;
  style?: VideoStyle;
}) {
  const sceneCount = getSceneCount(input.plan, input.durationSec, input.mode);

  if (input.mode === "logo_to_video") {
    if (sceneCount === 1) {
      return [
        `exact same uploaded logo, preserve shape and brand identity perfectly, subtle premium motion only, elegant reveal, clean polished brand finish, ${input.masterPrompt}`,
      ];
    }

    return [
      `exact same uploaded logo, preserve shape and brand identity perfectly, subtle intro motion only, elegant premium appearance, ${input.masterPrompt}`,
      `exact same uploaded logo, final crisp lockup, no distortion, refined premium brand ending, ${input.masterPrompt}`,
    ];
  }

  if (sceneCount === 1) {
    return [
      `exact same uploaded image, preserve subject and background exactly, same identity, same composition, subtle realistic motion only, slight camera push, micro-expression, no redesign, ${input.masterPrompt}`,
    ];
  }

  return [
    `exact same uploaded image, preserve subject and environment exactly, same identity, same face or same object, subtle opening motion only, slight camera push-in, no redesign, ${input.masterPrompt}`,
    `exact same uploaded image, same subject continuity, same environment, elegant motion continuation, same styling, premium final hero moment, no drift, ${input.masterPrompt}`,
  ];
}

async function buildStoryboardScenePrompts(input: {
  mode: GenerationMode;
  masterPrompt: string;
  durationSec: number;
  plan: string;
  style?: VideoStyle;
  sourceUrl?: string;
}) {
  // For image/logo modes, do NOT use LLM storyboard. Keep close to source image.
  if (input.mode === "image_to_video" || input.mode === "logo_to_video") {
    return buildDirectImageScenePrompts(input);
  }

  const sceneCount = getSceneCount(input.plan, input.durationSec, input.mode);
  const sceneDurations = getSceneDurations(input.durationSec, sceneCount);

  let storyboardScenes: StoryboardScene[] = [];

  try {
    storyboardScenes = await generateStoryboard({
      prompt: input.masterPrompt,
      plan: (["free", "starter", "pro", "agency"].includes(input.plan)
        ? input.plan
        : "free") as "free" | "starter" | "pro" | "agency",
      totalDurationSec: input.durationSec,
    });
  } catch {
    storyboardScenes = [];
  }

  if (!Array.isArray(storyboardScenes) || storyboardScenes.length === 0) {
    storyboardScenes = Array.from({ length: sceneCount }).map((_, index) => ({
      title: `Scene ${index + 1}`,
      prompt: `${input.masterPrompt}, scene ${index + 1}`,
      durationSec: sceneDurations[index],
    }));
  }

  const normalizedStoryboard = storyboardScenes.slice(0, sceneCount);

  return normalizedStoryboard.map((scene, index) => {
    const durationForScene = sceneDurations[index] ?? scene.durationSec ?? 6;

    const stageHint =
      index === 0
        ? "opening scene, establish the world and subject clearly"
        : index === normalizedStoryboard.length - 1
        ? "final payoff scene, polished cinematic ending"
        : `continue naturally from scene ${index}`;

    return [
      scene.prompt,
      stageHint,
      "same main subject across all scenes",
      "same environment and world logic",
      "same wardrobe and identity continuity",
      "same tone, same visual language, same cinematic style",
      `scene duration target ${durationForScene} seconds`,
      styleDescriptor(input.style),
      input.sourceUrl ? `source context: ${sanitizePrompt(input.sourceUrl)}` : "",
      "strong continuity with previous and next scenes",
      "high visual consistency",
      "premium cinematic motion",
      "precise prompt adherence",
    ]
      .filter(Boolean)
      .join(", ");
  });
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
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.detail || data?.error || `Replicate request failed: ${res.status}`
    );
  }

  return data as T;
}

async function createPrediction(model: string, input: Record<string, unknown>) {
  const { owner, name } = parseModel(model);

  return replicateRequest<ReplicatePrediction>(
    `/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      body: JSON.stringify({ input }),
    }
  );
}

async function getPrediction(id: string) {
  return replicateRequest<ReplicatePrediction>(`/predictions/${id}`, {
    method: "GET",
  });
}

async function waitForPrediction(id: string) {
  const timeoutMs = 1000 * 60 * 8;
  const intervalMs = 2500;
  const startedAt = Date.now();

  while (true) {
    const prediction = await getPrediction(id);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Replicate generation failed");
    }

    if (prediction.status === "canceled") {
      throw new Error("Replicate generation canceled");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Replicate generation timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function pickFirstUrl(output: unknown): string {
  if (!output) throw new Error("Replicate returned empty output");

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    const first = output[0];
    if (!first) throw new Error("Replicate returned empty output array");
    if (typeof first === "string") return first;

    if (typeof first === "object" && first) {
      const maybeUrl =
        (first as { url?: string }).url ||
        (first as { href?: string }).href ||
        null;
      if (maybeUrl) return maybeUrl;
    }
  }

  if (typeof output === "object" && output) {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.output === "string") return obj.output;
  }

  throw new Error("Could not parse Replicate output URL");
}

function buildVideoInput(params: {
  mode: GenerationMode;
  prompt: string;
  negativePrompt: string;
  imageUrl?: string;
  clipDurationSec: number;
  ratio?: string;
}) {
  if (params.mode === "image_to_video" || params.mode === "logo_to_video") {
    return {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      first_frame_image: params.imageUrl,
      aspect_ratio: ratioValue(params.ratio),
      duration: params.clipDurationSec,
    };
  }

  return {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    aspect_ratio: ratioValue(params.ratio),
    duration: params.clipDurationSec,
  };
}

function buildImageInput(params: {
  prompt: string;
  negativePrompt: string;
  ratio?: string;
}) {
  return {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    aspect_ratio: ratioValue(params.ratio),
    output_format: "jpg",
    output_quality: 90,
  };
}

async function generateSingleSceneVideo(params: {
  model: string;
  mode: GenerationMode;
  scenePrompt: string;
  negativePrompt: string;
  imageUrl?: string;
  clipDurationSec: number;
  ratio?: "1:1" | "16:9" | "9:16";
}) {
  const prediction = await createPrediction(
    params.model,
    buildVideoInput({
      mode: params.mode,
      prompt: params.scenePrompt,
      negativePrompt: params.negativePrompt,
      imageUrl: params.imageUrl,
      clipDurationSec: params.clipDurationSec,
      ratio: params.ratio,
    })
  );

  const finished = await waitForPrediction(prediction.id);
  return pickFirstUrl(finished.output);
}

async function generateSingleSceneImage(params: {
  scenePrompt: string;
  negativePrompt: string;
  ratio?: "1:1" | "16:9" | "9:16";
}) {
  const prediction = await createPrediction(
    TEXT_IMAGE_MODEL,
    buildImageInput({
      prompt: params.scenePrompt,
      negativePrompt: params.negativePrompt,
      ratio: params.ratio,
    })
  );

  const finished = await waitForPrediction(prediction.id);
  return pickFirstUrl(finished.output);
}

async function uploadSceneVideosToCloudinary(sceneVideoUrls: string[]) {
  const uploaded = await Promise.all(
    sceneVideoUrls.map((url, index) =>
      uploadRemoteVideoToCloudinary(url, {
        folder: "dubles-motion/generated/scenes",
        publicId: `scene-${Date.now()}-${index + 1}`,
      })
    )
  );

  return uploaded;
}

async function generateVideoWithReplicate(
  input: GenerateContentInput
): Promise<VideoResult> {
  const masterPrompt = buildMasterPrompt({
    mode: input.mode,
    prompt: input.prompt,
    sourceUrl: input.sourceUrl,
    style: input.style,
  });

  const scenePrompts = await buildStoryboardScenePrompts({
    mode: input.mode,
    masterPrompt,
    durationSec: input.durationSec,
    plan: input.plan,
    style: input.style,
    sourceUrl: input.sourceUrl,
  });

  const sceneCount = Math.max(scenePrompts.length, 1);
  const clipDurationSec = getClipDuration(input.durationSec, sceneCount);

  const model =
    input.mode === "logo_to_video"
      ? LOGO_VIDEO_MODEL
      : input.mode === "image_to_video"
      ? IMAGE_VIDEO_MODEL
      : TEXT_VIDEO_MODEL;

  const negativePrompt = buildNegativePrompt(input.negativePrompt);

  const sceneVideoUrls = await Promise.all(
    scenePrompts.map((scenePrompt) =>
      generateSingleSceneVideo({
        model,
        mode: input.mode,
        scenePrompt,
        negativePrompt,
        imageUrl: input.imageUrl,
        clipDurationSec,
        ratio: input.ratio,
      })
    )
  );

  const uploadedSceneAssets = await uploadSceneVideosToCloudinary(sceneVideoUrls);
  const uploadedSceneUrls = uploadedSceneAssets.map((item) => item.secure_url);
  const uploadedPublicIds = uploadedSceneAssets.map((item) => item.public_id);

  const finalVideoUrl =
    uploadedPublicIds.length === 1
      ? uploadedSceneUrls[0]
      : buildCloudinaryConcatUrl(uploadedPublicIds);

  return {
    mode: input.mode,
    provider: "replicate",
    model,
    videoUrl: finalVideoUrl,
    imageUrl: input.imageUrl ?? null,
    durationSec: input.durationSec,
    sceneImages:
      input.mode === "image_to_video" || input.mode === "logo_to_video"
        ? scenePrompts.map(() => input.imageUrl ?? "")
        : [],
    scenePrompts,
    sceneVideoUrls: uploadedSceneUrls,
    actualClipDurationSec: clipDurationSec,
  };
}

async function generateStoryboardPreviewWithReplicate(
  input: GenerateContentInput
): Promise<ImageResult> {
  // For image/logo modes, preview should show the actual uploaded image, not a generated unrelated image
  if (
    (input.mode === "image_to_video" || input.mode === "logo_to_video") &&
    input.imageUrl
  ) {
    const masterPrompt = buildMasterPrompt({
      mode: input.mode,
      prompt: input.prompt,
      sourceUrl: input.sourceUrl,
      style: input.style,
    });

    const scenePrompts = await buildStoryboardScenePrompts({
      mode: input.mode,
      masterPrompt,
      durationSec: input.durationSec,
      plan: input.plan,
      style: input.style,
      sourceUrl: input.sourceUrl,
    });

    return {
      mode: "text_to_image",
      provider: "replicate",
      model: TEXT_IMAGE_MODEL,
      imageUrl: input.imageUrl,
      durationSec: input.durationSec,
      sceneImages: scenePrompts.map(() => input.imageUrl as string),
      scenePrompts,
      sceneVideoUrls: [],
      actualClipDurationSec: 0,
    };
  }

  const masterPrompt = buildMasterPrompt({
    mode: "text_to_image",
    prompt: input.prompt,
    sourceUrl: input.sourceUrl,
    style: input.style,
  });

  const scenePrompts = await buildStoryboardScenePrompts({
    mode: input.mode === "text_to_image" ? "text_to_video" : input.mode,
    masterPrompt,
    durationSec: input.durationSec,
    plan: input.plan,
    style: input.style,
    sourceUrl: input.sourceUrl,
  });

  const negativePrompt = buildNegativePrompt(input.negativePrompt);

  const sceneImages = await Promise.all(
    scenePrompts.map((scenePrompt) =>
      generateSingleSceneImage({
        scenePrompt,
        negativePrompt,
        ratio: input.ratio,
      })
    )
  );

  return {
    mode: "text_to_image",
    provider: "replicate",
    model: TEXT_IMAGE_MODEL,
    imageUrl: sceneImages[0],
    durationSec: input.durationSec,
    sceneImages,
    scenePrompts,
    sceneVideoUrls: [],
    actualClipDurationSec: 0,
  };
}

export async function generateContent(input: GenerateContentInput) {
  if (input.preview) {
    return generateStoryboardPreviewWithReplicate(input);
  }

  if (input.mode === "text_to_image") {
    return generateStoryboardPreviewWithReplicate(input);
  }

  return generateVideoWithReplicate(input);
}