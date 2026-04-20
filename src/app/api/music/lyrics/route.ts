import { NextResponse } from "next/server";
import { getResolvedUserPlan } from "@/lib/user-profile-repository";
import {
  buildPlanLimitPayload,
  refundUserCredits,
  resolveUsageSession,
  tryConsumeUserCredits,
} from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const LYRICS_CREDIT_COST = 6;

type GenerateLyricsBody = {
  prompt?: string;
  title?: string;
  language?: "tr" | "en" | "de" | "ku" | "ar" | "fa";
  mood?: string;
  genre?: string;
  cleanLyrics?: boolean;
};

function normalizeText(input?: string) {
  return String(input || "").trim();
}

function normalizeLanguage(value?: string) {
  const lang = String(value || "en").trim().toLowerCase();

  if (
    lang === "tr" ||
    lang === "en" ||
    lang === "de" ||
    lang === "ku" ||
    lang === "ar" ||
    lang === "fa"
  ) {
    return lang;
  }

  return "en";
}

function languageLabel(language: string) {
  if (language === "tr") return "Turkish";
  if (language === "de") return "German";
  if (language === "ku") return "Kurdish";
  if (language === "ar") return "Arabic";
  if (language === "fa") return "Persian";
  return "English";
}

function buildSystemPrompt(language: string, cleanLyrics: boolean) {
  return `
You are a professional songwriter.

Write full original song lyrics in ${languageLabel(language)}.

Rules:
- Return only plain lyrics text.
- No markdown.
- No JSON.
- No explanations.
- Use clear verse and chorus structure.
- Keep it singable, memorable, emotionally coherent, and commercially strong.
${cleanLyrics ? "- Avoid profanity and explicit sexual language." : ""}
`.trim();
}

function buildUserPrompt(input: {
  title?: string;
  prompt?: string;
  language: string;
  mood?: string;
  genre?: string;
}) {
  return [
    input.title ? `Song title: ${input.title}` : "",
    `Main idea: ${input.prompt || "emotional modern song"}`,
    `Language: ${languageLabel(input.language)}`,
    input.mood ? `Mood: ${input.mood}` : "",
    input.genre ? `Genre: ${input.genre}` : "",
    "Write full lyrics with a strong chorus and polished songwriting.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  let chargedUserId: string | null = null;
  let chargedAmount = 0;

  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateLyricsBody;

    const prompt = normalizeText(body.prompt);
    const title = normalizeText(body.title);
    const language = normalizeLanguage(body.language);
    const mood = normalizeText(body.mood || "emotional");
    const genre = normalizeText(body.genre || "pop");
    const cleanLyrics = body.cleanLyrics !== false;

    if (!prompt && !title) {
      return NextResponse.json(
        { ok: false, error: "Prompt or title is required" },
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
      LYRICS_CREDIT_COST
    );

    if (!consumed.ok) {
      return NextResponse.json(
        buildPlanLimitPayload(usageSession.planInfo),
        { status: 403 }
      );
    }

    chargedUserId = usageSession.userId;
    chargedAmount = LYRICS_CREDIT_COST;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(language, cleanLyrics),
          },
          {
            role: "user",
            content: buildUserPrompt({
              title,
              prompt,
              language,
              mood,
              genre,
            }),
          },
        ],
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "Lyrics generation request failed"
      );
    }

    const lyrics =
      typeof data?.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content.trim()
        : "";

    if (!lyrics) {
      return NextResponse.json(
        {
          ok: false,
          error: "Lyrics were generated but came back empty.",
        },
        { status: 502 }
      );
    }

    const updatedPlan = await getResolvedUserPlan(usageSession.userId);

    return NextResponse.json({
      ok: true,
      lyrics,
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
        console.error("Lyrics credit refund failed:", refundError);
      }
    }

    console.error("music lyrics route error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Lyrics generation failed",
      },
      { status: 500 }
    );
  }
}
