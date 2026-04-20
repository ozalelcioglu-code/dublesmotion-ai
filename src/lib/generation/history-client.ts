import { buildSessionHeaders } from "@/lib/generation/client";

export type GenerationHistoryType =
  | "music"
  | "image"
  | "text_video"
  | "image_video"
  | "video_clone";

export type GenerationHistoryItem = {
  id: string;
  userId?: string;
  type: GenerationHistoryType;
  title: string;
  prompt: string;
  lyrics: string;
  url: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  provider: string | null;
  model: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

export type SessionUserForGenerationHistory = {
  id: string;
  email: string;
  name: string;
} | null;

export async function fetchGenerationHistory(input: {
  user: SessionUserForGenerationHistory;
  type?: GenerationHistoryType;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (input.type) params.set("type", input.type);
  if (input.limit) params.set("limit", String(input.limit));

  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`/api/generations${suffix}`, {
    method: "GET",
    headers: buildSessionHeaders(input.user),
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok || !Array.isArray(data.items)) {
    return [];
  }

  return data.items as GenerationHistoryItem[];
}

export async function deleteGenerationHistoryItem(input: {
  user: SessionUserForGenerationHistory;
  id: string;
}) {
  const params = new URLSearchParams({ id: input.id });
  const res = await fetch(`/api/generations?${params.toString()}`, {
    method: "DELETE",
    headers: buildSessionHeaders(input.user),
  });

  return res.ok;
}

export async function clearGenerationHistory(input: {
  user: SessionUserForGenerationHistory;
}) {
  const res = await fetch("/api/generations", {
    method: "DELETE",
    headers: buildSessionHeaders(input.user),
  });

  return res.ok;
}
