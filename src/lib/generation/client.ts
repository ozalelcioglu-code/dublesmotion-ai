import type { AppLanguage } from "@/lib/i18n";

export type GenerationUploadKind = "image" | "video" | "audio";

export function getSafeGenerationLanguage(language?: string): AppLanguage {
  if (
    language === "tr" ||
    language === "en" ||
    language === "de" ||
    language === "ku"
  ) {
    return language;
  }

  return "tr";
}

export function buildSessionHeaders(
  user: {
    id: string;
    email: string;
    name: string;
  } | null
) {
  if (!user) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-name": user.name,
  };
}

export async function uploadGenerationAsset(
  file: File,
  kind: GenerationUploadKind
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", kind);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok || !data?.fileUrl) {
    throw new Error(data?.error || "Upload failed");
  }

  return String(data.fileUrl);
}

export function compactTitle(prompt: string, fallback: string) {
  const title = prompt.trim().replace(/\s+/g, " ").slice(0, 72);
  return title || fallback;
}
