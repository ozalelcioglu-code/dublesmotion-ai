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
};

type BaseResult = {
  mode: GenerationMode;
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

/**
 * Aktif model sadece 6 veya 10 kabul ediyor.
 * Free kullanıcı tarafında genelde kısa klip,
 * pro/agency tarafında daha uzun klip üretimi için 10 kullanıyoruz.
 */
function getClipDuration(durationSec: number) {
  if (durationSec >= 20) return 10;
  return 6;
}

function getSceneCount(durationSec: number) {
  if (durationSec >= 30) return 3;
  if (durationSec >= 20) return 2;
  return 1;
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
  ].join(", ");

  const custom = sanitizePrompt(negativePrompt);
  return custom ? `${base}, ${custom}` : base;
}

function buildModeHint(input: {
  mode: GenerationMode;
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
      "preserve the original reference image identity exactly",
      "same person, same face, same clothes, same hairstyle, same subject design",
      "no character redesign",
      "no face drift",
      "no costume drift",
      "keep the source composition recognizable",
      "animate from the still image naturally",
      "controlled motion only",
      "cinematic but stable movement",
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
      "single polished hero frame",
      "premium composition",
      "high visual clarity",
      "strong subject focus",
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
  mode: GenerationMode;
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

function buildScenePrompts(input: {
  masterPrompt: string;
  durationSec: number;
  mode: GenerationMode;
}) {
  const count = getSceneCount(input.durationSec);

  if (input.mode === "logo_to_video") {
    if (count === 1) {
      return [
        `Scene 1: elegant logo entrance, subtle glow, refined premium motion, final clean brand reveal, ${input.masterPrompt}`,
      ];
    }

    if (count === 2) {
      return [
        `Scene 1: cinematic intro atmosphere, logo begins to appear, subtle luxury motion, ${input.masterPrompt}`,
        `Scene 2: final logo lockup, crisp brand presentation, elegant end frame, ${input.masterPrompt}`,
      ];
    }

    return [
      `Scene 1: elegant cinematic intro, minimal luxury motion, ${input.masterPrompt}`,
      `Scene 2: logo formation phase, refined glow and premium movement, ${input.masterPrompt}`,
      `Scene 3: final brand lockup, clean premium ending frame, ${input.masterPrompt}`,
    ];
  }

  if (input.mode === "image_to_video") {
    if (count === 1) {
      return [
        `Scene 1: exact source-image hero opening, same subject identity, subtle motion only, same face and same styling, ${input.masterPrompt}`,
      ];
    }

    if (count === 2) {
      return [
        `Scene 1: exact opening frame from the source image, same identity, soft camera push-in, natural micro movement only, ${input.masterPrompt}`,
        `Scene 2: final hero payoff shot, same identity preserved, elegant motion, premium ending frame, ${input.masterPrompt}`,
      ];
    }

    return [
      `Scene 1: exact source-image hero opening, same subject identity, subtle motion only, ${input.masterPrompt}`,
      `Scene 2: same subject, same outfit, same face, medium cinematic motion, preserve reference fidelity, ${input.masterPrompt}`,
      `Scene 3: final premium payoff shot, same subject continuity, same image world, elegant ending motion, ${input.masterPrompt}`,
    ];
  }

  if (count === 1) {
    return [
      `Scene 1: polished cinematic hero shot, strong composition, smooth motion, ${input.masterPrompt}`,
    ];
  }

  if (count === 2) {
    return [
      `Scene 1: opening establishing shot, wide cinematic composition, ${input.masterPrompt}`,
      `Scene 2: final payoff shot, memorable ending frame, premium finish, ${input.masterPrompt}`,
    ];
  }

  return [
    `Scene 1: opening cinematic intro, wide composition, ${input.masterPrompt}`,
    `Scene 2: medium progression shot with smooth motion, ${input.masterPrompt}`,
    `Scene 3: final payoff shot, elegant ending and high-impact finish, ${input.masterPrompt}`,
  ];
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
  if (!output) {
    throw new Error("Replicate returned empty output");
  }

  if (typeof output === "string") {
    return output;
  }

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
  durationSec: number;
  ratio?: string;
}) {
  const clipDuration = getClipDuration(params.durationSec);

  if (params.mode === "image_to_video" || params.mode === "logo_to_video") {
    return {
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      first_frame_image: params.imageUrl,
      aspect_ratio: ratioValue(params.ratio),
      duration: clipDuration,
    };
  }

  return {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    aspect_ratio: ratioValue(params.ratio),
    duration: clipDuration,
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

async function generateVideoWithReplicate(
  input: GenerateContentInput
): Promise<VideoResult> {
  const masterPrompt = buildMasterPrompt({
    mode: input.mode,
    prompt: input.prompt,
    sourceUrl: input.sourceUrl,
    style: input.style,
  });

  const scenePrompts = buildScenePrompts({
    masterPrompt,
    durationSec: input.durationSec,
    mode: input.mode,
  });

  const finalPrompt =
    scenePrompts.length > 1
      ? scenePrompts.join(
          " Then transition smoothly to the next scene while preserving subject continuity, same identity, same styling, same visual world. "
        )
      : masterPrompt;

  const model =
    input.mode === "logo_to_video"
      ? LOGO_VIDEO_MODEL
      : input.mode === "image_to_video"
      ? IMAGE_VIDEO_MODEL
      : TEXT_VIDEO_MODEL;

  const prediction = await createPrediction(
    model,
    buildVideoInput({
      mode: input.mode,
      prompt: finalPrompt,
      negativePrompt: buildNegativePrompt(input.negativePrompt),
      imageUrl: input.imageUrl,
      durationSec: input.durationSec,
      ratio: input.ratio,
    })
  );

  const finished = await waitForPrediction(prediction.id);
  const videoUrl = pickFirstUrl(finished.output);
  const clipDuration = getClipDuration(input.durationSec);

  return {
    mode: input.mode,
    provider: "replicate",
    model,
    videoUrl,
    imageUrl: input.imageUrl ?? null,
    durationSec: input.durationSec,
    sceneImages: [],
    scenePrompts,
    sceneVideoUrls: scenePrompts.map(() => videoUrl),
    actualClipDurationSec: clipDuration,
  };
}

async function generateImageWithReplicate(
  input: GenerateContentInput
): Promise<ImageResult> {
  const masterPrompt = buildMasterPrompt({
    mode: input.mode,
    prompt: input.prompt,
    sourceUrl: input.sourceUrl,
    style: input.style,
  });

  const prediction = await createPrediction(
    TEXT_IMAGE_MODEL,
    buildImageInput({
      prompt: masterPrompt,
      negativePrompt: buildNegativePrompt(input.negativePrompt),
      ratio: input.ratio,
    })
  );

  const finished = await waitForPrediction(prediction.id);
  const imageUrl = pickFirstUrl(finished.output);

  return {
    mode: input.mode,
    provider: "replicate",
    model: TEXT_IMAGE_MODEL,
    imageUrl,
    durationSec: input.durationSec,
    sceneImages: [imageUrl],
    scenePrompts: [masterPrompt],
    sceneVideoUrls: [],
    actualClipDurationSec: 0,
  };
}

export async function generateContent(input: GenerateContentInput) {
  if (input.mode === "text_to_image") {
    return generateImageWithReplicate(input);
  }

  return generateVideoWithReplicate(input);
}