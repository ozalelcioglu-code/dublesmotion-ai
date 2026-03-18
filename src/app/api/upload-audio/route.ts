import { NextRequest, NextResponse } from "next/server";
import { uploadBufferToCloudinary } from "@/lib/server/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Audio file is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unsupported audio type: ${file.type || "unknown"}`,
        },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadBufferToCloudinary(bytes, {
      folder: "dubles-motion/audio",
      resourceType: "video",
      filename: file.name || "audio-upload",
    });

    return NextResponse.json({
      ok: true,
      audioUrl: uploaded.secure_url,
      publicId: uploaded.public_id,
      resourceType: uploaded.resource_type,
      bytes: uploaded.bytes ?? null,
      duration: uploaded.duration ?? null,
      format: uploaded.format ?? null,
    });
  } catch (error) {
    console.error("upload-audio error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Audio upload failed",
      },
      { status: 500 }
    );
  }
}