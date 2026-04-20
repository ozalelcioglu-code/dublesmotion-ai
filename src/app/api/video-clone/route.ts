import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { saveGenerationOutput } from "@/lib/server/generation-history";
import { getResolvedUserPlan } from "@/lib/user-profile-repository";
import {
  buildPlanLimitPayload,
  refundUserCredits,
  resolveUsageSession,
  tryConsumeUserCredits,
} from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const CHARACTER_REPLACE_MODEL =
  process.env.REPLICATE_CHARACTER_REPLACE_MODEL ||
  "wan-video/wan-2.2-animate-replace";
const FACE_SWAP_VIDEO_MODEL =
  process.env.REPLICATE_FACE_SWAP_VIDEO_MODEL || "ddvinh1/new-faceswap-video";
const VIDEO_VOICE_CONVERSION_MODEL =
  process.env.REPLICATE_VIDEO_VOICE_CONVERSION_MODEL || "";
const VIDEO_CLONE_CREDIT_COST = 60;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const RequestSchema = z.object({
  sourceVideoUrl: z.string().url("Valid sourceVideoUrl is required."),
  referenceImageUrl: z.string().url("Valid referenceImageUrl is required."),
  prompt: z.string().trim().min(1, "Prompt is required."),
  title: z.string().optional(),
  cloneMode: z.enum(["character", "face"]).optional(),
  voiceMode: z.enum(["original", "own_voice"]).optional(),
  voiceSampleUrl: z.string().url().optional(),
  preserveAudio: z.boolean().optional(),
  resolution: z.enum(["480", "720"]).optional(),
});

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

type VoiceConversionMeta = {
  requestedOwnVoice: boolean;
  modelConfigured: boolean;
  applied: boolean;
  fallbackReason: string | null;
  fallbackStage: "voice_conversion" | null;
  note: string | null;
};

function ensureReplicateEnv() {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }
}

function ensureCloudinaryEnv() {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME");
  }
  if (!CLOUDINARY_API_KEY) {
    throw new Error("Missing CLOUDINARY_API_KEY");
  }
  if (!CLOUDINARY_API_SECRET) {
    throw new Error("Missing CLOUDINARY_API_SECRET");
  }
}

function parseOwnerAndName(model: string) {
  const [owner, name] = model.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid replicate model: ${model}`);
  }
  return { owner, name };
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
        data?.message ||
        `Replicate request failed with status ${res.status}`
    );
  }

  return data as T;
}

async function createPrediction(model: string, input: Record<string, unknown>) {
  const { owner, name } = parseOwnerAndName(model);

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
  const startedAt = Date.now();
  const timeoutMs = 10 * 60 * 1000;

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

    await new Promise((resolve) => setTimeout(resolve, 2500));
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
    for (const item of output) {
      if (typeof item === "string" && item.trim()) {
        return item;
      }

      if (item && typeof item === "object") {
        const maybeUrl =
          (item as { url?: string }).url ||
          (item as { href?: string }).href ||
          (item as { secure_url?: string }).secure_url;

        if (typeof maybeUrl === "string" && maybeUrl.trim()) {
          return maybeUrl;
        }
      }
    }
  }

  if (typeof output === "object" && output) {
    const obj = output as Record<string, unknown>;

    if (typeof obj.url === "string" && obj.url.trim()) return obj.url;
    if (typeof obj.output === "string" && obj.output.trim()) return obj.output;
    if (typeof obj.secure_url === "string" && obj.secure_url.trim()) {
      return obj.secure_url;
    }
  }

  throw new Error("Could not parse Replicate output URL");
}

function buildClonePrompt(prompt: string) {
  return [
    "Replace the main character in the source video with the person from the reference image.",
    "Preserve original body motion, camera motion, scene continuity, facial performance, composition, and timing.",
    "Keep the output realistic, stable, clean, and high quality.",
    "Do not redesign the environment unless required by the user prompt.",
    `User instruction: ${prompt.trim()}`,
  ].join(" ");
}

function getPredictionInput(input: z.infer<typeof RequestSchema>) {
  const preserveAudio = input.preserveAudio !== false;

  if (input.cloneMode === "face") {
    return {
      model: FACE_SWAP_VIDEO_MODEL,
      payload: {
        target_video: input.sourceVideoUrl,
        source_image: input.referenceImageUrl,
        num_threads: 8,
        swap_all_faces: false,
      },
    };
  }

  return {
    model: CHARACTER_REPLACE_MODEL,
    payload: {
      video: input.sourceVideoUrl,
      character_image: input.referenceImageUrl,
      resolution: input.resolution || "720",
      frames_per_second: 24,
      go_fast: true,
      merge_audio: preserveAudio,
    },
  };
}

function buildVoiceConversionMeta(input: {
  voiceMode?: "original" | "own_voice";
  voiceSampleUrl?: string;
}) {
  const requestedOwnVoice =
    input.voiceMode === "own_voice" && Boolean(input.voiceSampleUrl);
  const modelConfigured = Boolean(VIDEO_VOICE_CONVERSION_MODEL);
  const applied = requestedOwnVoice && modelConfigured;
  const fallbackReason =
    requestedOwnVoice && !modelConfigured
      ? "No compatible video voice conversion model configured. The cloned video keeps the original song or speech structure."
      : null;

  return {
    requestedOwnVoice,
    modelConfigured,
    applied,
    fallbackReason,
    fallbackStage: requestedOwnVoice && !modelConfigured ? "voice_conversion" : null,
    note: fallbackReason,
  } satisfies VoiceConversionMeta;
}

function sha1(message: string) {
  return crypto.createHash("sha1").update(message).digest("hex");
}

function isDataVideoUrl(url: string) {
  return /^data:video\/[a-zA-Z0-9.+-]+;base64,/.test(url);
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid data URL format.");
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("ogg")) return "ogv";
  return "mp4";
}

async function uploadVideoBufferToCloudinary(input: {
  buffer: Buffer;
  mimeType: string;
  folder?: string;
  publicId?: string;
}) {
  ensureCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = input.folder || "dublesmotion/generated-clones";
  const publicId =
    input.publicId ||
    `clone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const paramsToSign = [
    `folder=${folder}`,
    `overwrite=true`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join("&");

  const signature = sha1(`${paramsToSign}${CLOUDINARY_API_SECRET}`);
  const ext = mimeToExtension(input.mimeType);

  const file = new File([new Uint8Array(input.buffer)], `${publicId}.${ext}`, {
    type: input.mimeType,
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("overwrite", "true");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.secure_url) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Cloudinary video upload failed"
    );
  }

  return String(data.secure_url);
}

async function uploadRemoteVideoToCloudinary(remoteUrl: string) {
  ensureCloudinaryEnv();

  const remoteRes = await fetch(remoteUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!remoteRes.ok) {
    throw new Error("Failed to fetch generated video from remote output URL");
  }

  const arrayBuffer = await remoteRes.arrayBuffer();
  const mimeType =
    remoteRes.headers.get("content-type") || "video/mp4";

  return uploadVideoBufferToCloudinary({
    buffer: Buffer.from(arrayBuffer),
    mimeType,
    folder: "dublesmotion/generated-clones",
  });
}

async function normalizeOutputVideoUrl(rawUrl: string) {
  if (!rawUrl) {
    throw new Error("Clone output URL is empty.");
  }

  if (isDataVideoUrl(rawUrl)) {
    const { mimeType, base64 } = parseDataUrl(rawUrl);
    const buffer = Buffer.from(base64, "base64");

    return uploadVideoBufferToCloudinary({
      buffer,
      mimeType,
      folder: "dublesmotion/generated-clones",
    });
  }

  if (rawUrl.includes("cloudinary.com")) {
    return rawUrl;
  }

  return uploadRemoteVideoToCloudinary(rawUrl);
}

async function applyVoiceConversionIfConfigured(input: {
  videoUrl: string;
  voiceSampleUrl?: string;
  preserveAudio: boolean;
}) {
  const meta = buildVoiceConversionMeta({
    voiceMode: input.voiceSampleUrl ? "own_voice" : "original",
    voiceSampleUrl: input.voiceSampleUrl,
  });

  if (!meta.applied) {
    return {
      videoUrl: input.videoUrl,
      applied: false,
      fallbackReason: meta.fallbackReason,
      fallbackStage: meta.fallbackStage,
      note: meta.note,
      modelConfigured: meta.modelConfigured,
      requestedOwnVoice: meta.requestedOwnVoice,
    };
  }

  const prediction = await createPrediction(VIDEO_VOICE_CONVERSION_MODEL, {
    video: input.videoUrl,
    voice_sample: input.voiceSampleUrl,
    preserve_timing: true,
    preserve_background_audio: input.preserveAudio,
    keep_original_music: input.preserveAudio,
  });

  if (!prediction?.id) {
    throw new Error("Voice conversion prediction id missing.");
  }

  const finished = await waitForPrediction(prediction.id);
  const rawVideoUrl = pickFirstUrl(finished.output);

  return {
    videoUrl: await normalizeOutputVideoUrl(rawVideoUrl),
    applied: true,
    fallbackReason: null,
    fallbackStage: null,
    note: null,
    modelConfigured: meta.modelConfigured,
    requestedOwnVoice: meta.requestedOwnVoice,
  };
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedAmount = 0;

  try {
    const body = await req.json();
    const input = RequestSchema.parse(body);

    const usageSession = await resolveUsageSession(req);

    if (!usageSession) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const consumed = await tryConsumeUserCredits(
      usageSession.userId,
      VIDEO_CLONE_CREDIT_COST
    );

    if (!consumed.ok) {
      return NextResponse.json(
        buildPlanLimitPayload(usageSession.planInfo),
        { status: 403 }
      );
    }

    chargedUserId = usageSession.userId;
    chargedAmount = VIDEO_CLONE_CREDIT_COST;

    const finalPrompt = buildClonePrompt(input.prompt);
    const predictionInput = getPredictionInput(input);

    const prediction = await createPrediction(
      predictionInput.model,
      predictionInput.payload
    );

    if (!prediction?.id) {
      throw new Error("Character replace prediction id missing.");
    }

    const finished = await waitForPrediction(prediction.id);
    const rawVideoUrl = pickFirstUrl(finished.output);
    const baseVideoUrl = await normalizeOutputVideoUrl(rawVideoUrl);
    const preserveAudio = input.preserveAudio !== false;

    const voiceResult =
      input.voiceMode === "own_voice"
        ? await applyVoiceConversionIfConfigured({
            videoUrl: baseVideoUrl,
            voiceSampleUrl: input.voiceSampleUrl,
            preserveAudio,
          })
        : {
            videoUrl: baseVideoUrl,
            applied: false,
            fallbackReason: null,
            fallbackStage: null,
            note: null,
            modelConfigured: Boolean(VIDEO_VOICE_CONVERSION_MODEL),
            requestedOwnVoice: false,
          };
    const title = input.title || "Cloned Video";
    let generationId: string | null = null;

    try {
      const generationRecord = await saveGenerationOutput({
        userId: usageSession.userId,
        type: "video_clone",
        title,
        prompt: input.prompt,
        url: voiceResult.videoUrl,
        thumbnailUrl: input.referenceImageUrl,
        provider: "replicate",
        model: predictionInput.model,
        metadata: {
          finalPrompt,
          sourceVideoUrl: input.sourceVideoUrl,
          referenceImageUrl: input.referenceImageUrl,
          predictionId: prediction.id,
          cloneMode: input.cloneMode || "character",
          voiceMode: input.voiceMode || "original",
          voiceSampleUrl: input.voiceSampleUrl || null,
          preserveAudio,
          requestedOwnVoice: voiceResult.requestedOwnVoice,
          voiceCloneApplied: voiceResult.applied,
          voiceCloneModelConfigured: voiceResult.modelConfigured,
          fallbackReason: voiceResult.fallbackReason,
          fallbackStage: voiceResult.fallbackStage,
        },
      });

      generationId = generationRecord?.id ?? null;
    } catch (dbError) {
      console.error("video clone generation history db warning:", dbError);
    }

    const updatedPlan = await getResolvedUserPlan(usageSession.userId);

    return NextResponse.json({
      ok: true,
      title,
      generationId,
      videoUrl: voiceResult.videoUrl,
      predictionId: prediction.id,
      cloneMode: input.cloneMode || "character",
      voiceMode: input.voiceMode || "original",
      voiceSampleUrl: input.voiceSampleUrl || null,
      preserveAudio,
      requestedOwnVoice: voiceResult.requestedOwnVoice,
      voiceCloneApplied: voiceResult.applied,
      voiceCloneModelConfigured: voiceResult.modelConfigured,
      fallbackReason: voiceResult.fallbackReason,
      fallbackStage: voiceResult.fallbackStage,
      voiceCloneNote: voiceResult.note,
      prompt: finalPrompt,
      remainingCredits: updatedPlan.remainingCredits,
      usedThisMonth: updatedPlan.usedThisMonth,
      monthlyCredits: updatedPlan.monthlyCredits,
      planCode: updatedPlan.plan,
      planLabel: updatedPlan.planLabel,
    });
  } catch (error: unknown) {
    if (chargedUserId && chargedAmount > 0) {
      try {
        await refundUserCredits(chargedUserId, chargedAmount);
      } catch (refundError) {
        console.error("Video clone credit refund failed:", refundError);
      }
    }

    console.error("Video clone failed:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid video clone request payload.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "VIDEO_CLONE_FAILED",
        error: error instanceof Error ? error.message : "Video clone failed",
      },
      { status: 500 }
    );
  }
}
