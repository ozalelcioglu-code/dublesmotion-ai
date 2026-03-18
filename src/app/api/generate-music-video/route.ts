import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../lib/auth";
import { getSql } from "../../../lib/db";
import { generateMusicVideo } from "../../../lib/ai/music-video-generation";
import {
  ensureUserProfile,
  getResolvedUserPlan,
  incrementMonthlyVideoCount,
  resetMonthlyUsageIfNeeded,
} from "../../../lib/user-profile-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  audioUrl: z.string().url(),
  prompt: z.string().min(3),
  lyrics: z.string().optional(),
  title: z.string().optional(),
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

function makeVideoTitle(title?: string, prompt?: string) {
  const preferred = (title || "").trim();
  if (preferred) {
    return preferred.length > 80 ? `${preferred.slice(0, 80)}...` : preferred;
  }

  const clean = (prompt || "Music Video").trim().replace(/\s+/g, " ");
  if (!clean) return "Music Video";
  return clean.length > 80 ? `${clean.slice(0, 80)}...` : clean;
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
          error: "You must be logged in to generate music videos.",
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

    const result = await generateMusicVideo({
      audioUrl: input.audioUrl,
      prompt: input.prompt,
      lyrics: input.lyrics,
      title: input.title,
      ratio: input.ratio ?? "16:9",
      durationSec: targetDurationSec,
      style: input.style,
    });

    const sql = getSql();

    const videoId = crypto.randomUUID();
    const seed = createSeed();
    const title = makeVideoTitle(input.title, input.prompt);

    let saveWarning: string | null = null;

    if (result.videoUrl) {
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
            ${"music"},
            ${input.prompt},
            ${result.model},
            ${seed},
            ${"ready"},
            ${result.videoUrl},
            ${null},
            ${0},
            ${result.durationSec},
            now() + interval '30 days',
            now()
          )
        `;
      } catch (saveErr: any) {
        console.error("Music video generated but DB save failed:", saveErr);
        saveWarning =
          saveErr?.message || "Music video was generated but could not be saved.";
      }
    }

    if (planInfo.monthlyVideoLimit !== null) {
      await incrementMonthlyVideoCount(session.user.id);
    }

    const updatedPlan = await getResolvedUserPlan(session.user.id);

    return NextResponse.json(
      {
        ok: true,
        mode: result.mode,
        provider: result.provider,
        model: result.model,
        imageUrl: result.imageUrl ?? null,
        videoUrl: result.videoUrl,
        videoId: result.videoUrl ? videoId : null,
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
    console.error("Music video generation failed:", err);

    if (err?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_REQUEST",
          error: "Invalid music video generation request payload.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "GENERATION_FAILED",
        error: err?.message ?? "Music video generation failed",
      },
      { status: 500 }
    );
  }
}