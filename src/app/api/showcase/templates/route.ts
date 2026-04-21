import { NextResponse } from "next/server";
import {
  listPublicShowcaseTemplates,
  type GenerationOutputType,
} from "@/lib/server/generation-history";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<GenerationOutputType>([
  "image",
  "text_video",
  "image_video",
]);

function normalizeType(value: string | null): GenerationOutputType | null {
  if (!value) return null;
  return VALID_TYPES.has(value as GenerationOutputType)
    ? (value as GenerationOutputType)
    : null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value || 18);
  if (!Number.isFinite(parsed)) return 18;
  return Math.max(1, Math.min(60, Math.round(parsed)));
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = normalizeType(url.searchParams.get("type"));
    const limit = normalizeLimit(url.searchParams.get("limit"));
    const items = await listPublicShowcaseTemplates({ type, limit });

    return NextResponse.json({
      ok: true,
      items,
    });
  } catch (error) {
    console.error("public showcase templates error:", error);
    return NextResponse.json(
      { ok: false, error: "Showcase templates could not be loaded." },
      { status: 500 }
    );
  }
}
