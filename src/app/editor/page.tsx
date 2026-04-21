"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useLanguage } from "@/provider/languageProvider";
import type { AppLanguage } from "@/lib/i18n";
import { useIsMobile } from "@/lib/useIsMobile";
import type {
  EditorPrefill,
  EditorTab,
  ExportPayload,
  MediaType,
  TimelineClip,
  UploadedMediaItem,
} from "@/lib/editor/types";
import {
  createDefaultClip,
  EDITOR_PREFILL_KEY,
  formatClock,
  getActiveAudioClip,
  getActiveVisualClip,
  getFilterStyle,
  getProjectDuration,
  normalizeTimelineOrder,
  prefillToMedia,
} from "@/lib/editor/utils";
type AppTool = "video" | "audio";

type MotionPresetId =
  | "parallax"
  | "blur"
  | "gradient"
  | "ken-burns"
  | "wipe";

type MotionPreset = {
  id: MotionPresetId;
  label: string;
  description: string;
  filterPreset: TimelineClip["filterPreset"];
  cropMode: TimelineClip["cropMode"];
  x: number;
  y: number;
  scale: number;
  background: string;
  accent: string;
};

type TrimEdge = "start" | "end";

type TrimDragState = {
  clipId: string;
  edge: TrimEdge;
  startX: number;
  originalStartTime: number;
  originalDuration: number;
  originalTrimStart: number;
  originalTrimEnd: number;
  sourceDuration: number;
};

const MIN_CLIP_DURATION = 0.5;

const MOTION_PRESETS: MotionPreset[] = [
  {
    id: "parallax",
    label: "Parallax 5",
    description: "Slow depth push",
    filterPreset: "Cinematic",
    cropMode: "16:9",
    x: 46,
    y: 49,
    scale: 112,
    background:
      "linear-gradient(135deg, rgba(38,124,255,0.32), rgba(9,15,34,0.78)), url('/dubles-logo.png')",
    accent: "#38bdf8",
  },
  {
    id: "blur",
    label: "Blur Out",
    description: "Soft edge reveal",
    filterPreset: "Cool",
    cropMode: "16:9",
    x: 50,
    y: 50,
    scale: 106,
    background: "linear-gradient(135deg, #1a2747 0%, #6b7fa5 54%, #131827 100%)",
    accent: "#82d9ff",
  },
  {
    id: "gradient",
    label: "Gradient",
    description: "Blue motion wash",
    filterPreset: "Clean",
    cropMode: "16:9",
    x: 50,
    y: 50,
    scale: 100,
    background: "linear-gradient(135deg, #11182c 0%, #1557a7 52%, #6bc2ff 100%)",
    accent: "#0ea5ff",
  },
  {
    id: "ken-burns",
    label: "Ken Burns Smooth",
    description: "Polished zoom frame",
    filterPreset: "Warm",
    cropMode: "16:9",
    x: 54,
    y: 48,
    scale: 118,
    background: "linear-gradient(135deg, #2b2e43 0%, #42618f 48%, #c3d7ef 100%)",
    accent: "#fbbf24",
  },
  {
    id: "wipe",
    label: "Wipe Triangle",
    description: "Diagonal highlight",
    filterPreset: "Vintage",
    cropMode: "16:9",
    x: 48,
    y: 52,
    scale: 108,
    background: "linear-gradient(145deg, #121827 0 46%, #0ea5ff 47% 53%, #415a91 54% 100%)",
    accent: "#22d3ee",
  },
];

function getTrackDurationByKind(clips: TimelineClip[], track: TimelineClip["track"]) {
  return getProjectDuration(clips.filter((clip) => clip.track === track));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTime(value: number) {
  return Number(value.toFixed(2));
}

function getClipSourceDuration(clip: TimelineClip) {
  return Math.max(
    clip.sourceDuration || 0,
    clip.trimEnd || 0,
    clip.duration || 0,
    MIN_CLIP_DURATION
  );
}

function getTypeFromFile(file: File, fallbackType?: MediaType): MediaType {
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return fallbackType || "image";
}

function readMediaDuration(url: string, type: MediaType) {
  if (type === "image") return Promise.resolve<number | undefined>(4);

  return new Promise<number | undefined>((resolve) => {
    const media =
      type === "audio"
        ? document.createElement("audio")
        : document.createElement("video");

    media.preload = "metadata";
    media.onloadedmetadata = () => {
      const duration = Number.isFinite(media.duration)
        ? Math.max(1, Math.ceil(media.duration))
        : undefined;
      resolve(duration);
    };
    media.onerror = () => resolve(undefined);
    media.src = url;
  });
}

async function createUploadedMediaItem(
  file: File,
  fallbackType?: MediaType
): Promise<UploadedMediaItem> {
  const type = getTypeFromFile(file, fallbackType);
  const url = URL.createObjectURL(file);
  const duration = await readMediaDuration(url, type);

  return {
    id: `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: file.name.replace(/\.[^/.]+$/, ""),
    url,
    source: "upload",
    createdAt: new Date().toISOString(),
    duration,
  };
}

function getExportDownloadName(filename: string) {
  const cleanName = filename.trim().replace(/[^\w.-]+/g, "_") || "editor_project";
  return cleanName.endsWith(".json") ? cleanName : `${cleanName}.json`;
}

const TEXTS = {
  tr: {
    title: "Editör",
    subtitle: "Profesyonel timeline düzenleme akışı",
    goBack: "Go Back",
    premium: "Premium",
    video: "Video",
    audio: "Audio",
    mediaLibrary: "Media Library",
    motionPresets: "Motion Presets",
    noLibrary: "Henüz medya yok.",
    noHistory: "History tarafında içerik yok.",
    uploadVideo: "Video yükle",
    uploadImage: "Görsel yükle",
    uploadAudio: "Ses yükle",
    importSelected: "Seçileni ekle",
    delete: "Delete",
    addMusic: "Add Music",
    fitTimeline: "Fit Timeline",
    addFiles: "Add files",
    continueInOtherTools: "Continue in Other Tools",
    exportResult: "Export Result",
    noPreview: "Preview için timeline’a içerik ekle.",
    ready: "Hazır",
    activeClip: "Aktif clip",
    activeMedia: "Aktif medya",
    currentTime: "Zaman",
    tabs: {
      general: "General",
      audio: "Audio",
      trim: "Trim",
      crop: "Crop",
      text: "Text",
      filters: "Filters",
      pip: "PiP",
      stickers: "Stickers",
      export: "Export",
    } as Record<EditorTab, string>,
    keepOriginalAudio: "Keep original audio",
    balanceAddedAudio: "Adjust added soundtrack to original audio",
    volume: "Volume",
    fadeIn: "Fade-in",
    fadeOut: "Fade-out",
    trimStart: "Trim başlangıç",
    trimEnd: "Trim bitiş",
    cropMode: "Crop mode",
    overlayText: "Overlay text",
    textSize: "Text size",
    filterPreset: "Filter preset",
    pipEnabled: "PiP enabled",
    resetSettings: "Reset settings",
    moveLeft: "Sola",
    moveRight: "Sağa",
    duplicate: "Kopyala",
    removeClip: "Sil",
    addToTimeline: "Timeline'a ekle",
    usePreview: "Preview",
    exportFilename: "Dosya adı",
    exportSaveTo: "Kayıt yeri",
    exportFormat: "Format",
    exportResolution: "Resolution",
    exportFps: "FPS",
    exportQuality: "Quality",
    messages: {
      mediaAdded: "Medya kütüphaneye eklendi.",
      clipAdded: "Clip timeline'a eklendi.",
      clipRemoved: "Clip kaldırıldı.",
      editorCleared: "Editör temizlendi.",
      exportReady: "Export düzeni hazır. Sonraki adımda gerçek render bağlanacak.",
      prefillLoaded: "Editöre gönderilen içerik kütüphaneye eklendi.",
      presetApplied: "Preset seçili clip'e uygulandı.",
      selectVisualClip: "Önce timeline'da bir görsel clip seç.",
      exportCreated: "Export proje dosyası hazır.",
    },
  },
  en: {
    title: "Editor",
    subtitle: "Professional timeline editing flow",
    goBack: "Go Back",
    premium: "Premium",
    video: "Video",
    audio: "Audio",
    mediaLibrary: "Media Library",
    motionPresets: "Motion Presets",
    noLibrary: "No media yet.",
    noHistory: "No content in history.",
    uploadVideo: "Upload Video",
    uploadImage: "Upload Image",
    uploadAudio: "Upload Audio",
    importSelected: "Add Selected",
    delete: "Delete",
    addMusic: "Add Music",
    fitTimeline: "Fit Timeline",
    addFiles: "Add files",
    continueInOtherTools: "Continue in Other Tools",
    exportResult: "Export Result",
    noPreview: "Add media to the timeline for preview.",
    ready: "Ready",
    activeClip: "Active clip",
    activeMedia: "Active media",
    currentTime: "Time",
    tabs: {
      general: "General",
      audio: "Audio",
      trim: "Trim",
      crop: "Crop",
      text: "Text",
      filters: "Filters",
      pip: "PiP",
      stickers: "Stickers",
      export: "Export",
    } as Record<EditorTab, string>,
    keepOriginalAudio: "Keep original audio",
    balanceAddedAudio: "Adjust added soundtrack to original audio",
    volume: "Volume",
    fadeIn: "Fade-in",
    fadeOut: "Fade-out",
    trimStart: "Trim start",
    trimEnd: "Trim end",
    cropMode: "Crop mode",
    overlayText: "Overlay text",
    textSize: "Text size",
    filterPreset: "Filter preset",
    pipEnabled: "PiP enabled",
    resetSettings: "Reset settings",
    moveLeft: "Left",
    moveRight: "Right",
    duplicate: "Duplicate",
    removeClip: "Remove",
    addToTimeline: "Add to timeline",
    usePreview: "Preview",
    exportFilename: "Filename",
    exportSaveTo: "Save to",
    exportFormat: "Format",
    exportResolution: "Resolution",
    exportFps: "FPS",
    exportQuality: "Quality",
    messages: {
      mediaAdded: "Media added to library.",
      clipAdded: "Clip added to timeline.",
      clipRemoved: "Clip removed.",
      editorCleared: "Editor cleared.",
      exportReady: "Export layout is ready. Real rendering will be connected next.",
      prefillLoaded: "Sent editor content added to library.",
      presetApplied: "Preset applied to the selected clip.",
      selectVisualClip: "Select a visual clip on the timeline first.",
      exportCreated: "Export project file is ready.",
    },
  },
  de: {
    title: "Editor",
    subtitle: "Professioneller Timeline-Workflow",
    goBack: "Go Back",
    premium: "Premium",
    video: "Video",
    audio: "Audio",
    mediaLibrary: "Media Library",
    motionPresets: "Motion Presets",
    noLibrary: "Noch keine Medien.",
    noHistory: "Keine Inhalte im Verlauf.",
    uploadVideo: "Video hochladen",
    uploadImage: "Bild hochladen",
    uploadAudio: "Audio hochladen",
    importSelected: "Auswahl hinzufügen",
    delete: "Delete",
    addMusic: "Add Music",
    fitTimeline: "Fit Timeline",
    addFiles: "Add files",
    continueInOtherTools: "Continue in Other Tools",
    exportResult: "Export Result",
    noPreview: "Füge Inhalte zur Timeline hinzu.",
    ready: "Bereit",
    activeClip: "Aktiver Clip",
    activeMedia: "Aktive Medien",
    currentTime: "Zeit",
    tabs: {
      general: "General",
      audio: "Audio",
      trim: "Trim",
      crop: "Crop",
      text: "Text",
      filters: "Filters",
      pip: "PiP",
      stickers: "Stickers",
      export: "Export",
    } as Record<EditorTab, string>,
    keepOriginalAudio: "Keep original audio",
    balanceAddedAudio: "Adjust added soundtrack to original audio",
    volume: "Volume",
    fadeIn: "Fade-in",
    fadeOut: "Fade-out",
    trimStart: "Trim Start",
    trimEnd: "Trim Ende",
    cropMode: "Crop mode",
    overlayText: "Overlay text",
    textSize: "Text size",
    filterPreset: "Filter preset",
    pipEnabled: "PiP enabled",
    resetSettings: "Reset settings",
    moveLeft: "Links",
    moveRight: "Rechts",
    duplicate: "Duplizieren",
    removeClip: "Entfernen",
    addToTimeline: "Zur Timeline",
    usePreview: "Preview",
    exportFilename: "Dateiname",
    exportSaveTo: "Speichern unter",
    exportFormat: "Format",
    exportResolution: "Auflösung",
    exportFps: "FPS",
    exportQuality: "Qualität",
    messages: {
      mediaAdded: "Medien zur Library hinzugefügt.",
      clipAdded: "Clip zur Timeline hinzugefügt.",
      clipRemoved: "Clip entfernt.",
      editorCleared: "Editor geleert.",
      exportReady: "Export-Layout ist bereit. Echtes Rendering folgt als Nächstes.",
      prefillLoaded: "Gesendeter Inhalt wurde zur Library hinzugefügt.",
      presetApplied: "Preset wurde auf den ausgewählten Clip angewendet.",
      selectVisualClip: "Wähle zuerst einen visuellen Clip in der Timeline.",
      exportCreated: "Export-Projektdatei ist bereit.",
    },
  },
  ku: {
    title: "Editor",
    subtitle: "Herikîna profesyonel a timeline",
    goBack: "Go Back",
    premium: "Premium",
    video: "Video",
    audio: "Audio",
    mediaLibrary: "Media Library",
    motionPresets: "Motion Presets",
    noLibrary: "Hêj medya tune.",
    noHistory: "Di history de naverok tune.",
    uploadVideo: "Vîdyo bar bike",
    uploadImage: "Wêne bar bike",
    uploadAudio: "Deng bar bike",
    importSelected: "Hilbijartî zêde bike",
    delete: "Delete",
    addMusic: "Add Music",
    fitTimeline: "Fit Timeline",
    addFiles: "Add files",
    continueInOtherTools: "Continue in Other Tools",
    exportResult: "Export Result",
    noPreview: "Ji bo pêşdîtinê li timeline tişt zêde bike.",
    ready: "Amade",
    activeClip: "Clîpa çalak",
    activeMedia: "Medyaya çalak",
    currentTime: "Dem",
    tabs: {
      general: "General",
      audio: "Audio",
      trim: "Trim",
      crop: "Crop",
      text: "Text",
      filters: "Filters",
      pip: "PiP",
      stickers: "Stickers",
      export: "Export",
    } as Record<EditorTab, string>,
    keepOriginalAudio: "Keep original audio",
    balanceAddedAudio: "Adjust added soundtrack to original audio",
    volume: "Volume",
    fadeIn: "Fade-in",
    fadeOut: "Fade-out",
    trimStart: "Destpêk",
    trimEnd: "Dawî",
    cropMode: "Crop mode",
    overlayText: "Overlay text",
    textSize: "Text size",
    filterPreset: "Filter preset",
    pipEnabled: "PiP enabled",
    resetSettings: "Reset settings",
    moveLeft: "Çep",
    moveRight: "Rast",
    duplicate: "Dubare bike",
    removeClip: "Rake",
    addToTimeline: "Li timeline zêde bike",
    usePreview: "Preview",
    exportFilename: "Navê pelê",
    exportSaveTo: "Cihê tomarkirinê",
    exportFormat: "Format",
    exportResolution: "Resolution",
    exportFps: "FPS",
    exportQuality: "Quality",
    messages: {
      mediaAdded: "Medya hate zêdekirin.",
      clipAdded: "Clîp hate zêdekirin.",
      clipRemoved: "Clîp hate rakirin.",
      editorCleared: "Editor hate paqijkirin.",
      exportReady: "Rêza export amade ye. Render paşê tê girêdan.",
      prefillLoaded: "Naveroka editor hate zêdekirin.",
      presetApplied: "Preset li ser clîpa hilbijartî hate sepandin.",
      selectVisualClip: "Pêşî clîpekî dîtbar di timeline de hilbijêre.",
      exportCreated: "Pelê projeya export amade ye.",
    },
  },
} as const;

function getSafeLanguage(language?: string): AppLanguage {
  if (language === "tr" || language === "en" || language === "de" || language === "ku") {
    return language;
  }
  return "tr";
}

function EditorPageContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const isMobile = useIsMobile(980);

  const safeLanguage = getSafeLanguage(language);
  const t = TEXTS[safeLanguage];

  const [tool, setTool] = useState<AppTool>("video");
  const [notice, setNotice] = useState("");
  const [library, setLibrary] = useState<UploadedMediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] =
    useState<MotionPresetId>("gradient");

  const [timeline, setTimeline] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [cursorTime, setCursorTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);

  const keepOriginalAudio = true;
  const balanceAddedAudio = true;

  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [trimDrag, setTrimDrag] = useState<TrimDragState | null>(null);

  const exportFilename = "my_project_01";
  const saveTo = "/Downloads";
  const exportFormat = "mp4";
  const exportResolution = "1920x1080";
  const exportFps = "30";
  const exportQuality = "high";

  const visualInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const visibleLibrary = useMemo(
    () =>
      library.filter((item) =>
        tool === "audio" ? item.type === "audio" : item.type !== "audio"
      ),
    [library, tool]
  );

  const projectDuration = useMemo(() => getProjectDuration(timeline), [timeline]);

  const activeVisualClip = useMemo(
    () => getActiveVisualClip(timeline, cursorTime),
    [timeline, cursorTime]
  );

  const activeAudioClip = useMemo(
    () => getActiveAudioClip(timeline, cursorTime),
    [timeline, cursorTime]
  );

  const secondsWidth = 110 * timelineZoom;

  const readPrefill = useCallback(() => {
    try {
      const raw = localStorage.getItem(EDITOR_PREFILL_KEY);
      const parsed = raw ? (JSON.parse(raw) as EditorPrefill) : null;
      const media = prefillToMedia(parsed);

      if (!media) return;

      setLibrary((prev) => {
        const exists = prev.some(
          (item) =>
            item.url === media.url &&
            item.type === media.type &&
            item.title === media.title
        );
        if (exists) return prev;
        return [media, ...prev];
      });

      setActiveMediaId((prev) => prev || media.id);
      setNotice(t.messages.prefillLoaded);
    } catch {
      // ignore
    }
  }, [t.messages.prefillLoaded]);

  useEffect(() => {
    const timeout = window.setTimeout(readPrefill, 0);
    return () => window.clearTimeout(timeout);
  }, [readPrefill]);

  useEffect(() => {
    if (!isPlaying) return;

    const duration = Math.max(projectDuration, 0);
    if (duration <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCursorTime((prev) => {
        const next = prev + 0.1;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isPlaying, projectDuration]);

  useEffect(() => {
    const video = previewVideoRef.current;
    if (!video || !activeVisualClip || activeVisualClip.type !== "video") return;

    const clipTime = Math.max(
      activeVisualClip.trimStart,
      cursorTime - activeVisualClip.startTime + activeVisualClip.trimStart
    );

    if (Math.abs(video.currentTime - clipTime) > 0.35) {
      try {
        video.currentTime = clipTime;
      } catch {
        // Media metadata may not be ready yet.
      }
    }

    video.volume = Math.min(1, Math.max(0, activeVisualClip.volume / 100));
    video.muted = !keepOriginalAudio;

    if (isPlaying) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [activeVisualClip, cursorTime, isPlaying, keepOriginalAudio]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio || !activeAudioClip) return;

    const clipTime = Math.max(
      activeAudioClip.trimStart,
      cursorTime - activeAudioClip.startTime + activeAudioClip.trimStart
    );

    if (Math.abs(audio.currentTime - clipTime) > 0.35) {
      try {
        audio.currentTime = clipTime;
      } catch {
        // Media metadata may not be ready yet.
      }
    }

    const mixLevel = balanceAddedAudio && keepOriginalAudio ? 0.64 : 1;
    audio.volume = Math.min(1, Math.max(0, (activeAudioClip.volume / 100) * mixLevel));

    if (isPlaying) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [activeAudioClip, balanceAddedAudio, cursorTime, isPlaying, keepOriginalAudio]);

  useEffect(() => {
    if (!trimDrag) return;

    function handlePointerMove(event: PointerEvent) {
      const deltaSeconds = (event.clientX - trimDrag.startX) / secondsWidth;

      setTimeline((prev) =>
        prev.map((clip) => {
          if (clip.id !== trimDrag.clipId) return clip;

          if (trimDrag.edge === "end") {
            const nextTrimEnd = clampNumber(
              trimDrag.originalTrimEnd + deltaSeconds,
              trimDrag.originalTrimStart + MIN_CLIP_DURATION,
              trimDrag.sourceDuration
            );
            const nextDuration = nextTrimEnd - trimDrag.originalTrimStart;

            return {
              ...clip,
              trimEnd: roundTime(nextTrimEnd),
              duration: roundTime(nextDuration),
            };
          }

          const nextTrimStart = clampNumber(
            trimDrag.originalTrimStart + deltaSeconds,
            0,
            trimDrag.originalTrimEnd - MIN_CLIP_DURATION
          );
          const startShift = nextTrimStart - trimDrag.originalTrimStart;

          return {
            ...clip,
            startTime: roundTime(Math.max(0, trimDrag.originalStartTime + startShift)),
            trimStart: roundTime(nextTrimStart),
            duration: roundTime(trimDrag.originalTrimEnd - nextTrimStart),
          };
        })
      );
    }

    function handlePointerUp() {
      setTrimDrag(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [secondsWidth, trimDrag]);

  function addMediaItemsToLibrary(items: UploadedMediaItem[]) {
    if (items.length === 0) return;
    setLibrary((prev) => [...items, ...prev]);
    setActiveMediaId(items[0].id);
    if (items[0].type === "audio") {
      setTool("audio");
    }
    setNotice(t.messages.mediaAdded);
  }

  function createClipsForTimeline(
    items: UploadedMediaItem[],
    existingTimeline = timeline
  ) {
    let visualStart = getTrackDurationByKind(existingTimeline, "visual");
    let audioStart = getTrackDurationByKind(existingTimeline, "audio");

    return items.map((item) => {
      const startTime = item.type === "audio" ? audioStart : visualStart;
      const clip = createDefaultClip(item, startTime);

      if (clip.track === "audio") {
        audioStart += clip.duration;
      } else {
        visualStart += clip.duration;
      }

      return clip;
    });
  }

  function addItemsToTimeline(items: UploadedMediaItem[]) {
    if (items.length === 0) return;

    const clips = createClipsForTimeline(items);
    const lastClip = clips[clips.length - 1];

    setTimeline((prev) => [...prev, ...clips]);
    setSelectedClipId(lastClip.id);
    setActiveMediaId(lastClip.mediaId);
    setCursorTime(lastClip.startTime);
    if (lastClip.track === "audio") {
      setTool("audio");
    }
    setNotice(t.messages.clipAdded);
  }

  async function handleLocalUpload(
    e: ChangeEvent<HTMLInputElement>,
    type?: MediaType,
    addToTimeline = false
  ) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const items = await Promise.all(
      files.map((file) => createUploadedMediaItem(file, type))
    );

    addMediaItemsToLibrary(items);
    if (addToTimeline) addItemsToTimeline(items);
    e.target.value = "";
  }

  function handleAddToTimeline(item: UploadedMediaItem) {
    const startTime =
      item.type === "audio"
        ? getTrackDurationByKind(timeline, "audio")
        : getTrackDurationByKind(timeline, "visual");
    const clip = createDefaultClip(item, startTime);

    setTimeline((prev) => [...prev, clip]);
    setSelectedClipId(clip.id);
    setActiveMediaId(item.id);
    setCursorTime(clip.startTime);
    setNotice(t.messages.clipAdded);
  }

  function handleRemoveClip() {
    if (!selectedClipId) return;
    setTimeline((prev) => prev.filter((clip) => clip.id !== selectedClipId));
    setSelectedClipId(null);
    setNotice(t.messages.clipRemoved);
  }

  function handleDuplicateClip(clipId = selectedClipId) {
    const clipToCopy = timeline.find((clip) => clip.id === clipId);
    if (!clipToCopy) return;

    const copy = {
      ...clipToCopy,
      id: `clipcopy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      startTime: clipToCopy.startTime + clipToCopy.duration,
    };

    setTimeline((prev) => [...prev, copy]);
    setSelectedClipId(copy.id);
    setActiveMediaId(copy.mediaId);
    setCursorTime(copy.startTime);
  }

  function handleMoveClip(direction: "left" | "right", clipId = selectedClipId) {
    if (!clipId) return;

    setTimeline((prev) => {
      const target = prev.find((clip) => clip.id === clipId);
      if (!target) return prev;

      const sameTrack = prev
        .filter((clip) => clip.track === target.track)
        .sort((a, b) => a.startTime - b.startTime);
      const otherTrack = prev.filter((clip) => clip.track !== target.track);
      const idx = sameTrack.findIndex((clip) => clip.id === clipId);
      if (idx === -1) return prev;

      const swapIdx = direction === "left" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sameTrack.length) return prev;

      [sameTrack[idx], sameTrack[swapIdx]] = [sameTrack[swapIdx], sameTrack[idx]];
      return [...otherTrack, ...normalizeTimelineOrder(sameTrack)];
    });
  }

  function selectTimelineClip(clip: TimelineClip) {
    setSelectedClipId(clip.id);
    setActiveMediaId(clip.mediaId);
    setCursorTime(clip.startTime);
  }

  function handleTrimPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    clip: TimelineClip,
    edge: TrimEdge
  ) {
    event.preventDefault();
    event.stopPropagation();
    selectTimelineClip(clip);
    setIsPlaying(false);
    setTrimDrag({
      clipId: clip.id,
      edge,
      startX: event.clientX,
      originalStartTime: clip.startTime,
      originalDuration: clip.duration,
      originalTrimStart: clip.trimStart,
      originalTrimEnd: clip.trimEnd,
      sourceDuration: getClipSourceDuration(clip),
    });
  }

  function changeClipScale(clipId: string, delta: number) {
    setTimeline((prev) =>
      prev.map((clip) =>
        clip.id === clipId && clip.track === "visual"
          ? { ...clip, scale: clampNumber(clip.scale + delta, 20, 200) }
          : clip
      )
    );
    setSelectedClipId(clipId);
  }

  function applyMotionPreset(preset: MotionPreset) {
    const targetClip =
      (selectedClipId
        ? timeline.find((clip) => clip.id === selectedClipId && clip.track === "visual")
        : null) ||
      activeVisualClip ||
      timeline.find((clip) => clip.track === "visual") ||
      null;

    if (!targetClip) {
      setNotice(t.messages.selectVisualClip);
      return;
    }

    setSelectedPresetId(preset.id);
    setSelectedClipId(targetClip.id);
    setActiveMediaId(targetClip.mediaId);
    setTimeline((prev) =>
      prev.map((clip) =>
        clip.id === targetClip.id
          ? {
              ...clip,
              cropMode: preset.cropMode,
              filterPreset: preset.filterPreset,
              x: preset.x,
              y: preset.y,
              scale: preset.scale,
            }
          : clip
      )
    );
    setNotice(`${preset.label}: ${t.messages.presetApplied}`);
  }

  function handleAddFilesClick() {
    visualInputRef.current?.click();
  }

  function handleExportDownload(url: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = getExportDownloadName(exportFilename);
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function reorderVisualTimeline(dragId: string, targetIndex: number) {
    setTimeline((prev) => {
      const visuals = prev
        .filter((clip) => clip.track === "visual")
        .sort((a, b) => a.startTime - b.startTime);

      const audios = prev
        .filter((clip) => clip.track === "audio")
        .sort((a, b) => a.startTime - b.startTime);

      const fromIndex = visuals.findIndex((clip) => clip.id === dragId);
      if (fromIndex === -1) return prev;

      const nextVisuals = [...visuals];
      const [moved] = nextVisuals.splice(fromIndex, 1);
      nextVisuals.splice(Math.min(targetIndex, nextVisuals.length), 0, moved);

      const normalizedVisuals = normalizeTimelineOrder(nextVisuals);
      return [...normalizedVisuals, ...audios];
    });
  }

  function reorderAudioTimeline(dragId: string, targetIndex: number) {
    setTimeline((prev) => {
      const visuals = prev
        .filter((clip) => clip.track === "visual")
        .sort((a, b) => a.startTime - b.startTime);

      const audios = prev
        .filter((clip) => clip.track === "audio")
        .sort((a, b) => a.startTime - b.startTime);

      const fromIndex = audios.findIndex((clip) => clip.id === dragId);
      if (fromIndex === -1) return prev;

      const nextAudios = [...audios];
      const [moved] = nextAudios.splice(fromIndex, 1);
      nextAudios.splice(Math.min(targetIndex, nextAudios.length), 0, moved);

      const normalizedVisuals = normalizeTimelineOrder(visuals);
      const normalizedAudios = normalizeTimelineOrder(nextAudios);

      return [...normalizedVisuals, ...normalizedAudios];
    });
  }

  function handleDragStart(clipId: string) {
    setDraggingClipId(clipId);
  }

  function handleDragEnd() {
    setDraggingClipId(null);
    setDragOverIndex(null);
  }

  function handleFitTimeline() {
    setTimelineZoom(1);
  }

  async function handleExport() {
    const [width = 1920, height = 1080] = exportResolution
      .split("x")
      .map((value) => Number(value));

    const payload: ExportPayload & {
      format: string;
      quality: string;
      saveTo: string;
      projectDuration: number;
      createdAt: string;
      audio: {
        keepOriginalAudio: boolean;
        balanceAddedAudio: boolean;
      };
    } = {
      filename: exportFilename,
      width,
      height,
      fps: Number(exportFps),
      timeline,
      format: exportFormat,
      quality: exportQuality,
      saveTo,
      projectDuration,
      createdAt: new Date().toISOString(),
      audio: {
        keepOriginalAudio,
        balanceAddedAudio,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    handleExportDownload(URL.createObjectURL(blob));
    setNotice(t.messages.exportCreated);
  }

  function renderVisualPreview() {
    if (!activeVisualClip) {
      return (
        <div style={styles.previewEmpty}>
          <div style={styles.previewEmptyText}>{t.noPreview}</div>
        </div>
      );
    }

    const transformStyle: CSSProperties = {
      transform: `translate(${activeVisualClip.x - 50}%, ${activeVisualClip.y - 50}%) scale(${activeVisualClip.scale / 100})`,
      filter: getFilterStyle(activeVisualClip.filterPreset),
    };

    return (
      <div style={styles.visualPreviewWrap}>
        {activeVisualClip.type === "video" ? (
          <video
            ref={previewVideoRef}
            src={activeVisualClip.sourceUrl}
            playsInline
            poster={activeVisualClip.thumbnailUrl}
            muted={!keepOriginalAudio}
            onEnded={() => setIsPlaying(false)}
            style={{ ...styles.previewVideo, ...transformStyle }}
          />
        ) : (
          <img
            src={activeVisualClip.sourceUrl}
            alt={activeVisualClip.title}
            style={{ ...styles.previewImage, ...transformStyle }}
          />
        )}

        {activeVisualClip.textOverlay ? (
          <div
            style={{
              ...styles.overlayText,
              fontSize: activeVisualClip.textSize,
            }}
          >
            {activeVisualClip.textOverlay}
          </div>
        ) : null}

        {activeAudioClip ? (
          <>
            <audio
              ref={previewAudioRef}
              src={activeAudioClip.sourceUrl}
              preload="auto"
            />
            <div style={styles.audioBadge}>♫ {activeAudioClip.title}</div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <AppShell
      currentPath="/editor"
      pageTitle={t.title}
      pageDescription={t.subtitle}
    >
      <div style={styles.page}>
        <div style={{ ...styles.editorSurface, ...(isMobile ? styles.editorSurfaceMobile : null) }}>
          <div style={styles.topBar}>
            <button
              type="button"
              onClick={() => router.push("/history")}
              style={styles.backButton}
            >
              ← {t.goBack}
            </button>

            <div style={styles.topBarRight}>
              <button type="button" style={styles.premiumButton}>
                {t.premium}
              </button>
              <div style={styles.avatarCircle}>◯</div>
            </div>
          </div>

          <div style={{ ...styles.mainLayout, ...(isMobile ? styles.mainLayoutMobile : null) }}>
            <aside style={{ ...styles.toolRail, ...(isMobile ? styles.toolRailMobile : null) }}>
              <button
                type="button"
                onClick={() => setTool("video")}
                style={{
                  ...styles.railButton,
                  ...(isMobile ? styles.railButtonMobile : null),
                  ...(tool === "video" ? styles.railButtonActive : null),
                }}
              >
                <span style={styles.railIcon}>▣</span>
                <span>{t.video}</span>
              </button>

              <button
                type="button"
                onClick={() => setTool("audio")}
                style={{
                  ...styles.railButton,
                  ...(isMobile ? styles.railButtonMobile : null),
                  ...(tool === "audio" ? styles.railButtonActive : null),
                }}
              >
                <span style={styles.railIcon}>♪</span>
                <span>{t.audio}</span>
              </button>
            </aside>

            <section style={{ ...styles.assetPanel, ...(isMobile ? styles.assetPanelMobile : null) }}>
              <div style={styles.assetHeader}>
                <div style={styles.assetTitle}>
                  {tool === "video" ? t.motionPresets : t.mediaLibrary}
                </div>
              </div>

              {tool === "video" ? (
                <div style={styles.presetGrid}>
                  {MOTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyMotionPreset(preset)}
                      style={{
                        ...styles.presetCard,
                        ...(selectedPresetId === preset.id ? styles.presetCardActive : null),
                      }}
                    >
                      <span
                        style={{
                          ...styles.presetThumb,
                          background: preset.background,
                        }}
                      >
                        <span
                          style={{
                            ...styles.presetShine,
                            borderColor: preset.accent,
                          }}
                        />
                      </span>
                      <span style={styles.presetTitle}>{preset.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              <div style={styles.assetButtons}>
                <button
                  type="button"
                  style={styles.assetAction}
                  onClick={() => videoInputRef.current?.click()}
                >
                  {t.uploadVideo}
                </button>
                <button
                  type="button"
                  style={styles.assetAction}
                  onClick={() => imageInputRef.current?.click()}
                >
                  {t.uploadImage}
                </button>
                <button
                  type="button"
                  style={styles.assetAction}
                  onClick={() => audioInputRef.current?.click()}
                >
                  {t.uploadAudio}
                </button>

                <input
                  ref={visualInputRef}
                  type="file"
                  accept="video/*,image/*"
                  multiple
                  onChange={(e) => handleLocalUpload(e, undefined, true)}
                  style={{ display: "none" }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleLocalUpload(e, "video")}
                  style={{ display: "none" }}
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLocalUpload(e, "image")}
                  style={{ display: "none" }}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleLocalUpload(e, "audio")}
                  style={{ display: "none" }}
                />
                <input
                  ref={musicInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleLocalUpload(e, "audio", true)}
                  style={{ display: "none" }}
                />
              </div>

              <div style={styles.assetScroller}>
                {visibleLibrary.length === 0 ? (
                  <div style={styles.emptyBlock}>{t.noLibrary}</div>
                ) : (
                  <div style={styles.assetGrid}>
                    {visibleLibrary.map((item) => {
                      const selected = activeMediaId === item.id;
                      return (
                        <div
                          key={item.id}
                          style={{
                            ...styles.assetCard,
                            ...(selected ? styles.assetCardActive : null),
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveMediaId(item.id)}
                            style={styles.assetCardButton}
                          >
                            <div style={styles.assetThumb}>
                              {item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.title}
                                  style={styles.assetThumbImg}
                                />
                              ) : item.type === "image" ? (
                                <img
                                  src={item.url}
                                  alt={item.title}
                                  style={styles.assetThumbImg}
                                />
                              ) : (
                                <div style={styles.assetThumbFallback}>
                                  {item.type === "audio" ? "♫" : "▶"}
                                </div>
                              )}
                            </div>
                            <div style={styles.assetCardTitle}>{item.title}</div>
                          </button>

                          <div style={styles.assetCardActions}>
                            <button
                              type="button"
                              onClick={() => setActiveMediaId(item.id)}
                              style={styles.smallGhostButton}
                            >
                              {t.usePreview}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToTimeline(item)}
                              style={styles.smallPrimaryButton}
                            >
                              {t.addToTimeline}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </section>

            <section style={{ ...styles.previewColumn, ...(isMobile ? styles.previewColumnMobile : null) }}>
              <div style={styles.previewCanvasWrap}>{renderVisualPreview()}</div>

              <div style={styles.previewControlBar}>
                <div style={styles.previewControlLeft}>
                  <button
                    type="button"
                    onClick={() => {
                      setCursorTime((prev) => Math.max(0, prev - 1));
                      setIsPlaying(false);
                    }}
                    style={styles.iconControl}
                  >
                    ⏮
                  </button>

                  <button
                    type="button"
                    onClick={() => (isPlaying ? setIsPlaying(false) : setIsPlaying(true))}
                    style={styles.iconControl}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCursorTime((prev) => Math.min(projectDuration, prev + 1));
                      setIsPlaying(false);
                    }}
                    style={styles.iconControl}
                  >
                    ⏭
                  </button>
                </div>

                <div style={styles.previewSliderWrap}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(projectDuration, 1)}
                    step={0.1}
                    value={cursorTime}
                    onChange={(e) => {
                      setCursorTime(Number(e.target.value));
                      setIsPlaying(false);
                    }}
                    style={styles.previewSlider}
                  />
                </div>

                <div style={styles.previewTimeText}>
                  {formatClock(cursorTime)}
                </div>
              </div>

              <div style={styles.previewActionRow}>
                <button
                  type="button"
                  style={styles.exportButton}
                  onClick={handleExport}
                >
                  {t.exportResult}
                </button>
              </div>
            </section>
          </div>

          <div style={styles.timelineShell}>
            <div style={styles.timelineTopActions}>
              <button
                type="button"
                onClick={handleRemoveClip}
                style={styles.timelineDeleteButton}
              >
                🗑 {t.delete}
              </button>

              <button
                type="button"
                onClick={() => musicInputRef.current?.click()}
                style={styles.timelineAddMusicButton}
              >
                ♪ {t.addMusic}
              </button>

              <div style={styles.timelineTopRight}>
                <button
                  type="button"
                  onClick={() =>
                    setTimelineZoom((prev) =>
                      Math.max(0.6, Number((prev - 0.1).toFixed(2)))
                    )
                  }
                  style={styles.timelineZoomButton}
                >
                  −
                </button>

                <button
                  type="button"
                  onClick={handleFitTimeline}
                  style={styles.timelineFitButton}
                >
                  {t.fitTimeline}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTimelineZoom((prev) =>
                      Math.min(2, Number((prev + 0.1).toFixed(2)))
                    )
                  }
                  style={styles.timelineZoomButton}
                >
                  +
                </button>
              </div>
            </div>

            <div style={styles.timelineRulerWrap}>
              <div
                style={{
                  ...styles.timelineRuler,
                  width: Math.max(
                    860,
                    Math.max(projectDuration, 5) * secondsWidth + 140
                  ),
                }}
              >
                {Array.from({
                  length: Math.max(6, Math.ceil(Math.max(projectDuration, 5)) + 1),
                }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      ...styles.rulerTick,
                      left: idx * secondsWidth,
                    }}
                  >
                    <span style={styles.rulerLabel}>{formatClock(idx)}</span>
                  </div>
                ))}

                <div
                  style={{
                    ...styles.playhead,
                    left: `${cursorTime * secondsWidth}px`,
                  }}
                />
              </div>
            </div>

            <div style={styles.timelineTrackArea}>
              <div
                style={{
                  ...styles.timelineTrackRow,
                  width: Math.max(
                    860,
                    Math.max(projectDuration, 5) * secondsWidth + 140
                  ),
                }}
              >
                {timeline
                  .filter((clip) => clip.track === "visual")
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((clip, index) => (
                    <div
                      key={clip.id}
                      draggable={!trimDrag}
                      onDragStart={() => handleDragStart(clip.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingClipId) {
                          reorderVisualTimeline(draggingClipId, index);
                        }
                        handleDragEnd();
                      }}
                      style={{
                        ...styles.timelineClip,
                        ...(selectedClipId === clip.id
                          ? styles.timelineClipActive
                          : null),
                        ...(draggingClipId === clip.id
                          ? styles.timelineClipDragging
                          : null),
                        ...(dragOverIndex === index
                          ? styles.timelineClipDropTarget
                          : null),
                        left: `${clip.startTime * secondsWidth}px`,
                        width: `${Math.max(56, clip.duration * secondsWidth)}px`,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Trim start"
                        onPointerDown={(e) => handleTrimPointerDown(e, clip, "start")}
                        style={{ ...styles.trimHandle, ...styles.trimHandleStart }}
                      />
                      <button
                        type="button"
                        aria-label="Trim end"
                        onPointerDown={(e) => handleTrimPointerDown(e, clip, "end")}
                        style={{ ...styles.trimHandle, ...styles.trimHandleEnd }}
                      />

                      <button
                        type="button"
                        onClick={() => selectTimelineClip(clip)}
                        style={styles.timelineClipButton}
                      >
                        <div style={styles.timelineClipThumb}>
                          {clip.thumbnailUrl ? (
                            <img
                              src={clip.thumbnailUrl}
                              alt={clip.title}
                              style={styles.timelineClipThumbImg}
                            />
                          ) : clip.type === "image" ? (
                            <img
                              src={clip.sourceUrl}
                              alt={clip.title}
                              style={styles.timelineClipThumbImg}
                            />
                          ) : (
                            <div style={styles.timelineClipThumbFallback}>▶</div>
                          )}
                        </div>

                        <div style={styles.timelineClipMeta}>
                          <div style={styles.timelineClipTitle}>{clip.title}</div>
                          <div style={styles.timelineClipSub}>
                            {formatClock(clip.trimStart)}-{formatClock(clip.trimEnd)} • {clip.scale}%
                          </div>
                        </div>
                      </button>

                      {selectedClipId === clip.id ? (
                        <div
                          style={styles.timelineScaleBar}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => changeClipScale(clip.id, -5)}
                            style={styles.scaleMiniBtn}
                          >
                            −
                          </button>
                          <span style={styles.scaleValue}>{clip.scale}%</span>
                          <button
                            type="button"
                            onClick={() => changeClipScale(clip.id, 5)}
                            style={styles.scaleMiniBtn}
                          >
                            +
                          </button>
                        </div>
                      ) : null}

                      <div style={styles.timelineClipActionBar}>
                        <button
                          type="button"
                          onClick={() => handleMoveClip("left", clip.id)}
                          style={styles.clipMiniBtn}
                        >
                          {t.moveLeft}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveClip("right", clip.id)}
                          style={styles.clipMiniBtn}
                        >
                          {t.moveRight}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateClip(clip.id)}
                          style={styles.clipMiniBtn}
                        >
                          {t.duplicate}
                        </button>
                      </div>
                    </div>
                  ))}

                <button
                  type="button"
                  onClick={handleAddFilesClick}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggingClipId) return;

                    const visuals = timeline
                      .filter((clip) => clip.track === "visual")
                      .sort((a, b) => a.startTime - b.startTime);

                    reorderVisualTimeline(draggingClipId, visuals.length);
                    handleDragEnd();
                  }}
                  style={{
                    ...styles.addFilesSlot,
                    left: `${Math.max(projectDuration, 5) * secondsWidth + 10}px`,
                  }}
                >
                  + {t.addFiles}
                </button>
              </div>

              <div
                style={{
                  ...styles.timelineAudioRow,
                  width: Math.max(
                    860,
                    Math.max(projectDuration, 5) * secondsWidth + 140
                  ),
                }}
              >
                {timeline
                  .filter((clip) => clip.track === "audio")
                  .sort((a, b) => a.startTime - b.startTime)
                  .map((clip, index) => (
                    <div
                      key={clip.id}
                      draggable={!trimDrag}
                      onDragStart={() => handleDragStart(clip.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingClipId) {
                          reorderAudioTimeline(draggingClipId, index);
                        }
                        handleDragEnd();
                      }}
                      style={{
                        ...styles.timelineAudioClip,
                        ...(selectedClipId === clip.id
                          ? styles.timelineClipActive
                          : null),
                        ...(draggingClipId === clip.id
                          ? styles.timelineClipDragging
                          : null),
                        ...(dragOverIndex === index
                          ? styles.timelineClipDropTarget
                          : null),
                        left: `${clip.startTime * secondsWidth}px`,
                        width: `${Math.max(64, clip.duration * secondsWidth)}px`,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Trim start"
                        onPointerDown={(e) => handleTrimPointerDown(e, clip, "start")}
                        style={{ ...styles.trimHandle, ...styles.trimHandleStart }}
                      />
                      <button
                        type="button"
                        aria-label="Trim end"
                        onPointerDown={(e) => handleTrimPointerDown(e, clip, "end")}
                        style={{ ...styles.trimHandle, ...styles.trimHandleEnd }}
                      />

                      <button
                        type="button"
                        onClick={() => selectTimelineClip(clip)}
                        style={styles.timelineClipButton}
                      >
                        <div style={styles.timelineClipThumbAudio}>♫</div>

                        <div style={styles.timelineClipMeta}>
                          <div style={styles.timelineClipTitle}>{clip.title}</div>
                          <div style={styles.timelineClipSub}>
                            {formatClock(clip.trimStart)}-{formatClock(clip.trimEnd)} • {clip.volume}%
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
              </div>

              <div
                style={{
                  ...styles.playheadLine,
                  left: `${cursorTime * secondsWidth}px`,
                }}
              />
            </div>
          </div>
        </div>

        {notice ? <div style={styles.noticeBox}>{notice}</div> : null}
      </div>
    </AppShell>
  );
}

function EditorPageFallback() {
  return null;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<EditorPageFallback />}>
      <EditorPageContent />
    </Suspense>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "calc(100dvh - 145px)",
  },

  editorSurface: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    background: "linear-gradient(180deg, #1b2031 0%, #151a2a 100%)",
    boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
  },

  editorSurfaceMobile: {
    borderRadius: 8,
  },

  topBar: {
    minHeight: 58,
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
    gap: 12,
    flexWrap: "wrap",
  },

  backButton: {
    appearance: "none",
    border: 0,
    background: "transparent",
    color: "#dbe7ff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    padding: 0,
  },

  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  premiumButton: {
    appearance: "none",
    minHeight: 34,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid #1ea0ff",
    background: "transparent",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "2px solid rgba(255,255,255,0.8)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  },

  mainLayout: {
    display: "grid",
    gridTemplateColumns: "72px 260px minmax(0, 1fr)",
    minHeight: 420,
  },

  mainLayoutMobile: {
    gridTemplateColumns: "1fr",
    minHeight: 0,
  },

  toolRail: {
    background: "rgba(7,10,19,0.26)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    padding: "16px 10px",
  },

  toolRailMobile: {
    borderRight: 0,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    padding: 10,
    overflowX: "auto",
  },

  railButton: {
    width: "100%",
    appearance: "none",
    border: 0,
    background: "transparent",
    color: "rgba(255,255,255,0.82)",
    borderRadius: 16,
    padding: "12px 6px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    fontWeight: 600,
  },

  railButtonMobile: {
    width: "auto",
    minWidth: 96,
    flexDirection: "row",
    justifyContent: "center",
    padding: "10px 12px",
  },

  railButtonActive: {
    background: "rgba(255,255,255,0.06)",
    boxShadow: "inset 0 0 0 1px rgba(30,160,255,0.18)",
  },

  railIcon: {
    fontSize: 24,
    lineHeight: 1,
  },

  assetPanel: {
    background: "rgba(255,255,255,0.03)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    padding: 14,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: 12,
  },

  assetPanelMobile: {
    borderRight: 0,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  assetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  assetTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
  },

  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  presetCard: {
    appearance: "none",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: "#dbe7ff",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 0,
    cursor: "pointer",
    textAlign: "center",
    minWidth: 0,
  },

  presetCardActive: {
    color: "#35b6ff",
  },

  presetThumb: {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.08)",
    overflow: "hidden",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "inset 0 0 24px rgba(0,0,0,0.28)",
  },

  presetShine: {
    position: "absolute",
    inset: 0,
    border: "2px solid",
    borderRadius: 6,
    opacity: 0.76,
    boxShadow: "inset 0 0 28px rgba(255,255,255,0.12)",
  },

  presetTitle: {
    minHeight: 32,
    color: "inherit",
    fontSize: 13,
    lineHeight: 1.25,
    fontWeight: 700,
    overflowWrap: "anywhere",
  },

  assetButtons: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 8,
  },

  assetAction: {
    appearance: "none",
    minHeight: 38,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#e7eeff",
    fontSize: 12,
    fontWeight: 700,
    textAlign: "left",
    padding: "0 12px",
    cursor: "pointer",
  },

  assetScroller: {
    minHeight: 180,
    maxHeight: 290,
    overflowY: "auto",
    paddingRight: 2,
  },

  assetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  assetCard: {
    borderRadius: 8,
    overflow: "hidden",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  assetCardActive: {
    boxShadow: "0 0 0 2px rgba(30,160,255,0.35)",
  },

  assetCardButton: {
    width: "100%",
    appearance: "none",
    border: 0,
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    textAlign: "left",
  },

  assetThumb: {
    width: "100%",
    aspectRatio: "16 / 9",
    background: "#20263a",
    overflow: "hidden",
  },

  assetThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  assetThumbFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: 24,
  },

  assetCardTitle: {
    padding: "10px 10px 8px",
    fontSize: 12,
    lineHeight: 1.4,
    color: "#eef3ff",
    minHeight: 42,
  },

  assetCardActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    padding: "0 10px 10px",
  },

  smallGhostButton: {
    appearance: "none",
    minHeight: 32,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.03)",
    color: "#e6eeff",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  smallPrimaryButton: {
    appearance: "none",
    minHeight: 32,
    borderRadius: 8,
    border: 0,
    background: "linear-gradient(135deg, #0ea5ff 0%, #1d7cf2 100%)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  historyImportPanel: {
    marginTop: "auto",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  historyImportTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
  },

  historyImportList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxHeight: 140,
    overflowY: "auto",
  },

  historyRow: {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    background: "rgba(255,255,255,0.03)",
    padding: "10px 12px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  historyRowActive: {
    boxShadow: "0 0 0 2px rgba(30,160,255,0.25)",
    background: "rgba(30,160,255,0.10)",
  },

  historyRowType: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "capitalize",
    flexShrink: 0,
  },

  historyRowText: {
    color: "#dce6ff",
    fontSize: 12,
    lineHeight: 1.4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  importButton: {
    appearance: "none",
    minHeight: 36,
    borderRadius: 10,
    border: 0,
    background: "linear-gradient(135deg, #0ea5ff 0%, #1d7cf2 100%)",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  previewColumn: {
    display: "flex",
    flexDirection: "column",
    padding: 18,
    gap: 12,
    minWidth: 0,
  },

  previewColumnMobile: {
    padding: 12,
  },

  previewCanvasWrap: {
    minHeight: 250,
    borderRadius: 8,
    background: "#090c14",
    border: "1px solid rgba(255,255,255,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 18,
  },

  visualPreviewWrap: {
    width: "100%",
    minHeight: 250,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  previewVideo: {
    maxWidth: "100%",
    maxHeight: 290,
    borderRadius: 6,
    display: "block",
    background: "#000",
    transition: "all 120ms ease",
  },

  previewImage: {
    maxWidth: "100%",
    maxHeight: 290,
    borderRadius: 6,
    display: "block",
    objectFit: "contain",
    transition: "all 120ms ease",
  },

  overlayText: {
    position: "absolute",
    bottom: 20,
    left: "50%",
    transform: "translateX(-50%)",
    color: "#ffffff",
    fontWeight: 800,
    textShadow: "0 3px 14px rgba(0,0,0,0.5)",
    textAlign: "center",
    maxWidth: "88%",
    padding: "4px 10px",
    wordBreak: "break-word",
  },

  audioBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(0,0,0,0.45)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
  },

  previewEmpty: {
    width: "100%",
    minHeight: 250,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  previewEmptyText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 14,
    textAlign: "center",
  },

  previewControlBar: {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 14,
    alignItems: "center",
  },

  previewControlLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  iconControl: {
    appearance: "none",
    border: 0,
    background: "transparent",
    color: "#ffffff",
    fontSize: 18,
    cursor: "pointer",
    padding: 0,
  },

  previewSliderWrap: {
    display: "flex",
    alignItems: "center",
  },

  previewSlider: {
    width: "100%",
  },

  previewTimeText: {
    color: "#dbe7ff",
    fontSize: 13,
    minWidth: 42,
    textAlign: "right",
  },

  previewActionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    flexWrap: "wrap",
  },

  continueButton: {
    appearance: "none",
    minHeight: 40,
    padding: "0 20px",
    borderRadius: 999,
    border: "1px solid #1ea0ff",
    background: "transparent",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  exportButton: {
    appearance: "none",
    minHeight: 40,
    padding: "0 20px",
    borderRadius: 999,
    border: 0,
    background: "linear-gradient(135deg, #0ea5ff 0%, #1d7cf2 100%)",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  downloadLink: {
    minHeight: 38,
    borderRadius: 8,
    border: "1px solid rgba(30,160,255,0.42)",
    color: "#eaf6ff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
  },

  settingsTabsWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },

  settingsTabButton: {
    appearance: "none",
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#dbe7ff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  settingsTabButtonActive: {
    border: "1px solid rgba(30,160,255,0.42)",
    background: "rgba(30,160,255,0.12)",
    color: "#ffffff",
  },

  settingsContent: {
    marginTop: 12,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
  },

  settingsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
  },

  settingCard: {
    borderRadius: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 12,
  },

  settingLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.62)",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },

  settingValue: {
    marginTop: 8,
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 1.55,
    wordBreak: "break-word",
  },

  settingsStack: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#e7eeff",
    fontSize: 14,
    flexWrap: "wrap",
  },

  rangeBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  rangeLabel: {
    color: "#dbe7ff",
    fontSize: 13,
    fontWeight: 700,
  },

  inputLabel: {
    color: "#dbe7ff",
    fontSize: 13,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    height: 42,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#101522",
    color: "#ffffff",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },

  textarea: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "#101522",
    color: "#ffffff",
    padding: "12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    resize: "vertical",
  },

  emptyBlock: {
    borderRadius: 12,
    padding: 14,
    border: "1px dashed rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.02)",
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 1.6,
  },

  timelineShell: {
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.10) 100%)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: 14,
  },

  timelineTopActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },

  timelineDeleteButton: {
    appearance: "none",
    minHeight: 34,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  timelineAddMusicButton: {
    appearance: "none",
    minHeight: 34,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#cfdcff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  timelineTopRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  timelineZoomButton: {
    appearance: "none",
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#ffffff",
    fontSize: 18,
    cursor: "pointer",
  },

  timelineFitButton: {
    appearance: "none",
    minHeight: 34,
    padding: "0 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.03)",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  timelineRulerWrap: {
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 4,
  },

  timelineRuler: {
    position: "relative",
    height: 34,
  },

  rulerTick: {
    position: "absolute",
    top: 0,
    width: 1,
    height: "100%",
    background: "rgba(255,255,255,0.10)",
  },

  rulerLabel: {
    position: "absolute",
    top: 0,
    left: 6,
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
  },

  playhead: {
    position: "absolute",
    top: 0,
    width: 2,
    height: "100%",
    background: "#ff5b5b",
  },

  timelineTrackArea: {
    position: "relative",
    overflowX: "auto",
    overflowY: "hidden",
    paddingTop: 2,
  },

  timelineTrackRow: {
    position: "relative",
    minHeight: 78,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },

  timelineAudioRow: {
    position: "relative",
    minHeight: 58,
    marginTop: 8,
  },

  timelineClip: {
    position: "absolute",
    top: 10,
    height: 56,
    borderRadius: 10,
    background: "#5966c9",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
    overflow: "hidden",
    userSelect: "none",
  },

  timelineAudioClip: {
    position: "absolute",
    top: 6,
    height: 46,
    borderRadius: 10,
    background: "#4d67b5",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
    overflow: "hidden",
    userSelect: "none",
  },

  timelineClipActive: {
    boxShadow: "inset 0 0 0 2px #ffd84d",
  },

  timelineClipDragging: {
    opacity: 0.55,
    transform: "scale(0.98)",
  },

  timelineClipDropTarget: {
    boxShadow: "inset 0 0 0 2px #38bdf8",
  },

  timelineClipButton: {
    width: "100%",
    height: "100%",
    appearance: "none",
    border: 0,
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 16px",
    cursor: "pointer",
    textAlign: "left",
  },

  trimHandle: {
    position: "absolute",
    top: 0,
    width: 12,
    height: "100%",
    border: 0,
    padding: 0,
    background: "rgba(255,255,255,0.18)",
    cursor: "ew-resize",
    zIndex: 4,
  },

  trimHandleStart: {
    left: 0,
    borderRight: "1px solid rgba(255,255,255,0.35)",
  },

  trimHandleEnd: {
    right: 0,
    borderLeft: "1px solid rgba(255,255,255,0.35)",
  },

  timelineClipThumb: {
    width: 44,
    height: 32,
    borderRadius: 6,
    overflow: "hidden",
    background: "rgba(0,0,0,0.18)",
    flexShrink: 0,
  },

  timelineClipThumbAudio: {
    width: 32,
    height: 32,
    borderRadius: 999,
    background: "rgba(0,0,0,0.16)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    flexShrink: 0,
  },

  timelineClipThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  timelineClipThumbFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: 14,
  },

  timelineClipMeta: {
    minWidth: 0,
    flex: 1,
  },

  timelineClipTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  timelineClipSub: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  timelineClipActionBar: {
    position: "absolute",
    right: 8,
    bottom: -40,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },

  timelineScaleBar: {
    position: "absolute",
    right: 18,
    top: 5,
    zIndex: 5,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    minHeight: 24,
    padding: "0 4px",
    borderRadius: 8,
    background: "rgba(0,0,0,0.34)",
    border: "1px solid rgba(255,255,255,0.14)",
  },

  scaleMiniBtn: {
    appearance: "none",
    width: 22,
    height: 22,
    borderRadius: 6,
    border: 0,
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1,
    cursor: "pointer",
  },

  scaleValue: {
    minWidth: 38,
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 800,
    textAlign: "center",
  },

  clipMiniBtn: {
    appearance: "none",
    minHeight: 26,
    padding: "0 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: 700,
    cursor: "pointer",
  },

  addFilesSlot: {
    position: "absolute",
    top: 10,
    width: 130,
    height: 56,
    borderRadius: 10,
    border: "1px dashed rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.02)",
    color: "#dbe7ff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  playheadLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 148,
    background: "#ff5b5b",
    pointerEvents: "none",
  },

  noticeBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: "12px 14px",
    background: "#eff6ff",
    border: "1px solid rgba(37,99,235,0.18)",
    color: "#1d4ed8",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
