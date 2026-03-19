type VideoStyle =
  | "realistic"
  | "cinematic"
  | "3d_animation"
  | "anime"
  | "pixar"
  | "cartoon";

type GenerateMusicVideoInput = {
  audioUrl: string;
  prompt: string;
  lyrics?: string;
  title?: string;
  ratio?: "1:1" | "16:9" | "9:16";
  durationSec: number;
  style?: VideoStyle;
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

type MusicVideoResult = {
  mode: "music_video";
  provider: "replicate";
  model: string;
  videoUrl: string;
  imageUrl?: string | null;
  durationSec: number;
  sceneImages: string[];
  scenePrompts: string[];
  sceneVideoUrls: string[];
  actualClipDurationSec: number;
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const MUSIC_VIDEO_MODEL =
  process.env.REPLICATE_MUSIC_VIDEO_MODEL || "minimax/video-01";

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

function sanitizeText(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function ratioValue(ratio?: string) {
  if (ratio === "1:1") return "1:1";
  if (ratio === "9:16") return "9:16";
  return "16:9";
}

/**
 * Aktif model sadece 6 veya 10 kabul ediyor.
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
        "natural movement",
        "realistic lighting",
        "authentic textures",
        "stable human anatomy",
      ].join(", ");

    case "cinematic":
      return [
        "cinematic premium music video quality",
        "dramatic lighting",
        "luxury commercial look",
        "smooth camera movement",
        "high-end visual polish",
      ].join(", ");

    case "3d_animation":
      return [
        "high-end 3D animated music video",
        "premium render quality",
        "stylized cinematic lighting",
        "clean geometry and motion",
      ].join(", ");

    case "anime":
      return [
        "anime music video quality",
        "expressive cinematic framing",
        "clean character consistency",
        "premium anime lighting",
      ].join(", ");

    case "pixar":
      return [
        "feature-quality stylized animation",
        "emotional cinematic composition",
        "beautiful lighting",
        "premium animated music video look",
      ].join(", ");

    case "cartoon":
      return [
        "stylized cartoon music video",
        "clean outlines",
        "vivid premium colors",
        "smooth polished motion",
      ].join(", ");

    default:
      return "premium cinematic music video quality";
  }
}

function buildNegativePrompt() {
  return [
    "low quality",
    "blurry",
    "flicker",
    "bad anatomy",
    "deformed hands",
    "warped face",
    "jitter",
    "duplicate person",
    "broken body proportions",
    "unstable scene continuity",
    "messy background",
    "artifacting",
    "washed out colors",
    "random camera shake",
  ].join(", ");
}

function buildMasterPrompt(input: {
  prompt: string;
  lyrics?: string;
  title?: string;
  style?: VideoStyle;
}) {
  const prompt = sanitizeText(input.prompt);
  const lyrics = sanitizeText(input.lyrics);
  const title = sanitizeText(input.title);
  const style = styleDescriptor(input.style);

  const lyricsHint = lyrics
    ? `lyrics mood reference: ${lyrics.slice(0, 260)}`
    : "";

  return [
    title ? `music video for "${title}"` : "premium music video",
    prompt,
    lyricsHint,
    style,
    "strong visual rhythm",
    "coherent subject continuity",
    "premium composition",
    "smooth camera transitions",
    "clean temporal consistency",
    "high prompt adherence",
    "memorable final frames",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildScenePrompts(input: {
  masterPrompt: string;
  durationSec: number;
}) {
  const count = getSceneCount(input.durationSec);

  if (count === 1) {
    return [
      `Scene 1: cinematic performance hero shot, premium rhythm, emotional final frame, ${input.masterPrompt}`,
    ];
  }

  if (count === 2) {
    return [
      `Scene 1: opening establishing performance shot, cinematic intro, atmospheric world building, ${input.masterPrompt}`,
      `Scene 2: final payoff shot, emotional climax, premium ending frame, ${input.masterPrompt}`,
    ];
  }

  return [
    `Scene 1: opening cinematic intro, atmospheric establishing shot, ${input.masterPrompt}`,
    `Scene 2: performance progression shot, stronger rhythm and medium framing, ${input.masterPrompt}`,
    `Scene 3: elegant final outro shot, memorable ending frame, ${input.masterPrompt}`,
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
  const timeoutMs = 1000 * 60 * 12;
  const intervalMs = 3000;
  const startedAt = Date.now();

  while (true) {
    const prediction = await getPrediction(id);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Replicate music video failed");
    }

    if (prediction.status === "canceled") {
      throw new Error("Replicate music video canceled");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Replicate music video timed out");
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

function buildMusicVideoInput(params: {
  prompt: string;
  negativePrompt: string;
  durationSec: number;
  ratio?: string;
  audioUrl: string;
}) {
  return {
    prompt: params.prompt,
    negative_prompt: params.negativePrompt,
    aspect_ratio: ratioValue(params.ratio),
    duration: getClipDuration(params.durationSec),
    audio: params.audioUrl,
  };
}

export async function generateMusicVideo(
  input: GenerateMusicVideoInput
): Promise<MusicVideoResult> {
  const masterPrompt = buildMasterPrompt({
    prompt: input.prompt,
    lyrics: input.lyrics,
    title: input.title,
    style: input.style,
  });

  const scenePrompts = buildScenePrompts({
    masterPrompt,
    durationSec: input.durationSec,
  });

  const finalPrompt = scenePrompts.join(
    " Then transition smoothly to the next scene while preserving continuity. "
  );

  const prediction = await createPrediction(
    MUSIC_VIDEO_MODEL,
    buildMusicVideoInput({
      prompt: finalPrompt,
      negativePrompt: buildNegativePrompt(),
      durationSec: input.durationSec,
      ratio: input.ratio,
      audioUrl: input.audioUrl,
    })
  );

  const finished = await waitForPrediction(prediction.id);
  const videoUrl = pickFirstUrl(finished.output);
  const clipDuration = getClipDuration(input.durationSec);

  return {
    mode: "music_video",
    provider: "replicate",
    model: MUSIC_VIDEO_MODEL,
    videoUrl,
    imageUrl: null,
    durationSec: input.durationSec,
    sceneImages: [],
    scenePrompts,
    sceneVideoUrls: scenePrompts.map(() => videoUrl),
    actualClipDurationSec: clipDuration,
  };
}