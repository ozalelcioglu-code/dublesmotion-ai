"use client";

import { useMemo, useState } from "react";
import {
  GenerationStudio,
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
import { addV2HistoryItem, makeHistoryId, setV2Prefill } from "@/lib/v2-store";
import {
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
      imageUrl: string;
      title: string;
      prompt: string;
      style: VisualStyle;
      ratio: AspectRatio;
      remainingCredits: number | null;
    }
  | { status: "error"; message: string };

const COPY = {
  tr: {
    title: "Görsel Üretimi",
    description:
      "Promptunu yaz, görsel stilini seç ve sonucu video akışına hazır şekilde üret.",
    inputTitle: "Görsel brief’i",
    inputDescription: "Kompozisyon, ışık, obje ve estetik yönlendirmesini tek yerde yönet.",
    prompt: "Prompt",
    promptPlaceholder:
      "Premium ürün çekimi, temiz arka plan, kontrollü ışık, reklam kalitesinde detay",
    style: "Stil",
    ratio: "Format",
    generate: "Görsel üret",
    reset: "Sıfırla",
    previewTitle: "Preview",
    previewDescription: "Üretim sonucu burada görünür.",
    emptyTitle: "Henüz görsel yok",
    emptyText: "Sol tarafta promptu tamamlayıp üretimi başlat.",
    templatesTitle: "Hazır briefler",
    templatesDescription: "Bir başlangıç seç, sonra promptu kendi fikrine göre düzenle.",
    done: "Hazır",
    loading: "Görsel hazırlanıyor...",
    error: "Görsel üretimi başarısız oldu.",
    credits: "Kredi",
    download: "İndir",
    turnIntoVideo: "Video akışına gönder",
    routed: "Görsel image-to-video akışına hazırlandı.",
  },
  en: {
    title: "Image Studio",
    description:
      "Write a visual brief, choose the format, and generate an image ready for the video flow.",
    inputTitle: "Image brief",
    inputDescription: "Control composition, lighting, subject, and aesthetic in one place.",
    prompt: "Prompt",
    promptPlaceholder:
      "Premium product shot, clean background, controlled lighting, commercial detail",
    style: "Style",
    ratio: "Format",
    generate: "Generate image",
    reset: "Reset",
    previewTitle: "Preview",
    previewDescription: "The generated image appears here.",
    emptyTitle: "No image yet",
    emptyText: "Complete the prompt on the left and start generation.",
    templatesTitle: "Ready briefs",
    templatesDescription: "Pick a starting point, then adapt the prompt.",
    done: "Ready",
    loading: "Preparing image...",
    error: "Image generation failed.",
    credits: "Credits",
    download: "Download",
    turnIntoVideo: "Send to video flow",
    routed: "Image prepared for image-to-video.",
  },
} as const;

const TEMPLATES = [
  {
    id: "product",
    title: "Ürün hero",
    description: "Temiz reklam kompozisyonu.",
    prompt:
      "Premium ürün hero shot, temiz arka plan, kontrollü ışık, reklam kalitesinde detay, keskin odak",
    style: "product" as VisualStyle,
    ratio: "1:1" as AspectRatio,
    badge: "Commerce",
  },
  {
    id: "fashion",
    title: "Fashion editorial",
    description: "Dergi kapağı hissi.",
    prompt:
      "Lüks moda editorial çekimi, yumuşak sinematik ışık, premium styling, profesyonel portre",
    style: "fashion" as VisualStyle,
    ratio: "9:16" as AspectRatio,
  },
  {
    id: "cinematic",
    title: "Sinematik sahne",
    description: "Film karesi estetiği.",
    prompt:
      "Sinematik gece sahnesi, doğal lens derinliği, dramatik ışık, yüksek prodüksiyon kalitesi",
    style: "cinematic" as VisualStyle,
    ratio: "16:9" as AspectRatio,
  },
  {
    id: "anime",
    title: "Anime visual",
    description: "Poster etkili anime stil.",
    prompt:
      "Detaylı anime key visual, güçlü kompozisyon, atmosferik arka plan, premium poster kalitesi",
    style: "anime" as VisualStyle,
    ratio: "16:9" as AspectRatio,
  },
];

export default function TextToImagePage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = safeLanguage === "tr" ? COPY.tr : COPY.en;

  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [style, setStyle] = useState<VisualStyle>("product");
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [notice, setNotice] = useState("");
  const recentImages = useGenerationHistory({
    user,
    type: "image",
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
          setNotice("");
        },
      }));

      const activeGeneration =
        generation.status === "done"
          ? [
              {
                id: "current-image",
                title: generation.title,
                prompt: generation.prompt,
                metadata: {
                  style: generation.style,
                  ratio: generation.ratio,
                },
              },
            ]
          : [];
      const generatedTemplates = [...activeGeneration, ...recentImages].map(
        (item) => ({
          id: `generated-${item.id}`,
          title: item.title,
          description: "Son üretilen görselden brief.",
          badge: "Neon",
          onSelect: () => {
            setPrompt(item.prompt || item.title);
            setStyle((item.metadata?.style as VisualStyle) || "cinematic");
            setRatio((item.metadata?.ratio as AspectRatio) || "16:9");
            setNotice("");
          },
        })
      );

      return [...staticTemplates, ...generatedTemplates];
    },
    [generation, recentImages]
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

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: buildSessionHeaders(user),
        body: JSON.stringify({
          mode: "text_to_image",
          prompt: cleanPrompt,
          style,
          ratio,
          preview: false,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.imageUrl) {
        throw new Error(data?.error || t.error);
      }

      const imageUrl = String(data.imageUrl);
      const title = compactTitle(cleanPrompt, "Generated Image");

      setGeneration({
        status: "done",
        imageUrl,
        title,
        prompt: cleanPrompt,
        style,
        ratio,
        remainingCredits:
          typeof data.remainingCredits === "number" ? data.remainingCredits : null,
      });

      addV2HistoryItem({
        id: makeHistoryId("image"),
        type: "image",
        title,
        createdAt: new Date().toISOString(),
        url: imageUrl,
        prompt: cleanPrompt,
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
    setStyle("product");
    setRatio("1:1");
    setGeneration({ status: "idle" });
    setNotice("");
  }

  function handleTurnIntoVideo() {
    if (generation.status !== "done") return;

    setV2Prefill({
      intent: "image-to-video",
      prompt: generation.prompt,
      imageUrl: generation.imageUrl,
      style: generation.style,
      ratio: generation.ratio,
      source: "text-to-image",
      createdAt: new Date().toISOString(),
    });
    setNotice(t.routed);
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
      currentPath="/text-to-image"
      title={t.title}
      description={t.description}
      badge="Duble-S Motion"
      isMobile={isMobile}
      status={status}
      metrics={[{ label: t.credits, value: credits ?? "-" }]}
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
        </>
      }
      previewTitle={t.previewTitle}
      previewDescription={t.previewDescription}
      preview={
        generation.status === "done" ? (
          <StudioMediaPreview
            kind="image"
            src={generation.imageUrl}
            title={generation.title}
          />
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
          label: t.turnIntoVideo,
          onClick: handleTurnIntoVideo,
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
