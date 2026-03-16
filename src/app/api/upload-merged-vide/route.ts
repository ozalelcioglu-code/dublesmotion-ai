import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const filename =
      req.headers.get("x-upload-filename") || `merged-${Date.now()}.mp4`;

    const buffer = Buffer.from(await req.arrayBuffer());

    const blob = await put(`merged-videos/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      contentType: "video/mp4",
    });

    return NextResponse.json({
      ok: true,
      videoUrl: blob.url,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Merged upload failed",
      },
      { status: 500 }
    );
  }
}