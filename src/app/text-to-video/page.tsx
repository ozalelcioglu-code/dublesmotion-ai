"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  GenerationStudio,
  StudioDownloadLink,
  StudioEmpty,
  StudioField,
  StudioMediaPreview,
  StudioSegmented,
  StudioSelect,
  StudioTextArea,
  type StudioTemplate,
} from "@/components/generation/GenerationStudio";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { useGenerationHistory } from "@/lib/generation/useGenerationHistory";
import {
  addV2HistoryItem,
  makeHistoryId,
  setV2EditorPrefill,
} from "@/lib/v2-store";
import {
  DURATION_OPTIONS,
  RATIO_OPTIONS,
  VISUAL_STYLE_OPTIONS,
  type AspectRatio,
  type VisualStyle,
} from "@/lib/generation/options";
import {
  buildSessionHeaders,
  compactTitle,
  getSafeGenerationLanguage,
} from "@/lib/generation/client";

type GenerationState =
  | { status: "idle" }
  | { status: "loading"; phase: string }
  | {
      status: "done";
      videoUrl: string;
      title: string;
      prompt: string;
      style: VisualStyle;
      ratio: AspectRatio;
      durationSec: number;
      remainingCredits: number | null;
    }
  | { status: "error"; message: string };

const COPY = {
  tr: {
    title: "Video Üretimi",
    description:
      "Sahneyi yaz, kamera dilini seç ve editöre hazır kısa video üret.",
    inputTitle: "Video brief’i",
    inputDescription:
      "Sahne, hareket, stil, süre ve format tek üretim panelinde.",
    prompt: "Prompt",
    promptPlaceholder:
      "Gece şehir ışıklarında yürüyen karakter, yavaş kamera takibi, sinematik reklam kalitesi",
    style: "Stil",
    ratio: "Format",
    duration: "Süre",
    generate: "Video üret",
    reset: "Sıfırla",
    previewTitle: "Preview",
    previewDescription: "Üretilen video burada oynatılır.",
    emptyTitle: "Henüz video yok",
    emptyText: "Promptu tamamlayıp üretimi başlat.",
    templatesTitle: "Hazır video briefleri",
    templatesDescription: "Bir başlangıç seç, sonra sahneyi markana göre düzenle.",
    loading: "Video hazırlanıyor...",
    done: "Hazır",
    error: "Video üretimi başarısız oldu.",
    credits: "Kredi",
    addToEditor: "Editöre ekle",
    download: "İndir",
    editorReady: "Video editöre gönderildi.",
  },
  en: {
    title: "Video Studio",
    description:
      "Write the scene, choose the camera language, and generate an editor-ready short video.",
    inputTitle: "Video brief",
    inputDescription: "Scene, motion, style, duration, and format in one panel.",
    prompt: "Prompt",
    promptPlaceholder:
      "A character walking through city lights at night, slow tracking camera, cinematic commercial quality",
    style: "Style",
    ratio: "Format",
    duration: "Duration",
    generate: "Generate video",
    reset: "Reset",
    previewTitle: "Preview",
    previewDescription: "The generated video plays here.",
    emptyTitle: "No video yet",
    emptyText: "Complete the prompt and start generation.",
    templatesTitle: "Ready video briefs",
    templatesDescription: "Pick a starting point, then adapt the scene.",
    loading: "Preparing video...",
    done: "Ready",
    error: "Video generation failed.",
    credits: "Credits",
    addToEditor: "Add to editor",
    download: "Download",
    editorReady: "Video sent to editor.",
  },
} as const;

const TEMPLATES = [
  {
    id: "commercial",
    title: "Premium reklam",
    description: "Parlak marka filmi hissi.",
    prompt:
      "Premium marka reklam filmi, kontrollü ışık, yavaş kamera hareketi, modern şehir atmosferi, yüksek prodüksiyon kalitesi",
    style: "cinematic" as VisualStyle,
    ratio: "16:9" as AspectRatio,
    duration: "8",
    badge: "Pro",
  },
  {
    id: "social",
    title: "Dikey sosyal video",
    description: "Mobil akışa uygun hareket.",
    prompt:
      "Dikey sosyal medya videosu, enerjik kamera hareketi, net konu, parlak doğal ışık, premium içerik kalitesi",
    style: "realistic" as VisualStyle,
    ratio: "9:16" as AspectRatio,
    duration: "6",
  },
  {
    id: "product",
    title: "Ürün hareketi",
    description: "Ürünü merkezde tutar.",
    prompt:
      "Lüks ürün tanıtım videosu, ürün etrafında yumuşak kamera dönüşü, temiz arka plan, reklam kalitesi",
    style: "product" as VisualStyle,
    ratio: "1:1" as AspectRatio,
    duration: "8",
  },
  {
    id: "anime",
    title: "Anime sahne",
    description: "Poster tadında hareket.",
    prompt:
      "Detaylı anime sahnesi, dramatik ışık, karakter odaklı yumuşak hareket, etkileyici atmosfer",
    style: "anime" as VisualStyle,
    ratio: "16:9" as AspectRatio,
    duration: "6",
  },
];

export default function TextToVideoPage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = safeLanguage === "tr" ? COPY.tr : COPY.en;

  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [style, setStyle] = useState<VisualStyle>("cinematic");
  const [ratio, setRatio] = useState<AspectRatio>("16:9");
  const [durationSec, setDurationSec] = useState("8");
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [notice, setNotice] = useState("");
  const recentVideos = useGenerationHistory({
    user,
    type: "text_video",
    limit: 8,
  });

  const templates = useMemo<StudioTemplate[]>(
    () => {
      const staticTemplates = TEMPLATES.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        badge: template.badge,
        onSelect: () => {
          setPrompt(template.prompt);
          setStyle(template.style);
          setRatio(template.ratio);
          setDurationSec(template.duration);
          setNotice("");
        },
      }));

      const activeGeneration =
        generation.status === "done"
          ? [
              {
                id: "current-video",
                title: generation.title,
                prompt: generation.prompt,
                metadata: {
                  style: generation.style,
                  ratio: generation.ratio,
                  requestedDurationSec: generation.durationSec,
                },
                durationSec: generation.durationSec,
              },
            ]
          : [];
      const generatedTemplates = [...activeGeneration, ...recentVideos].map(
        (item) => ({
          id: `generated-${item.id}`,
          title: item.title,
          description: "Son üretilen videodan brief.",
          badge: "Neon",
          onSelect: () => {
            setPrompt(item.prompt || item.title);
            setStyle((item.metadata?.style as VisualStyle) || "cinematic");
            setRatio((item.metadata?.ratio as AspectRatio) || "16:9");
            setDurationSec(
              String(
                item.metadata?.requestedDurationSec ||
                  item.durationSec ||
                  "8"
              )
            );
            setNotice("");
          },
        })
      );

      return [...staticTemplates, ...generatedTemplates];
    },
    [generation, recentVideos]
  );

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setGeneration({ status: "error", message: "Prompt alanı boş olamaz." });
      return;
    }

    try {
      setNotice("");
      setGeneration({ status: "loading", phase: t.loading });

      const duration = Number(durationSec);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: buildSessionHeaders(user),
        body: JSON.stringify({
          mode: "text_to_video",
          prompt: cleanPrompt,
          style,
          ratio,
          durationSec: duration,
          preview: false,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.videoUrl) {
        throw new Error(data?.error || t.error);
      }

      const videoUrl = String(data.videoUrl);
      const title = compactTitle(cleanPrompt, "Generated Video");

      setGeneration({
        status: "done",
        videoUrl,
        title,
        prompt: cleanPrompt,
        style,
        ratio,
        durationSec: duration,
        remainingCredits:
          typeof data.remainingCredits === "number" ? data.remainingCredits : null,
      });

      addV2HistoryItem({
        id: makeHistoryId("text-video"),
        type: "text_video",
        title,
        createdAt: new Date().toISOString(),
        url: videoUrl,
        prompt: cleanPrompt,
        durationSec: duration,
      });

      await refreshSession();
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    }
  }

  function handleReset() {
    setPrompt(t.promptPlaceholder);
    setStyle("cinematic");
    setRatio("16:9");
    setDurationSec("8");
    setGeneration({ status: "idle" });
    setNotice("");
  }

  function handleAddToEditor() {
    if (generation.status !== "done") return;

    setV2EditorPrefill({
      type: "video",
      source: "text-to-video",
      createdAt: new Date().toISOString(),
      title: generation.title,
      prompt: generation.prompt,
      videoUrl: generation.videoUrl,
      duration: generation.durationSec,
      style: generation.style,
      ratio: generation.ratio,
    });
    setNotice(t.editorReady);
  }

  const status =
    generation.status === "loading"
      ? { label: generation.phase, tone: "warning" as const }
      : generation.status === "done"
      ? { label: t.done, tone: "good" as const }
      : generation.status === "error"
      ? { label: generation.message, tone: "danger" as const }
      : { label: "Ready" };

  const credits =
    generation.status === "done" ? generation.remainingCredits : user?.remainingCredits;

  return (
    <GenerationStudio
      currentPath="/text-to-video"
      title={t.title}
      description={t.description}
      badge="Duble-S Motion"
      isMobile={isMobile}
      status={status}
      metrics={[
        { label: t.credits, value: credits ?? "-" },
        { label: t.duration, value: `${durationSec} sn` },
        { label: t.ratio, value: ratio },
      ]}
      inputTitle={t.inputTitle}
      inputDescription={t.inputDescription}
      inputPanel={
        <>
          <StudioField label={t.prompt}>
            <StudioTextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={t.promptPlaceholder}
              rows={7}
            />
          </StudioField>
          <StudioField label={t.style}>
            <StudioSelect<VisualStyle>
              value={style}
              onChange={setStyle}
              options={VISUAL_STYLE_OPTIONS}
            />
          </StudioField>
          <StudioField label={t.ratio}>
            <StudioSegmented<AspectRatio>
              value={ratio}
              onChange={setRatio}
              options={RATIO_OPTIONS}
            />
          </StudioField>
          <StudioField label={t.duration}>
            <StudioSelect
              value={durationSec}
              onChange={setDurationSec}
              options={DURATION_OPTIONS}
            />
          </StudioField>
        </>
      }
      previewTitle={t.previewTitle}
      previewDescription={t.previewDescription}
      preview={
        generation.status === "done" ? (
          <div style={styles.previewStack}>
            <StudioMediaPreview
              kind="video"
              src={generation.videoUrl}
              title={generation.title}
            />
            <StudioDownloadLink href={generation.videoUrl} label={t.download} />
          </div>
        ) : (
          <StudioEmpty title={t.emptyTitle} text={t.emptyText} />
        )
      }
      primaryAction={{
        label: generation.status === "loading" ? t.loading : t.generate,
        onClick: handleGenerate,
        disabled: generation.status === "loading",
      }}
      secondaryActions={[
        { label: t.reset, onClick: handleReset },
        {
          label: t.addToEditor,
          onClick: handleAddToEditor,
          disabled: generation.status !== "done",
        },
      ]}
      notice={notice}
      templates={templates}
      templatesTitle={t.templatesTitle}
      templatesDescription={t.templatesDescription}
    />
  );
}

const styles: Record<string, CSSProperties> = {
  previewStack: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
  },
};
