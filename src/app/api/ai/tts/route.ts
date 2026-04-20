import { NextResponse } from "next/server";
import { resolveUsageSession } from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const PRIMARY_TTS_MODEL = process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";

function cleanTextForSpeech(value: unknown) {
  const text = typeof value === "string" ? value : "";
  return text.replace(/```[\s\S]*?```/g, "").replace(/\s+/g, " ").trim();
}

function getVoiceForAvatar(value: unknown) {
  return value === "child" ? "echo" : "onyx";
}

function getInstructions(value: unknown) {
  if (value === "child") {
    return "Speak naturally with a warm young male voice. Keep the rhythm smooth and conversational.";
  }

  return "Speak naturally with a calm adult male voice. Keep the rhythm smooth, confident, and conversational.";
}

async function requestSpeechAudio(params: {
  text: string;
  voice: string;
  instructions: string;
}) {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PRIMARY_TTS_MODEL,
      voice: params.voice,
      input: params.text,
      instructions: params.instructions,
      response_format: "mp3",
    }),
  });

  if (response.ok) return response;

  const fallback = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: params.voice,
      input: params.text,
      response_format: "mp3",
    }),
  });

  return fallback;
}

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const usageSession = await resolveUsageSession(req);

    if (!usageSession) {
      return NextResponse.json(
        { ok: false, error: "Login required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const text = cleanTextForSpeech(body?.text).slice(0, 1400);

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Speech text is empty" },
        { status: 400 }
      );
    }

    const voice = getVoiceForAvatar(body?.avatar);
    const audioResponse = await requestSpeechAudio({
      text,
      voice,
      instructions: getInstructions(body?.avatar),
    });

    if (!audioResponse.ok) {
      const error = await audioResponse.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: error || "Speech generation failed" },
        { status: 502 }
      );
    }

    const audio = await audioResponse.arrayBuffer();

    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      { ok: false, error: "Speech generation failed" },
      { status: 500 }
    );
  }
}
