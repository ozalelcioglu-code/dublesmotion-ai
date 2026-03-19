import crypto from "crypto";

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes?: number;
  format?: string;
  duration?: number;
};

function getCloudinaryEnv() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Missing Cloudinary env vars. Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function signParams(params: Record<string, string>, apiSecret: string) {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
}

function createPublicId(prefix = "scene-video") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadRemoteVideoToCloudinary(
  remoteUrl: string,
  options?: {
    folder?: string;
    publicId?: string;
  }
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = options?.folder || "dubles-motion/generated/scenes";
  const publicId = options?.publicId || createPublicId();

  const paramsToSign: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = signParams(paramsToSign, apiSecret);

  const formData = new FormData();
  formData.append("file", remoteUrl);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary remote video upload failed");
  }

  return data as CloudinaryUploadResult;
}

function overlayId(publicId: string) {
  return publicId.replace(/\//g, ":");
}

export function buildCloudinaryConcatUrl(publicIds: string[]) {
  const { cloudName } = getCloudinaryEnv();

  if (!publicIds.length) {
    throw new Error("At least one Cloudinary public ID is required");
  }

  if (publicIds.length === 1) {
    return `https://res.cloudinary.com/${cloudName}/video/upload/${publicIds[0]}.mp4`;
  }

  const [base, ...rest] = publicIds;

  const spliceTransforms = rest
    .map((id) => `l_video:${overlayId(id)},fl_splice`)
    .join("/");

  return `https://res.cloudinary.com/${cloudName}/video/upload/${spliceTransforms}/${base}.mp4`;
}