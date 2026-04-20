import { NextResponse } from "next/server";
import {
  clearGenerationOutputs,
  deleteGenerationOutput,
  listGenerationOutputs,
  type GenerationOutputType,
} from "@/lib/server/generation-history";
import { resolveUsageSession } from "@/lib/server/usage-credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = new Set<GenerationOutputType>([
  "music",
  "image",
  "text_video",
  "image_video",
  "video_clone",
]);

function normalizeType(value: string | null): GenerationOutputType | null {
  if (!value) return null;
  return VALID_TYPES.has(value as GenerationOutputType)
    ? (value as GenerationOutputType)
    : null;
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value || 40);
  if (!Number.isFinite(parsed)) return 40;
  return Math.max(1, Math.min(100, Math.round(parsed)));
}

export async function GET(req: Request) {
  const usageSession = await resolveUsageSession(req);

  if (!usageSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const type = normalizeType(url.searchParams.get("type"));
  const limit = normalizeLimit(url.searchParams.get("limit"));
  const items = await listGenerationOutputs({
    userId: usageSession.userId,
    type,
    limit,
  });

  return NextResponse.json({
    ok: true,
    items,
  });
}

export async function DELETE(req: Request) {
  const usageSession = await resolveUsageSession(req);

  if (!usageSession) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  if (id) {
    await deleteGenerationOutput({
      userId: usageSession.userId,
      id,
    });
  } else {
    await clearGenerationOutputs(usageSession.userId);
  }

  return NextResponse.json({
    ok: true,
  });
}
