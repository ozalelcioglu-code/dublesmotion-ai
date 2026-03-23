import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import {
  ensureUserProfile,
  getResolvedUserPlan,
  resetMonthlyUsageIfNeeded,
} from "../../../lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VocalType = "ai_male" | "ai_female" | "custom";

type GenerateMusicBody = {
  title?: string;
  prompt?: string;
  lyrics?: string;
  durationSec?: number;
  language?: string;
  vocalType?: VocalType;
  voiceSampleUrl?: string;
  autoLyrics?: boolean;
};

type SelfHostedMusicResponse = {
  ok: boolean;
  audioUrl?: string;
  title?: string;
  lyrics?: string;
  durationSec?: number;
  segments?: Array<{
    id?: string;
    startSec?: number;
    endSec?: number;
    label?: string;
    audioUrl?: string;
  }>;
  saveWarning?: string | null;
  error?: string;
};

function normalizeDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(240, Math.max(5, Math.round(n)));
}

function getMaxSongDurationByPlan(plan: string) {
  switch (plan) {
    case "starter":
    case "pro":
    case "agency":
      return 240;
    case "free":
    default:
      return 60;
  }
}

async function generateLyricsFromProvider(
  prompt: string,
  language: string,
  title?: string
) {
  const providerUrl = process.env.LYRICS_PROVIDER_URL;
  const providerToken = process.env.LYRICS_PROVIDER_TOKEN;

  if (!providerUrl) return null;

  const res = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(providerToken ? { authorization: `Bearer ${providerToken}` } : {}),
    },
    body: JSON.stringify({
      prompt,
      language,
      title: title || "",
      type: "song_lyrics",
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.lyrics) return null;

  return String(data.lyrics);
}

function buildFallbackLyrics(prompt: string, language: string, title?: string) {
  const safeTitle = (title || "Generated Song").trim();

  if (language === "tr") {
    return `[Verse 1]
${safeTitle} için yeni bir hikâye başlıyor
${prompt} içinde yanan bir duygu taşıyor
Gece konuşurken şehir bize eşlik ediyor
Kalbin ritmi bu şarkıda yeniden doğuyor

[Chorus]
Sen söyle, gece bizimle aksın
Bu melodi içimde yavaşça çalsın
Bir adım daha, ışıklar bize kalsın
Bu şarkı şimdi gökyüzünde yankılansın

[Verse 2]
Kelimeler rüzgâr gibi usulca dolaşır
Anılar kalbimde sessizce yarışır
Her nota yeni bir kapıyı aralar
Bu hikâye müzikle sonsuza uzanır

[Bridge]
Durma, bırak sesin yükselsin
Karanlık bile bugün bizimle gelsin
Bir düş gibi zaman burada dursun
Bu anın içinde dünya kaybolsun

[Outro]
${safeTitle}
Bir melodi, bir gece, bir iz
Ve bu şarkı artık biziz`;
  }

  if (language === "de") {
    return `[Verse 1]
Für ${safeTitle} beginnt jetzt eine neue Nacht
${prompt} trägt eine leuchtende Kraft
Die Stadt atmet leise mit unserem Klang
Und jeder Herzschlag zieht uns entlang

[Chorus]
Lass die Lichter für uns weiterziehen
Lass die Melodie durch die Dunkelheit blühen
Noch ein Schritt und wir verlieren die Zeit
Dieser Song trägt uns in die Unendlichkeit

[Verse 2]
Worte treiben langsam durch den Wind
Wie Erinnerungen, die noch lebendig sind
Jede Note öffnet eine weitere Tür
Und diese Geschichte gehört jetzt uns dafür

[Bridge]
Halte nicht an, lass deine Stimme steigen
Selbst die Schatten werden uns begleiten
Wie ein Traum bleibt dieser Moment bestehen
Bis wir uns im Echo wiedersehen

[Outro]
${safeTitle}
Ein Lied, eine Nacht, ein Gefühl
Und alles klingt jetzt still und kühl`;
  }

  if (language === "ku") {
    return `[Verse 1]
${safeTitle} re şeveke nû dest pê dike
${prompt} di dil de hesteke geş hildide
Bajar bi dengê me re bi hêviya xwe dimeşe
Her lêdanek di vê stranê de dîsa dijî

[Chorus]
Bêje bila ev şev bi me re here
Bila ev melodi di nav dilê min de bibêje
Yek gav din, bila ronahî ji me re bimîne
Ev stran niha di ezman de deng bide

[Verse 2]
Peyv wekî bayê hêdî dihate û diçe
Bîranîn di dil de bêdeng dimeşe
Her nota deriyekî nû vedike
Ev çîrok bi muzîkê re dirêj dibe

[Bridge]
Raweste neke, bila dengê te bilind bibe
Tewra tariyê jî îro bi me re were
Wekî xewnê dem li vir raweste
Di nava vê kêliyê de cîhan winda bibe

[Outro]
${safeTitle}
Stranek, şevek, şopek
Û niha ev stran em in`;
  }

  return `[Verse 1]
A new story starts inside ${safeTitle}
${prompt} turns the silence into light
The city breathes along with every line
And every heartbeat falls into the rhyme

[Chorus]
Let the lights keep running through the night
Let this melody hold us in the light
One more step and time begins to fly
This song will keep on rising through the sky

[Verse 2]
Words are moving softly with the wind
Like the memories we still carry in
Every note unlocks another door
And this feeling pulls us in once more

[Bridge]
Do not stop, let your voice lift high
Even shadows fade when we feel alive
Like a dream this moment stays in place
Till the echo wraps around this space

[Outro]
${safeTitle}
One song, one night, one flame
And nothing will remain the same`;
}

async function resolveLyrics(body: GenerateMusicBody) {
  const prompt = (body.prompt || "").trim();
  const providedLyrics = (body.lyrics || "").trim();
  const language = (body.language || "en").trim() || "en";

  if (providedLyrics) return providedLyrics;
  if (!prompt) return "";

  const providerLyrics = await generateLyricsFromProvider(
    prompt,
    language,
    body.title
  );

  if (providerLyrics?.trim()) {
    return providerLyrics.trim();
  }

  return buildFallbackLyrics(prompt, language, body.title);
}

async function callSelfHostedMusicProvider(args: {
  title: string;
  prompt: string;
  lyrics: string;
  language: string;
  durationSec: number;
  plan: string;
  vocalType: VocalType;
  voiceSampleUrl: string;
}): Promise<SelfHostedMusicResponse> {
  const providerBaseUrl = (process.env.MUSIC_INFERENCE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const providerToken = process.env.MUSIC_INFERENCE_TOKEN;

  if (!providerBaseUrl) {
    throw new Error("MUSIC_INFERENCE_URL is not configured.");
  }

  if (args.vocalType === "custom") {
    return {
      ok: false,
      error:
        "Custom voice singing is not active yet in the self-hosted inference service.",
    };
  }

  const endpoint = `${providerBaseUrl}/generate-song`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(providerToken ? { authorization: `Bearer ${providerToken}` } : {}),
    },
    body: JSON.stringify({
      title: args.title,
      prompt: args.prompt,
      lyrics: args.lyrics,
      language: args.language,
      durationSec: args.durationSec,
      plan: args.plan,
      vocalType: args.vocalType,
      voiceSampleUrl: args.voiceSampleUrl || "",
    }),
  });

  const data = (await res.json().catch(() => null)) as SelfHostedMusicResponse | null;

  if (!res.ok) {
    throw new Error(data?.error || "Self-hosted music inference request failed");
  }

  if (!data?.ok || !data.audioUrl) {
    throw new Error(data?.error || "Self-hosted music inference did not return audioUrl");
  }

  return data;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        {
          ok: false,
          error: "You must be logged in to generate music.",
        },
        { status: 401 }
      );
    }

    const body = (await req.json()) as GenerateMusicBody;

    const title = (body.title || "").trim();
    const prompt = (body.prompt || "").trim();
    const inputLyrics = (body.lyrics || "").trim();
    const language = (body.language || "en").trim() || "en";
    const vocalType: VocalType =
      body.vocalType === "ai_male" ||
      body.vocalType === "ai_female" ||
      body.vocalType === "custom"
        ? body.vocalType
        : "ai_female";
    const voiceSampleUrl = (body.voiceSampleUrl || "").trim();
    const autoLyrics = body.autoLyrics !== false;

    if (!prompt && !inputLyrics) {
      return NextResponse.json(
        { ok: false, error: "Music prompt or lyrics is required" },
        { status: 400 }
      );
    }

    await ensureUserProfile({
      userId: session.user.id,
      email: session.user.email,
      fullName: session.user.name ?? null,
    });

    await resetMonthlyUsageIfNeeded(session.user.id);
    const planInfo = await getResolvedUserPlan(session.user.id);

    const maxDurationSec = getMaxSongDurationByPlan(planInfo.plan);
    const requestedDurationSec = normalizeDuration(body.durationSec);
    const durationSec = Math.min(requestedDurationSec, maxDurationSec);

    if (vocalType === "custom" && !voiceSampleUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Custom voice selected but no voice sample was provided.",
        },
        { status: 400 }
      );
    }

    const finalLyrics =
      inputLyrics || (autoLyrics ? await resolveLyrics({ ...body, language }) : "");

    const providerResult = await callSelfHostedMusicProvider({
      title,
      prompt,
      lyrics: finalLyrics,
      durationSec,
      language,
      plan: planInfo.plan,
      vocalType,
      voiceSampleUrl,
    });

    const safeLyrics =
      (providerResult.lyrics || "").trim() || (finalLyrics || "").trim();

    return NextResponse.json({
  ok: true,
  audioUrl: toAbsoluteAudioUrl(providerResult.audioUrl || ""),
  title: providerResult.title || title || "Generated Song",
  durationSec: providerResult.durationSec ?? durationSec,
  lyrics: safeLyrics,
  segments: (providerResult.segments ?? []).map((segment) => ({
    ...segment,
    audioUrl: segment.audioUrl ? toAbsoluteAudioUrl(segment.audioUrl) : null,
  })),
  saveWarning: providerResult.saveWarning ?? null,
  plan: {
    code: planInfo.plan,
    label: planInfo.planLabel,
    maxSongDurationSec: maxDurationSec,
  },
});
  } catch (error) {
    console.error("generate-music error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Music generation failed",
      },
      { status: 500 }
    );
  }
  function toAbsoluteAudioUrl(audioUrl: string) {
  if (!audioUrl) return audioUrl;
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }

  const base =
    process.env.MUSIC_INFERENCE_BASE_URL ||
    "http://127.0.0.1:8000";

  if (audioUrl.startsWith("/")) {
    return `${base}${audioUrl}`;
  }

  return `${base}/${audioUrl}`;
}
}