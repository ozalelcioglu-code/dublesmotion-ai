import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GenerateMusicBody = {
  title?: string;
  prompt?: string;
  lyrics?: string;
  durationSec?: number;
  language?: string;
};

function normalizeDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(180, Math.max(5, Math.round(n)));
}

async function callExternalMusicProvider(body: GenerateMusicBody) {
  const providerUrl = process.env.MUSIC_PROVIDER_URL;
  const providerToken = process.env.MUSIC_PROVIDER_TOKEN;

  if (!providerUrl) {
    return null;
  }

  const res = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(providerToken
        ? { authorization: `Bearer ${providerToken}` }
        : {}),
    },
    body: JSON.stringify({
      title: body.title || "",
      prompt: body.prompt || "",
      lyrics: body.lyrics || "",
      durationSec: normalizeDuration(body.durationSec),
      language: body.language || "en",
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Music provider request failed");
  }

  if (!data?.audioUrl) {
    throw new Error("Music provider did not return audioUrl");
  }

  return {
    audioUrl: data.audioUrl as string,
    title: (data.title || body.title || "Generated Song") as string,
    durationSec: normalizeDuration(data.durationSec ?? body.durationSec),
    lyrics: (data.lyrics || body.lyrics || "") as string,
    saveWarning:
      (data.saveWarning as string | undefined) ||
      null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateMusicBody;

    const title = (body.title || "").trim();
    const prompt = (body.prompt || "").trim();
    const lyrics = (body.lyrics || "").trim();
    const durationSec = normalizeDuration(body.durationSec);
    const language = (body.language || "en").trim();

    if (!prompt && !lyrics) {
      return NextResponse.json(
        { ok: false, error: "Music prompt or lyrics is required" },
        { status: 400 }
      );
    }

    const providerResult = await callExternalMusicProvider({
      title,
      prompt,
      lyrics,
      durationSec,
      language,
    });

    if (providerResult) {
      return NextResponse.json({
        ok: true,
        audioUrl: providerResult.audioUrl,
        title: providerResult.title,
        durationSec: providerResult.durationSec,
        lyrics: providerResult.lyrics,
        saveWarning: providerResult.saveWarning,
      });
    }

    const demoAudioUrl = process.env.DEMO_AUDIO_URL;

    if (!demoAudioUrl) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Music provider is not configured. Set MUSIC_PROVIDER_URL or DEMO_AUDIO_URL.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      audioUrl: demoAudioUrl,
      title: title || "Demo Song",
      durationSec,
      lyrics,
      saveWarning:
        "Demo mode active: real music provider is not connected yet.",
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
}