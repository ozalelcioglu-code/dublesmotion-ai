const V2_HISTORY_STORAGE_KEY = "dubles_v2_history";
const V2_EDITOR_PREFILL_KEY = "dubles_v2_editor_prefill";
const LEGACY_EDITOR_PREFILL_KEY = "dubles_editor_prefill_v1";
const V2_PREFILL_KEY = "dubles_v2_prefill";

export type V2IntentType =
  | "chat"
  | "music"
  | "text-to-image"
  | "text-to-video"
  | "image-to-video"
  | "video-clone";

export type V2HistoryItemType =
  | "music"
  | "image"
  | "text_video"
  | "image_video"
  | "video_clone";

export type V2HistoryItem = {
  id: string;
  type: V2HistoryItemType;
  title: string;
  createdAt: string;
  url?: string;
  thumbnailUrl?: string;
  prompt?: string;
  durationSec?: number | null;
};

export function makeHistoryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getV2History(): V2HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(V2_HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("getV2History error:", error);
    return [];
  }
}

export function addV2HistoryItem(item: V2HistoryItem) {
  if (typeof window === "undefined") return;

  try {
    const current = getV2History();
    const next = [item, ...current];
    window.localStorage.setItem(V2_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("addV2HistoryItem error:", error);
  }
}

export function removeV2HistoryItem(itemId: string) {
  if (typeof window === "undefined") return;

  try {
    const current = getV2History();
    const next = current.filter((item) => item.id !== itemId);
    window.localStorage.setItem(V2_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("removeV2HistoryItem error:", error);
  }
}

export function setV2EditorPrefill(value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(V2_EDITOR_PREFILL_KEY, JSON.stringify(value));
    window.localStorage.setItem(LEGACY_EDITOR_PREFILL_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("setV2EditorPrefill error:", error);
  }
}

export function getV2EditorPrefill<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(V2_EDITOR_PREFILL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("getV2EditorPrefill error:", error);
    return null;
  }
}

export function clearV2EditorPrefill() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(V2_EDITOR_PREFILL_KEY);
    window.localStorage.removeItem(LEGACY_EDITOR_PREFILL_KEY);
  } catch (error) {
    console.error("clearV2EditorPrefill error:", error);
  }
}

export function setV2Prefill(value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(V2_PREFILL_KEY, JSON.stringify(value));
  } catch (error) {
    console.error("setV2Prefill error:", error);
  }
}

export function getV2Prefill<T = { intent?: V2IntentType; prompt?: string }>(): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(V2_PREFILL_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("getV2Prefill error:", error);
    return null;
  }
}

export function clearV2Prefill() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(V2_PREFILL_KEY);
  } catch (error) {
    console.error("clearV2Prefill error:", error);
  }
}
