import type {
  EditorPrefill,
  MediaType,
  RawHistoryItem,
  TimelineClip,
  UploadedMediaItem,
} from "./types";

export const EDITOR_PREFILL_KEY = "dubles_editor_prefill_v1";
export const HISTORY_STORAGE_KEY_PREFIX = "dubles_generation_history_v1_";

export function createHistoryStorageKey(email?: string | null) {
  return `${HISTORY_STORAGE_KEY_PREFIX}${email || "guest"}`;
}

export function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function getTypeFromUrl(url: string): MediaType {
  const lower = url.toLowerCase();

  if (
    lower.includes(".mp3") ||
    lower.includes(".wav") ||
    lower.includes(".m4a") ||
    lower.includes(".aac") ||
    lower.includes(".ogg")
  ) {
    return "audio";
  }

  if (
    lower.includes(".mp4") ||
    lower.includes(".mov") ||
    lower.includes(".webm") ||
    lower.includes(".mkv")
  ) {
    return "video";
  }

  return "image";
}

export function prefillToMedia(prefill: EditorPrefill | null): UploadedMediaItem | null {
  if (!prefill) return null;

  const url =
    prefill.audioUrl ||
    prefill.videoUrl ||
    prefill.imageUrl ||
    prefill.url ||
    "";

  if (!url) return null;

  const type =
    prefill.type === "music"
      ? "audio"
      : prefill.type === "video" || prefill.type === "video_clone"
      ? "video"
      : prefill.type === "image"
      ? "image"
      : getTypeFromUrl(url);

  return {
    id: createId("prefill"),
    type,
    title: prefill.title || "Untitled",
    url,
    source: "prefill",
    createdAt: prefill.createdAt || new Date().toISOString(),
    prompt: prefill.prompt || "",
    lyrics: prefill.lyrics || "",
    duration: prefill.duration,
    thumbnailUrl: prefill.coverImageUrl || prefill.thumbnailUrl,
    provider: prefill.provider,
    model: prefill.model,
  };
}

export function rawHistoryToMedia(item: RawHistoryItem): UploadedMediaItem | null {
  const url =
    item?.audioUrl ||
    item?.videoUrl ||
    item?.imageUrl ||
    item?.url ||
    "";

  if (!url || typeof url !== "string") return null;

  let type: MediaType = "image";
  const rawType = String(item?.type || item?.mode || "").toLowerCase();

  if (rawType.includes("music") || rawType === "song" || item?.audioUrl) {
    type = "audio";
  } else if (rawType.includes("video") || rawType.includes("clone") || item?.videoUrl) {
    type = "video";
  } else if (rawType.includes("image") || item?.imageUrl) {
    type = "image";
  } else {
    type = getTypeFromUrl(url);
  }

  return {
    id: createId("history"),
    type,
    title:
      item?.title ||
      (type === "audio"
        ? "Untitled Track"
        : type === "video"
        ? "Untitled Video"
        : "Untitled Image"),
    url,
    source: "history",
    createdAt: item?.createdAt || new Date().toISOString(),
    prompt: item?.prompt || "",
    lyrics: item?.lyrics || "",
    duration:
      typeof item?.durationSec === "number"
        ? item.durationSec
        : typeof item?.duration === "number"
        ? item.duration
        : undefined,
    thumbnailUrl: item?.thumbnailUrl || item?.coverImageUrl,
    provider: item?.provider,
    model: item?.model,
  };
}

export function createDefaultClip(
  item: UploadedMediaItem,
  startTime: number
): TimelineClip {
  const baseDuration =
    typeof item.duration === "number" && item.duration > 0
      ? item.duration
      : item.type === "image"
      ? 4
      : item.type === "audio"
      ? 8
      : 6;

  return {
    id: createId("clip"),
    mediaId: item.id,
    type: item.type,
    title: item.title,
    sourceUrl: item.url,
    thumbnailUrl: item.thumbnailUrl,
    track: item.type === "audio" ? "audio" : "visual",
    startTime,
    sourceDuration: baseDuration,
    duration: baseDuration,
    trimStart: 0,
    trimEnd: baseDuration,
    volume: 100,
    fadeIn: 0,
    fadeOut: 0,
    x: 50,
    y: 50,
    scale: 100,
    textOverlay: "",
    textSize: 28,
    pipEnabled: false,
    cropMode: "16:9",
    filterPreset: "Clean",
  };
}

export function getProjectDuration(clips: TimelineClip[]) {
  if (clips.length === 0) return 0;
  return Math.max(...clips.map((clip) => clip.startTime + clip.duration));
}

export function getActiveVisualClip(clips: TimelineClip[], time: number) {
  const active = clips
    .filter(
      (clip) =>
        clip.track === "visual" &&
        time >= clip.startTime &&
        time < clip.startTime + clip.duration
    )
    .sort((a, b) => a.startTime - b.startTime);

  return active[active.length - 1] || null;
}

export function getActiveAudioClip(clips: TimelineClip[], time: number) {
  const active = clips
    .filter(
      (clip) =>
        clip.track === "audio" &&
        time >= clip.startTime &&
        time < clip.startTime + clip.duration
    )
    .sort((a, b) => a.startTime - b.startTime);

  return active[active.length - 1] || null;
}

export function getFilterStyle(filter: TimelineClip["filterPreset"]) {
  switch (filter) {
    case "Cinematic":
      return "contrast(1.08) saturate(1.08) brightness(0.95)";
    case "Warm":
      return "sepia(0.18) saturate(1.12) brightness(1.03)";
    case "Cool":
      return "hue-rotate(10deg) saturate(0.92) brightness(1.02)";
    case "Vintage":
      return "sepia(0.28) contrast(0.95) saturate(0.82)";
    case "B&W":
      return "grayscale(1)";
    default:
      return "none";
  }
}

export function normalizeTimelineOrder(clips: TimelineClip[]) {
  const ordered = [...clips].sort((a, b) => a.startTime - b.startTime);

  let running = 0;
  return ordered.map((clip) => {
    const updated = { ...clip, startTime: running };
    running += clip.duration;
    return updated;
  });
}
