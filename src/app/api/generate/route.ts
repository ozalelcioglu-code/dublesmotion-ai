import { NextResponse } from "next/server";
import { z } from "zod";
import { generateContent } from "../../../lib/ai/generation";
import { auth } from "../../../lib/auth";
import { getSql } from "../../../lib/db";
import {
  ensureUserProfile,
  getResolvedUserPlan,
  incrementMonthlyVideoCount,
  resetMonthlyUsageIfNeeded,
} from "../../../lib/user-profile-repository";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RequestSchema = z.object({
  mode: z.enum([
    "image_to_video",
    "url_to_video",
    "text_to_image",
    "text_to_video",
    "logo_to_video",
  ]),
  prompt: z.string().min(1).optional(),
  negativePrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  projectId: z.string().optional(),
  ratio: z.enum(["1:1", "16:9", "9:16"]).optional(),
  style: z
    .enum([
      "realistic",
      "cinematic",
      "3d_animation",
      "anime",
      "pixar",
      "cartoon",
    ])
    .optional(),
  preview: z.boolean().optional(),
});

function createSeed() {
  return Math.floor(Math.random() * 1_000_000_000).toString();
}

function getPlanDurationSec(plan: string) {
  switch (plan) {
    case "starter":
      return 20;
    case "pro":
    case "agency":
      return 30;
    case "free":
    default:
      return 10;
  }
}

function getPlanSceneCount(plan: string, durationSec: number) {
  if (durationSec <= 10 || plan === "free") return 2;
  if (durationSec <= 20 || plan === "starter") return 3;
  return 4;
}

function getLanguageFromHeaders(req: Request): "tr" | "en" | "de" {
  const cookie = req.headers.get("cookie") || "";
  const cookieMatch = cookie.match(/app-language=(tr|en|de)/);
  if (cookieMatch?.[1] === "tr" || cookieMatch?.[1] === "en" || cookieMatch?.[1] === "de") {
    return cookieMatch[1];
  }

  const accept = req.headers.get("accept-language") || "";
  if (accept.startsWith("tr")) return "tr";
  if (accept.startsWith("de")) return "de";
  return "en";
}

function makeVideoTitle(prompt?: string) {
  const clean = (prompt || "AI Video").trim().replace(/\s+/g, " ");
  if (!clean) return "AI Video";
  return clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
}

function toDbMode(
  mode:
    | "image_to_video"
    | "url_to_video"
    | "text_to_image"
    | "text_to_video"
    | "logo_to_video"
) {
  switch (mode) {
    case "text_to_video":
    case "text_to_image":
      return "text";
    case "image_to_video":
      return "image";
    case "url_to_video":
      return "url";
    case "logo_to_video":
      return "image";
    default:
      return "text";
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          error: "You must be logged in to generate content.",
        },
        { status: 401 }
      );
    }

    const json = await req.json();
    const input = RequestSchema.parse(json);
    const isPreview = input.preview === true;

    if (input.mode === "logo_to_video" && !input.imageUrl && !input.sourceUrl) {
      return NextResponse.json(
        {
          ok: false,
          code: "LOGO_IMAGE_REQUIRED",
          error: "Logo Animation Mode requires an uploaded logo image.",
        },
        { status: 400 }
      );
    }

    if (
      input.mode !== "logo_to_video" &&
      input.mode !== "image_to_video" &&
      input.mode !== "url_to_video" &&
      !input.prompt?.trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "PROMPT_REQUIRED",
          error: "Prompt is required for this generation mode.",
        },
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

    if (
      !isPreview &&
      planInfo.monthlyVideoLimit !== null &&
      planInfo.usedThisMonth >= planInfo.monthlyVideoLimit
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "PLAN_LIMIT_REACHED",
          error: `Your ${planInfo.planLabel} plan monthly limit has been reached.`,
          plan: planInfo,
        },
        { status: 403 }
      );
    }

    const activePlan = planInfo.plan;
    const targetDurationSec = getPlanDurationSec(activePlan);
    const targetSceneCount = getPlanSceneCount(activePlan, targetDurationSec);
    const language = getLanguageFromHeaders(req);

    const normalizedPrompt =
      input.prompt ||
      (input.mode === "logo_to_video"
        ? "clean premium technology logo reveal"
        : undefined);

    const result = await generateContent({
      mode: input.mode,
      prompt: normalizedPrompt,
      negativePrompt: input.negativePrompt,
      imageUrl: input.imageUrl,
      sourceUrl: input.sourceUrl,
      durationSec: targetDurationSec,
      sceneCount: targetSceneCount,
      ratio: input.ratio ?? "16:9",
      plan: activePlan,
      style: input.style,
      preview: isPreview,
      language,
    });

    if (isPreview) {
      return NextResponse.json(
        {
          ok: true,
          preview: true,
          mode: result.mode,
          provider: result.provider,
          model: result.model,
          imageUrl: "imageUrl" in result ? result.imageUrl ?? null : null,
          videoUrl: null,
          videoId: null,
          durationSec: result.durationSec,
          sceneImages: result.sceneImages,
          scenePrompts: result.scenePrompts,
          sceneVideoUrls: [],
          actualClipDurationSec: 0,
          saveWarning: null,
          plan: {
            code: planInfo.plan,
            label: planInfo.planLabel,
            monthlyVideoLimit: planInfo.monthlyVideoLimit,
            usedThisMonth: planInfo.usedThisMonth,
            remainingCredits: planInfo.remainingCredits,
            maxDurationSec: planInfo.maxDurationSec,
          },
        },
        { status: 200 }
      );
    }

    const sql = getSql();

    const videoId = crypto.randomUUID();
    const seed = createSeed();
    const title = makeVideoTitle(
      normalizedPrompt || (input.mode === "logo_to_video" ? "Logo Animation" : "AI Video")
    );
    const dbMode = toDbMode(input.mode);

    const finalVideoUrl = "videoUrl" in result ? result.videoUrl : null;
    const finalImageUrl = "imageUrl" in result ? result.imageUrl ?? null : null;

    let saveWarning: string | null = null;

    if (finalVideoUrl) {
      try {
        await sql`
          insert into videos (
            id,
            user_id,
            project_id,
            title,
            mode,
            prompt,
            model,
            seed,
            status,
            video_url,
            thumbnail_url,
            file_size,
            duration_sec,
            expires_at,
            created_at
          )
          values (
            ${videoId},
            ${session.user.id},
            ${input.projectId ?? null},
            ${title},
            ${dbMode},
            ${normalizedPrompt || "AI Video"},
            ${result.model},
            ${seed},
            ${"ready"},
            ${finalVideoUrl},
            ${finalImageUrl},
            ${0},
            ${result.durationSec},
            now() + interval '30 days',
            now()
          )
        `;
      } catch (saveErr: any) {
        console.error("Video generated but DB save failed:", saveErr);
        saveWarning =
          saveErr?.message || "Video was generated but could not be saved.";
      }
    }

    if (planInfo.monthlyVideoLimit !== null) {
      await incrementMonthlyVideoCount(session.user.id);
    }

    const updatedPlan = await getResolvedUserPlan(session.user.id);

    return NextResponse.json(
      {
        ok: true,
        preview: false,
        mode: result.mode,
        provider: result.provider,
        model: result.model,
        imageUrl: "imageUrl" in result ? result.imageUrl ?? null : null,
        videoUrl: "videoUrl" in result ? result.videoUrl : null,
        videoId: finalVideoUrl ? videoId : null,
        durationSec: result.durationSec,
        sceneImages: result.sceneImages,
        scenePrompts: result.scenePrompts,
        sceneVideoUrls: result.sceneVideoUrls,
        actualClipDurationSec: result.actualClipDurationSec,
        saveWarning,
        plan: {
          code: updatedPlan.plan,
          label: updatedPlan.planLabel,
          monthlyVideoLimit: updatedPlan.monthlyVideoLimit,
          usedThisMonth: updatedPlan.usedThisMonth,
          remainingCredits: updatedPlan.remainingCredits,
          maxDurationSec: updatedPlan.maxDurationSec,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Unified generation failed:", err);

    if (err?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid generation request payload.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "GENERATION_FAILED",
        error: err?.message ?? "Generation failed",
      },
      { status: 500 }
    );
  }
}