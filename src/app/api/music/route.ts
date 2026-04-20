import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sql } from "@/lib/db";
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
const REPLICATE_FULL_SONG_MODEL =
  process.env.REPLICATE_FULL_SONG_MODEL || "minimax/music-2.5";
const REPLICATE_MUSIC_VOICE_CLONE_MODEL =
  process.env.REPLICATE_MUSIC_VOICE_CLONE_MODEL || "";
const SONG_CREDIT_COST = 20;

type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

type Prediction = {
  id: string;
  status: PredictionStatus;
  error?: string | null;
  output?: unknown;
};

type GenerateMusicBody = {
  mode?: "song" | "speech";
  text?: string;
  lyrics?: string;
  prompt?: string;
  title?: string;
  language?: "tr" | "en" | "de" | "ku" | "ar" | "fa";
  durationSec?: number;
  vocalType?: string;
  vocalMode?: "preset" | "own_voice";
  voiceSampleUrl?: string;
  mood?: string;
  genre?: string;
  tempo?: string;
  instrumental?: boolean;
  cleanLyrics?: boolean;
};

type MusicGenerationMeta = {
  requestedOwnVoice: boolean;
  voiceCloningEnabled: boolean;
  voiceCloneModelConfigured: boolean;
  fallbackReason: string | null;
  fallbackStage: "generation" | "postprocess" | null;
};

function ensureEnv() {
  if (!REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }
}

function parseOwnerAndName(model: string) {
  const [owner, name] = model.split("/");
  if (!owner || !name) {
    throw new Error(`Invalid Replicate model name: ${model}`);
  }
  return { owner, name };
}

async function replicateModelRequest<T>(
  model: string,
  init?: RequestInit
): Promise<T> {
  ensureEnv();

  const { owner, name } = parseOwnerAndName(model);

  const res = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}/predictions`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        data?.title ||
        JSON.stringify(data) ||
        `Replicate request failed: ${res.status}`
    );
  }

  return data as T;
}

async function getPrediction(id: string): Promise<Prediction> {
  ensureEnv();

  const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.detail ||
        data?.error ||
        data?.title ||
        JSON.stringify(data) ||
        `Replicate get prediction failed: ${res.status}`
    );
  }

  return data as Prediction;
}

async function waitPrediction(id: string): Promise<Prediction> {
  const startedAt = Date.now();
  const timeoutMs = 1000 * 60 * 8;
  const intervalMs = 2500;

  while (true) {
    const prediction = await getPrediction(id);

    if (prediction.status === "succeeded") return prediction;

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "Prediction failed");
    }

    if (prediction.status === "canceled") {
      throw new Error("Prediction canceled");
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Prediction timed out");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function pickOutputUrl(output: unknown): string {
  if (!output) {
    throw new Error("Empty model output");
  }

  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    const first = output[0];

    if (typeof first === "string") return first;

    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      if (typeof obj.url === "string") return obj.url;
      if (typeof obj.href === "string") return obj.href;
      if (typeof obj.audio === "string") return obj.audio;
    }
  }

  if (typeof output === "object" && output) {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.audio === "string") return obj.audio;
    if (typeof obj.output === "string") return obj.output;
    if (typeof obj.href === "string") return obj.href;
  }

  throw new Error("Could not parse audio URL");
}

function normalizeText(input?: string) {
  return String(input || "").trim();
}

function normalizeTitle(input?: string) {
  const text = normalizeText(input);
  if (!text) return "Generated Song";
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function normalizeDurationSec(input?: number) {
  const n = Number(input || 60);
  if (!Number.isFinite(n)) return 60;
  return Math.min(240, Math.max(15, Math.round(n)));
}

function mapLanguageLabel(language?: string) {
  const lang = String(language || "en").trim().toLowerCase();
  if (lang === "tr") return "Turkish";
  if (lang === "de") return "German";
  if (lang === "ku") return "Kurdish";
  if (lang === "ar") return "Arabic";
  if (lang === "fa") return "Persian";
  return "English";
}

function mapTempoLabel(input?: string) {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "yavas") return "slow tempo";
  if (value === "orta") return "medium tempo";
  if (value === "hizli") return "fast tempo";
  return value;
}

function mapVocalStyle(input?: {
  language?: string;
  vocalType?: string;
  vocalMode?: string;
}) {
  const lang = String(input?.language || "en").trim().toLowerCase();
  const vocalType = String(input?.vocalType || "").trim().toLowerCase();

  if (input?.vocalMode === "own_voice") {
    return [
      "lead vocal follows the uploaded voice reference when the active model supports voice conditioning",
      "preserve the singer's natural tone, breath, pronunciation, and emotional contour",
      "keep lyrics intelligible and musical",
    ];
  }

  const nativePronunciation =
    lang === "tr"
      ? "native Turkish pronunciation"
      : lang === "ku"
      ? "native Kurdish pronunciation"
      : lang === "de"
      ? "native German pronunciation"
      : lang === "ar"
      ? "native Arabic pronunciation"
      : lang === "fa"
      ? "native Persian pronunciation"
      : "native English pronunciation";

  if (vocalType === "ai_male") {
    return [
      "modern male lead vocal",
      "warm emotional male tone",
      "clean articulation",
      "commercial polished male singer",
      nativePronunciation,
    ];
  }

  if (vocalType === "duet") {
    return [
      "natural duet between a warm male vocalist and a clear female vocalist",
      "call-and-response phrasing in the chorus",
      "polished commercial vocal blend",
      nativePronunciation,
    ];
  }

  if (vocalType === "rap") {
    return [
      "confident rhythmic vocal delivery",
      "clear diction",
      "modern melodic rap flow",
      nativePronunciation,
    ];
  }

  const base = [
    "modern female lead vocal",
    "warm emotional tone",
    "clean articulation",
    "radio-ready female pop delivery",
    "controlled breath",
    "melodic phrasing",
    "commercial polished female singer",
    nativePronunciation,
  ];

  if (lang === "fa") return [...base, "Persian emotional pop style"];
  if (lang === "ar") return [...base, "Arabic emotional pop style"];
  if (vocalType === "ai_turkish" || lang === "tr") {
    return [...base, "Turkish pop style"];
  }
  if (vocalType === "ai_german" || lang === "de") {
    return [...base, "German pop style"];
  }
  if (vocalType === "ai_kurdish_beta" || lang === "ku") {
    return [...base, "Kurdish emotional pop style"];
  }

  return [...base, "international female pop style"];
}

function normalizeLyricsForSong(lyrics: string) {
  const clean = lyrics.trim();
  if (!clean) return "";

  const hasTag =
    /\[(intro|verse|pre chorus|pre-chorus|chorus|hook|drop|bridge|solo|build up|build-up|inst|interlude|break|transition|outro)\]/i.test(
      clean
    );

  if (hasTag) return clean;

  return `[Verse]
${clean}

[Chorus]
${clean}`;
}

function buildStylePrompt(input: {
  prompt?: string;
  language?: string;
  vocalType?: string;
  vocalMode?: string;
  mood?: string;
  genre?: string;
  tempo?: string;
  instrumental?: boolean;
  cleanLyrics?: boolean;
}) {
  const vocalStyle = mapVocalStyle({
    language: input.language,
    vocalType: input.vocalType,
    vocalMode: input.vocalMode,
  });

  const parts = [
    "full-length professional song",
    ...vocalStyle,
    normalizeText(input.genre),
    normalizeText(input.mood),
    mapTempoLabel(input.tempo),
    `${mapLanguageLabel(input.language)} lyrics only`,
    `the singer must perform naturally in ${mapLanguageLabel(input.language)}`,
    input.instrumental
      ? "instrumental-focused full song arrangement"
      : "full produced song with lead vocal",
    input.cleanLyrics
      ? "radio-ready clean songwriting"
      : "expressive songwriting",
    "studio-quality mix",
    "rich instrumentation",
    "strong chorus hook",
    "natural verse and chorus flow",
    "clear section dynamics",
    "wide soundstage",
    normalizeText(input.prompt),
  ].filter(Boolean);

  return parts.join(", ");
}

function buildMusicGenerationMeta(input: {
  vocalMode?: string;
  voiceSampleUrl?: string;
}) {
  const requestedOwnVoice =
    input.vocalMode === "own_voice" && Boolean(input.voiceSampleUrl);
  const voiceCloneModelConfigured = Boolean(REPLICATE_MUSIC_VOICE_CLONE_MODEL);
  const voiceCloningEnabled = requestedOwnVoice && voiceCloneModelConfigured;

  return {
    requestedOwnVoice,
    voiceCloningEnabled,
    voiceCloneModelConfigured,
    fallbackReason:
      requestedOwnVoice && !voiceCloneModelConfigured
        ? "No compatible music voice clone model configured. Falling back to the standard song generation model."
        : null,
    fallbackStage:
      requestedOwnVoice && !voiceCloneModelConfigured ? "generation" : null,
  } satisfies MusicGenerationMeta;
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedAmount = 0;

  try {
    const body = (await req.json()) as GenerateMusicBody;

    const mode: "song" | "speech" =
      body?.mode === "speech" ? "speech" : "song";

    if (mode !== "song") {
      return NextResponse.json(
        { ok: false, error: "Only song mode is supported in this route." },
        { status: 400 }
      );
    }

    const title = normalizeTitle(body.title);
    const userPrompt = normalizeText(body.prompt);
    const lyrics = normalizeLyricsForSong(normalizeText(body.lyrics));
    const prompt = buildStylePrompt({
      prompt: body.prompt,
      language: body.language,
      vocalType: body.vocalType,
      vocalMode: body.vocalMode,
      mood: body.mood,
      genre: body.genre,
      tempo: body.tempo,
      instrumental: body.instrumental,
      cleanLyrics: body.cleanLyrics,
    });
    const durationSec = normalizeDurationSec(body.durationSec);

    if (!lyrics) {
      return NextResponse.json(
        { ok: false, error: "Lyrics are required" },
        { status: 400 }
      );
    }

    const usageSession = await resolveUsageSession(req);

    if (!usageSession) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const consumed = await tryConsumeUserCredits(
      usageSession.userId,
      SONG_CREDIT_COST
    );

    if (!consumed.ok) {
      return NextResponse.json(
        buildPlanLimitPayload(usageSession.planInfo),
        { status: 403 }
      );
    }

    chargedUserId = usageSession.userId;
    chargedAmount = SONG_CREDIT_COST;

    const generationMeta = buildMusicGenerationMeta({
      vocalMode: body.vocalMode,
      voiceSampleUrl: body.voiceSampleUrl,
    });

    const activeModel = generationMeta.voiceCloningEnabled
      ? REPLICATE_MUSIC_VOICE_CLONE_MODEL
      : REPLICATE_FULL_SONG_MODEL;

    const modelInput = generationMeta.voiceCloningEnabled
      ? {
          lyrics,
          prompt,
          voice_sample: body.voiceSampleUrl,
          sample_rate: 44100,
          bitrate: 256000,
          audio_format: "mp3",
        }
      : {
          lyrics,
          prompt,
          sample_rate: 44100,
          bitrate: 256000,
          audio_format: "mp3",
        };

    const prediction = await replicateModelRequest<Prediction>(activeModel, {
      method: "POST",
      body: JSON.stringify({
        input: modelInput,
      }),
    });

    if (!prediction?.id) {
      throw new Error("Prediction id missing");
    }

    const result = await waitPrediction(prediction.id);
    const audioUrl = pickOutputUrl(result.output);
    let generationId: string | null = null;

    try {
      const generationRecord = await saveGenerationOutput({
        userId: usageSession.userId,
        type: "music",
        title,
        prompt: userPrompt || prompt,
        lyrics,
        url: audioUrl,
        durationSec,
        provider: "replicate",
        model: activeModel,
        metadata: {
          mode,
          stylePrompt: prompt,
          vocalType: body?.vocalType ?? null,
          vocalMode: body?.vocalMode ?? "preset",
          voiceSampleUrl: body?.voiceSampleUrl ?? null,
          language: body.language ?? "en",
          mood: body?.mood ?? null,
          genre: body?.genre ?? null,
          tempo: body?.tempo ?? null,
          instrumental: body?.instrumental ?? null,
          cleanLyrics: body?.cleanLyrics ?? null,
          requestedDurationSec: durationSec,
          requestedOwnVoice: generationMeta.requestedOwnVoice,
          voiceCloningEnabled: generationMeta.voiceCloningEnabled,
          voiceCloneModelConfigured: generationMeta.voiceCloneModelConfigured,
          fallbackReason: generationMeta.fallbackReason,
          fallbackStage: generationMeta.fallbackStage,
        },
      });

      generationId = generationRecord?.id ?? null;
    } catch (dbError) {
      console.error("music generation history db warning:", dbError);
    }

    if (usageSession.userId) {
      const audioId = crypto.randomUUID();

      try {
        await sql`
          insert into audio (
            id,
            user_id,
            title,
            kind,
            source_type,
            audio_url,
            original_filename,
            mime_type,
            duration_sec,
            language,
            prompt,
            lyrics,
            voice_sample_url,
            voice_id,
            model,
            status,
            metadata,
            created_at,
            updated_at
          )
          values (
            ${audioId},
            ${usageSession.userId},
            ${title},
            ${"generated_song"},
            ${"ai_generate"},
            ${audioUrl},
            ${null},
            ${"audio/mpeg"},
            ${durationSec},
            ${body.language ?? "en"},
            ${prompt},
            ${lyrics},
            ${body.voiceSampleUrl ?? null},
            ${null},
            ${activeModel},
            ${"ready"},
            ${JSON.stringify({
              mode,
              vocalType: body?.vocalType ?? null,
              vocalMode: body?.vocalMode ?? "preset",
              voiceSampleUrl: body?.voiceSampleUrl ?? null,
              mood: body?.mood ?? null,
              genre: body?.genre ?? null,
              tempo: body?.tempo ?? null,
              instrumental: body?.instrumental ?? null,
              cleanLyrics: body?.cleanLyrics ?? null,
              requestedDurationSec: durationSec,
              requestedOwnVoice: generationMeta.requestedOwnVoice,
              voiceCloningEnabled: generationMeta.voiceCloningEnabled,
              voiceCloneModelConfigured: generationMeta.voiceCloneModelConfigured,
              fallbackReason: generationMeta.fallbackReason,
              fallbackStage: generationMeta.fallbackStage,
            })}::jsonb,
            now(),
            now()
          )
        `;
      } catch (dbError) {
        console.error("music route db warning:", dbError);
      }
    }

    const updatedPlan = await getResolvedUserPlan(usageSession.userId);

    return NextResponse.json({
      ok: true,
      generationId,
      audioUrl,
      title,
      durationSec,
      lyrics,
      kind: "generated_song",
      model: activeModel,
      vocalMode: body.vocalMode ?? "preset",
      requestedOwnVoice: generationMeta.requestedOwnVoice,
      voiceCloningEnabled: generationMeta.voiceCloningEnabled,
      voiceCloneModelConfigured: generationMeta.voiceCloneModelConfigured,
      voiceCloneApplied: generationMeta.voiceCloningEnabled,
      fallbackReason: generationMeta.fallbackReason,
      fallbackStage: generationMeta.fallbackStage,
      voiceCloneNote: generationMeta.fallbackReason,
      remainingCredits: updatedPlan.remainingCredits,
      usedThisMonth: updatedPlan.usedThisMonth,
      monthlyCredits: updatedPlan.monthlyCredits,
      planCode: updatedPlan.plan,
      planLabel: updatedPlan.planLabel,
    });
  } catch (err: unknown) {
    if (chargedUserId && chargedAmount > 0) {
      try {
        await refundUserCredits(chargedUserId, chargedAmount);
      } catch (refundError) {
        console.error("Music credit refund failed:", refundError);
      }
    }

    console.error("MUSIC ROUTE ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Music generation failed",
      },
      { status: 500 }
    );
  }
}
