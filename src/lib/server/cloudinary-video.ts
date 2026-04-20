const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

function ensureCloudinaryEnv() {
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

async function sha1(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadRemoteVideoToCloudinary(input: {
  videoUrl: string;
  publicId?: string;
  folder?: string;
  overwrite?: boolean;
  resourceType?: "video" | "image" | "raw";
}) {
  ensureCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = input.folder || "dublesmotion/generated";
  const publicId =
    input.publicId ||
    `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const overwrite = input.overwrite ?? true;
  const resourceType = input.resourceType || "video";

  const paramsToSign = [
    `folder=${folder}`,
    `overwrite=${overwrite ? "true" : "false"}`,
    `public_id=${publicId}`,
    `timestamp=${timestamp}`,
  ].join("&");

  const signature = await sha1(`${paramsToSign}${CLOUDINARY_API_SECRET}`);

  const formData = new FormData();
  formData.append("file", input.videoUrl);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("overwrite", overwrite ? "true" : "false");

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Cloudinary upload failed"
    );
  }

  return {
    assetId: data?.asset_id as string | undefined,
    publicId: data?.public_id as string,
    version: data?.version as number | string | undefined,
    width: data?.width as number | undefined,
    height: data?.height as number | undefined,
    duration: data?.duration as number | undefined,
    format: data?.format as string | undefined,
    resourceType: data?.resource_type as string | undefined,
    bytes: data?.bytes as number | undefined,
    secureUrl: data?.secure_url as string,
    playbackUrl: data?.secure_url as string,
  };
}

export function buildCloudinaryConcatUrl(input: {
  publicIds: string[];
  format?: string;
  width?: number;
  height?: number;
}) {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Missing CLOUDINARY_CLOUD_NAME");
  }

  const publicIds = input.publicIds.filter(Boolean);

  if (publicIds.length === 0) {
    throw new Error("publicIds is required");
  }

  const format = input.format || "mp4";

  if (publicIds.length === 1) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload/${encodeURIComponent(
      publicIds[0]
    )}.${format}`;
  }

  const encodedIds = publicIds.map((id) => encodeURIComponent(id));
  const transforms: string[] = [];

  if (input.width && input.height) {
    transforms.push(`w_${input.width},h_${input.height},c_fill`);
  }

  const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/video/upload`;
  const transformPart = transforms.length ? `${transforms.join(",")}/` : "";
  const [first, ...rest] = encodedIds;
  const splicePart = rest.map((id) => `fl_splice/l_video:${id}`).join("/");

  return `${base}/${transformPart}${first}/${splicePart}.${format}`;
}