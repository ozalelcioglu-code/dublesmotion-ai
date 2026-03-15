import { NextResponse } from "next/server";
import { RenderRequestSchema } from "types/schema";
import { getSql } from "../../../lib/db";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const LOCAL_VIDEO_URL = "/demo/preview.mp4";

function createSeed() {
  return Math.floor(Math.random() * 1_000_000_000).toString();
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = RenderRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid render request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const sql = getSql();

    const { id, inputProps } = parsed.data;
    const scenes = inputProps.storyboard?.scenes ?? [];
    const sceneCount = scenes.length;
    const totalDuration = scenes.reduce(
      (acc, scene) => acc + scene.durationSec,
      0
    );

    const prompt = inputProps.prompt ?? "";
    const userId =
      rawBody && typeof rawBody.userId === "string" ? rawBody.userId : null;
    const projectId =
      rawBody && typeof rawBody.projectId === "string"
        ? rawBody.projectId
        : null;

    const videoId = crypto.randomUUID();
    const seed = createSeed();
    const model = "demo-render-v1";
    const estimatedSize = 4 * 1024 * 1024;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        try {
          send({
            type: "phase",
            phase: "Initializing render",
            progress: 8,
            subtitle: `Composition: ${id}`,
          });

          await sleep(500);

          send({
            type: "phase",
            phase: "Validating storyboard",
            progress: 20,
            subtitle: `${sceneCount} scenes · ${totalDuration}s total`,
          });

          await sleep(700);

          send({
            type: "phase",
            phase: "Preparing composition",
            progress: 42,
            subtitle:
              inputProps.prompt?.slice(0, 80) || "Preparing prompt-driven sequence",
          });

          await sleep(900);

          send({
            type: "phase",
            phase: "Rendering preview video",
            progress: 72,
            subtitle: "Encoding local preview",
          });

          await sleep(1100);

          send({
            type: "phase",
            phase: "Saving generation record",
            progress: 88,
            subtitle: "Writing video metadata to Neon",
          });

          await sql`
            insert into videos (
              id,
              user_id,
              project_id,
              prompt,
              model,
              seed,
              status,
              video_url,
              file_size,
              duration_sec,
              expires_at,
              created_at
            )
            values (
              ${videoId},
              ${userId},
              ${projectId},
              ${prompt},
              ${model},
              ${seed},
              ${"done"},
              ${LOCAL_VIDEO_URL},
              ${estimatedSize},
              ${totalDuration},
              now() + interval '30 days',
              now()
            )
          `;

          await sleep(400);

          send({
            type: "phase",
            phase: "Finalizing output",
            progress: 96,
            subtitle: "Preparing local playback URL",
          });

          await sleep(300);

          send({
            type: "done",
            url: LOCAL_VIDEO_URL,
            size: estimatedSize,
          });

          controller.close();
        } catch (error) {
          send({
            type: "error",
            message:
              error instanceof Error ? error.message : "Unknown render error",
          });
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}