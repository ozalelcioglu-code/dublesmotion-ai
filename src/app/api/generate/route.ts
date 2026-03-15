import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../lib/auth";
import { generateContent } from "../../../lib/ai/generation";
import { getSql } from "../../../lib/db";
import {
  ensureUserProfile,
  getResolvedUserPlan,
} from "../../../lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  mode: z.enum([
    "image_to_video",
    "url_to_video",
    "text_to_image",
    "text_to_video",
  ]),
  prompt: z.string().min(3),
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

function getFallbackPlanLimits(plan: string) {
  switch (plan) {
    case "starter":
      return {
        monthlyVideoLimit: 20,
        maxDurationSec: 20,
        planLabel: "Starter",
      };
    case "pro":
      return {
        monthlyVideoLimit: 50,
        maxDurationSec: 30,
        planLabel: "Pro",
      };
    case "agency":
      return {
        monthlyVideoLimit: null,
        maxDurationSec: 30,
        planLabel: "Agency",
      };
    case "free":
    default:
      return {
        monthlyVideoLimit: 1,
        maxDurationSec: 10,
        planLabel: "Free",
      };
  }
}

function makeVideoTitle(prompt: string) {
  const clean = prompt.trim().replace(/\s+/g, " ");
  if (!clean) return "AI Video";
  return clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
}

function toDbMode(
  mode: "image_to_video" | "url_to_video" | "text_to_image" | "text_to_video"
) {
  switch (mode) {
    case "text_to_video":
    case "text_to_image":
      return "text";
    case "image_to_video":
      return "image";
    case "url_to_video":
      return "url";
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

    await ensureUserProfile({
      userId: session.user.id,
      email: session.user.email,
      fullName: session.user.name ?? null,
    });

    const sql = getSql();

    const planInfo = await getResolvedUserPlan(session.user.id);
    const fallback = getFallbackPlanLimits(planInfo?.plan ?? "free");

    const activePlan = planInfo?.plan ?? "free";
    const planLabel = planInfo?.planLabel ?? fallback.planLabel;
    const monthlyVideoLimit =
      typeof planInfo?.monthlyVideoLimit === "number" ||
      planInfo?.monthlyVideoLimit === null
        ? planInfo.monthlyVideoLimit
        : fallback.monthlyVideoLimit;

    const targetDurationSec = getPlanDurationSec(activePlan);

    const isVideoGeneration =
      input.mode === "text_to_video" ||
      input.mode === "url_to_video" ||
      input.mode === "image_to_video";

    if (isVideoGeneration) {
      const usageResult = await sql<{ count: string }>`
        select count(*)::text as count
        from videos
        where user_id = ${session.user.id}
          and created_at >= date_trunc('month', now())
          and created_at < date_trunc('month', now()) + interval '1 month'
      `;

      const usedThisMonth = Number(usageResult[0]?.count ?? "0");

      if (
        monthlyVideoLimit !== null &&
        Number.isFinite(monthlyVideoLimit) &&
        usedThisMonth >= monthlyVideoLimit
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "PLAN_LIMIT_REACHED",
            error: `Your ${planLabel} plan monthly limit has been reached.`,
            plan: activePlan,
            planLabel,
            usedThisMonth,
            monthlyVideoLimit,
          },
          { status: 403 }
        );
      }
    }

    const result = await generateContent({
      mode: input.mode,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      imageUrl: input.imageUrl,
      sourceUrl: input.sourceUrl,
      durationSec: targetDurationSec,
    });

    const videoId = crypto.randomUUID();
    const seed = createSeed();
    const title = makeVideoTitle(input.prompt);
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
            ${input.prompt},
            ${result.model},
            ${seed},
            ${"done"},
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

    let usedThisMonthAfter = 0;

    try {
      const usageAfterResult = await sql<{ count: string }>`
        select count(*)::text as count
        from videos
        where user_id = ${session.user.id}
          and created_at >= date_trunc('month', now())
          and created_at < date_trunc('month', now()) + interval '1 month'
      `;
      usedThisMonthAfter = Number(usageAfterResult[0]?.count ?? "0");
    } catch {
      usedThisMonthAfter = 0;
    }

    const remainingCredits =
      monthlyVideoLimit === null
        ? null
        : Math.max(monthlyVideoLimit - usedThisMonthAfter, 0);

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
        saveWarning,
        plan: {
          code: activePlan,
          label: planLabel,
          monthlyVideoLimit,
          usedThisMonth: usedThisMonthAfter,
          remainingCredits,
          maxDurationSec: targetDurationSec,
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
          details: err.flatten?.() ?? null,
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