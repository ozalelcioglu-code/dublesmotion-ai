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

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_API_KEY || "";
const FAL_TALKING_AVATAR_MODEL =
  process.env.FAL_TALKING_AVATAR_MODEL || "fal-ai/ai-avatar/single-text";
const REAL_AVATAR_CREDIT_COST = Number(
  process.env.REAL_AVATAR_CREDIT_COST || "8"
);
const FREE_REAL_AVATAR_DAILY_LIMIT = Number(
  process.env.FREE_REAL_AVATAR_DAILY_LIMIT || "3"
);

type VoiceAvatarId = "child" | "adult";

type FalSubmitResponse = {
  request_id?: string;
  status_url?: string;
  response_url?: string;
};

type FalStatusResponse = {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";
  error?: string;
  response_url?: string;
};

type FalResultResponse = {
  video?: {
    url?: string;
  };
};

function cleanTextForVideo(value: unknown) {
  const text = typeof value === "string" ? value : "";
  return text.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim();
}

function normalizeAvatar(value: unknown): VoiceAvatarId {
  return value === "adult" ? "adult" : "child";
}

function getFalVoice(avatar: VoiceAvatarId) {
  return avatar === "child" ? "Liam" : "Daniel";
}

function getAvatarPrompt(avatar: VoiceAvatarId) {
  if (avatar === "child") {
    return "A friendly young male robot avatar in a video call, natural lip sync, expressive eyes, subtle head movement, realistic upper body motion, clean studio lighting.";
  }

  return "A confident adult male robot avatar in a video call, natural lip sync, expressive face, subtle head movement, realistic upper body motion, clean studio lighting.";
}

async function getAvatarDataUri(avatar: VoiceAvatarId) {
  const fileName =
    avatar === "adult" ? "adult-robot-avatar.png" : "child-robot-avatar.png";
  const filePath = path.join(
    process.cwd(),
    "public",
    "voice-avatars",
    fileName
  );
  const buffer = await readFile(filePath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
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

function falHeaders() {
  return {
    Authorization: `Key ${FAL_KEY}`,
    "Content-Type": "application/json",
    "X-Fal-No-Retry": "1",
  };
}

async function falRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...falHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => null)) as T | null;

  if (!response.ok || !data) {
    throw new Error(
      (data as { error?: string; detail?: string } | null)?.error ||
        (data as { error?: string; detail?: string } | null)?.detail ||
        `fal request failed with status ${response.status}`
    );
  }

  return data;
}

async function generateTalkingAvatarVideo(input: {
  avatar: VoiceAvatarId;
  text: string;
}) {
  if (!FAL_KEY) {
    throw new Error("Missing FAL_KEY");
  }

  const modelPath = FAL_TALKING_AVATAR_MODEL.replace(/^\/+/, "");
  const avatarImage = await getAvatarDataUri(input.avatar);
  const submit = await falRequest<FalSubmitResponse>(
    `https://queue.fal.run/${modelPath}`,
    {
      method: "POST",
      body: JSON.stringify({
        image_url: avatarImage,
        text_input: input.text.slice(0, 320),
        voice: getFalVoice(input.avatar),
        prompt: getAvatarPrompt(input.avatar),
        num_frames: 129,
        resolution: "480p",
        acceleration: "regular",
      }),
    }
  );

  let statusUrl = submit.status_url;
  let responseUrl = submit.response_url;

  if (!statusUrl && submit.request_id) {
    statusUrl = `https://queue.fal.run/${modelPath}/requests/${submit.request_id}/status`;
  }

  if (!responseUrl && submit.request_id) {
    responseUrl = `https://queue.fal.run/${modelPath}/requests/${submit.request_id}/response`;
  }

  if (!statusUrl || !responseUrl) {
    throw new Error("fal response did not include queue URLs");
  }

  const startedAt = Date.now();
  const timeoutMs = 4 * 60 * 1000;

  while (true) {
    const status = await falRequest<FalStatusResponse>(`${statusUrl}?logs=0`, {
      method: "GET",
    });

    if (status.status === "COMPLETED") {
      if (status.error) throw new Error(status.error);
      responseUrl = status.response_url || responseUrl;
      break;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Talking avatar generation timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  const result = await falRequest<FalResultResponse>(responseUrl, {
    method: "GET",
  });
  const videoUrl = result.video?.url;

  if (!videoUrl) {
    throw new Error("Talking avatar output video is empty");
  }

  return videoUrl;
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let consumedFreeUsage = false;
  let freeUsageCount: number | null = null;

  try {
    const usageSession = await resolveUsageSession(req);

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

    if (!FAL_KEY) {
      return NextResponse.json({
        ok: false,
        fallback: true,
        code: "MISSING_FAL_KEY",
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
      provider: "fal",
      model: FAL_TALKING_AVATAR_MODEL,
      creditCost: REAL_AVATAR_CREDIT_COST,
      usageCount: freeUsageCount,
      usageLimit: isFreePlan ? FREE_REAL_AVATAR_DAILY_LIMIT : null,
    });
  } catch (error) {
    console.error("Talking avatar generation error:", error);

    if (chargedUserId) {
      await refundUserCredits(chargedUserId, REAL_AVATAR_CREDIT_COST);
    }

    if (consumedFreeUsage) {
      const usageSession = await resolveUsageSession(req).catch(() => null);
      if (usageSession) {
        await refundFreeRealAvatarUsage(usageSession.userId).catch(() => null);
      }
    }

    return NextResponse.json({
      ok: false,
      fallback: true,
      error:
        error instanceof Error
          ? error.message
          : "Talking avatar generation failed",
    });
  }
}
