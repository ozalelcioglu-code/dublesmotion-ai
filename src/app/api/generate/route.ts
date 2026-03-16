import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../lib/auth";
import { generateContent } from "../../../lib/ai/generation";
import {
  ensureUserProfile,
  getResolvedUserPlan,
  getUserPlanUsage,
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

    const planInfo = await getResolvedUserPlan(session.user.id);
    const activePlan = planInfo.plan;
    const planLabel = planInfo.planLabel;
    const monthlyVideoLimit = planInfo.monthlyVideoLimit;
    const targetDurationSec = planInfo.maxDurationSec;

    const isVideoGeneration =
      input.mode === "text_to_video" ||
      input.mode === "url_to_video" ||
      input.mode === "image_to_video";

    if (isVideoGeneration) {
      const usage = await getUserPlanUsage(session.user.id, activePlan);

      if (
        monthlyVideoLimit !== null &&
        Number.isFinite(monthlyVideoLimit) &&
        usage.used >= monthlyVideoLimit
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "PLAN_LIMIT_REACHED",
            error:
              activePlan === "free"
                ? "Your Free plan allows only 1 video. Please upgrade to continue."
                : `Your ${planLabel} plan limit has been reached.`,
            plan: activePlan,
            planLabel,
            usedThisMonth: usage.used,
            monthlyVideoLimit,
            remainingCredits: 0,
            limitScope: planInfo.limitScope,
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

    const sql = (await import("../../../lib/db")).getSql();

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

    const usageAfter = await getUserPlanUsage(session.user.id, activePlan);
    const remainingCredits =
      monthlyVideoLimit === null
        ? null
        : Math.max(monthlyVideoLimit - usageAfter.used, 0);

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
          usedThisMonth: usageAfter.used,
          remainingCredits,
          maxDurationSec: targetDurationSec,
          limitScope: planInfo.limitScope,
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