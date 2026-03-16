"use client";

import {
  Suspense,
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { useSession } from "../provider/SessionProvider";
import AppSidebar from "../components/AppSidebar";

type Mode = "text_to_video" | "url_to_video" | "image_to_video";
type Ratio = "square" | "vertical" | "horizontal";
type NavKey = "tool" | "apps" | "chat" | "flow" | "live";

type SceneCard = {
  id: string;
  title: string;
  description: string;
  durationSec: number;
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
      sceneImages?: string[];
      scenePrompts?: string[];
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
  const { user, isAuthenticated, isLoading, clearSession } = useSession();

  const [activeNav, setActiveNav] = useState<NavKey>("tool");
  const [mode, setMode] = useState<Mode>("text_to_video");
  const [prompt, setPrompt] = useState(
    "A cinematic hooded traveler walking through an old medieval city"
  );
  const [sourceUrl, setSourceUrl] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ratioUi, setRatioUi] = useState("1:1");

  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
  });

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

  const ratio = useMemo<Ratio>(() => {
    if (ratioUi === "1:1") return "square";
    if (ratioUi === "9:16") return "vertical";
    return "horizontal";
  }, [ratioUi]);

  const derivedScenes = useMemo<SceneCard[]>(() => {
    const clean = prompt.trim() || "Cinematic AI video";

    if (generation.status === "done" && generation.durationSec) {
      const sceneCount =
        generation.scenePrompts?.length && generation.scenePrompts.length > 0
          ? generation.scenePrompts.length
          : generation.durationSec >= 30
          ? 3
          : generation.durationSec >= 20
          ? 2
          : 1;

      const perScene = Math.max(
        1,
        Math.round(generation.durationSec / Math.max(sceneCount, 1))
      );

      return Array.from({ length: sceneCount }).map((_, index) => ({
        id: `scene-${index + 1}`,
        title: `Scene ${index + 1}`,
        description:
          generation.scenePrompts?.[index] ||
          `${clean} — scene ${index + 1} cinematic composition`,
        durationSec: perScene,
      }));
    }

    return [
      {
        id: "scene-1",
        title: "Scene 1",
        description: `${clean} — establishing shot`,
        durationSec: 4,
      },
      {
        id: "scene-2",
        title: "Scene 2",
        description: `${clean} — medium motion shot`,
        durationSec: 4,
      },
      {
        id: "scene-3",
        title: "Scene 3",
        description: `${clean} — closing cinematic shot`,
        durationSec: 4,
      },
    ];
  }, [prompt, generation]);

  const totalDuration = useMemo(() => {
    if (generation.status === "done" && generation.durationSec) {
      return generation.durationSec;
    }
    return derivedScenes.reduce((acc, scene) => acc + scene.durationSec, 0);
  }, [derivedScenes, generation]);

  const statusText =
    generation.status === "idle"
      ? "Ready"
      : generation.status === "loading"
      ? "Generating"
      : generation.status === "done"
      ? "Done"
      : "Error";

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
    try {
      setGeneration({
        status: "loading",
        phase: "Submitting generation request...",
      });

      let payload:
        | {
            mode: "text_to_video";
            prompt: string;
            ratio?: string;
          }
        | {
            mode: "url_to_video";
            prompt: string;
            sourceUrl: string;
            ratio?: string;
          }
        | {
            mode: "image_to_video";
            prompt: string;
            imageUrl: string;
            ratio?: string;
          };

      if (mode === "text_to_video") {
        payload = {
          mode,
          prompt,
          ratio: ratioUi,
        };
      } else if (mode === "url_to_video") {
        payload = {
          mode,
          prompt,
          sourceUrl,
          ratio: ratioUi,
        };
      } else {
        payload = {
          mode,
          prompt,
          imageUrl: uploadedImageUrl,
          ratio: ratioUi,
        };
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

      setGeneration({
        status: "done",
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl ?? null,
        videoId: data.videoId ?? null,
        durationSec: data.durationSec ?? 10,
        sceneImages: Array.isArray(data.sceneImages) ? data.sceneImages : [],
        scenePrompts: Array.isArray(data.scenePrompts) ? data.scenePrompts : [],
        saveWarning: data.saveWarning ?? null,
      });
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleReset = () => {
    setGeneration({ status: "idle" });
  };

  const canGenerate =
    generation.status !== "loading" &&
    !uploadingImage &&
    ((mode === "text_to_video" && prompt.trim().length >= 3) ||
      (mode === "url_to_video" &&
        prompt.trim().length >= 3 &&
        sourceUrl.trim().length > 0) ||
      (mode === "image_to_video" &&
        prompt.trim().length >= 3 &&
        uploadedImageUrl.trim().length > 0));

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
                <div style={styles.appCardTitle}>URL Video Engine</div>
                <div style={styles.appCardText}>
                  Görsel URL’den doğrudan video oluştur.
                </div>
              </div>
            </div>
          </section>
        );

      case "chat":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>AI Chat Assistant</div>
            <div style={styles.chatBox}>
              Buradan ileride prompt iyileştirme, reklam metni üretimi ve
              otomatik storyboard önerileri gelecek.
            </div>
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
              <div style={styles.flowItem}>4. Blob storage’a kaydet</div>
              <div style={styles.flowItem}>5. Neon DB’ye yaz</div>
            </div>
          </section>
        );

      case "live":
        return (
          <section style={styles.secondaryPanel}>
            <div style={styles.secondaryTitle}>Live</div>
            <div style={styles.chatBox}>
              Live üretim ve gerçek zamanlı preview alanı burada aktifleşecek.
            </div>
          </section>
        );

      case "tool":
      default:
        return (
          <section style={styles.mainWorkspace}>
            <div style={styles.previewCard}>
              <div style={styles.previewBox}>
                {generation.status === "done" ? (
                  <video
                    src={generation.videoUrl}
                    controls
                    style={styles.video}
                  />
                ) : generation.status === "loading" ? (
                  <div style={styles.centerBox}>
                    <div style={styles.spinner} />
                    <div style={styles.previewText}>Generating video...</div>
                    <div style={styles.previewSubtext}>{generation.phase}</div>
                  </div>
                ) : generation.status === "error" ? (
                  <div style={styles.centerBox}>
                    <div style={styles.previewText}>Generation failed</div>
                    <div style={styles.previewSubtext}>
                      {generation.message}
                    </div>
                  </div>
                ) : (
                  <div style={styles.centerBox}>
                    <div style={styles.previewText}>
                      Video preview will appear here
                    </div>
                    <div style={styles.previewSubtext}>
                      Mode seç, gerekli alanları doldur ve Generate ile üretimi
                      başlat.
                    </div>
                  </div>
                )}
              </div>

              {generation.status === "done" && generation.saveWarning ? (
                <div style={styles.warningBox}>{generation.saveWarning}</div>
              ) : null}

              <div style={styles.timelineCard}>
                <div style={styles.cardTitle}>Timeline</div>
                <div style={styles.timelineRow}>
                  {derivedScenes.map((scene, index) => (
                    <div key={scene.id} style={styles.timelineItem}>
                      <div style={styles.timelineIndex}>{index + 1}</div>
                      <div style={styles.timelineMeta}>
                        <div style={styles.timelineName}>{scene.title}</div>
                        <div style={styles.timelineDuration}>
                          {scene.durationSec}s
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.sideColumn}>
              <div style={styles.accountCard}>
                <div>
                  <div style={styles.cardTitle}>Account</div>

                  {isLoading ? (
                    <div style={styles.accountMeta}>Loading...</div>
                  ) : isAuthenticated ? (
                    <div style={styles.accountMeta}>
                      {user?.email ?? "Signed in"}
                      <br />
                      Plan: {user?.planLabel ?? "Free"}
                    </div>
                  ) : (
                    <div style={styles.accountMeta}>You are not signed in</div>
                  )}
                </div>

                <div style={styles.accountActions}>
                  {!isLoading && !isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        style={styles.outlineButton}
                        onClick={() => {
                          router.push("/login");
                        }}
                      >
                        Login
                      </button>

                      <button
                        type="button"
                        style={styles.outlineButton}
                        onClick={() => {
                          router.push("/billing");
                        }}
                      >
                        Plans
                      </button>
                    </>
                  ) : null}

                  {!isLoading && isAuthenticated ? (
                    <>
                      <button
                        type="button"
                        style={styles.outlineButton}
                        onClick={() => {
                          router.push("/billing");
                        }}
                      >
                        Plans
                      </button>

                      <button
                        type="button"
                        style={styles.outlineButton}
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div style={styles.controlCard}>
                <div style={styles.cardTitle}>Generator</div>

                <div style={styles.modeTabs}>
                  {(
                    [
                      "text_to_video",
                      "url_to_video",
                      "image_to_video",
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

                <label style={styles.label}>Prompt</label>
                <textarea
                  style={styles.prompt}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />

                {mode === "url_to_video" ? (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Source URL</label>
                    <input
                      style={styles.input}
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                ) : null}

                {mode === "image_to_video" ? (
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Görüntü Ekle</label>

                    <div style={styles.uploadRow}>
                      <label style={styles.uploadButton}>
                        Görüntü Seç
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImagePick}
                          style={{ display: "none" }}
                        />
                      </label>

                      {uploadingImage ? (
                        <span style={styles.uploadHint}>Yükleniyor...</span>
                      ) : uploadedImageUrl ? (
                        <span style={styles.uploadReady}>Görsel yüklendi</span>
                      ) : (
                        <span style={styles.uploadHint}>
                          Henüz görsel seçilmedi
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

                <div style={styles.controls}>
                  <select
                    value={ratioUi}
                    onChange={(e) => setRatioUi(e.target.value)}
                    style={styles.select}
                  >
                    <option value="1:1">1:1</option>
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                  </select>

                  <button
                    type="button"
                    style={styles.reset}
                    onClick={handleReset}
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.generate,
                      ...(!canGenerate ? styles.generateDisabled : {}),
                    }}
                    onClick={canGenerate ? handleGenerate : undefined}
                  >
                    {uploadingImage
                      ? "Uploading..."
                      : generation.status === "loading"
                      ? "Generating..."
                      : "Generate"}
                  </button>
                </div>
              </div>

              <div style={styles.outputCard}>
                <div style={styles.cardTitle}>Output</div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Mode</span>
                  <strong style={styles.infoValue}>
                    {mode.replaceAll("_", " ")}
                  </strong>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Ratio</span>
                  <strong style={styles.infoValue}>{ratioUi}</strong>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Scenes</span>
                  <strong style={styles.infoValue}>
                    {derivedScenes.length}
                  </strong>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Duration</span>
                  <strong style={styles.infoValue}>{totalDuration}s</strong>
                </div>

                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Status</span>
                  <span style={styles.status}>{statusText}</span>
                </div>

                {generation.status === "done" ? (
                  <a
                    href={generation.videoUrl}
                    download
                    style={styles.downloadLink}
                  >
                    Download video
                  </a>
                ) : null}
              </div>

              <div style={styles.scenesCard}>
                <div style={styles.cardTitle}>Scenes</div>

                {derivedScenes.map((scene, index) => {
                  const sceneImage =
                    generation.status === "done"
                      ? generation.sceneImages?.[index]
                      : null;

                  return (
                    <div key={scene.id} style={styles.scene}>
                      {sceneImage ? (
                        <div style={styles.sceneImageWrap}>
                          <img
                            src={sceneImage}
                            alt={scene.title}
                            style={styles.sceneImage}
                          />
                        </div>
                      ) : null}

                      <div style={styles.sceneTitleRow}>
                        <strong>{scene.title}</strong>
                        <span>{scene.durationSec}s</span>
                      </div>

                      <div style={styles.sceneDescription}>
                        {generation.status === "done" &&
                        generation.scenePrompts?.[index]
                          ? generation.scenePrompts[index]
                          : scene.description}
                      </div>
                    </div>
                  );
                })}
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
            <h1 style={styles.title}>AI Video Studio</h1>
          </div>
        </div>

        {renderPanel()}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fbff 0%, #eef4ff 38%, #f7f2ff 100%)",
    color: "#0f172a",
  },

  main: {
    flex: 1,
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minWidth: 0,
    background:
      "radial-gradient(circle at top left, rgba(126, 87, 255, 0.10), transparent 28%), radial-gradient(circle at top right, rgba(77, 182, 255, 0.12), transparent 24%)",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },

  kicker: {
    fontSize: 12,
    color: "#64748b",
    letterSpacing: 0.4,
    fontWeight: 800,
  },

  title: {
    margin: "4px 0 0 0",
    fontSize: 42,
    lineHeight: 1.05,
    color: "#0f172a",
  },

  mainWorkspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.2fr) 420px",
    gap: 20,
    alignItems: "start",
  },

  previewCard: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },

  previewBox: {
    width: "100%",
    maxWidth: 700,
    aspectRatio: "1 / 1",
    borderRadius: 24,
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.10)",
  },

  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    background: "#000",
  },

  centerBox: {
    textAlign: "center",
    width: "100%",
    maxWidth: 420,
    padding: 24,
    color: "#fff",
  },

  previewText: {
    fontSize: 22,
    fontWeight: 800,
  },

  previewSubtext: {
    marginTop: 10,
    opacity: 0.72,
    fontSize: 14,
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
  },

  timelineCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
  },

  cardTitle: {
    marginBottom: 12,
    fontWeight: 900,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#334155",
  },

  timelineRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },

  timelineItem: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid rgba(15,23,42,0.08)",
    minWidth: 0,
  },

  timelineIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "#6d5dfc",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 800,
    flexShrink: 0,
  },

  timelineMeta: {
    minWidth: 0,
  },

  timelineName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  timelineDuration: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  sideColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  accountCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  accountMeta: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 700,
    lineHeight: 1.5,
  },

  accountActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  outlineButton: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    cursor: "pointer",
  },

  controlCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
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
    minHeight: 150,
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
    width: 140,
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

  select: {
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
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
    boxShadow: "0 14px 30px rgba(77,182,255,0.18)",
  },

  generateDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },

  outputCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
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

  scenesCard: {
    padding: 16,
    borderRadius: 20,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.08)",
    boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
  },

  scene: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.08)",
  },

  sceneImageWrap: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#fff",
  },

  sceneImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  sceneTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 6,
    fontSize: 13,
    color: "#0f172a",
  },

  sceneDescription: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.45,
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
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
};