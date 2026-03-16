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

type Mode =
  | "text_to_video"
  | "url_to_video"
  | "image_to_video"
  | "logo_to_video";

type NavKey = "tool" | "apps" | "chat" | "flow" | "live";
type WorkspaceTab = "video" | "voice" | "support";

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

type GenerationState =
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

  const [mode, setMode] = useState<Mode>("text_to_video");
  const [prompt, setPrompt] = useState(getDefaultPrompt(language));
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ratioUi, setRatioUi] = useState("1:1");
  const [styleUi, setStyleUi] = useState<VideoStyle>("cinematic");

  const [generation, setGeneration] = useState<GenerationState>({
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
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
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

  const displayScenes = scenes;

  const totalDuration = useMemo(() => {
    if (scenes.length > 0) {
      return scenes.reduce((acc, scene) => acc + scene.durationSec, 0);
    }

    if (generation.status === "done" && generation.durationSec) {
      return generation.durationSec;
    }

    return null;
  }, [generation, scenes]);

  const statusText =
    generation.status === "idle"
      ? t.home.statusReady
      : generation.status === "loading"
      ? t.home.statusGenerating
      : generation.status === "done"
      ? t.home.statusDone
      : t.home.statusError;

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

  const canGenerateBase =
    generation.status !== "loading" &&
    !uploadingImage &&
    ((mode === "text_to_video" && prompt.trim().length >= 3) ||
      (mode === "url_to_video" &&
        prompt.trim().length >= 3 &&
        sourceUrl.trim().length > 0) ||
      (mode === "image_to_video" &&
        prompt.trim().length >= 3 &&
        uploadedImageUrl.trim().length > 0) ||
      (mode === "logo_to_video" && uploadedImageUrl.trim().length > 0));

  const canGenerate = canGenerateBase && isAuthenticated && !isPlanBlocked;

  const selectedScene =
    previewTarget !== "final"
      ? displayScenes.find((scene) => scene.id === previewTarget) ?? null
      : null;

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
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Image upload failed",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (isPlanBlocked) {
      router.push("/billing");
      return;
    }

    try {
      setGeneration({
        status: "loading",
        phase: "Submitting generation request...",
      });

      const payload: Record<string, unknown> = {
        mode,
        style: styleUi,
      };

      if (mode === "text_to_video") {
        payload.prompt = prompt;
        payload.ratio = ratioUi;
      } else if (mode === "url_to_video") {
        payload.prompt = prompt;
        payload.sourceUrl = sourceUrl;
        payload.ratio = ratioUi;
      } else if (mode === "image_to_video") {
        payload.prompt = prompt;
        payload.imageUrl = uploadedImageUrl;
        payload.ratio = ratioUi;
      } else if (mode === "logo_to_video") {
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

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Generation failed");
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
          title: `Scene ${index + 1}`,
          description: scenePrompt,
          durationSec: actualClipDurationSec,
          imageUrl: sceneImages[index] ?? null,
          videoUrl: sceneVideoUrls[index] ?? null,
        })
      );

      setScenes(nextScenes);
      setSelectedSceneId(nextScenes[0]?.id ?? null);
      setPreviewTarget("final");

      setGeneration({
        status: "done",
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
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReset = () => {
    setGeneration({ status: "idle" });
    setScenes([]);
    setSelectedSceneId(null);
    setPreviewTarget("final");
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
        setSelectedSceneId(next[0]?.id ?? null);
      }

      return next;
    });
  };

  const handleSupportSend = () => {
    const subject = encodeURIComponent(
      supportSubject || `${t.support.title} - Duble-S Motion AI`
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

  const renderPreviewContent = () => {
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

    if (generation.status === "done") {
      return (
        <video
          src={generation.videoUrl}
          controls
          playsInline
          style={styles.video}
        />
      );
    }

    if (generation.status === "loading") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.spinner} />
          <div style={styles.previewText}>{t.home.generatingVideo}</div>
          <div style={styles.previewSubtext}>{generation.phase}</div>
        </div>
      );
    }

    if (generation.status === "error") {
      return (
        <div style={styles.centerBox}>
          <div style={styles.previewText}>{t.home.statusError}</div>
          <div style={styles.previewSubtext}>{generation.message}</div>
        </div>
      );
    }

    return (
      <div style={styles.centerBox}>
        <div style={styles.previewText}>{t.home.noVideoYet}</div>
        <div style={styles.previewSubtext}>{t.home.generateHint}</div>
      </div>
    );
  };

  const renderWorkspaceBody = () => {
    if (workspaceTab === "voice") {
      return (
        <div style={styles.toolCard}>
          <div style={styles.sectionTitle}>{t.voice.title}</div>
          <div style={styles.sectionSub}>{t.voice.subtitle}</div>

          <label style={styles.label}>{t.voice.textLabel}</label>
          <textarea
            style={styles.prompt}
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder={t.voice.textPlaceholder}
          />

          <label style={styles.label}>{t.voice.voiceLabel}</label>
          <select
            value={voiceUri}
            onChange={(e) => setVoiceUri(e.target.value)}
            style={styles.selectWide}
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

          <div style={styles.controls}>
            <button type="button" style={styles.generate} onClick={handleSpeak}>
              {t.voice.preview}
            </button>
            <button
              type="button"
              style={styles.reset}
              onClick={handleStopSpeaking}
            >
              {t.voice.stop}
            </button>
          </div>

          <div style={styles.smallNote}>{t.voice.note}</div>
        </div>
      );
    }

    if (workspaceTab === "support") {
      return (
        <div style={styles.toolCard}>
          <div style={styles.sectionTitle}>{t.support.title}</div>
          <div style={styles.sectionSub}>{t.support.subtitle}</div>

          <label style={styles.label}>{t.support.subjectLabel}</label>
          <input
            style={styles.input}
            value={supportSubject}
            onChange={(e) => setSupportSubject(e.target.value)}
            placeholder={t.support.subjectPlaceholder}
          />

          <label style={styles.label}>{t.support.messageLabel}</label>
          <textarea
            style={styles.prompt}
            value={supportMessage}
            onChange={(e) => setSupportMessage(e.target.value)}
            placeholder={t.support.messagePlaceholder}
          />

          <div style={styles.controls}>
            <button
              type="button"
              style={styles.generate}
              onClick={handleSupportSend}
            >
              {t.support.send}
            </button>
          </div>

          <div style={styles.smallNote}>{t.support.hint}</div>
        </div>
      );
    }

    return (
      <div style={styles.toolCard}>
        <div style={styles.sectionTitle}>{t.createVideo.title}</div>
        <div style={styles.sectionSub}>{t.createVideo.subtitle}</div>

        <div style={styles.modeTabs}>
          {(
            [
              "text_to_video",
              "url_to_video",
              "image_to_video",
              "logo_to_video",
            ] as const
          ).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              style={{
                ...styles.modeTab,
                ...(mode === item ? styles.modeTabActive : {}),
              }}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <label style={styles.label}>
          {mode === "logo_to_video"
            ? "Logo prompt (optional)"
            : t.home.promptLabel}
        </label>
        <textarea
          style={styles.prompt}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === "logo_to_video"
              ? "clean premium technology logo reveal with subtle glow"
              : t.home.promptPlaceholder
          }
        />

        {mode === "logo_to_video" ? (
          <div style={styles.logoInfoBox}>
            Upload your logo for a clean cinematic brand reveal. PNG logos with
            transparent background work best.
          </div>
        ) : null}

        {mode === "url_to_video" ? (
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.home.sourceUrlLabel}</label>
            <input
              style={styles.input}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        ) : null}

        {mode === "image_to_video" || mode === "logo_to_video" ? (
          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {mode === "logo_to_video"
                ? "Upload logo"
                : t.home.uploadImageLabel}
            </label>

            <div style={styles.uploadRow}>
              <label style={styles.uploadButton}>
                {mode === "logo_to_video"
                  ? "Choose logo"
                  : t.home.chooseImage}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImagePick}
                  style={{ display: "none" }}
                />
              </label>

              {uploadingImage ? (
                <span style={styles.uploadHint}>{t.home.uploadInProgress}</span>
              ) : uploadedImageUrl ? (
                <span style={styles.uploadReady}>
                  {mode === "logo_to_video"
                    ? "Logo uploaded"
                    : t.home.imageUploaded}
                </span>
              ) : (
                <span style={styles.uploadHint}>
                  {mode === "logo_to_video"
                    ? "No logo selected"
                    : t.home.noImageSelected}
                </span>
              )}
            </div>

            {uploadedImageUrl ? (
              <div style={styles.imagePreviewWrap}>
                <img
                  src={uploadedImageUrl}
                  alt="Uploaded preview"
                  style={styles.imagePreview}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Style</label>
          <select
            value={styleUi}
            onChange={(e) => setStyleUi(e.target.value as VideoStyle)}
            style={styles.selectWide}
          >
            <option value="realistic">Realistic</option>
            <option value="cinematic">Cinematic</option>
            <option value="3d_animation">3D Animation</option>
            <option value="anime">Anime</option>
            <option value="pixar">Pixar Style</option>
            <option value="cartoon">Cartoon</option>
          </select>
        </div>

        {mode !== "logo_to_video" ? (
          <div style={styles.inputGroup}>
            <label style={styles.label}>{t.home.ratioLabel}</label>
            <select
              value={ratioUi}
              onChange={(e) => setRatioUi(e.target.value)}
              style={styles.selectWide}
            >
              <option value="1:1">1:1</option>
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
          </div>
        ) : null}

        <div style={styles.controls}>
          <button type="button" style={styles.reset} onClick={handleReset}>
            {t.common.reset}
          </button>

          {!isAuthenticated ? (
            <button
              type="button"
              style={styles.generate}
              onClick={() => router.push("/login")}
            >
              {t.home.loginToCreate}
            </button>
          ) : isPlanBlocked ? (
            <button
              type="button"
              style={styles.generate}
              onClick={() => router.push("/billing")}
            >
              {t.home.upgradeCta}
            </button>
          ) : (
            <button
              type="button"
              style={{
                ...styles.generate,
                ...(!canGenerate ? styles.generateDisabled : {}),
              }}
              onClick={canGenerate ? handleGenerate : undefined}
            >
              {uploadingImage
                ? t.home.uploadInProgress
                : generation.status === "loading"
                ? t.home.statusGenerating
                : mode === "logo_to_video"
                ? "Generate logo animation"
                : t.common.generate}
            </button>
          )}
        </div>

        {isPlanBlocked ? (
          <div style={styles.limitBox}>{planLimitMessage}</div>
        ) : (
          <div style={styles.smallNote}>
            {mode === "logo_to_video"
              ? "Use a clean logo image for the best result."
              : t.home.generateHint}
          </div>
        )}
      </div>
    );
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
                <div style={styles.appCardTitle}>Voice Studio</div>
                <div style={styles.appCardText}>
                  Metni ses ön izlemeye dönüştür.
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
              <div style={styles.flowItem}>1. Prompt / source seç</div>
              <div style={styles.flowItem}>2. AI image veya source hazırla</div>
              <div style={styles.flowItem}>3. Video üret</div>
              <div style={styles.flowItem}>4. Sahne seç / sil</div>
              <div style={styles.flowItem}>5. Final çıktı indir</div>
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
            className="studio-responsive"
            style={{
              display: "grid",
              gridTemplateColumns: isMobileViewport ? "1fr" : "360px 1fr",
              justifyContent: "space-between",
              gap: isMobileViewport ? 16 : 24,
              alignItems: "start",
              width: "100%",
              maxWidth: 1320,
            }}
          >
            <div style={styles.studioRail}>{renderWorkspaceBody()}</div>

            <div style={styles.canvasColumn}>
              <div style={styles.previewMainRow}>
                <div style={styles.previewMainLeft}>
                  <div style={styles.previewHeader}>
                    <div>
                      <div style={styles.cardTitle}>
                        {previewTarget === "final"
                          ? t.home.finalPreviewTitle
                          : t.home.scenePreviewTitle}
                      </div>
                      <div style={styles.previewHeaderSub}>
                        {previewTarget === "final"
                          ? t.home.finalVideoButton
                          : selectedScene?.title ?? t.home.selectedScene}
                      </div>
                    </div>
                  </div>

                  <div style={styles.previewBoxLarge}>{renderPreviewContent()}</div>

                  {generation.status === "done" && generation.saveWarning ? (
                    <div style={styles.warningBox}>{generation.saveWarning}</div>
                  ) : null}

                  <div style={styles.outputCard}>
                    <div style={styles.cardTitle}>{t.home.outputTitle}</div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>{t.home.mode}</span>
                      <strong style={styles.infoValue}>
                        {mode.replaceAll("_", " ")}
                      </strong>
                    </div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>{t.home.scenes}</span>
                      <strong style={styles.infoValue}>
                        {generation.status === "done" ? displayScenes.length : "-"}
                      </strong>
                    </div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>{t.home.duration}</span>
                      <strong style={styles.infoValue}>
                        {generation.status === "done" && totalDuration
                          ? `${totalDuration}s`
                          : "-"}
                      </strong>
                    </div>

                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>{t.home.status}</span>
                      <span style={styles.status}>{statusText}</span>
                    </div>

                    {generation.status === "done" ? (
                      <a
                        href={generation.videoUrl}
                        download
                        style={styles.downloadLink}
                      >
                        {t.home.downloadVideo}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div style={styles.previewMainRight}>
                  <div style={styles.scenesRailCard}>
                    <div style={styles.cardTitle}>{t.home.sceneRailTitle}</div>

                    {displayScenes.length === 0 ? (
                      <div style={styles.smallNote}>
                        Video oluşturulduktan sonra sahneler burada görünecek.
                      </div>
                    ) : (
                      <div style={styles.scenesStack}>
                        {displayScenes.map((scene) => {
                          const isSelected = scene.id === selectedSceneId;

                          return (
                            <div
                              key={scene.id}
                              style={{
                                ...styles.sceneCard,
                                ...(isSelected ? styles.sceneCardActive : {}),
                              }}
                            >
                              {scene.videoUrl ? (
                                <div style={styles.sceneThumbWrap}>
                                  <video
                                    src={scene.videoUrl}
                                    muted
                                    playsInline
                                    controls
                                    style={styles.sceneVideo}
                                  />
                                </div>
                              ) : scene.imageUrl ? (
                                <div style={styles.sceneThumbWrap}>
                                  <img
                                    src={scene.imageUrl}
                                    alt={scene.title}
                                    style={styles.sceneThumb}
                                  />
                                </div>
                              ) : (
                                <div style={styles.sceneThumbPlaceholder}>
                                  {scene.title}
                                </div>
                              )}

                              <div style={styles.sceneTitleRow}>
                                <strong>{scene.title}</strong>
                                <span>{scene.durationSec}s</span>
                              </div>

                              <div style={styles.sceneDescription}>
                                {scene.description}
                              </div>

                              <div style={styles.sceneActions}>
                                <button
                                  type="button"
                                  style={styles.sceneActionButton}
                                  onClick={() => handleSelectScene(scene.id)}
                                >
                                  {t.common.select}
                                </button>
                                <button
                                  type="button"
                                  style={styles.sceneActionButtonDanger}
                                  onClick={() => handleDeleteScene(scene.id)}
                                >
                                  {t.common.delete}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
    }
  };

  return (
    <div style={styles.root}>
      <AppSidebar activeKey={activeNav} onSelect={setActiveNav} />

      <main style={styles.main}>
        <div style={styles.topBar}>
          <div>
            <div style={styles.kicker}>DUBLE-S MOTION</div>
            <h1 style={styles.title}>{t.home.title}</h1>
            <div style={styles.topSub}>{t.home.subtitle}</div>
          </div>

          <div style={styles.topBarRight}>
            <button
              type="button"
              style={{
                ...styles.topActionButton,
                ...(previewTarget === "final" ? styles.topActionButtonActive : {}),
              }}
              onClick={() => setPreviewTarget("final")}
            >
              {t.home.finalVideoButton}
            </button>

            <button
              type="button"
              style={styles.topActionButton}
              onClick={() => router.push("/billing")}
            >
              {t.home.upgradeCta}
            </button>

            <div style={styles.accountTopRight} ref={accountMenuRef}>
              <button
                type="button"
                style={styles.accountMiniButton}
                onClick={() => setAccountMenuOpen((prev) => !prev)}
              >
                <div style={styles.accountMiniAvatar}>
                  {(user?.name?.[0] || user?.email?.[0] || "D").toUpperCase()}
                </div>

                <div style={styles.accountMiniText}>
                  <strong style={styles.accountMiniName}>
                    {isAuthenticated ? user?.name || "User" : "Guest"}
                  </strong>
                  <span style={styles.accountMiniPlan}>
                    {user?.planLabel ?? "Free"}
                  </span>
                </div>

                <span style={styles.accountMiniCaret}>▾</span>
              </button>

              {accountMenuOpen ? (
                <div style={styles.accountDropdown}>
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
      </main>
    </div>
  );
}

function getDefaultPrompt(language: AppLanguage) {
  if (language === "tr") {
    return "Berlin sokaklarında yürüyen sinematik bir gezgin, yumuşak ışık, premium reklam hissi";
  }
  if (language === "de") {
    return "Ein cineastischer Reisender in den Straßen Berlins, weiches Licht, hochwertiger Werbestil";
  }
  return "A cinematic traveler walking through Berlin streets, soft light, premium ad mood";
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fbff 0%, #eef4ff 38%, #f7f2ff 100%)",
    color: "#0f172a",
  },

  main: {
    flex: 1,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 0,
    background:
      "radial-gradient(circle at top left, rgba(126, 87, 255, 0.08), transparent 28%), radial-gradient(circle at top right, rgba(77, 182, 255, 0.10), transparent 24%)",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },

  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  topActionButton: {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "rgba(255,255,255,0.96)",
    color: "#0f172a",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    minHeight: 40,
  },

  topActionButtonActive: {
    background: "#0f172a",
    color: "#fff",
    border: "1px solid #0f172a",
  },

  kicker: {
    fontSize: 12,
    color: "#64748b",
    letterSpacing: 0.4,
    fontWeight: 800,
  },

  title: {
    margin: "4px 0 0 0",
    fontSize: 34,
    lineHeight: 1.08,
    color: "#0f172a",
    fontWeight: 900,
    letterSpacing: -0.8,
  },

  topSub: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 720,
  },

  accountTopRight: {
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },

  accountMiniButton: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "rgba(255,255,255,0.94)",
    borderRadius: 16,
    padding: "8px 10px",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
    minWidth: 180,
  },

  accountMiniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 14,
    flexShrink: 0,
  },

  accountMiniText: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 0,
    flex: 1,
  },

  accountMiniName: {
    fontSize: 13,
    color: "#0f172a",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: 120,
  },

  accountMiniPlan: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.2,
  },

  accountMiniCaret: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
  },

  accountDropdown: {
    position: "absolute",
    top: "calc(100% + 10px)",
    right: 0,
    width: 280,
    borderRadius: 18,
    background: "rgba(255,255,255,0.98)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 22px 50px rgba(15,23,42,0.12)",
    padding: 14,
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  accountDropdownHeader: {
    paddingBottom: 10,
    borderBottom: "1px solid rgba(15,23,42,0.06)",
  },

  accountDropdownName: {
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 4,
  },

  accountDropdownEmail: {
    fontSize: 12,
    color: "#64748b",
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
    color: "#475569",
  },

  accountDropdownGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  accountDropdownLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  accountDropdownSelect: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#0f172a",
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
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  },

  accountDropdownButtonDanger: {
    flex: 1,
    minWidth: 110,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(239,68,68,0.16)",
    background: "#fff5f5",
    color: "#b91c1c",
    fontWeight: 800,
    cursor: "pointer",
  },

  studioRail: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  canvasColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
    alignItems: "stretch",
  },

  toolCard: {
    padding: 16,
    borderRadius: 22,
    background: "rgba(255,255,255,0.90)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 6,
  },

  sectionSub: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.6,
    marginBottom: 16,
  },

  modeTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
  },

  modeTab: {
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontWeight: 700,
    textTransform: "capitalize",
  },

  modeTabActive: {
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    border: "1px solid transparent",
  },

  label: {
    marginBottom: 8,
    display: "block",
    fontWeight: 800,
    fontSize: 13,
    color: "#334155",
  },

  inputGroup: {
    marginTop: 12,
  },

  prompt: {
    width: "100%",
    minHeight: 130,
    borderRadius: 16,
    border: "1px solid rgba(15,23,42,0.08)",
    padding: 14,
    background: "#fff",
    color: "#111827",
    resize: "vertical",
  },

  input: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    padding: "0 12px",
    background: "#fff",
    color: "#111827",
  },

  selectWide: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.08)",
    padding: "0 12px",
    background: "#fff",
    color: "#111827",
  },

  uploadRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },

  uploadReady: {
    fontSize: 13,
    color: "#059669",
    fontWeight: 800,
  },

  uploadHint: {
    fontSize: 13,
    color: "#64748b",
  },

  imagePreviewWrap: {
    marginTop: 12,
    width: 120,
    aspectRatio: "1 / 1",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
  },

  imagePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  controls: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
    alignItems: "center",
  },

  reset: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
  },

  generate: {
    padding: "12px 18px",
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    border: "none",
    borderRadius: 12,
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    boxShadow: "0 10px 22px rgba(77,182,255,0.16)",
  },

  generateDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  limitBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(254,226,226,0.9)",
    border: "1px solid rgba(239,68,68,0.16)",
    color: "#b91c1c",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.5,
  },

  smallNote: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.5,
  },

  logoInfoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(239,246,255,0.95)",
    border: "1px solid rgba(59,130,246,0.14)",
    color: "#1d4ed8",
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.5,
  },

  previewMainRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 560px) minmax(260px, 340px)",
    gap: 18,
    alignItems: "start",
    width: "100%",
  },

  previewMainLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
  },

  previewMainRight: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    minWidth: 0,
  },

  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    width: "100%",
  },

  previewHeaderSub: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },

  previewBoxLarge: {
    width: "100%",
    maxWidth: 560,
    aspectRatio: "1 / 1",
    margin: "0",
    borderRadius: 22,
    background: "#05070b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.10)",
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
    background: "#000",
    display: "block",
  },

  centerBox: {
    textAlign: "center",
    width: "100%",
    maxWidth: 320,
    padding: 24,
    color: "#fff",
  },

  previewText: {
    fontSize: 20,
    fontWeight: 800,
  },

  previewSubtext: {
    marginTop: 10,
    opacity: 0.72,
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
    padding: 14,
    borderRadius: 16,
    background: "rgba(254,249,195,0.92)",
    border: "1px solid rgba(250,204,21,0.25)",
    color: "#854d0e",
    fontWeight: 700,
    fontSize: 14,
    width: "100%",
    maxWidth: 560,
  },

  outputCard: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
    width: "100%",
    maxWidth: 560,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },

  infoLabel: {
    color: "#64748b",
    fontSize: 13,
  },

  infoValue: {
    fontSize: 13,
    color: "#0f172a",
  },

  status: {
    background: "#eef2ff",
    color: "#4338ca",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },

  downloadLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: 8,
    padding: "10px 14px",
    borderRadius: 12,
    background: "linear-gradient(135deg, #6d5dfc 0%, #4db6ff 100%)",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 800,
  },

  scenesRailCard: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(15,23,42,0.06)",
    boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
    width: "100%",
    minHeight: 100,
  },

  scenesStack: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },

  sceneCard: {
    padding: 12,
    borderRadius: 14,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.06)",
    width: "100%",
  },

  sceneCardActive: {
    border: "1px solid rgba(109,93,252,0.55)",
    boxShadow: "0 0 0 3px rgba(109,93,252,0.10)",
  },

  sceneThumbWrap: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
    background: "#f1f5f9",
  },

  sceneThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  sceneVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: "#000",
  },

  sceneThumbPlaceholder: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 10,
    marginBottom: 10,
    background: "#e2e8f0",
    display: "grid",
    placeItems: "center",
    color: "#475569",
    fontWeight: 800,
    fontSize: 12,
    textAlign: "center",
    padding: 10,
  },

  sceneTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
    fontSize: 12,
    color: "#0f172a",
  },

  sceneDescription: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 1.45,
    minHeight: 42,
  },

  sceneActions: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },

  sceneActionButton: {
    flex: 1,
    padding: "8px 9px",
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
  },

  sceneActionButtonDanger: {
    flex: 1,
    padding: "8px 9px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.16)",
    background: "#fff5f5",
    color: "#b91c1c",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 11,
  },

  secondaryPanel: {
    padding: 20,
    borderRadius: 24,
    background: "rgba(255,255,255,0.74)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 20px 50px rgba(15,23,42,0.06)",
  },

  secondaryTitle: {
    fontSize: 22,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 14,
  },

  appsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },

  appCard: {
    padding: 18,
    borderRadius: 18,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
  },

  appCardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 8,
  },

  appCardText: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },

  chatBox: {
    padding: 18,
    borderRadius: 18,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#475569",
    lineHeight: 1.6,
  },

  flowList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  flowItem: {
    padding: 14,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
    color: "#334155",
    fontWeight: 700,
  },

  cardTitle: {
    marginBottom: 10,
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#475569",
  },
};