import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { deleteVideoById } from "../../../../lib/video-repository";

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