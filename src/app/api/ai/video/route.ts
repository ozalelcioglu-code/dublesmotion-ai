import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImageToVideo } from "../../../../lib/ai/video";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  imageUrl: z.string().url(),
  prompt: z.string().min(3),
  negativePrompt: z.string().optional(),
  durationSec: z.number().optional(),
  cacheKey: z.string().optional(),
});

type CacheItem = {
  videoUrl: string;
  createdAt: number;
};

const memoryCache = new Map<string, CacheItem>();
const inflightRequests = new Map<string, Promise<Response>>();

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 saat

function cleanupCache() {
  const now = Date.now();

  for (const [key, value] of memoryCache.entries()) {
    if (now - value.createdAt > CACHE_TTL_MS) {
      memoryCache.delete(key);
    }
  }
}

function buildCacheKey(input: {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string;
  durationSec?: number;
  cacheKey?: string;
}) {
  if (input.cacheKey?.trim()) {
    return input.cacheKey.trim();
  }

  return [
    input.imageUrl,
    input.prompt,
    input.negativePrompt ?? "",
    input.durationSec ?? 0,
  ].join("::");
}

export async function POST(req: Request) {
  try {
    cleanupCache();

    const json = await req.json();
    const input = RequestSchema.parse(json);

    const useRealSceneVideo =
      String(process.env.USE_REAL_SCENE_VIDEO).toLowerCase() === "true";

    console.log("AI VIDEO REQUEST STARTED");
    console.log("USE_REAL_SCENE_VIDEO:", useRealSceneVideo);
    console.log("imageUrl:", input.imageUrl);
    console.log("prompt:", input.prompt);

    if (!useRealSceneVideo) {
      return NextResponse.json(
        {
          ok: false,
          code: "SCENE_VIDEO_DISABLED",
          error:
            "Real scene video generation is disabled. Set USE_REAL_SCENE_VIDEO=true in production environment variables.",
        },
        { status: 400 }
      );
    }

    const requestKey = buildCacheKey(input);

    // 1) Aynı process içinde daha önce üretildiyse cache'den dön
    const cached = memoryCache.get(requestKey);
    if (cached?.videoUrl) {
      console.log("AI VIDEO CACHE HIT:", requestKey);

      return NextResponse.json(
        {
          ok: true,
          videoUrl: cached.videoUrl,
          cached: true,
        },
        { status: 200 }
      );
    }

    // 2) Aynı anda aynı request çalışıyorsa mevcut promise'i bekle
    const inflight = inflightRequests.get(requestKey);
    if (inflight) {
      console.log("AI VIDEO INFLIGHT REUSE:", requestKey);
      return inflight;
    }

    const generationPromise = (async () => {
      const videoUrl = await generateImageToVideo({
        image: input.imageUrl,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
      });

      console.log("VIDEO URL RETURNED:", videoUrl);

      if (!videoUrl || typeof videoUrl !== "string") {
        return NextResponse.json(
          {
            ok: false,
            code: "SCENE_VIDEO_EMPTY",
            error: "No video URL returned from generateImageToVideo().",
          },
          { status: 502 }
        );
      }

      // 3) Başarılı sonucu memory cache'e koy
      memoryCache.set(requestKey, {
        videoUrl,
        createdAt: Date.now(),
      });

      return NextResponse.json(
        {
          ok: true,
          videoUrl,
          cached: false,
        },
        { status: 200 }
      );
    })();

    inflightRequests.set(requestKey, generationPromise);

    try {
      const response = await generationPromise;
      return response;
    } finally {
      inflightRequests.delete(requestKey);
    }
  } catch (err: any) {
    console.error("Video generation failed:", err);

    if (err?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid scene video request payload.",
          details: err.flatten?.() ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "SCENE_VIDEO_FAILED",
        error: err?.message ?? "Video generation failed",
      },
      { status: 500 }
    );
  }
}