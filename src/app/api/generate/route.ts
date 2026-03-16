import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../lib/auth";
import { generateContent } from "../../../lib/ai/generation";
import { getSql } from "../../../lib/db";
import {
  ensureUserProfile,
  getResolvedUserPlan,
  incrementMonthlyVideoCount,
  resetMonthlyUsageIfNeeded,
} from "../../../lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  mode: z.enum([
    "image_to_video",
    "url_to_video",
    "text_to_image",
    "text_to_video",
    "logo_to_video",
  ]),
  prompt: z.string().min(3).optional(),
  negativePrompt: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  projectId: z.string().optional(),
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

    if (planInfo.monthlyVideoLimit !== null) {
      await incrementMonthlyVideoCount(session.user.id);
    }

    let result;
    try {
      result = await generateContent({
        mode: input.mode,
        prompt:
          input.prompt ||
          (input.mode === "logo_to_video"
            ? "clean premium technology logo reveal"
            : undefined),
        negativePrompt: input.negativePrompt,
        imageUrl: input.imageUrl,
        sourceUrl: input.sourceUrl,
        durationSec: targetDurationSec,
        plan: activePlan,
      });
    } catch (generationError: any) {
      throw generationError;
    }

    const sql = getSql();

    const videoId = crypto.randomUUID();
    const seed = createSeed();
    const title = makeVideoTitle(
      input.prompt ||
        (input.mode === "logo_to_video"
          ? "Logo Animation"
          : "AI Video")
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
            ${
              input.prompt ||
              (input.mode === "logo_to_video"
                ? "clean premium technology logo reveal"
                : "AI Video")
            },
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

    const updatedPlan = await getResolvedUserPlan(session.user.id);

    return NextResponse.json(
      {
        ok: true,
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