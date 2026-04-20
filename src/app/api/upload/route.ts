import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

function ensureEnv() {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME");
  }
  if (!CLOUDINARY_API_KEY) {
    throw new Error("Missing CLOUDINARY_API_KEY");
  }
  if (!CLOUDINARY_API_SECRET) {
    throw new Error("Missing CLOUDINARY_API_SECRET");
  }
}

function sha1(message: string) {
  return crypto.createHash("sha1").update(message).digest("hex");
}

function sanitizeFileName(name: string) {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function extFromFile(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  if (file.type.includes("mp4")) return "mp4";
  if (file.type.includes("quicktime")) return "mov";
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("jpeg")) return "jpg";
  if (file.type.includes("jpg")) return "jpg";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("mpeg")) return "mp3";
  if (file.type.includes("mp3")) return "mp3";
  if (file.type.includes("wav")) return "wav";
  if (file.type.includes("ogg")) return "ogg";
  if (file.type.includes("aac")) return "aac";
  if (file.type.includes("m4a")) return "m4a";

  return "bin";
}

async function uploadToCloudinary(file: File, kind: "image" | "video" | "audio") {
  ensureEnv();

  const timestamp = Math.floor(Date.now() / 1000);
  const baseName = sanitizeFileName(file.name || `${kind}-${Date.now()}`);
  const ext = extFromFile(file);
  const publicId = `${kind}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}_${baseName}`;

  const folder =
    kind === "video"
      ? "dublesmotion/source-videos"
      : kind === "audio"
      ? "dublesmotion/source-audio"
      : "dublesmotion/reference-images";

  const resourceType = kind === "video" || kind === "audio" ? "video" : "image";

  const paramsToSign = [
    `folder=${folder}`,
    `overwrite=true`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join("&");

  const signature = sha1(`${paramsToSign}${CLOUDINARY_API_SECRET}`);

  const arrayBuffer = await file.arrayBuffer();
  const blobFile = new File([new Uint8Array(arrayBuffer)], `${publicId}.${ext}`, {
    type:
      file.type ||
      (kind === "video"
        ? "video/mp4"
        : kind === "audio"
        ? "audio/mpeg"
        : "image/jpeg"),
  });

  const form = new FormData();
  form.append("file", blobFile);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("overwrite", "true");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.secure_url) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `Cloudinary ${kind} upload failed`
    );
  }

  return {
    fileUrl: String(data.secure_url),
    publicId: String(data.public_id || publicId),
    bytes: Number(data.bytes || file.size || 0),
    width: typeof data.width === "number" ? data.width : null,
    height: typeof data.height === "number" ? data.height : null,
    duration: typeof data.duration === "number" ? data.duration : null,
    format: typeof data.format === "string" ? data.format : ext,
    resourceType,
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const kindRaw = formData.get("kind");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File is required." },
        { status: 400 }
      );
    }

    const kind =
      kindRaw === "video" || kindRaw === "image" || kindRaw === "audio"
        ? kindRaw
        : file.type.startsWith("audio/")
        ? "audio"
        : file.type.startsWith("video/")
        ? "video"
        : "image";

    if (kind === "video" && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { ok: false, error: "Uploaded file is not a valid video." },
        { status: 400 }
      );
    }

    if (kind === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Uploaded file is not a valid image." },
        { status: 400 }
      );
    }

    if (kind === "audio" && !file.type.startsWith("audio/")) {
      return NextResponse.json(
        { ok: false, error: "Uploaded file is not a valid audio file." },
        { status: 400 }
      );
    }

    const uploaded = await uploadToCloudinary(file, kind);

    return NextResponse.json({
      ok: true,
      kind,
      fileUrl: uploaded.fileUrl,
      publicId: uploaded.publicId,
      bytes: uploaded.bytes,
      width: uploaded.width,
      height: uploaded.height,
      duration: uploaded.duration,
      format: uploaded.format,
      resourceType: uploaded.resourceType,
    });
  } catch (error: unknown) {
    console.error("Cloudinary upload error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 }
    );
  }
}
