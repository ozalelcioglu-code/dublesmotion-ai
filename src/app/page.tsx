"use client";

import type { CSSProperties } from "react";
import {
  Suspense,
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useSession } from "../provider/SessionProvider";
import { useLanguage } from "../provider/LanguageProvider";
import { LANGUAGE_LABELS, type AppLanguage } from "../lib/i18n";
import AppSidebar from "../components/AppSidebar";
import AppFooter from "../components/AppFooter";

type VideoMode =
  | "text_to_video"
  | "url_to_video"
  | "image_to_video"
  | "logo_to_video";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";
type WorkspaceTab = "video" | "voice" | "music" | "music_video" | "support";

type VideoStyle =
  | "realistic"
  | "cinematic"
  | "3d_animation"
  | "anime"
  | "pixar"
  | "cartoon";

type SceneCard = {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

type VideoGenerationState =
  | { status: "idle" }
  | { status: "loading"; phase: string }
  | {
      status: "done";
      videoUrl: string;
      imageUrl?: string | null;
      videoId?: string | null;
      durationSec?: number;
      actualClipDurationSec?: number;
      sceneImages?: string[];
      scenePrompts?: string[];
      sceneVideoUrls?: string[];
      saveWarning?: string | null;
      preview?: boolean;
    }
  | { status: "error"; message: string };

type MusicGenerationState =
  | { status: "idle" }
  | { status: "loading"; phase: string }
  | {
      status: "done";
      audioUrl: string;
      title?: string | null;
      durationSec?: number | null;
      lyrics?: string | null;
      saveWarning?: string | null;
    }
  | { status: "error"; message: string };

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, clearSession, refreshSession } =
    useSession();
  const { language, setLanguage, t } = useLanguage();

  const [activeNav, setActiveNav] = useState<NavKey>("tool");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("video");

  const [videoMode, setVideoMode] = useState<VideoMode>("text_to_video");
  const [prompt, setPrompt] = useState(getDefaultPrompt(language));
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ratioUi, setRatioUi] = useState("16:9");
  const [styleUi, setStyleUi] = useState<VideoStyle>("cinematic");

  const [videoGeneration, setVideoGeneration] = useState<VideoGenerationState>({
    status: "idle",
  });

  const [scenes, setScenes] = useState<SceneCard[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<"final" | string>("final");

  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const [voiceText, setVoiceText] = useState("");
  const [voiceUri, setVoiceUri] = useState("");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [musicTitle, setMusicTitle] = useState("");
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicLyrics, setMusicLyrics] = useState("");
  const [musicDurationSec, setMusicDurationSec] = useState("30");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [musicVideoPrompt, setMusicVideoPrompt] = useState(
    "Cinematic neon performance, emotional lighting, smooth camera movement, premium music video aesthetic"
  );
  const [musicGeneration, setMusicGeneration] = useState<MusicGenerationState>({
    status: "idle",
  });

  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (
      tab === "tool" ||
      tab === "apps" ||
      tab === "chat" ||
      tab === "flow" ||
      tab === "live"
    ) {
      setActiveNav(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth <= 980);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      setAvailableVoices(voices);

      if (!voiceUri && voices.length > 0) {
        setVoiceUri(voices[0].voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceUri]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleId = "dubles-motion-spin-keyframes";
    if (document.getElementById(styleId)) return;

    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.innerHTML = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      styleEl.remove();
    };
  }, []);

  const displayScenes = scenes;

  const totalDuration = useMemo(() => {
    if (displayScenes.length > 0) {
      return displayScenes.reduce((acc, scene) => acc + scene.durationSec, 0);
    }

    if (videoGeneration.status === "done" && videoGeneration.durationSec) {
      return videoGeneration.durationSec;
    }

    if (musicGeneration.status === "done" && musicGeneration.durationSec) {
      return musicGeneration.durationSec;
    }

    return null;
  }, [displayScenes, videoGeneration, musicGeneration]);

  const selectedScene =
    previewTarget !== "final"
      ? displayScenes.find((scene) => scene.id === previewTarget) ?? null
      : null;

  const previewAspectRatio = useMemo(() => {
    if (workspaceTab === "music") return "16 / 9";
    if (workspaceTab === "voice") return "16 / 9";
    if (workspaceTab === "support") return "16 / 9";

    if (
      previewTarget !== "final" &&
      selectedScene &&
      (selectedScene.videoUrl || selectedScene.imageUrl)
    ) {
      return "16 / 9";
    }

    if (videoMode === "logo_to_video") return "16 / 9";
    return ratioToAspect(ratioUi);
  }, [workspaceTab, previewTarget, selectedScene, videoMode, ratioUi]);

  const activeAudioUrl =
    musicGeneration.status === "done"
      ? musicGeneration.audioUrl
      : uploadedAudioUrl || "";

  const videoStatusText =
    videoGeneration.status === "idle"
      ? t.home.statusReady
      : videoGeneration.status === "loading"
      ? t.home.statusGenerating
      : videoGeneration.status === "done"
      ? videoGeneration.preview
        ? "Preview Ready"
        : t.home.statusDone
      : t.home.statusError;

  const musicStatusText =
    musicGeneration.status === "idle"
      ? "Ready"
      : musicGeneration.status === "loading"
      ? "Generating"
      : musicGeneration.status === "done"
      ? "Done"
      : "Error";

  const remainingCreditsText =
    user?.remainingCredits === null
      ? t.common.unlimitedCredits
      : `${user?.remainingCredits ?? 0} ${t.common.creditsLeft}`;

  const isPlanBlocked =
    isAuthenticated &&
    !isLoading &&
    typeof user?.remainingCredits === "number" &&
    user.remainingCredits <= 0;

  const planLimitMessage =
    user?.planCode === "free"
      ? t.home.lifetimeLimitReached
      : t.home.monthlyLimitReached;

  const canGenerateVideoBase =
    videoGeneration.status !== "loading" &&
    !uploadingImage &&
    ((videoMode === "text_to_video" && prompt.trim().length >= 3) ||
      (videoMode === "url_to_video" &&
        prompt.trim().length >= 3 &&
        sourceUrl.trim().length > 0) ||
      (videoMode === "image_to_video" &&
        prompt.trim().length >= 3 &&
        uploadedImageUrl.trim().length > 0) ||
      (videoMode === "logo_to_video" && uploadedImageUrl.trim().length > 0));

  const canGenerateMusicBase =
    musicGeneration.status !== "loading" &&
    (musicPrompt.trim().length >= 3 || musicLyrics.trim().length >= 8);

  const canGenerateMusicVideoBase =
    videoGeneration.status !== "loading" &&
    activeAudioUrl.trim().length > 0 &&
    musicVideoPrompt.trim().length >= 3;

  const canGenerateVideo =
    canGenerateVideoBase && isAuthenticated && !isPlanBlocked;
  const canGenerateMusic =
    canGenerateMusicBase && isAuthenticated && !isPlanBlocked;
  const canGenerateMusicVideo =
    canGenerateMusicVideoBase && isAuthenticated && !isPlanBlocked;

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearSession();
      router.replace("/login");
      router.refresh();
    }
  };

  const handleImagePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.imageUrl) {
        throw new Error(data?.error || "Image upload failed");
      }

      setUploadedImageUrl(data.imageUrl);
    } catch (error) {
      setVideoGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Image upload failed",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAudioPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAudio(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data?.ok || !data?.audioUrl) {
        throw new Error(data?.error || "Audio upload failed");
      }

      setUploadedAudioUrl(data.audioUrl);
      setWorkspaceTab("music_video");
    } catch (error) {
      setMusicGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Audio upload failed",
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleGenerateVideo = async (preview = false) => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!preview && isPlanBlocked) {
      router.push("/billing");
      return;
    }

    try {
      setVideoGeneration({
        status: "loading",
        phase: preview
          ? "Creating preview storyboard..."
          : "Submitting final generation request...",
      });

      const payload: Record<string, unknown> = {
        mode: videoMode,
        style: styleUi,
        ratio: ratioUi,
        preview,
      };

      if (videoMode === "text_to_video") {
        payload.prompt = prompt;
      } else if (videoMode === "url_to_video") {
        payload.prompt = prompt;
        payload.sourceUrl = sourceUrl;
      } else if (videoMode === "image_to_video") {
        payload.prompt = prompt;
        payload.imageUrl = uploadedImageUrl;
      } else if (videoMode === "logo_to_video") {
        payload.prompt =
          prompt.trim() || "clean premium technology logo reveal";
        payload.imageUrl = uploadedImageUrl;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      const rawText = await res.text();

      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        throw new Error(rawText || "Generation failed");
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Generation failed");
      }

      if (preview) {
        const previewImage = data.imageUrl ?? data.sceneImages?.[0] ?? null;
        if (!previewImage) {
          throw new Error("No preview image returned");
        }

        setScenes([
          {
            id: "preview-scene-1",
            title: "Preview Scene",
            description:
              data.scenePrompts?.[0] || prompt || "Storyboard preview",
            durationSec: 0,
            imageUrl: previewImage,
            videoUrl: null,
          },
        ]);
        setSelectedSceneId(null);
        setPreviewTarget("final");

        setVideoGeneration({
          status: "done",
          preview: true,
          imageUrl: previewImage,
          videoUrl: "",
          videoId: null,
          durationSec: 0,
          actualClipDurationSec: 0,
          sceneImages: [previewImage],
          scenePrompts: data.scenePrompts ?? [],
          sceneVideoUrls: [],
          saveWarning: null,
        });

        return;
      }

      if (!data.videoUrl) {
        throw new Error("No video URL returned");
      }

      const scenePrompts = Array.isArray(data.scenePrompts)
        ? data.scenePrompts
        : [];
      const sceneImages = Array.isArray(data.sceneImages)
        ? data.sceneImages
        : [];
      const sceneVideoUrls = Array.isArray(data.sceneVideoUrls)
        ? data.sceneVideoUrls
        : [];
      const actualClipDurationSec =
        typeof data.actualClipDurationSec === "number"
          ? data.actualClipDurationSec
          : 7;

      const nextScenes: SceneCard[] = scenePrompts.map(
        (scenePrompt: string, index: number) => ({
          id: `generated-scene-${index + 1}`,
          title:
            index === 0
              ? "Scene 1: NYC Skyline"
              : index === 1
              ? "Scene 2: Street Walk"
              : `Scene ${index + 1}: Times Square`,
          description: scenePrompt,
          durationSec: actualClipDurationSec,
          imageUrl: sceneImages[index] ?? null,
          videoUrl: sceneVideoUrls[index] ?? null,
        })
      );

      setScenes(nextScenes);
      setSelectedSceneId(null);
      setPreviewTarget("final");

      setVideoGeneration({
        status: "done",
        preview: false,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl ?? null,
        videoId: data.videoId ?? null,
        durationSec: data.durationSec ?? 10,
        actualClipDurationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls,
        saveWarning: data.saveWarning ?? null,
      });

      await refreshSession();
    } catch (error) {
      setVideoGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleGenerateMusic = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isPlanBlocked) {
      router.push("/billing");
      return;
    }

    try {
      setMusicGeneration({
        status: "loading",
        phase: "Generating music track...",
      });

      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          title: musicTitle,
          prompt: musicPrompt,
          lyrics: musicLyrics,
          durationSec: Number(musicDurationSec || 30),
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Music generation failed");
      }

      if (!data.audioUrl) {
        throw new Error("No audio URL returned");
      }

      setUploadedAudioUrl("");
      setMusicGeneration({
        status: "done",
        audioUrl: data.audioUrl,
        title: data.title ?? musicTitle ?? null,
        durationSec:
          typeof data.durationSec === "number"
            ? data.durationSec
            : Number(musicDurationSec || 30),
        lyrics: data.lyrics ?? musicLyrics ?? null,
        saveWarning: data.saveWarning ?? null,
      });

      await refreshSession();
    } catch (error) {
      setMusicGeneration({
        status: "error",
        message:
          error instanceof Error ? error.message : "Music generation failed",
      });
    }
  };

  const handleGenerateMusicVideo = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isPlanBlocked) {
      router.push("/billing");
      return;
    }

    if (!activeAudioUrl) {
      setVideoGeneration({
        status: "error",
        message: "Please generate or upload an audio track first.",
      });
      return;
    }

    try {
      setVideoGeneration({
        status: "loading",
        phase: "Creating music video from your track...",
      });

      const res = await fetch("/api/generate-music-video", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          audioUrl: activeAudioUrl,
          prompt: musicVideoPrompt,
          style: styleUi,
          ratio: ratioUi,
          title:
            musicTitle ||
            (musicGeneration.status === "done" ? musicGeneration.title : "") ||
            "Music Video",
          lyrics:
            musicGeneration.status === "done"
              ? musicGeneration.lyrics
              : musicLyrics,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Music video generation failed");
      }

      if (!data.videoUrl) {
        throw new Error("No video URL returned");
      }

      const scenePrompts = Array.isArray(data.scenePrompts)
        ? data.scenePrompts
        : [];
      const sceneImages = Array.isArray(data.sceneImages)
        ? data.sceneImages
        : [];
      const sceneVideoUrls = Array.isArray(data.sceneVideoUrls)
        ? data.sceneVideoUrls
        : [];
      const actualClipDurationSec =
        typeof data.actualClipDurationSec === "number"
          ? data.actualClipDurationSec
          : 7;

      const nextScenes: SceneCard[] = scenePrompts.map(
        (scenePrompt: string, index: number) => ({
          id: `music-video-scene-${index + 1}`,
          title:
            index === 0
              ? "Scene 1: NYC Skyline"
              : index === 1
              ? "Scene 2: Street Walk"
              : `Scene ${index + 1}: Times Square`,
          description: scenePrompt,
          durationSec: actualClipDurationSec,
          imageUrl: sceneImages[index] ?? null,
          videoUrl: sceneVideoUrls[index] ?? null,
        })
      );

      setScenes(nextScenes);
      setSelectedSceneId(null);
      setPreviewTarget("final");

      setVideoGeneration({
        status: "done",
        preview: false,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl ?? null,
        videoId: data.videoId ?? null,
        durationSec:
          data.durationSec ??
          (musicGeneration.status === "done"
            ? musicGeneration.durationSec ?? 30
            : 30),
        actualClipDurationSec,
        sceneImages,
        scenePrompts,
        sceneVideoUrls,
        saveWarning: data.saveWarning ?? null,
      });

      setWorkspaceTab("music_video");
      await refreshSession();
    } catch (error) {
      setVideoGeneration({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Music video generation failed",
      });
    }
  };

  const handleResetVideo = () => {
    setVideoGeneration({ status: "idle" });
    setScenes([]);
    setSelectedSceneId(null);
    setPreviewTarget("final");
  };

  const handleResetMusic = () => {
    setMusicGeneration({ status: "idle" });
    setUploadedAudioUrl("");
    setMusicTitle("");
    setMusicPrompt("");
    setMusicLyrics("");
    setMusicDurationSec("30");
  };

  const handleSelectScene = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setPreviewTarget(sceneId);
  };

  const handleDeleteScene = (sceneId: string) => {
    setScenes((prev) => {
      const next = prev.filter((scene) => scene.id !== sceneId);

      if (previewTarget === sceneId) {
        setPreviewTarget("final");
      }

      if (selectedSceneId === sceneId) {
        setSelectedSceneId(null);
      }

      return next;
    });
  };

  const handleSupportSend = () => {
    const subject = encodeURIComponent(
      supportSubject || `${t.support.title} - Dublesmotion AI`
    );
    const body = encodeURIComponent(
      `${supportMessage}\n\n---\nUser: ${user?.email ?? "Guest"}\nPlan: ${
        user?.planLabel ?? "Unknown"
      }\nLanguage: ${language}`
    );

    window.location.href = `mailto:info@dublestechnology.com?subject=${subject}&body=${body}`;
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!voiceText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(voiceText);
    const selected = availableVoices.find((v) => v.voiceURI === voiceUri);

    if (selected) {
      utterance.voice = selected;
      utterance.lang = selected.lang;
    } else {
      utterance.lang =
        language === "tr" ? "tr-TR" : language === "de" ? "de-DE" : "en-US";
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const renderCompactToolTabs = () => {
    const items = [
      {
        key: "text_to_video",
        label: "Text to Video",
        active: workspaceTab === "video" && videoMode === "text_to_video",
        onClick: () => {
          setWorkspaceTab("video");
          setVideoMode("text_to_video");
        },
      },
      {
        key: "image_to_video",
        label: "Image to Video",
        active: workspaceTab === "video" && videoMode === "image_to_video",
        onClick: () => {
          setWorkspaceTab("video");
          setVideoMode("image_to_video");
        },
      },
      {
        key: "url_to_video",
        label: "URL to Video",
        active: workspaceTab === "video" && videoMode === "url_to_video",
        onClick: () => {
          setWorkspaceTab("video");
          setVideoMode("url_to_video");
        },
      },
      {
        key: "text_to_ses",
        label: "Text to Ses",
        active: workspaceTab === "voice",
        onClick: () => {
          setWorkspaceTab("voice");
        },
      },
      {
        key: "ses_to_video_clip",
        label: "Ses to Video Clip",
        active: workspaceTab === "music_video",
        onClick: () => {
          setWorkspaceTab("music_video");
        },
      },
    ];

    return (
      <div style={styles.compactToolTabs}>
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            style={{
              ...styles.compactToolTab,
              ...(item.active ? styles.compactToolTabActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  };

  const renderPreviewContent = () => {
    if (workspaceTab === "music") {
      if (musicGeneration.status === "loading") {
        return (
          <div style={styles.centerBox}>
            <div style={styles.spinner} />
            <div style={styles.previewText}>Generating music...</div>
            <div style={styles.previewSubtext}>{musicGeneration.phase}</div>
          </div>
        );
      }

      if (musicGeneration.status === "error") {
        return (
          <div style={styles.centerBox}>
            <div style={styles.previewText}>Music error</div>
            <div style={styles.previewSubtext}>{musicGeneration.message}</div>
          </div>
        );
      }

      if (activeAudioUrl) {
        return (
          <div style={styles.audioPreviewCard}>
            <div style={styles.audioPreviewTitle}>
              {musicGeneration.status === "done"
                ? musicGeneration.title || "Generated Song"
                : "Uploaded Audio"}
            </div>
            <div style={styles.audioPreviewSub}>
              {musicGeneration.status === "done"
                ? "Your track is ready. You can continue with music video creation."
                : "Audio uploaded successfully. You can use it to create a music video."}
            </div>
            <audio controls src={activeAudioUrl} style={styles.audioPlayer} />
          </div>
        );
      }

      return (
        <div style={styles.centerBox}>
          <div style={styles.previewText}>No music yet</div>
          <div style={styles.previewSubtext}>
            Generate a new song or upload audio to continue.
          </div>
        </div>
      );
    }

    if (
      previewTarget !== "final" &&
      selectedScene &&
      (selectedScene.videoUrl || selectedScene.imageUrl)
    ) {
      if (selectedScene.videoUrl) {
        return (
          <video
            src={selectedScene.videoUrl}
            controls
            playsInline
            style={styles.video}
          />
        );
      }

      return (
        <img
          src={selectedScene.imageUrl ?? ""}
          alt={selectedScene.title}
          style={styles.previewImage}
        />
      );
    }

    if (videoGeneration.status === "done") {
      if (videoGeneration.preview && videoGeneration.imageUrl) {
        return (
          <img
            src={videoGeneration.imageUrl}
            alt="Preview storyboard"
            style={styles.previewImage}
          />
        );
      }

      if (videoGeneration.videoUrl) {
        return (
          <video
            src={videoGeneration.videoUrl}
            controls
            playsInline
            style={styles.video}
          />
        );
      }
    }

    if (videoGeneration.status === "loading") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.spinner} />
          <div style={styles.previewText}>
            {videoGeneration.phase.includes("preview")
              ? "Generating preview"
              : t.home.generatingVideo}
          </div>
          <div style={styles.previewSubtext}>{videoGeneration.phase}</div>
        </div>
      );
    }

    if (videoGeneration.status === "error") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.previewText}>{t.home.statusError}</div>
          <div style={styles.previewSubtext}>{videoGeneration.message}</div>
        </div>
      );
    }

    if (workspaceTab === "voice") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.previewText}>Voice Preview</div>
          <div style={styles.previewSubtext}>
            Type your text and preview it with the selected voice.
          </div>
        </div>
      );
    }

    if (workspaceTab === "support") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.previewText}>Support Center</div>
          <div style={styles.previewSubtext}>
            Send your support request directly from the form.
          </div>
        </div>
      );
    }

    return (
      <div style={styles.centerBox}>
        <div style={styles.previewText}>{t.home.noVideoYet}</div>
        <div style={styles.previewSubtext}>
          {workspaceTab === "music_video"
            ? "Generate or upload a song, then create your music video."
            : t.home.generateHint}
        </div>
      </div>
    );
  };

  const renderVideoWorkspace = () => {
    return (
      <div style={styles.workspaceCard}>
        {renderCompactToolTabs()}

        <div style={styles.formCardInner}>
          <label style={styles.label}>
            {videoMode === "logo_to_video" ? "Logo Prompt" : "Text Prompt"}
          </label>
          <textarea
            style={styles.heroInput}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              videoMode === "logo_to_video"
                ? "clean premium technology logo reveal"
                : "A cinematic traveller walking in New York City"
            }
          />

          {videoMode === "image_to_video" || videoMode === "logo_to_video" ? (
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                {videoMode === "logo_to_video" ? "Upload Logo" : "Upload Image"}
              </label>
              <div style={styles.uploadRow}>
                <label style={styles.uploadFieldLike}>
                  <span style={styles.uploadFieldText}>
                    {uploadedImageUrl ? "Image selected" : "No image selected."}
                  </span>
                  <span style={styles.uploadFieldIcon}>☁</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImagePick}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {videoMode === "url_to_video" ? (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Source URL</label>
              <input
                style={styles.selectMetal}
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          ) : null}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Style</label>
            <select
              value={styleUi}
              onChange={(e) => setStyleUi(e.target.value as VideoStyle)}
              style={styles.selectMetal}
            >
              <option value="realistic">Realistic</option>
              <option value="cinematic">Cinematic</option>
              <option value="3d_animation">3D Animation</option>
              <option value="anime">Anime</option>
              <option value="pixar">Pixar</option>
              <option value="cartoon">Cartoon</option>
            </select>
          </div>

          {videoMode !== "logo_to_video" ? (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Aspect Ratio</label>
              <select
                value={ratioUi}
                onChange={(e) => setRatioUi(e.target.value)}
                style={styles.selectMetal}
              >
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
          ) : null}

          <div style={styles.previewFinalActions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => handleGenerateVideo(true)}
              disabled={!canGenerateVideoBase || !isAuthenticated}
            >
              Preview
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => router.push("/login")}
              >
                Login
              </button>
            ) : isPlanBlocked ? (
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => router.push("/billing")}
              >
                Upgrade
              </button>
            ) : (
              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => handleGenerateVideo(false)}
                disabled={!canGenerateVideo}
              >
                Generate Final Video
              </button>
            )}
          </div>

          <div style={styles.actionRowSingle}>
            <button
              type="button"
              style={styles.resetButton}
              onClick={handleResetVideo}
            >
              Reset
            </button>
          </div>

          {isPlanBlocked ? (
            <div style={styles.limitBox}>{planLimitMessage}</div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderVoiceWorkspace = () => {
    return (
      <div style={styles.workspaceCard}>
        {renderCompactToolTabs()}

        <div style={styles.formCardInner}>
          <label style={styles.label}>{t.voice.textLabel}</label>
          <textarea
            style={styles.heroInput}
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder={t.voice.textPlaceholder}
          />

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.voice.voiceLabel}</label>
            <select
              value={voiceUri}
              onChange={(e) => setVoiceUri(e.target.value)}
              style={styles.selectMetal}
            >
              {availableVoices.length === 0 ? (
                <option value="">{t.voice.noVoices}</option>
              ) : (
                availableVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} — {voice.lang}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={styles.actionRow}>
            <button
              type="button"
              style={styles.resetButton}
              onClick={handleStopSpeaking}
            >
              {t.voice.stop}
            </button>
            <button
              type="button"
              style={styles.primaryGenerateButton}
              onClick={handleSpeak}
            >
              {t.voice.preview}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderMusicWorkspace = () => {
    return (
      <div style={styles.workspaceCard}>
        {renderCompactToolTabs()}

        <div style={styles.formCardInner}>
          <label style={styles.label}>Song Title</label>
          <input
            style={styles.selectMetal}
            value={musicTitle}
            onChange={(e) => setMusicTitle(e.target.value)}
            placeholder="Midnight Neon"
          />

          <div style={styles.inputGroup}>
            <label style={styles.label}>Music Prompt</label>
            <textarea
              style={styles.promptArea}
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
              placeholder="Emotional synthwave pop, cinematic atmosphere, strong chorus..."
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Lyrics / Vocal Idea</label>
            <textarea
              style={styles.promptArea}
              value={musicLyrics}
              onChange={(e) => setMusicLyrics(e.target.value)}
              placeholder="Write the lyrics, chorus, verses, or vocal mood here..."
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Duration</label>
            <select
              value={musicDurationSec}
              onChange={(e) => setMusicDurationSec(e.target.value)}
              style={styles.selectMetal}
            >
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
              <option value="45">45 sec</option>
              <option value="60">60 sec</option>
            </select>
          </div>

          <div style={styles.actionRow}>
            <button
              type="button"
              style={styles.resetButton}
              onClick={handleResetMusic}
            >
              Reset
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                style={styles.primaryGenerateButton}
                onClick={() => router.push("/login")}
              >
                Login
              </button>
            ) : isPlanBlocked ? (
              <button
                type="button"
                style={styles.primaryGenerateButton}
                onClick={() => router.push("/billing")}
              >
                Upgrade
              </button>
            ) : (
              <button
                type="button"
                style={{
                  ...styles.primaryGenerateButton,
                  ...(!canGenerateMusic ? styles.generateDisabled : {}),
                }}
                onClick={canGenerateMusic ? handleGenerateMusic : undefined}
              >
                {musicGeneration.status === "loading"
                  ? "Generating Music"
                  : "Generate Music"}
              </button>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Upload Existing Audio</label>
            <div style={styles.uploadRow}>
              <label style={styles.uploadFieldLike}>
                <span style={styles.uploadFieldText}>
                  {uploadedAudioUrl ? "Audio uploaded" : "No audio selected."}
                </span>
                <span style={styles.uploadFieldIcon}>♫</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioPick}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {musicGeneration.status === "done" && musicGeneration.saveWarning ? (
            <div style={styles.warningBox}>{musicGeneration.saveWarning}</div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderMusicVideoWorkspace = () => {
    return (
      <div style={styles.workspaceCard}>
        {renderCompactToolTabs()}

        <div style={styles.formCardInner}>
          <label style={styles.label}>Ses to Video Clip Prompt</label>
          <textarea
            style={styles.heroInput}
            value={musicVideoPrompt}
            onChange={(e) => setMusicVideoPrompt(e.target.value)}
            placeholder="Futuristic city lights, emotional singer performance..."
          />

          <div style={styles.inputGroup}>
            <label style={styles.label}>Connected Audio</label>
            {activeAudioUrl ? (
              <div style={styles.audioBox}>
                <audio controls src={activeAudioUrl} style={styles.audioPlayer} />
              </div>
            ) : (
              <div style={styles.smallNote}>
                First generate music in the music section or upload an audio file.
              </div>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Style</label>
            <select
              value={styleUi}
              onChange={(e) => setStyleUi(e.target.value as VideoStyle)}
              style={styles.selectMetal}
            >
              <option value="realistic">Realistic</option>
              <option value="cinematic">Cinematic</option>
              <option value="3d_animation">3D Animation</option>
              <option value="anime">Anime</option>
              <option value="pixar">Pixar</option>
              <option value="cartoon">Cartoon</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Aspect Ratio</label>
            <select
              value={ratioUi}
              onChange={(e) => setRatioUi(e.target.value)}
              style={styles.selectMetal}
            >
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16</option>
            </select>
          </div>

          <div style={styles.actionRow}>
            <button
              type="button"
              style={styles.resetButton}
              onClick={handleResetVideo}
            >
              Reset
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                style={styles.primaryGenerateButton}
                onClick={() => router.push("/login")}
              >
                Login
              </button>
            ) : isPlanBlocked ? (
              <button
                type="button"
                style={styles.primaryGenerateButton}
                onClick={() => router.push("/billing")}
              >
                Upgrade
              </button>
            ) : (
              <button
                type="button"
                style={{
                  ...styles.primaryGenerateButton,
                  ...(!canGenerateMusicVideo ? styles.generateDisabled : {}),
                }}
                onClick={
                  canGenerateMusicVideo ? handleGenerateMusicVideo : undefined
                }
              >
                {videoGeneration.status === "loading"
                  ? "Generating Video"
                  : "Generate Video"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSupportWorkspace = () => {
    return (
      <div style={styles.workspaceCard}>
        {renderCompactToolTabs()}

        <div style={styles.formCardInner}>
          <label style={styles.label}>{t.support.subjectLabel}</label>
          <input
            style={styles.selectMetal}
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            placeholder={t.support.subjectPlaceholder}
          />

          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.support.messageLabel}</label>
            <textarea
              style={styles.heroInput}
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder={t.support.messagePlaceholder}
            />
          </div>

          <div style={styles.actionRowSingle}>
            <button
              type="button"
              style={styles.primaryGenerateButton}
              onClick={handleSupportSend}
            >
              {t.support.send}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWorkspaceBody = () => {
    if (workspaceTab === "voice") return renderVoiceWorkspace();
    if (workspaceTab === "music") return renderMusicWorkspace();
    if (workspaceTab === "music_video") return renderMusicVideoWorkspace();
    if (workspaceTab === "support") return renderSupportWorkspace();
    return renderVideoWorkspace();
  };

  const renderPanel = () => {
    switch (activeNav) {
      case "apps":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>Apps</div>
            <div style={styles.appsGrid}>
              <div style={styles.appCard}>
                <div style={styles.appCardTitle}>Product Ad Maker</div>
                <div style={styles.appCardText}>
                  Ürün görselinden kısa reklam videoları üret.
                </div>
              </div>
              <div style={styles.appCard}>
                <div style={styles.appCardTitle}>Social Reel Builder</div>
                <div style={styles.appCardText}>
                  Reels ve TikTok için hızlı dikey video üret.
                </div>
              </div>
              <div style={styles.appCard}>
                <div style={styles.appCardTitle}>AI Music Studio</div>
                <div style={styles.appCardText}>
                  Şarkı oluştur, sonra videoya dönüştür.
                </div>
              </div>
            </div>
          </section>
        );

      case "chat":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>Support</div>
            <div style={styles.chatBox}>{t.support.subtitle}</div>
          </section>
        );

      case "flow":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>Workflow</div>
            <div style={styles.flowList}>
              <div style={styles.flowItem}>1. Tool seç</div>
              <div style={styles.flowItem}>2. Prompt veya media ekle</div>
              <div style={styles.flowItem}>3. Preview al</div>
              <div style={styles.flowItem}>4. Final video üret</div>
              <div style={styles.flowItem}>5. Final çıktıyı indir</div>
            </div>
          </section>
        );

      case "live":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>Live</div>
            <div style={styles.chatBox}>{t.common.comingSoon}</div>
          </section>
        );

      case "tool":
      default:
        return (
          <section
            style={{
              ...styles.mainGrid,
              gridTemplateColumns: isMobileViewport
                ? "1fr"
                : "minmax(360px, 1.02fr) minmax(420px, 0.82fr)",
            }}
          >
            <div style={styles.leftColumn}>{renderWorkspaceBody()}</div>

            <div style={styles.rightColumn}>
              <div style={styles.previewCard}>
                <div style={styles.previewCardHeader}>
                  <div style={styles.previewCardTitle}>
                    {videoGeneration.status === "done" && videoGeneration.preview
                      ? "Preview Storyboard"
                      : "Final Preview"}
                  </div>
                  <div style={styles.previewCardTools}>
                    <span style={styles.previewTool}>▢</span>
                    <span style={styles.previewTool}>⌃</span>
                    <span style={styles.previewTool}>⎘</span>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.previewFrame,
                    aspectRatio: previewAspectRatio,
                  }}
                >
                  {renderPreviewContent()}
                </div>
              </div>

              <div style={styles.summaryCard}>
                <div style={styles.summaryHeader}>Output Summary</div>

                <div style={styles.summaryList}>
                  <div style={styles.summaryLine}>
                    <span style={styles.summaryLabel}>Mode:</span>
                    <span style={styles.summaryValue}>
                      {workspaceTab === "music_video"
                        ? "Ses to Video Clip"
                        : workspaceTab === "voice"
                        ? "Text to Ses"
                        : workspaceTab === "music"
                        ? "Music"
                        : getVideoModeLabel(videoMode)}
                    </span>
                  </div>

                  <div style={styles.summaryLine}>
                    <span style={styles.summaryLabel}>Type:</span>
                    <span style={styles.summaryValue}>
                      {videoGeneration.status === "done" && videoGeneration.preview
                        ? "Preview"
                        : "Final"}
                    </span>
                  </div>

                  <div style={styles.summaryLine}>
                    <span style={styles.summaryLabel}>Scenes:</span>
                    <span style={styles.summaryValue}>
                      {videoGeneration.status === "done"
                        ? displayScenes.length
                        : "-"}
                    </span>
                  </div>

                  <div style={styles.summaryLine}>
                    <span style={styles.summaryLabel}>Duration:</span>
                    <span style={styles.summaryValue}>
                      {videoGeneration.status === "done" &&
                      !videoGeneration.preview &&
                      totalDuration
                        ? `${totalDuration}s`
                        : workspaceTab === "music" &&
                          musicGeneration.status === "done" &&
                          musicGeneration.durationSec
                        ? `${musicGeneration.durationSec}s`
                        : videoGeneration.status === "done" &&
                          videoGeneration.preview
                        ? "Preview"
                        : "-"}
                    </span>
                  </div>

                  <div style={styles.summaryLine}>
                    <span style={styles.summaryLabel}>Status:</span>
                    <span style={styles.summaryValue}>
                      {workspaceTab === "music"
                        ? musicStatusText
                        : videoStatusText}
                    </span>
                  </div>
                </div>

                {workspaceTab === "music" && activeAudioUrl ? (
                  <a href={activeAudioUrl} download style={styles.downloadButton}>
                    Download Audio
                  </a>
                ) : videoGeneration.status === "done" &&
                  !videoGeneration.preview &&
                  videoGeneration.videoUrl ? (
                  <a
                    href={videoGeneration.videoUrl}
                    download
                    style={styles.downloadButton}
                  >
                    Download Video
                  </a>
                ) : null}
              </div>
            </div>

            {(workspaceTab === "video" || workspaceTab === "music_video") && (
              <div style={styles.sceneOverviewFull}>
                <div style={styles.sceneOverviewHeader}>
                  {videoGeneration.status === "done" && videoGeneration.preview
                    ? "Preview Overview"
                    : "Scene Overview"}
                </div>

                {displayScenes.length === 0 ? (
                  <div style={styles.emptySceneText}>
                    Video oluşturulduktan sonra sahneler burada görünecek.
                  </div>
                ) : (
                  <div
                    style={{
                      ...styles.sceneGrid,
                      gridTemplateColumns: isMobileViewport
                        ? "1fr"
                        : "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    {displayScenes.map((scene) => {
                      const isSelected =
                        previewTarget !== "final" &&
                        selectedSceneId === scene.id;

                      return (
                        <div
                          key={scene.id}
                          style={{
                            ...styles.sceneOverviewCard,
                            ...(isSelected ? styles.sceneOverviewCardActive : {}),
                          }}
                        >
                          <div style={styles.sceneOverviewThumbWrap}>
                            {scene.videoUrl ? (
                              <video
                                src={scene.videoUrl}
                                muted
                                playsInline
                                controls
                                style={styles.sceneOverviewThumb}
                              />
                            ) : scene.imageUrl ? (
                              <img
                                src={scene.imageUrl}
                                alt={scene.title}
                                style={styles.sceneOverviewThumb}
                              />
                            ) : (
                              <div style={styles.sceneOverviewThumbPlaceholder}>
                                {scene.title}
                              </div>
                            )}
                          </div>

                          <div style={styles.sceneOverviewTitle}>
                            {scene.title}
                          </div>

                          <div style={styles.sceneOverviewActions}>
                            <button
                              type="button"
                              style={styles.sceneSelectButton}
                              onClick={() => handleSelectScene(scene.id)}
                            >
                              Select
                            </button>
                            <button
                              type="button"
                              style={styles.sceneDeleteButton}
                              onClick={() => handleDeleteScene(scene.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {workspaceTab === "music" && musicGeneration.status === "done" ? (
              <div style={styles.sceneOverviewFull}>
                <div style={styles.sceneOverviewHeader}>Lyrics Preview</div>
                <div style={styles.lyricsBox}>
                  {musicGeneration.lyrics || "No lyrics available."}
                </div>
              </div>
            ) : null}
          </section>
        );
    }
  };

  return (
    <div
      style={{
        ...styles.root,
        flexDirection: isMobileViewport ? "column" : "row",
      }}
    >
      <AppSidebar activeKey={activeNav} onSelect={setActiveNav} />

      <main style={styles.main}>
        <div style={styles.topHeaderBar}>
          <div style={styles.topHeaderText}>
            Create and edit AI <strong>videos</strong>, music, and voiceovers
          </div>

          <div
            style={{
              ...styles.topHeaderActions,
              width: isMobileViewport ? "100%" : "auto",
            }}
          >
            <button
              type="button"
              style={{
                ...styles.headerActionButton,
                width: isMobileViewport ? "100%" : "auto",
              }}
              onClick={() => router.push("/billing")}
            >
              Upgrade Plan
            </button>

            <button
              type="button"
              style={{
                ...styles.headerDarkActionButton,
                width: isMobileViewport ? "100%" : "auto",
              }}
              onClick={() => {
                setPreviewTarget("final");
                setSelectedSceneId(null);
              }}
            >
              Final Video ▶▶
            </button>

            <div
              style={{
                ...styles.accountTopRight,
                width: isMobileViewport ? "100%" : "auto",
              }}
              ref={accountMenuRef}
            >
              <button
                type="button"
                style={{
                  ...styles.accountCircleButton,
                  width: isMobileViewport ? "100%" : 58,
                }}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
              >
                <span style={styles.accountCircleText}>
                  {(user?.name?.[0] || user?.email?.[0] || "A").toUpperCase()}
                </span>
              </button>

              {accountMenuOpen ? (
                <div
                  style={{
                    ...styles.accountDropdown,
                    width: isMobileViewport ? "100%" : 280,
                    right: 0,
                    left: isMobileViewport ? 0 : "auto",
                  }}
                >
                  <div style={styles.accountDropdownHeader}>
                    <div style={styles.accountDropdownName}>
                      {isAuthenticated ? user?.name || "User" : "Guest"}
                    </div>
                    <div style={styles.accountDropdownEmail}>
                      {isAuthenticated ? user?.email : t.header.guestText}
                    </div>
                  </div>

                  <div style={styles.accountDropdownStats}>
                    <div style={styles.accountDropdownStatRow}>
                      <span>{t.home.currentPlan}</span>
                      <strong>{user?.planLabel ?? "Free"}</strong>
                    </div>
                    <div style={styles.accountDropdownStatRow}>
                      <span>{t.home.remainingCredits}</span>
                      <strong>{remainingCreditsText}</strong>
                    </div>
                    <div style={styles.accountDropdownStatRow}>
                      <span>{t.home.maxDuration}</span>
                      <strong>{user?.maxDurationSec ?? 10}s</strong>
                    </div>
                  </div>

                  <div style={styles.accountDropdownGroup}>
                    <label style={styles.accountDropdownLabel}>Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                      style={styles.accountDropdownSelect}
                    >
                      {Object.entries(LANGUAGE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.accountDropdownActions}>
                    {!isAuthenticated ? (
                      <>
                        <button
                          type="button"
                          style={styles.accountDropdownButton}
                          onClick={() => router.push("/login")}
                        >
                          {t.common.login}
                        </button>
                        <button
                          type="button"
                          style={styles.accountDropdownButton}
                          onClick={() => router.push("/billing")}
                        >
                          {t.common.billing}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          style={styles.accountDropdownButton}
                          onClick={() => router.push("/billing")}
                        >
                          {t.common.billing}
                        </button>
                        <button
                          type="button"
                          style={styles.accountDropdownButtonDanger}
                          onClick={handleLogout}
                        >
                          {t.common.logout}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {renderPanel()}
        <AppFooter />
      </main>
    </div>
  );
}

function getDefaultPrompt(language: AppLanguage) {
  if (language === "tr") {
    return "A cinematic traveller walking in New York City";
  }
  if (language === "de") {
    return "Ein cineastischer Reisender in New York City";
  }
  return "A cinematic traveller walking in New York City";
}

function getVideoModeLabel(mode: VideoMode) {
  switch (mode) {
    case "text_to_video":
      return "Text to Video";
    case "url_to_video":
      return "URL to Video";
    case "image_to_video":
      return "Image to Video";
    case "logo_to_video":
      return "Logo to Video";
    default:
      return mode;
  }
}

function ratioToAspect(ratio: string) {
  switch (ratio) {
    case "16:9":
      return "16 / 9";
    case "9:16":
      return "9 / 16";
    case "1:1":
    default:
      return "1 / 1";
  }
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,255,255,0.55), transparent 28%), linear-gradient(135deg, #d9dde2 0%, #cfd5dc 42%, #b9c1cb 100%)",
    color: "#0f172a",
    overflowX: "hidden",
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 0,
    padding: "20px 18px 24px",
    overflowX: "hidden",
  },

  topHeaderBar: {
    minHeight: 74,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(240,243,247,0.98) 0%, rgba(214,220,227,0.98) 100%)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "12px 18px",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 4px 14px rgba(15,23,42,0.05)",
    flexWrap: "wrap",
  },

  topHeaderText: {
    fontSize: 18,
    color: "#4b5563",
    lineHeight: 1.4,
  },

  topHeaderActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
    minWidth: 0,
  },

  headerActionButton: {
    minHeight: 44,
    padding: "0 18px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#4b5563",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  headerDarkActionButton: {
    minHeight: 44,
    padding: "0 18px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },

  accountTopRight: {
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-start",
    minWidth: 0,
    flexShrink: 0,
  },

  accountCircleButton: {
    width: 58,
    height: 58,
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.14)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 10px rgba(15,23,42,0.08)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },

  accountCircleText: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1,
  },

  accountDropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    borderRadius: 14,
    background:
      "linear-gradient(180deg, rgba(240,243,247,0.98) 0%, rgba(214,220,227,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 22px 50px rgba(15,23,42,0.14)",
    padding: 14,
    zIndex: 80,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  accountDropdownHeader: {
    paddingBottom: 10,
    borderBottom: "1px solid rgba(15,23,42,0.08)",
  },

  accountDropdownName: {
    fontSize: 14,
    fontWeight: 800,
    color: "#374151",
    marginBottom: 4,
  },

  accountDropdownEmail: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },

  accountDropdownStats: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  accountDropdownStatRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    fontSize: 12,
    color: "#4b5563",
  },

  accountDropdownGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  accountDropdownLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  accountDropdownSelect: {
    width: "100%",
    height: 42,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#f8fafc",
    color: "#374151",
    padding: "0 12px",
    fontWeight: 700,
  },

  accountDropdownActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    paddingTop: 6,
  },

  accountDropdownButton: {
    flex: 1,
    minWidth: 110,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },

  accountDropdownButtonDanger: {
    flex: 1,
    minWidth: 110,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(239,68,68,0.18)",
    background: "#fff5f5",
    color: "#b91c1c",
    fontWeight: 700,
    cursor: "pointer",
  },

  mainGrid: {
    display: "grid",
    gap: 18,
    alignItems: "start",
    width: "100%",
    maxWidth: 1700,
    minWidth: 0,
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },

  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },

  workspaceCard: {
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 5px 16px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },

  compactToolTabs: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 12px 0",
    overflowX: "auto",
    flexWrap: "nowrap",
  },

  compactToolTab: {
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(231,236,241,0.96) 0%, rgba(201,209,218,0.96) 100%)",
    color: "#4b5563",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },

  compactToolTabActive: {
    background:
      "linear-gradient(180deg, rgba(245,248,252,0.98) 0%, rgba(214,223,234,0.98) 100%)",
    color: "#334155",
    border: "1px solid rgba(126, 154, 196, 0.42)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.8), 0 0 0 1px rgba(146,173,214,0.10)",
  },

  formCardInner: {
    padding: 18,
    borderTop: "1px solid rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },

  label: {
    marginBottom: 8,
    display: "block",
    fontWeight: 700,
    fontSize: 16,
    color: "#4b5563",
  },

  inputGroup: {
    marginTop: 18,
    minWidth: 0,
  },

  heroInput: {
    width: "100%",
    minHeight: 62,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "14px 16px",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    resize: "vertical",
    fontSize: 16,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
    minWidth: 0,
  },

  promptArea: {
    width: "100%",
    minHeight: 110,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "14px 16px",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    resize: "vertical",
    fontSize: 15,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
    minWidth: 0,
  },

  selectMetal: {
    width: "100%",
    height: 52,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    padding: "0 14px",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    color: "#374151",
    fontSize: 15,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
    minWidth: 0,
  },

  uploadRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  uploadFieldLike: {
    width: "100%",
    minHeight: 52,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 14px",
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  uploadFieldText: {
    fontSize: 15,
    color: "#6b7280",
    fontStyle: "italic",
  },

  uploadFieldIcon: {
    fontSize: 24,
    color: "#6b7280",
    flexShrink: 0,
  },

  previewFinalActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 22,
    paddingTop: 16,
    borderTop: "1px solid rgba(15,23,42,0.10)",
  },

  secondaryButton: {
    minHeight: 54,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  primaryButton: {
    minHeight: 54,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 22,
    paddingTop: 16,
    borderTop: "1px solid rgba(15,23,42,0.10)",
  },

  actionRowSingle: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    marginTop: 16,
  },

  resetButton: {
    minHeight: 54,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  primaryGenerateButton: {
    minHeight: 54,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },

  generateDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  limitBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    background: "rgba(254,226,226,0.9)",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.5,
  },

  smallNote: {
    marginTop: 12,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  audioBox: {
    padding: 14,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(250,251,252,0.98) 0%, rgba(235,239,243,0.98) 100%)",
  },

  previewCard: {
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 5px 16px rgba(15,23,42,0.05)",
    padding: 14,
  },

  previewCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },

  previewCardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#4b5563",
  },

  previewCardTools: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#8b949e",
  },

  previewTool: {
    fontSize: 20,
    lineHeight: 1,
  },

  previewFrame: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    background: "#0f1115",
    border: "1px solid rgba(15,23,42,0.14)",
    boxShadow: "0 8px 16px rgba(15,23,42,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: "#000",
  },

  centerBox: {
    textAlign: "center",
    width: "100%",
    maxWidth: 360,
    padding: 24,
    color: "#fff",
  },

  previewText: {
    fontSize: 20,
    fontWeight: 800,
  },

  previewSubtext: {
    marginTop: 10,
    opacity: 0.75,
    fontSize: 13,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },

  spinner: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "4px solid rgba(255,255,255,0.2)",
    borderTopColor: "#fff",
    animation: "spin 1s linear infinite",
    margin: "0 auto 16px",
  },

  warningBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 8,
    background: "rgba(254,249,195,0.92)",
    border: "1px solid rgba(250,204,21,0.25)",
    color: "#854d0e",
    fontWeight: 700,
    fontSize: 14,
    width: "100%",
  },

  summaryCard: {
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 5px 16px rgba(15,23,42,0.05)",
    overflow: "hidden",
  },

  summaryHeader: {
    minHeight: 58,
    display: "flex",
    alignItems: "center",
    padding: "0 18px",
    borderBottom: "1px solid rgba(15,23,42,0.10)",
    fontSize: 18,
    fontWeight: 800,
    color: "#4b5563",
  },

  summaryList: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  summaryLine: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 16,
    color: "#4b5563",
  },

  summaryLabel: {
    fontWeight: 500,
  },

  summaryValue: {
    fontWeight: 700,
    color: "#374151",
  },

  downloadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 18px 18px",
    minHeight: 50,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "linear-gradient(180deg, #7a818a 0%, #5f6670 100%)",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: 16,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(15,23,42,0.08)",
  },

  sceneOverviewFull: {
    gridColumn: "1 / -1",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 5px 16px rgba(15,23,42,0.05)",
    padding: 14,
  },

  sceneOverviewHeader: {
    fontSize: 18,
    fontWeight: 800,
    color: "#4b5563",
    marginBottom: 14,
  },

  emptySceneText: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  sceneGrid: {
    display: "grid",
    gap: 14,
  },

  sceneOverviewCard: {
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    padding: 12,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75)",
  },

  sceneOverviewCardActive: {
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 0 0 2px rgba(137,170,215,0.35)",
    border: "1px solid rgba(137,170,215,0.45)",
  },

  sceneOverviewThumbWrap: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
    background: "#dbe2ea",
    border: "1px solid rgba(15,23,42,0.10)",
  },

  sceneOverviewThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sceneOverviewThumbPlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "#6b7280",
    fontWeight: 700,
    fontSize: 13,
    textAlign: "center",
    padding: 10,
  },

  sceneOverviewTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 10,
  },

  sceneOverviewActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },

  sceneSelectButton: {
    minHeight: 40,
    borderRadius: 6,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },

  sceneDeleteButton: {
    minHeight: 40,
    borderRadius: 6,
    border: "1px solid rgba(15,23,42,0.14)",
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryPanel: {
    padding: 20,
    borderRadius: 12,
    background:
      "linear-gradient(180deg, rgba(242,245,248,0.97) 0%, rgba(220,226,233,0.97) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.75), 0 5px 16px rgba(15,23,42,0.05)",
  },

  secondaryTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "#4b5563",
    marginBottom: 14,
  },

  appsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },

  appCard: {
    padding: 18,
    borderRadius: 8,
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
  },

  appCardTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#374151",
    marginBottom: 8,
  },

  appCardText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  chatBox: {
    padding: 18,
    borderRadius: 8,
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#4b5563",
    lineHeight: 1.6,
  },

  flowList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  flowItem: {
    padding: 14,
    borderRadius: 8,
    background:
      "linear-gradient(180deg, rgba(244,246,249,0.98) 0%, rgba(211,217,225,0.98) 100%)",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#4b5563",
    fontWeight: 700,
  },

  audioPreviewCard: {
    width: "100%",
    maxWidth: 480,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 18,
    padding: 18,
    color: "#fff",
  },

  audioPreviewTitle: {
    fontSize: 20,
    fontWeight: 800,
    marginBottom: 8,
  },

  audioPreviewSub: {
    fontSize: 13,
    lineHeight: 1.5,
    opacity: 0.82,
    marginBottom: 16,
  },

  audioPlayer: {
    width: "100%",
  },

  lyricsBox: {
    whiteSpace: "pre-wrap",
    fontSize: 14,
    lineHeight: 1.7,
    color: "#4b5563",
  },
};