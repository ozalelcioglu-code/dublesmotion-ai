import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export type GenerateTextToImageInput = {
  prompt: string;
  negativePrompt?: string;
  ratio?: "square" | "vertical" | "horizontal";
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractImageUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) {
    return output;
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && item.startsWith("http")) {
        return item;
      }

      if (
        item &&
        typeof item === "object" &&
        "url" in item &&
        typeof (item as any).url === "string"
      ) {
        return (item as any).url;
      }
    }
  }

  return null;
}

async function uploadImageToBlob(remoteUrl: string) {
  const response = await fetch(remoteUrl);
  const buffer = Buffer.from(await response.arrayBuffer());

  const fileName = `generated-images/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.png`;

  const blob = await put(fileName, buffer, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });

  return blob.url;
}

export async function generateTextToImage(
  input: GenerateTextToImageInput
): Promise<string> {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }

  const aspect_ratio =
    input.ratio === "vertical"
      ? "9:16"
      : input.ratio === "horizontal"
      ? "16:9"
      : "1:1";

  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-schnell",
    input: {
      prompt: input.prompt,
      negative_prompt:
        input.negativePrompt ??
        "blurry, low quality, text, watermark, logo",
      aspect_ratio,
    },
  });

  let current = prediction;

  for (let i = 0; i < 60; i++) {
    if (current.status === "succeeded") {
      const imageUrl = extractImageUrl(current.output);

      if (!imageUrl) {
        throw new Error("No image URL returned from replicate");
      }

      const blobUrl = await uploadImageToBlob(imageUrl);

      return blobUrl;
    }

    if (current.status === "failed") {
  throw new Error(String(current.error ?? "Image generation failed"));
}

    await sleep(2000);

    current = await replicate.predictions.get(prediction.id);
  }

  throw new Error("Image generation timeout");
}