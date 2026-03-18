import crypto from "crypto";

type UploadResult = {
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

export async function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  options?: {
    folder?: string;
    publicId?: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    filename?: string;
  }
): Promise<UploadResult> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryEnv();

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = options?.folder || "dubles-motion";
  const publicId =
    options?.publicId ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const resourceType = options?.resourceType || "auto";

  const paramsToSign: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
  };

  const signature = signParams(paramsToSign, apiSecret);

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);

  formData.append("file", blob, options?.filename || `${publicId}.bin`);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return data as UploadResult;
}