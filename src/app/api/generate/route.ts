import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { generateContent } from "@/lib/ai/generation";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "@/lib/user-profile-repository";
import { saveGenerationOutput } from "@/lib/server/generation-history";
import { uploadRemoteVideoToCloudinary } from "@/lib/server/cloudinary-video";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type MusicProvider = "suno" | "replicate";
type VoiceGender = "female" | "male";
type SongLanguage = "tr" | "ku" | "en" | "de" | "ar" | "fa";

type AppSession = {
  userId: string;
  email: string;
  name?: string | null;
};

const RequestSchema = z.object({
  mode: z.enum([
    "text_to_image",
    "text_to_video",
    "image_to_video",
    "logo_to_video",
    "music",
    "video_clone",
  ]),

  prompt: z.string().optional(),

  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),

  ratio: z.enum(["1:1", "16:9", "9:16"]).optional(),
  style: z.string().optional(),
  preview: z.boolean().optional(),
  durationSec: z.number().min(5).max(120).optional(),
  projectId: z.string().optional(),

  // music
  title: z.string().max(120).optional(),
  lyrics: z.string().max(600).optional(),
  instrumental: z.boolean().optional(),
  provider: z.enum(["suno", "replicate"]).optional(),
  model: z.string().max(120).optional(),
  language: z.string().max(20).optional(),
  songLanguage: z.enum(["tr", "ku", "en", "de", "ar", "fa"]).optional(),
  voiceGender: z.enum(["female", "male"]).optional(),
  vocalType: z.string().max(80).optional(),
  vocalMode: z.enum(["preset", "own_voice"]).optional(),
  voiceSampleUrl: z.string().url().optional(),

  // video clone
  sourceVideoUrl: z.string().url().optional(),
  referenceImageUrl: z.string().url().optional(),
  cloneMode: z.enum(["character", "face"]).optional(),
  preserveAudio: z.boolean().optional(),
});

type SupportedVisualStyle =
  | "realistic"
  | "cinematic"
  | "3d_animation"
  | "anime"
  | "pixar"
  | "cartoon";

type VisualMode =
  | "text_to_image"
  | "text_to_video"
  | "image_to_video"
  | "logo_to_video";

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

const DEFAULT_MAX_DURATION_SEC = 120;

// music providers
const SUNO_API_KEY = process.env.SUNO_API_KEY || "";
const SUNO_API_BASE_URL =
  process.env.SUNO_API_BASE_URL || "https://api.sunoapi.org";
const SUNO_API_GENERATE_PATH =
  process.env.SUNO_API_GENERATE_PATH || "/api/v1/generate";
const SUNO_API_STATUS_PATH =
  process.env.SUNO_API_STATUS_PATH || "/api/v1/generate/record-info";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_FULL_SONG_MODEL =
  process.env.REPLICATE_FULL_SONG_MODEL ||
  process.env.REPLICATE_MINIMAX_MUSIC_MODEL ||
  "minimax/music-2.5";

// video clone
const CHARACTER_REPLACE_MODEL =
  process.env.REPLICATE_CHARACTER_REPLACE_MODEL ||
  "wan-video/wan-2.2-animate-replace";

function normalizePlanCode(value?: string | null) {
  if (value === "starter" || value === "pro" || value === "agency") {
    return value;
  }
  return "free";
}

function getSessionFromHeaders(req: Request): AppSession | null {
  const userId = req.headers.get("x-user-id");
  const userEmail = req.headers.get("x-user-email");
  const userName = req.headers.get("x-user-name") || null;

  if (!userId || !userEmail) {
    return null;
  }

  return {
    userId,
    email: userEmail,
    name: userName,
  };
}

async function getSessionFromCookie(): Promise<AppSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("dubles_session")?.value;

    if (!raw) return null;

    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);

    if (!parsed?.userId || !parsed?.email) {
      return null;
    }

    return {
      userId: String(parsed.userId),
      email: String(parsed.email),
      name: parsed.name ? String(parsed.name) : null,
    };
  } catch {
    return null;
  }
}

async function getResolvedSession(req: Request): Promise<AppSession | null> {
  return getSessionFromHeaders(req) || (await getSessionFromCookie());
}

function normalizeStyle(value?: string): SupportedVisualStyle | undefined {
  if (!value) return undefined;

  switch (value) {
    case "realistic":
      return "realistic";
    case "cinematic":
      return "cinematic";
    case "anime":
      return "anime";
    case "pixar":
      return "pixar";
    case "cartoon":
      return "cartoon";
    case "3d_render":
    case "3d":
    case "3d_animation":
      return "3d_animation";
    case "fashion":
    case "product":
    case "digital_art":
      return "cinematic";
    default:
      return "cinematic";
  }
}

function normalizeRequestedDuration(
  requested: number | undefined,
  planMax: number = DEFAULT_MAX_DURATION_SEC
) {
  const safe =
    typeof requested === "number" && Number.isFinite(requested)
      ? Math.round(requested)
      : planMax;

  return Math.min(planMax, Math.max(5, safe));
}

function getFallbackPrompt(mode: VisualMode) {
  switch (mode) {
    case "image_to_video":
      return "Animate the uploaded image with smooth cinematic motion.";
    case "logo_to_video":
      return "Create a clean premium logo reveal animation.";
    case "text_to_video":
      return "Create a cinematic AI video.";
    case "text_to_image":
    default:
      return "Create a polished cinematic image.";
  }
}

function shouldConsumeCredits(mode: z.infer<typeof RequestSchema>["mode"]) {
  return mode !== "text_to_image" ? true : true;
}

function getCreditCostForMode(
  mode: z.infer<typeof RequestSchema>["mode"],
  input: z.infer<typeof RequestSchema>
) {
  switch (mode) {
    case "text_to_image":
      return 10;
    case "text_to_video":
      return 32;
    case "image_to_video":
      return 26;
    case "logo_to_video":
      return 26;
    case "video_clone":
      return 60;
    case "music":
      return input.preview === true ? 0 : 20;
    default:
      return 0;
  }
}

async function tryConsumeCredits(userId: string, amount: number) {
  if (!amount || amount <= 0) {
    return { ok: true, remainingCredits: null as number | null };
  }

  const rows: any[] = await sql`
    update user_profiles
    set
      monthly_video_count = coalesce(monthly_video_count, 0) + ${amount},
      updated_at = now()
    where user_id = ${userId}::text
      and (
        ${amount} <= (
          case
            when coalesce(plan_code, 'free') = 'agency' then 14000 - coalesce(monthly_video_count, 0)
            when coalesce(plan_code, 'free') = 'pro' then 1600 - coalesce(monthly_video_count, 0)
            when coalesce(plan_code, 'free') = 'starter' then 450 - coalesce(monthly_video_count, 0)
            else 100 - coalesce(monthly_video_count, 0)
          end
        )
      )
    returning monthly_video_count
  `;

  if (!rows[0]) {
    return { ok: false, remainingCredits: null as number | null };
  }

  return {
    ok: true,
    remainingCredits: null as number | null,
  };
}

async function refundCredits(userId: string, amount: number) {
  if (!amount || amount <= 0) return;

  await sql`
    update user_profiles
    set
      monthly_video_count = greatest(0, coalesce(monthly_video_count, 0) - ${amount}),
      updated_at = now()
    where user_id = ${userId}::text
  `;
}

async function resetMonthlyUsageIfNeeded(userId: string) {
  await sql`
    update user_profiles
    set
      monthly_video_count = 0,
      monthly_video_reset_at = now(),
      updated_at = now()
    where user_id = ${userId}::text
      and (
        monthly_video_reset_at is null
        or monthly_video_reset_at < now() - interval '1 month'
      )
  `;
}

// --------------------
// Music helpers
// --------------------

const LANGUAGE_HINTS: Record<SongLanguage, string> = {
  tr: "Turkish",
  ku: "Kurdish",
  en: "English",
  de: "German",
  ar: "Arabic",
  fa: "Persian",
};

const GENDER_HINTS: Record<VoiceGender, string> = {
  female: "female singing vocal",
  male: "male singing vocal",
};

function getNativeLanguageHint(language: SongLanguage) {
  return `${LANGUAGE_HINTS[language]} lyrics with native pronunciation`;
}

function ensureSunoEnv() {
  if (!SUNO_API_KEY) {
    throw new Error("Missing SUNO_API_KEY");
  }
}

function ensureReplicateEnv() {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }
}

function buildEnhancedMusicPrompt(input: {
  prompt: string;
  title?: string;
  lyrics?: string;
  style?: string;
  songLanguage: SongLanguage;
  voiceGender: VoiceGender;
  vocalType?: string;
  vocalMode?: "preset" | "own_voice";
}) {
  const vocalProfile =
    input.vocalMode === "own_voice"
      ? "lead vocal should follow the uploaded voice reference when supported by the active model"
      : input.vocalType === "duet"
      ? "natural duet between a warm male vocalist and a clear female vocalist"
      : input.vocalType === "rap"
      ? "confident melodic rap vocal with clear diction"
      : `${GENDER_HINTS[input.voiceGender]}, polished commercial singer`;

  const parts = [
    input.title ? `Song title: ${input.title}.` : "",
    `Main request: ${input.prompt}.`,
    input.style ? `Style: ${input.style}.` : "",
    `Song language: ${LANGUAGE_HINTS[input.songLanguage]}.`,
    `Primary vocal identity: ${vocalProfile}.`,
    `Delivery rule: sing the lyrics in ${getNativeLanguageHint(input.songLanguage)}.`,
    `Do not force a Persian accent unless the selected language is Persian.`,
    `Keep the performance musical, emotional, polished, and commercially strong.`,
  ].filter(Boolean);

  return parts.join(" ");
}

function pickAudioUrl(data: any): string {
  if (!data) return "";

  if (typeof data.audioUrl === "string") return data.audioUrl;
  if (typeof data.audio_url === "string") return data.audio_url;
  if (typeof data.url === "string") return data.url;

  if (Array.isArray(data.output) && typeof data.output[0] === "string") {
    return data.output[0];
  }

  if (typeof data.output === "string") return data.output;

  if (data.output && typeof data.output.audio === "string") {
    return data.output.audio;
  }

  if (data.output && typeof data.output.url === "string") {
    return data.output.url;
  }

  if (data.result && typeof data.result.audioUrl === "string") {
    return data.result.audioUrl;
  }

  if (data.result && typeof data.result.audio_url === "string") {
    return data.result.audio_url;
  }

  if (data.data && typeof data.data.audio_url === "string") {
    return data.data.audio_url;
  }

  if (data.data && typeof data.data.streamAudioUrl === "string") {
    return data.data.streamAudioUrl;
  }

  if (Array.isArray(data.data) && data.data[0]) {
    const first = data.data[0];
    if (typeof first.audio_url === "string") return first.audio_url;
    if (typeof first.audioUrl === "string") return first.audioUrl;
    if (typeof first.url === "string") return first.url;
    if (typeof first.streamAudioUrl === "string") return first.streamAudioUrl;
    if (typeof first.sourceAudioUrl === "string") return first.sourceAudioUrl;
  }

  if (data.response?.sunoData?.[0]) {
    const first = data.response.sunoData[0];
    if (typeof first.audioUrl === "string") return first.audioUrl;
    if (typeof first.audio_url === "string") return first.audio_url;
    if (typeof first.streamAudioUrl === "string") return first.streamAudioUrl;
    if (typeof first.sourceAudioUrl === "string") return first.sourceAudioUrl;
  }

  return "";
}

function pickCoverImageUrl(data: any): string | undefined {
  if (!data) return undefined;

  if (typeof data.coverImageUrl === "string") return data.coverImageUrl;
  if (typeof data.cover_image_url === "string") return data.cover_image_url;
  if (typeof data.imageUrl === "string") return data.imageUrl;

  if (data.result && typeof data.result.coverImageUrl === "string") {
    return data.result.coverImageUrl;
  }

  if (data.result && typeof data.result.cover_image_url === "string") {
    return data.result.cover_image_url;
  }

  if (data.data && typeof data.data.image_url === "string") {
    return data.data.image_url;
  }

  if (Array.isArray(data.data) && data.data[0]) {
    const first = data.data[0];
    if (typeof first.image_url === "string") return first.image_url;
    if (typeof first.cover_image_url === "string") return first.cover_image_url;
    if (typeof first.imageUrl === "string") return first.imageUrl;
  }

  if (data.response?.sunoData?.[0]) {
    const first = data.response.sunoData[0];
    if (typeof first.imageUrl === "string") return first.imageUrl;
    if (typeof first.image_url === "string") return first.image_url;
    if (typeof first.coverImageUrl === "string") return first.coverImageUrl;
  }

  return undefined;
}

function pickTaskStatus(data: any): string {
  return (
    data?.data?.status ||
    data?.status ||
    data?.state ||
    data?.response?.status ||
    data?.response?.sunoData?.[0]?.status ||
    "processing"
  );
}

function pickLyrics(data: any): string | null {
  if (!data) return null;

  if (typeof data.lyrics === "string") return data.lyrics;
  if (typeof data.prompt === "string") return data.prompt;
  if (data.data && typeof data.data.lyrics === "string") return data.data.lyrics;
  if (data.data && typeof data.data.prompt === "string") return data.data.prompt;

  if (Array.isArray(data.data) && data.data[0]) {
    const first = data.data[0];
    if (typeof first.lyrics === "string") return first.lyrics;
    if (typeof first.prompt === "string") return first.prompt;
  }

  if (data.response?.sunoData?.[0]) {
    const first = data.response.sunoData[0];
    if (typeof first.prompt === "string") return first.prompt;
    if (typeof first.lyrics === "string") return first.lyrics;
  }

  return null;
}

async function sunoRequest(path: string, init?: RequestInit) {
  ensureSunoEnv();

  const res = await fetch(`${SUNO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SUNO_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        data?.detail ||
        data?.msg ||
        `Suno request failed with status ${res.status}`
    );
  }

  return data;
}

async function replicateRequest<T>(path: string, init?: RequestInit) {
  ensureReplicateEnv();

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
        `Replicate request failed with status ${res.status}`
    );
  }

  return data as T;
}

function parseReplicateModel(model: string) {
  const [owner, name] = model.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid Replicate model: ${model}`);
  }
  return { owner, name };
}

async function createReplicatePrediction(model: string, input: any) {
  const { owner, name } = parseReplicateModel(model);

  return replicateRequest<ReplicatePrediction>(`/models/${owner}/${name}/predictions`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

async function getReplicatePrediction(id: string) {
  return replicateRequest<ReplicatePrediction>(`/predictions/${id}`, {
    method: "GET",
  });
}

async function waitForReplicatePrediction(id: string) {
  const startedAt = Date.now();
  const timeoutMs = 1000 * 60 * 10;

  while (true) {
    const prediction = await getReplicatePrediction(id);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new Error(prediction.error || "Replicate music generation failed");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Replicate music generation timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
}

async function generateMusicWithReplicate(input: {
  title?: string;
  prompt: string;
  lyrics?: string;
  style?: string;
  duration: number;
  instrumental: boolean;
  songLanguage: SongLanguage;
  voiceGender: VoiceGender;
  vocalType?: string;
  vocalMode?: "preset" | "own_voice";
  model?: string;
}) {
  const enhancedPrompt = buildEnhancedMusicPrompt({
    title: input.title,
    prompt: input.prompt,
    lyrics: input.lyrics,
    style: input.style,
    songLanguage: input.songLanguage,
    voiceGender: input.voiceGender,
    vocalType: input.vocalType,
    vocalMode: input.vocalMode,
  });

  const model = input.model || REPLICATE_FULL_SONG_MODEL;

  const prediction: any = await createReplicatePrediction(model, {
    lyrics: input.lyrics || undefined,
    prompt: enhancedPrompt,
  });

  const done = await waitForReplicatePrediction(prediction.id);

  return {
    provider: "replicate" as const,
    model,
    generationId: done?.id || prediction?.id,
    taskId: done?.id || prediction?.id || null,
    status: "succeeded",
    previewReady: true,
    audioUrl: pickAudioUrl(done),
    coverImageUrl: pickCoverImageUrl(done),
    lyrics: input.lyrics || pickLyrics(done),
    raw: done,
  };
}

async function generateMusicWithSuno(input: {
  title?: string;
  prompt: string;
  lyrics?: string;
  style?: string;
  duration: number;
  instrumental: boolean;
  songLanguage: SongLanguage;
  voiceGender: VoiceGender;
  vocalType?: string;
  vocalMode?: "preset" | "own_voice";
}) {
  const enhancedPrompt = buildEnhancedMusicPrompt({
    title: input.title,
    prompt: input.prompt,
    lyrics: input.lyrics,
    style: input.style,
    songLanguage: input.songLanguage,
    voiceGender: input.voiceGender,
    vocalType: input.vocalType,
    vocalMode: input.vocalMode,
  });

  const created: any = await sunoRequest(SUNO_API_GENERATE_PATH, {
    method: "POST",
    body: JSON.stringify({
      title: input.title || undefined,
      prompt: enhancedPrompt,
      lyrics: input.lyrics || undefined,
      customMode: Boolean(input.lyrics),
      instrumental: input.instrumental,
      model: "V4_5PLUS",
      callBackUrl: undefined,
    }),
  });

  const taskId =
    created?.data?.taskId ||
    created?.taskId ||
    created?.id ||
    created?.data?.id;

  if (!taskId || typeof taskId !== "string") {
    return {
      provider: "suno" as const,
      model: "V4_5PLUS",
      generationId: undefined,
      taskId: null,
      status: pickTaskStatus(created),
      previewReady: Boolean(pickAudioUrl(created)),
      audioUrl: pickAudioUrl(created),
      coverImageUrl: pickCoverImageUrl(created),
      lyrics: input.lyrics || pickLyrics(created),
      raw: created,
    };
  }

  let attempts = 0;
  let lastStatusData: any = null;

  while (attempts < 80) {
    const statusData: any = await sunoRequest(
      `${SUNO_API_STATUS_PATH}?taskId=${encodeURIComponent(taskId)}`,
      { method: "GET" }
    );

    lastStatusData = statusData;

    const audioUrl = pickAudioUrl(statusData);
    const status = pickTaskStatus(statusData);

    if (audioUrl) {
      return {
        provider: "suno" as const,
        model: "V4_5PLUS",
        generationId: taskId,
        taskId,
        status,
        previewReady: true,
        audioUrl,
        coverImageUrl: pickCoverImageUrl(statusData),
        lyrics: input.lyrics || pickLyrics(statusData),
        raw: statusData,
      };
    }

    if (
      status === "failed" ||
      status === "error" ||
      status === "canceled"
    ) {
      throw new Error(
        statusData?.message ||
          statusData?.error ||
          "Suno music generation failed"
      );
    }

    attempts += 1;
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return {
    provider: "suno" as const,
    model: "V4_5PLUS",
    generationId: taskId,
    taskId,
    status: pickTaskStatus(lastStatusData),
    previewReady: Boolean(pickAudioUrl(lastStatusData)),
    audioUrl: pickAudioUrl(lastStatusData),
    coverImageUrl: pickCoverImageUrl(lastStatusData),
    lyrics: input.lyrics || pickLyrics(lastStatusData),
    raw: lastStatusData,
  };
}

// --------------------
// Video clone helpers
// --------------------

function ensureCharacterReplaceEnv() {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }
}

async function createClonePrediction(model: string, input: Record<string, unknown>) {
  ensureCharacterReplaceEnv();
  const { owner, name } = parseReplicateModel(model);

  return replicateRequest<ReplicatePrediction>(`/models/${owner}/${name}/predictions`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}

async function waitClonePrediction(id: string) {
  const timeoutMs = 1000 * 60 * 10;
  const intervalMs = 2500;
  const startedAt = Date.now();

  while (true) {
    const prediction = await getReplicatePrediction(id);

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

    if (typeof first === "string") {
      return first;
    }

    if (first && typeof first === "object") {
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

function buildClonePrompt(input: {
  prompt: string;
  sourceVideoUrl: string;
  referenceImageUrl: string;
}) {
  return [
    "Replace the main character in the source video using the reference image.",
    "Preserve original body motion, camera motion, timing, facial performance, lip sync, and scene continuity.",
    "Do not change the environment unless explicitly required.",
    "Keep output realistic, stable, and premium quality.",
    `User instruction: ${input.prompt.trim()}`,
  ].join(" ");
}
async function normalizeCloneVideoUrl(rawUrl: string) {
  if (!rawUrl) {
    throw new Error("Clone output URL is empty.");
  }

  if (!rawUrl.startsWith("data:video/")) {
    return rawUrl;
  }

  const uploaded = await uploadRemoteVideoToCloudinary({
    videoUrl: rawUrl,
    folder: "dublesmotion/generated-clones",
    publicId: `clone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    overwrite: true,
    resourceType: "video",
  });

  if (!uploaded?.secureUrl) {
    throw new Error("Clone video upload failed.");
  }

  return uploaded.secureUrl;
}

// --------------------
// Main route
// --------------------

export async function POST(req: Request) {
  let creditCost = 0;
  let resolvedUserId = "";

  try {
    const session = await getResolvedSession(req);

    if (!session?.userId || !session?.email) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "You must be logged in to generate content.",
        },
        { status: 401 }
      );
    }

    resolvedUserId = session.userId;

    const json = await req.json();
    const input = RequestSchema.parse(json);

    await ensureUserProfile({
      userId: session.userId,
      email: session.email,
      fullName: session.name ?? null,
    });

    await resetMonthlyUsageIfNeeded(session.userId);

    const planInfo = await getResolvedUserPlan(session.userId);
    const isPreview = input.preview === true;
    creditCost = isPreview ? 0 : getCreditCostForMode(input.mode, input);

    if (
      shouldConsumeCredits(input.mode) &&
      !isPreview &&
      typeof planInfo.remainingCredits === "number" &&
      planInfo.remainingCredits < creditCost
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "PLAN_LIMIT_REACHED",
          error: `Your ${planInfo.planLabel} plan credits have been exhausted.`,
          plan: {
            code: planInfo.plan,
            label: planInfo.planLabel,
            usedThisMonth: planInfo.usedThisMonth,
            remainingCredits: planInfo.remainingCredits,
            monthlyCredits: planInfo.monthlyCredits,
          },
        },
        { status: 403 }
      );
    }

    if (creditCost > 0) {
      const consumed = await tryConsumeCredits(session.userId, creditCost);
      if (!consumed.ok) {
        return NextResponse.json(
          {
            ok: false,
            code: "PLAN_LIMIT_REACHED",
            error: `Your ${planInfo.planLabel} plan credits have been exhausted.`,
            plan: {
              code: planInfo.plan,
              label: planInfo.planLabel,
              usedThisMonth: planInfo.usedThisMonth,
              remainingCredits: planInfo.remainingCredits,
              monthlyCredits: planInfo.monthlyCredits,
            },
          },
          { status: 403 }
        );
      }
    }

    // --------------------------------------
    // VISUAL MODES
    // --------------------------------------
    if (
      input.mode === "text_to_image" ||
      input.mode === "text_to_video" ||
      input.mode === "image_to_video" ||
      input.mode === "logo_to_video"
    ) {
      const mode = input.mode as VisualMode;
      const prompt = (input.prompt || "").trim();
      const imageUrl = input.imageUrl;
      const sourceUrl = input.sourceUrl;

      if (mode === "image_to_video" && !imageUrl) {
        throw new Error("Image URL is required for image-to-video generation.");
      }

      if (mode === "logo_to_video" && !imageUrl && !sourceUrl) {
        throw new Error("Logo image is required for logo-to-video generation.");
      }

      if ((mode === "text_to_image" || mode === "text_to_video") && !prompt) {
        throw new Error("Prompt is required for this generation mode.");
      }

      const targetDurationSec = normalizeRequestedDuration(
        input.durationSec,
        DEFAULT_MAX_DURATION_SEC
      );

      const normalizedPrompt = prompt || getFallbackPrompt(mode);
      const normalizedStyle = normalizeStyle(input.style);

      const result = await generateContent({
        mode,
        prompt: normalizedPrompt,
        imageUrl,
        sourceUrl,
        durationSec: targetDurationSec,
        ratio: input.ratio ?? "16:9",
        plan: normalizePlanCode(planInfo.plan),
        style: normalizedStyle,
        preview: isPreview,
      });

      const outputUrl =
        "imageUrl" in result ? result.imageUrl ?? "" : result.videoUrl ?? "";
      const outputType =
        mode === "text_to_image"
          ? "image"
          : mode === "text_to_video"
          ? "text_video"
          : "image_video";
      const title =
        input.title ||
        normalizedPrompt.slice(0, 80) ||
        (mode === "text_to_image" ? "Generated Image" : "Generated Video");
      const generationRecord =
        !isPreview && outputUrl
          ? await saveGenerationOutput({
              userId: session.userId,
              type: outputType,
              title,
              prompt: normalizedPrompt,
              url: outputUrl,
              thumbnailUrl:
                mode === "text_to_image" ? outputUrl : imageUrl || sourceUrl || null,
              durationSec:
                "durationSec" in result && result.durationSec
                  ? result.durationSec
                  : null,
              provider: result.provider,
              model: result.model,
              metadata: {
                mode,
                style: normalizedStyle ?? null,
                ratio: input.ratio ?? "16:9",
                requestedDurationSec: targetDurationSec,
                sourceImageUrl: imageUrl || sourceUrl || null,
              },
            })
          : null;

      const updatedPlan = await getResolvedUserPlan(session.userId);

      return NextResponse.json(
        {
          ok: true,
          mode,
          title,
          generationId: generationRecord?.id ?? null,
          imageUrl: "imageUrl" in result ? result.imageUrl ?? null : null,
          videoUrl: "videoUrl" in result ? result.videoUrl ?? null : null,
          audioUrl: null,
          coverImageUrl: null,
          preview: isPreview,
          remainingCredits: updatedPlan.remainingCredits,
          usedThisMonth: updatedPlan.usedThisMonth,
          monthlyCredits: updatedPlan.monthlyCredits,
          planCode: updatedPlan.plan,
          planLabel: updatedPlan.planLabel,
        },
        { status: 200 }
      );
    }

    // --------------------------------------
    // MUSIC
    // --------------------------------------
    if (input.mode === "music") {
      const prompt = String(input.prompt || "").trim();

      if (prompt.length < 10 || prompt.length > 300) {
        throw new Error("Prompt must be between 10 and 300 characters.");
      }

      if (input.lyrics && (input.lyrics.length < 10 || input.lyrics.length > 600)) {
        throw new Error("Lyrics must be between 10 and 600 characters.");
      }

      const provider: MusicProvider = input.provider || "suno";
      const songLanguage: SongLanguage = input.songLanguage || "fa";
      const voiceGender: VoiceGender = input.voiceGender || "female";
      const duration = normalizeRequestedDuration(input.durationSec, 120);

      const musicResult =
        provider === "replicate"
          ? await generateMusicWithReplicate({
              title: input.title,
              prompt,
              lyrics: input.lyrics,
              style: input.style,
              duration,
              instrumental: Boolean(input.instrumental),
              songLanguage,
              voiceGender,
              vocalType: input.vocalType,
              vocalMode: input.vocalMode,
              model: input.model,
            })
          : await generateMusicWithSuno({
              title: input.title,
              prompt,
              lyrics: input.lyrics,
              style: input.style,
              duration,
              instrumental: Boolean(input.instrumental),
              songLanguage,
              voiceGender,
              vocalType: input.vocalType,
              vocalMode: input.vocalMode,
            });

      const audioUrl = musicResult.audioUrl || "";
      const generationRecord =
        !isPreview && audioUrl
          ? await saveGenerationOutput({
              userId: session.userId,
              type: "music",
              title: input.title || "Generated Song",
              prompt,
              lyrics: musicResult.lyrics || input.lyrics || "",
              url: audioUrl,
              thumbnailUrl: musicResult.coverImageUrl || null,
              durationSec: duration,
              provider: musicResult.provider,
              model: musicResult.model,
              metadata: {
                mode: "music",
                taskId: musicResult.taskId ?? null,
                providerGenerationId: musicResult.generationId ?? null,
                status: musicResult.status ?? null,
                previewReady: musicResult.previewReady ?? false,
                songLanguage,
                voiceGender,
                instrumental: Boolean(input.instrumental),
                style: input.style ?? null,
                vocalType: input.vocalType ?? null,
                vocalMode: input.vocalMode ?? "preset",
              },
            })
          : null;

      const updatedPlan = await getResolvedUserPlan(session.userId);

      return NextResponse.json(
        {
          ok: true,
          mode: "music",
          title: input.title || "Generated Song",
          audioUrl: musicResult.audioUrl || null,
          coverImageUrl: musicResult.coverImageUrl || null,
          videoUrl: null,
          imageUrl: null,
          lyrics: musicResult.lyrics || input.lyrics || null,
          provider: musicResult.provider,
          model: musicResult.model,
          generationId: generationRecord?.id ?? musicResult.generationId ?? null,
          taskId: musicResult.taskId ?? null,
          previewReady: musicResult.previewReady ?? false,
          status: musicResult.status ?? "succeeded",
          songLanguage,
          voiceGender,
          remainingCredits: updatedPlan.remainingCredits,
          usedThisMonth: updatedPlan.usedThisMonth,
          monthlyCredits: updatedPlan.monthlyCredits,
          planCode: updatedPlan.plan,
          planLabel: updatedPlan.planLabel,
        },
        { status: 200 }
      );
    }

    // --------------------------------------
    // VIDEO CLONE
    // --------------------------------------
    // --------------------------------------
// VIDEO CLONE
// --------------------------------------
if (input.mode === "video_clone") {
  const sourceVideoUrl = input.sourceVideoUrl || input.sourceUrl || "";
  const referenceImageUrl = input.referenceImageUrl || input.imageUrl || "";
  const prompt = String(input.prompt || "").trim();

  if (!sourceVideoUrl) {
    throw new Error("sourceVideoUrl is required for video clone.");
  }

  if (!referenceImageUrl) {
    throw new Error("referenceImageUrl is required for video clone.");
  }

  if (!prompt) {
    throw new Error("Prompt is required for video clone.");
  }

  const finalPrompt = buildClonePrompt({
    prompt,
    sourceVideoUrl,
    referenceImageUrl,
  });

  const prediction = await createClonePrediction(CHARACTER_REPLACE_MODEL, {
    video: sourceVideoUrl,
    character_image: referenceImageUrl,
    resolution: "720",
    frames_per_second: 24,
    go_fast: true,
    merge_audio: input.preserveAudio !== false,
  });

  if (!prediction?.id) {
    throw new Error("Character replace prediction id missing.");
  }

  const finished = await waitClonePrediction(prediction.id);
  const rawVideoUrl = pickFirstUrl(finished.output);
  const videoUrl = await normalizeCloneVideoUrl(rawVideoUrl);
  const title = input.title || "Cloned Video";
  const generationRecord =
    !isPreview && videoUrl
      ? await saveGenerationOutput({
          userId: session.userId,
          type: "video_clone",
          title,
          prompt,
          url: videoUrl,
          thumbnailUrl: referenceImageUrl,
          provider: "replicate",
          model: CHARACTER_REPLACE_MODEL,
          metadata: {
            mode: "video_clone",
            finalPrompt,
            sourceVideoUrl,
            referenceImageUrl,
            predictionId: prediction.id,
            replicateGenerationId: finished.id,
            preserveAudio: input.preserveAudio !== false,
          },
        })
      : null;

  const updatedPlan = await getResolvedUserPlan(session.userId);

  return NextResponse.json(
    {
      ok: true,
      mode: "video_clone",
      title,
      videoUrl,
      imageUrl: referenceImageUrl,
      audioUrl: null,
      coverImageUrl: null,
      sourceVideoUrl,
      referenceImageUrl,
      prompt: finalPrompt,
      preserveAudio: input.preserveAudio !== false,
      generationId: generationRecord?.id ?? finished.id,
      remainingCredits: updatedPlan.remainingCredits,
      usedThisMonth: updatedPlan.usedThisMonth,
      monthlyCredits: updatedPlan.monthlyCredits,
      planCode: updatedPlan.plan,
      planLabel: updatedPlan.planLabel,
    },
    { status: 200 }
  );
}

    throw new Error("Unsupported generation mode.");
  } catch (error: any) {
    if (resolvedUserId && creditCost > 0) {
      try {
        await refundCredits(resolvedUserId, creditCost);
      } catch (refundError) {
        console.error("Credit refund failed:", refundError);
      }
    }

    console.error("/api/generate error:", error);

    if (error?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid generation request payload.",
          details: error.flatten?.() ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "GENERATION_FAILED",
        error: error?.message || "Generation failed",
      },
      { status: 500 }
    );
  }
}
