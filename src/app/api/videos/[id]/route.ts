import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { deleteVideoById } from "../../../../lib/video-repository";
import { NextRequest } from "next/server";
import { createVideoPipeline } from "@/lib/video/createVideoPipeline";
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const deleted = await deleteVideoById({
      videoId: id,
      userId,
    });

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          error: "Video not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Delete failed",
      },
      { status: 500 }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, userId, userPlan } = body;

    if (!prompt || !userId || !userPlan) {
      return NextResponse.json(
        { error: "Eksik veri gönderildi." },
        { status: 400 }
      );
    }

    const video = await createVideoPipeline({
      prompt,
      userId,
      userPlan,
    });

    return NextResponse.json({
      ok: true,
      video,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}