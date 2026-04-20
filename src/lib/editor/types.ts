export type EditorTab =
  | "general"
  | "audio"
  | "trim"
  | "crop"
  | "text"
  | "filters"
  | "pip"
  | "stickers"
  | "export";

export type MediaType = "video" | "image" | "audio";

export type UploadedMediaItem = {
  id: string;
  type: MediaType;
  title: string;
  url: string;
  source: "upload" | "history" | "prefill";
  createdAt: string;
  prompt?: string;
  lyrics?: string;
  duration?: number;
  thumbnailUrl?: string;
  provider?: string;
  model?: string;
};

export type TimelineClip = {
  id: string;
  mediaId: string;
  type: MediaType;
  title: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  track: "visual" | "audio";
  startTime: number;
  sourceDuration: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  x: number;
  y: number;
  scale: number;
  textOverlay: string;
  textSize: number;
  pipEnabled: boolean;
  cropMode: "16:9" | "9:16" | "1:1" | "4:5";
  filterPreset: "Clean" | "Cinematic" | "Warm" | "Cool" | "Vintage" | "B&W";
};

export type EditorPrefill = {
  type?: "music" | "video" | "image" | "video_clone" | "other";
  source?: string;
  createdAt?: string;
  title?: string;
  prompt?: string;
  lyrics?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  url?: string;
  coverImageUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  provider?: string;
  model?: string;
};

export type RawHistoryItem = {
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  url?: string;
  type?: string;
  mode?: string;
  title?: string;
  createdAt?: string;
  prompt?: string;
  lyrics?: string;
  durationSec?: number;
  duration?: number;
  thumbnailUrl?: string;
  coverImageUrl?: string;
  provider?: string;
  model?: string;
};

export type ExportPayload = {
  filename: string;
  width: number;
  height: number;
  fps: number;
  timeline: TimelineClip[];
};
