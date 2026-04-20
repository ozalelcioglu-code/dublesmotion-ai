import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  refundUserCredits,
  resolveUsageSession,
  tryConsumeUserCredits,
} from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_TALKING_AVATAR_MODEL =
  process.env.REPLICATE_TALKING_AVATAR_MODEL ||
  "lucataco/sadtalker:6872f221926b27ee9b41d6de4e486c098acf7d33c55467698bb3a30fb69ecae8";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
const REAL_AVATAR_CREDIT_COST = Number(
  process.env.REAL_AVATAR_CREDIT_COST || "8"
);
const FREE_REAL_AVATAR_DAILY_LIMIT = Number(
  process.env.FREE_REAL_AVATAR_DAILY_LIMIT || "3"
);

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";
const SADTALKER_VERSION_ID =
  "6872f221926b27ee9b41d6de4e486c098acf7d33c55467698bb3a30fb69ecae8";

type VoiceAvatarId = "child" | "adult";

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

function cleanTextForVideo(value: unknown) {
  const text = typeof value === "string" ? value : "";
  return text.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim();
}

function normalizeAvatar(value: unknown): VoiceAvatarId {
  return value === "adult" ? "adult" : "child";
}

function getAvatarFileName(avatar: VoiceAvatarId) {
  return avatar === "adult" ? "adult-robot-avatar.png" : "child-robot-avatar.png";
}

function getTtsVoice(avatar: VoiceAvatarId) {
  return avatar === "child" ? "echo" : "onyx";
}

function getTtsInstructions(avatar: VoiceAvatarId) {
  if (avatar === "child") {
    return "Speak naturally with a warm young male voice. Keep the rhythm smooth and conversational.";
  }

  return "Speak naturally with a calm adult male voice. Keep the rhythm smooth, confident, and conversational.";
}

function ensureCloudinaryEnv() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Missing Cloudinary configuration");
  }
}

function sha1(message: string) {
  return crypto.createHash("sha1").update(message).digest("hex");
}

async function uploadBufferToCloudinary(input: {
  buffer: Buffer;
  fileName: string;
  folder: string;
  mimeType: string;
  resourceType: "image" | "video";
}) {
  ensureCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${input.fileName}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`.replace(/[^a-zA-Z0-9-_]/g, "-");
  const paramsToSign = [
    `folder=${input.folder}`,
    `overwrite=true`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join("&");
  const signature = sha1(`${paramsToSign}${CLOUDINARY_API_SECRET}`);
  const form = new FormData();
  const file = new File([new Uint8Array(input.buffer)], input.fileName, {
    type: input.mimeType,
  });

  form.append("file", file);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", input.folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${input.resourceType}/upload`,
    {
      method: "POST",
      body: form,
    }
  );
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.secure_url) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Cloudinary ${input.resourceType} upload failed`
    );
  }

  return String(data.secure_url);
}

async function uploadAvatarImageToCloudinary(avatar: VoiceAvatarId) {
  const fileName = getAvatarFileName(avatar);
  const filePath = path.join(
    process.cwd(),
    "public",
    "voice-avatars",
    fileName
  );
  const buffer = await readFile(filePath);

  return uploadBufferToCloudinary({
    buffer,
    fileName,
    folder: "dublesmotion/voice-avatars",
    mimeType: "image/png",
    resourceType: "image",
  });
}

async function createTtsAudioBuffer(input: {
  text: string;
  avatar: VoiceAvatarId;
}) {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const body = {
    model: OPENAI_TTS_MODEL,
    voice: getTtsVoice(input.avatar),
    input: input.text.slice(0, 900),
    instructions: getTtsInstructions(input.avatar),
    response_format: "wav",
  };

  let response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok && OPENAI_TTS_MODEL !== "tts-1") {
    response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        model: "tts-1",
        instructions: undefined,
      }),
    });
  }

  if (!response.ok) {
    const error = await response.text().catch(() => "");
    throw new Error(error || "TTS generation failed");
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadSpeechAudioToCloudinary(input: {
  text: string;
  avatar: VoiceAvatarId;
}) {
  const audioBuffer = await createTtsAudioBuffer(input);

  return uploadBufferToCloudinary({
    buffer: audioBuffer,
    fileName: `avatar-speech-${input.avatar}.wav`,
    folder: "dublesmotion/voice-avatar-audio",
    mimeType: "audio/wav",
    resourceType: "video",
  });
}

async function ensureRealAvatarUsageTable() {
  await sql`
    create table if not exists chat_voice_avatar_daily_usage (
      user_id text not null,
      date_key text not null,
      count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, date_key)
    )
  `;
}

async function tryConsumeFreeRealAvatarUsage(userId: string) {
  await ensureRealAvatarUsageTable();

  const dateKey = new Date().toISOString().slice(0, 10);
  const rows = (await sql`
    insert into chat_voice_avatar_daily_usage (user_id, date_key, count)
    values (${userId}, ${dateKey}, 1)
    on conflict (user_id, date_key)
    do update set
      count = chat_voice_avatar_daily_usage.count + 1,
      updated_at = now()
    where chat_voice_avatar_daily_usage.count < ${FREE_REAL_AVATAR_DAILY_LIMIT}
    returning count
  `) as Array<{ count: number }>;

  return {
    ok: Boolean(rows[0]),
    count: Number(rows[0]?.count || FREE_REAL_AVATAR_DAILY_LIMIT),
    limit: FREE_REAL_AVATAR_DAILY_LIMIT,
  };
}

async function refundFreeRealAvatarUsage(userId: string) {
  await ensureRealAvatarUsageTable();

  const dateKey = new Date().toISOString().slice(0, 10);
  await sql`
    update chat_voice_avatar_daily_usage
    set count = greatest(0, count - 1), updated_at = now()
    where user_id = ${userId}
      and date_key = ${dateKey}
  `;
}

function parseReplicateModel(model: string) {
  if (/^[a-f0-9]{64}$/i.test(model)) {
    return { owner: null, name: null, version: model };
  }

  const [slug, version] = model.split(":");
  const [owner, name] = slug.split("/");

  if (!owner || !name) {
    throw new Error(`Invalid Replicate model: ${model}`);
  }

  return {
    owner,
    name,
    version:
      version ||
      (owner === "lucataco" && name === "sadtalker"
        ? SADTALKER_VERSION_ID
        : undefined),
  };
}

async function replicateRequest<T>(pathName: string, init?: RequestInit) {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  const response = await fetch(`https://api.replicate.com/v1${pathName}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=5",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !data) {
    throw new Error(
      (data as { detail?: string; error?: string } | null)?.detail ||
        (data as { detail?: string; error?: string } | null)?.error ||
        `Replicate request failed with status ${response.status}`
    );
  }

  return data;
}

async function createPrediction(input: Record<string, unknown>) {
  const { owner, name, version } = parseReplicateModel(
    REPLICATE_TALKING_AVATAR_MODEL
  );

  if (version) {
    return replicateRequest<ReplicatePrediction>("/predictions", {
      method: "POST",
      body: JSON.stringify({ version, input }),
    });
  }

  if (!owner || !name) {
    throw new Error(`Invalid Replicate model: ${REPLICATE_TALKING_AVATAR_MODEL}`);
  }

  return replicateRequest<ReplicatePrediction>(
    `/models/${owner}/${name}/predictions`,
    {
      method: "POST",
      body: JSON.stringify({ input }),
    }
  );
}

async function copyReplicateOutputVideoToCloudinary(videoUrl: string) {
  const fetchWithAuth = () =>
    fetch(videoUrl, {
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
      cache: "no-store",
    });

  let response = await fetchWithAuth();

  if (!response.ok) {
    response = await fetch(videoUrl, { cache: "no-store" });
  }

  if (!response.ok) {
    throw new Error(
      `Replicate video output could not be downloaded (${response.status})`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  return uploadBufferToCloudinary({
    buffer,
    fileName: "talking-avatar-output.mp4",
    folder: "dublesmotion/voice-avatar-videos",
    mimeType: response.headers.get("content-type") || "video/mp4",
    resourceType: "video",
  });
}

async function getPrediction(id: string) {
  return replicateRequest<ReplicatePrediction>(`/predictions/${id}`, {
    method: "GET",
  });
}

async function waitForPrediction(id: string) {
  const startedAt = Date.now();
  const timeoutMs = 4 * 60 * 1000;

  while (true) {
    const prediction = await getPrediction(id);

    if (prediction.status === "succeeded") {
      return prediction;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Replicate avatar generation failed");
    }

    if (prediction.status === "canceled") {
      throw new Error("Replicate avatar generation canceled");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Replicate avatar generation timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
}

function pickOutputUrl(output: unknown): string {
  if (typeof output === "string" && output.trim()) {
    return output;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const url = pickOutputUrl(item);
      if (url) return url;
    }
  }

  if (output && typeof output === "object") {
    const value = output as Record<string, unknown>;

    for (const key of ["url", "video", "output", "secure_url"]) {
      if (typeof value[key] === "string" && value[key].trim()) {
        return value[key];
      }
    }
  }

  return "";
}

async function generateTalkingAvatarVideo(input: {
  avatar: VoiceAvatarId;
  text: string;
}) {
  const [sourceImageUrl, drivenAudioUrl] = await Promise.all([
    uploadAvatarImageToCloudinary(input.avatar),
    uploadSpeechAudioToCloudinary(input),
  ]);
  const prediction = await createPrediction({
    source_image: sourceImageUrl,
    driven_audio: drivenAudioUrl,
    enhancer: "gfpgan",
    preprocess: "full",
    still: false,
  });
  const done =
    prediction.status === "succeeded"
      ? prediction
      : await waitForPrediction(prediction.id);
  const videoUrl = pickOutputUrl(done.output);

  if (!videoUrl) {
    throw new Error("Replicate avatar output video is empty");
  }

  return copyReplicateOutputVideoToCloudinary(videoUrl);
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let consumedFreeUsage = false;
  let freeUsageCount: number | null = null;
  let usageSessionForRefund: Awaited<ReturnType<typeof resolveUsageSession>> | null =
    null;

  try {
    const usageSession = await resolveUsageSession(req);
    usageSessionForRefund = usageSession;

    if (!usageSession) {
      return NextResponse.json(
        { ok: false, fallback: true, error: "Login required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const text = cleanTextForVideo(body?.text);
    const avatar = normalizeAvatar(body?.avatar);

    if (!text) {
      return NextResponse.json(
        { ok: false, fallback: true, error: "Text is empty" },
        { status: 400 }
      );
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        code: "MISSING_REPLICATE_API_TOKEN",
      });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        code: "MISSING_OPENAI_API_KEY",
      });
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        code: "MISSING_CLOUDINARY_CONFIG",
      });
    }

    const isFreePlan = usageSession.planInfo.plan === "free";

    if (isFreePlan) {
      const freeUsage = await tryConsumeFreeRealAvatarUsage(
        usageSession.userId
      );

      if (!freeUsage.ok) {
        return NextResponse.json({
          ok: false,
          fallback: true,
          code: "FREE_REAL_AVATAR_LIMIT",
          usageCount: freeUsage.count,
          usageLimit: freeUsage.limit,
        });
      }

      consumedFreeUsage = true;
      freeUsageCount = freeUsage.count;
    }

    const consumed = await tryConsumeUserCredits(
      usageSession.userId,
      REAL_AVATAR_CREDIT_COST
    );

    if (!consumed.ok) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        code: "CREDIT_LIMIT",
      });
    }

    chargedUserId = usageSession.userId;

    const videoUrl = await generateTalkingAvatarVideo({
      avatar,
      text,
    });

    return NextResponse.json({
      ok: true,
      fallback: false,
      videoUrl,
      provider: "replicate",
      model: REPLICATE_TALKING_AVATAR_MODEL,
      creditCost: REAL_AVATAR_CREDIT_COST,
      usageCount: freeUsageCount,
      usageLimit: isFreePlan ? FREE_REAL_AVATAR_DAILY_LIMIT : null,
    });
  } catch (error) {
    console.error("Talking avatar generation error:", error);

    if (chargedUserId) {
      await refundUserCredits(chargedUserId, REAL_AVATAR_CREDIT_COST);
    }

    if (consumedFreeUsage && usageSessionForRefund) {
      await refundFreeRealAvatarUsage(usageSessionForRefund.userId).catch(
        () => null
      );
    }

    return NextResponse.json({
      ok: false,
      fallback: true,
      code: "TALKING_AVATAR_GENERATION_FAILED",
      error:
        error instanceof Error
          ? error.message
          : "Talking avatar generation failed",
    });
  }
}
