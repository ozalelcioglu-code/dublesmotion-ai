"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  GenerationStudio,
  StudioDownloadLink,
  StudioEmpty,
  StudioField,
  StudioMediaPreview,
  StudioSegmented,
  StudioSelect,
  StudioTextArea,
  StudioUpload,
  type StudioTemplate,
} from "@/components/generation/GenerationStudio";
import { useLanguage } from "@/provider/languageProvider";
import { useSession } from "@/provider/SessionProvider";
import { useIsMobile } from "@/lib/useIsMobile";
import { useGenerationHistory } from "@/lib/generation/useGenerationHistory";
import {
  addV2HistoryItem,
  clearV2Prefill,
  getV2Prefill,
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
  uploadGenerationAsset,
} from "@/lib/generation/client";

type GenerationState =
  | { status: "idle" }
  | { status: "loading"; phase: string }
  | {
      status: "done";
      videoUrl: string;
      imageUrl: string;
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
    title: "Resimden Video",
    description:
      "Bir görsel yükle, hareketi tarif et ve aynı profesyonel preview akışında videoya dönüştür.",
    inputTitle: "Hareket brief’i",
    inputDescription:
      "Kaynak görsel, hareket promptu, stil ve format tek panelde.",
    sourceImage: "Kaynak görsel",
    uploadImage: "Görsel yükle",
    uploadDescription: "PNG, JPG veya WebP dosyanı seç.",
    prompt: "Hareket promptu",
    promptPlaceholder:
      "Kamera yavaşça yaklaşsın, saçlar hafif dalgalansın, ışık doğal kalsın, sinematik hareket olsun",
    style: "Stil",
    ratio: "Format",
    duration: "Süre",
    generate: "Videoya dönüştür",
    reset: "Sıfırla",
    previewTitle: "Preview",
    previewDescription: "Kaynak görsel ve üretilen video burada görünür.",
    emptyTitle: "Henüz görsel yok",
    emptyText: "Önce kaynak görsel yükle, sonra hareketi tarif et.",
    templatesTitle: "Hazır hareket briefleri",
    templatesDescription: "Görselin için uygun kamera hareketini hızlı seç.",
    loading: "Video hazırlanıyor...",
    uploading: "Görsel yükleniyor...",
    done: "Hazır",
    error: "Resimden video üretimi başarısız oldu.",
    credits: "Kredi",
    addToEditor: "Editöre ekle",
    download: "İndir",
    editorReady: "Video editöre gönderildi.",
  },
  en: {
    title: "Image to Video",
    description:
      "Upload an image, describe the motion, and convert it into video inside the same studio flow.",
    inputTitle: "Motion brief",
    inputDescription: "Source image, motion prompt, style, and format in one panel.",
    sourceImage: "Source image",
    uploadImage: "Upload image",
    uploadDescription: "Choose a PNG, JPG, or WebP file.",
    prompt: "Motion prompt",
    promptPlaceholder:
      "Camera slowly pushes in, hair moves gently, natural lighting stays intact, cinematic motion",
    style: "Style",
    ratio: "Format",
    duration: "Duration",
    generate: "Convert to video",
    reset: "Reset",
    previewTitle: "Preview",
    previewDescription: "The source image and generated video appear here.",
    emptyTitle: "No image yet",
    emptyText: "Upload a source image first, then describe the motion.",
    templatesTitle: "Ready motion briefs",
    templatesDescription: "Choose a camera move quickly.",
    loading: "Preparing video...",
    uploading: "Uploading image...",
    done: "Ready",
    error: "Image-to-video generation failed.",
    credits: "Credits",
    addToEditor: "Add to editor",
    download: "Download",
    editorReady: "Video sent to editor.",
  },
} as const;

const TEMPLATES = [
  {
    id: "portrait",
    title: "Portre canlandırma",
    description: "Yumuşak yaklaşma ve doğal mikro hareket.",
    prompt:
      "Kamera yavaşça yaklaşsın, gözler canlı kalsın, saç ve kıyafet hafif hareket etsin, yüz doğal ve stabil olsun",
    style: "realistic" as VisualStyle,
    ratio: "9:16" as AspectRatio,
    duration: "6",
    badge: "Portrait",
  },
  {
    id: "product",
    title: "Ürün kamera turu",
    description: "Ürünü merkezde tutan premium hareket.",
    prompt:
      "Kamera ürün etrafında yumuşak dönüş yapsın, yansımalar kontrollü kalsın, reklam filmi kalitesinde hareket olsun",
    style: "product" as VisualStyle,
    ratio: "1:1" as AspectRatio,
    duration: "8",
  },
  {
    id: "landscape",
    title: "Manzara parallax",
    description: "Derinlik ve atmosfer ekler.",
    prompt:
      "Ön plan ve arka plan arasında doğal parallax oluşsun, kamera yavaşça süzülsün, atmosfer sinematik olsun",
    style: "cinematic" as VisualStyle,
    ratio: "16:9" as AspectRatio,
    duration: "8",
  },
  {
    id: "fashion",
    title: "Fashion loop",
    description: "Editorial hareket ve ışık.",
    prompt:
      "Model sabit kompozisyonda kalsın, kumaş ve ışık hafif hareket etsin, dergi kapağı kalitesinde video olsun",
    style: "fashion" as VisualStyle,
    ratio: "9:16" as AspectRatio,
    duration: "6",
  },
];

export default function ImageToVideoPage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = safeLanguage === "tr" ? COPY.tr : COPY.en;

  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [style, setStyle] = useState<VisualStyle>("realistic");
  const [ratio, setRatio] = useState<AspectRatio>("9:16");
  const [durationSec, setDurationSec] = useState("6");
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [notice, setNotice] = useState("");
  const recentImageVideos = useGenerationHistory({
    user,
    type: "image_video",
    limit: 8,
  });

  useEffect(() => {
    const prefill = getV2Prefill<{
      intent?: string;
      prompt?: string;
      imageUrl?: string;
      style?: VisualStyle;
      ratio?: AspectRatio;
    }>();

    if (!prefill) return;

    if (prefill.intent === "image-to-video" || prefill.imageUrl) {
      if (prefill.prompt) setPrompt(prefill.prompt);
      if (prefill.imageUrl) setImageUrl(prefill.imageUrl);
      if (prefill.style) setStyle(prefill.style);
      if (prefill.ratio) setRatio(prefill.ratio);
      clearV2Prefill();
    }
  }, []);

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
                id: "current-image-video",
                title: generation.title,
                prompt: generation.prompt,
                thumbnailUrl: generation.imageUrl,
                metadata: {
                  style: generation.style,
                  ratio: generation.ratio,
                  requestedDurationSec: generation.durationSec,
                  sourceImageUrl: generation.imageUrl,
                },
                durationSec: generation.durationSec,
              },
            ]
          : [];
      const generatedTemplates = [...activeGeneration, ...recentImageVideos].map(
        (item) => ({
          id: `generated-${item.id}`,
          title: item.title,
          description: "Son resimden video üretiminden hareket brief’i.",
          badge: "Neon",
          onSelect: () => {
            const sourceImage =
              (item.metadata?.sourceImageUrl as string | undefined) ||
              item.thumbnailUrl ||
              "";

            setPrompt(item.prompt || item.title);
            if (sourceImage) setImageUrl(sourceImage);
            setStyle((item.metadata?.style as VisualStyle) || "realistic");
            setRatio((item.metadata?.ratio as AspectRatio) || "9:16");
            setDurationSec(
              String(
                item.metadata?.requestedDurationSec ||
                  item.durationSec ||
                  "6"
              )
            );
            setNotice("");
          },
        })
      );

      return [...staticTemplates, ...generatedTemplates];
    },
    [generation, recentImageVideos]
  );

  async function handleImageUpload(file: File) {
    try {
      setUploading(true);
      setNotice("");
      const uploadedUrl = await uploadGenerationAsset(file, "image");
      setImageUrl(uploadedUrl);
      setGeneration({ status: "idle" });
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();
    if (!imageUrl) {
      setGeneration({ status: "error", message: "Önce kaynak görsel yüklemelisin." });
      return;
    }

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
          mode: "image_to_video",
          imageUrl,
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
      const title = compactTitle(cleanPrompt, "Image Motion Video");

      setGeneration({
        status: "done",
        videoUrl,
        imageUrl,
        title,
        prompt: cleanPrompt,
        style,
        ratio,
        durationSec: duration,
        remainingCredits:
          typeof data.remainingCredits === "number" ? data.remainingCredits : null,
      });

      addV2HistoryItem({
        id: makeHistoryId("image-video"),
        type: "image_video",
        title,
        createdAt: new Date().toISOString(),
        url: videoUrl,
        thumbnailUrl: imageUrl,
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
    setImageUrl("");
    setPrompt(t.promptPlaceholder);
    setStyle("realistic");
    setRatio("9:16");
    setDurationSec("6");
    setGeneration({ status: "idle" });
    setNotice("");
  }

  function handleAddToEditor() {
    if (generation.status !== "done") return;

    setV2EditorPrefill({
      type: "video",
      source: "image-to-video",
      createdAt: new Date().toISOString(),
      title: generation.title,
      prompt: generation.prompt,
      videoUrl: generation.videoUrl,
      thumbnailUrl: generation.imageUrl,
      duration: generation.durationSec,
      style: generation.style,
      ratio: generation.ratio,
    });
    setNotice(t.editorReady);
  }

  const status =
    uploading
      ? { label: t.uploading, tone: "warning" as const }
      : generation.status === "loading"
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
      currentPath="/image-to-video"
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
          <StudioField label={t.sourceImage}>
            <StudioUpload
              title={t.uploadImage}
              description={t.uploadDescription}
              accept="image/*"
              mediaType="image"
              value={imageUrl}
              busy={uploading}
              onChange={handleImageUpload}
            />
          </StudioField>
          <StudioField label={t.prompt}>
            <StudioTextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={t.promptPlaceholder}
              rows={6}
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
        ) : imageUrl ? (
          <StudioMediaPreview kind="image" src={imageUrl} title={t.sourceImage} />
        ) : (
          <StudioEmpty title={t.emptyTitle} text={t.emptyText} />
        )
      }
      primaryAction={{
        label: generation.status === "loading" ? t.loading : t.generate,
        onClick: handleGenerate,
        disabled: uploading || generation.status === "loading",
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
