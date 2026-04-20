import { NextResponse } from "next/server";
import { z } from "zod";
import { getChatAccess } from "@/lib/plan-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

const RequestSchema = z.object({
  query: z.string().min(3),
  language: z.string().optional(),
  planCode: z.string().optional(),
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_DEEP_RESEARCH_MODEL =
  process.env.OPENAI_DEEP_RESEARCH_MODEL || "o4-mini-deep-research";

function buildResearchPrompt(language?: string) {
  const lang = language || "en";

  if (lang === "tr") {
    return [
      "Sen Duble-S Motion AI için derin araştırma yapan profesyonel bir asistansın.",
      "Yanıtın kapsamlı, düzenli ve güvenilir olsun.",
      "Gerekirse farklı kaynakları karşılaştır.",
      "Belirsizlik varsa bunu açıkça belirt.",
      "Sonuçları uygulanabilir şekilde özetle.",
    ].join(" ");
  }

  if (lang === "de") {
    return [
      "Du bist ein professioneller Assistent für Deep Research innerhalb von Duble-S Motion AI.",
      "Antworte gründlich, strukturiert und verlässlich.",
      "Vergleiche bei Bedarf mehrere Quellen.",
      "Kennzeichne Unsicherheiten klar.",
      "Fasse die Ergebnisse praktisch zusammen.",
    ].join(" ");
  }

  if (lang === "ku") {
    return [
      "Tu di nav Duble-S Motion AI de asîstantek lêkolîna kûr î.",
      "Bersiv bi kûrahî, rêkûpêk û bawerbar be.",
      "Heke pêwîst be çend çavkaniyan berhev bike.",
      "Heke nezelalî hebe, bi zelalî bibêje.",
      "Encaman bi awayekî bikêrhatî kurt bike.",
    ].join(" ");
  }

  return [
    "You are a professional deep research assistant for Duble-S Motion AI.",
    "Be thorough, structured, and reliable.",
    "Compare multiple sources when useful.",
    "Clearly state uncertainty when present.",
    "Summarize findings in a practical way.",
  ].join(" ");
}

export async function POST(req: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const input = RequestSchema.parse(body);
    const access = getChatAccess(input.planCode);

    if (!access.canUseDeepResearch) {
      return NextResponse.json(
        {
          ok: false,
          error: "Deep research is not available on this plan.",
        },
        { status: 403 }
      );
    }

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_DEEP_RESEARCH_MODEL,
        stream: true,
        instructions: buildResearchPrompt(input.language),
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: input.query.trim(),
              },
            ],
          },
        ],
        tools: [
          {
            type: "web_search_preview",
            search_context_size: "high",
          },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const errorText = await upstream.text().catch(() => "");
      console.error("Deep research upstream error:", {
        status: upstream.status,
        statusText: upstream.statusText,
        body: errorText,
      });

      return NextResponse.json(
        {
          ok: false,
          error: errorText || "Deep research request failed",
        },
        { status: 500 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Deep research route failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Deep research failed",
      },
      { status: 500 }
    );
  }
}
