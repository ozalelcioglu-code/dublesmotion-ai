"use client";

import { useEffect, useMemo, useState } from "react";
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
  getRatioOptions,
  getVisualStyleOptions,
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
    promptRequired: "Prompt alanı boş olamaz.",
    generatedTemplateDescription: "Son üretilen görselden brief.",
    generatedTitle: "Üretilen Görsel",
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
    promptRequired: "Prompt cannot be empty.",
    generatedTemplateDescription: "Brief from the latest generated image.",
    generatedTitle: "Generated Image",
  },
  de: {
    title: "Bildstudio",
    description:
      "Schreibe deinen visuellen Brief, wähle den Stil und erzeuge ein Bild für den Videoablauf.",
    inputTitle: "Bildbrief",
    inputDescription: "Steuere Komposition, Licht, Motiv und Ästhetik an einem Ort.",
    prompt: "Prompt",
    promptPlaceholder:
      "Premium Produktaufnahme, sauberer Hintergrund, kontrolliertes Licht, Werbequalität mit klaren Details",
    style: "Stil",
    ratio: "Format",
    generate: "Bild erzeugen",
    reset: "Zurücksetzen",
    previewTitle: "Preview",
    previewDescription: "Das erzeugte Bild erscheint hier.",
    emptyTitle: "Noch kein Bild",
    emptyText: "Vervollständige links den Prompt und starte die Erstellung.",
    templatesTitle: "Fertige Briefs",
    templatesDescription: "Wähle einen Startpunkt und passe den Prompt an.",
    done: "Bereit",
    loading: "Bild wird vorbereitet...",
    error: "Bilderzeugung fehlgeschlagen.",
    credits: "Credits",
    download: "Download",
    turnIntoVideo: "Zum Videoablauf senden",
    routed: "Bild für Bild-zu-Video vorbereitet.",
    promptRequired: "Prompt darf nicht leer sein.",
    generatedTemplateDescription: "Brief aus dem zuletzt erzeugten Bild.",
    generatedTitle: "Erzeugtes Bild",
  },
  ku: {
    title: "Stûdyoya Wêneyê",
    description:
      "Briefa xwe binivîse, stîla wêneyê hilbijêre û encamê ji bo vîdyoyê amade bike.",
    inputTitle: "Briefa wêneyê",
    inputDescription: "Kompozîsyon, ronahî, mijar û estetîkê di yek cihî de rêve bibe.",
    prompt: "Prompt",
    promptPlaceholder:
      "Wêneya hilbera premium, paşxaneya paqij, ronahiya kontrolkirî, detaya kalîteya reklamê",
    style: "Stîl",
    ratio: "Format",
    generate: "Wêne çêke",
    reset: "Ji nû ve",
    previewTitle: "Preview",
    previewDescription: "Wêneya çêkirî li vir xuya dibe.",
    emptyTitle: "Hê wêne tune",
    emptyText: "Li aliyê çepê promptê temam bike û dest bi çêkirinê bike.",
    templatesTitle: "Briefên amade",
    templatesDescription: "Destpêkek hilbijêre, paşê promptê li gor fikra xwe biguherîne.",
    done: "Amade",
    loading: "Wêne tê amadekirin...",
    error: "Çêkirina wêneyê bi ser neket.",
    credits: "Kredit",
    download: "Daxe",
    turnIntoVideo: "Bişîne rêya vîdyoyê",
    routed: "Wêne ji bo ji-wêneyê-vîdyo hate amadekirin.",
    promptRequired: "Prompt vala nabe.",
    generatedTemplateDescription: "Brief ji wêneya dawî ya çêkirî.",
    generatedTitle: "Wêneya Çêkirî",
  },
} as const;

type ImageTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  style: VisualStyle;
  ratio: AspectRatio;
  badge?: string;
};

function isVisualStyle(value: string | null): value is VisualStyle {
  return (
    value === "cinematic" ||
    value === "realistic" ||
    value === "fashion" ||
    value === "product" ||
    value === "anime" ||
    value === "cartoon" ||
    value === "3d_animation"
  );
}

function isAspectRatio(value: string | null): value is AspectRatio {
  return value === "16:9" || value === "9:16" || value === "1:1";
}

const TEMPLATES: Record<keyof typeof COPY, ImageTemplate[]> = {
  tr: [
    {
      id: "product",
      title: "Ürün hero",
      description: "Temiz reklam kompozisyonu.",
      prompt:
        "Premium ürün hero shot, temiz arka plan, kontrollü ışık, reklam kalitesinde detay, keskin odak",
      style: "product",
      ratio: "1:1",
      badge: "Commerce",
    },
    {
      id: "fashion",
      title: "Fashion editorial",
      description: "Dergi kapağı hissi.",
      prompt:
        "Lüks moda editorial çekimi, yumuşak sinematik ışık, premium styling, profesyonel portre",
      style: "fashion",
      ratio: "9:16",
    },
    {
      id: "cinematic",
      title: "Sinematik sahne",
      description: "Film karesi estetiği.",
      prompt:
        "Sinematik gece sahnesi, doğal lens derinliği, dramatik ışık, yüksek prodüksiyon kalitesi",
      style: "cinematic",
      ratio: "16:9",
    },
    {
      id: "anime",
      title: "Anime visual",
      description: "Poster etkili anime stil.",
      prompt:
        "Detaylı anime key visual, güçlü kompozisyon, atmosferik arka plan, premium poster kalitesi",
      style: "anime",
      ratio: "16:9",
    },
  ],
  en: [
    {
      id: "product",
      title: "Product hero",
      description: "Clean commercial composition.",
      prompt:
        "Premium product hero shot, clean background, controlled lighting, commercial detail, sharp focus",
      style: "product",
      ratio: "1:1",
      badge: "Commerce",
    },
    {
      id: "fashion",
      title: "Fashion editorial",
      description: "Magazine cover feeling.",
      prompt:
        "Luxury fashion editorial shoot, soft cinematic lighting, premium styling, professional portrait",
      style: "fashion",
      ratio: "9:16",
    },
    {
      id: "cinematic",
      title: "Cinematic scene",
      description: "Film still aesthetic.",
      prompt:
        "Cinematic night scene, natural lens depth, dramatic lighting, high production quality",
      style: "cinematic",
      ratio: "16:9",
    },
    {
      id: "anime",
      title: "Anime visual",
      description: "Poster-grade anime style.",
      prompt:
        "Detailed anime key visual, strong composition, atmospheric background, premium poster quality",
      style: "anime",
      ratio: "16:9",
    },
  ],
  de: [
    {
      id: "product",
      title: "Produkt-Hero",
      description: "Saubere Werbekomposition.",
      prompt:
        "Premium Produkt-Hero-Shot, sauberer Hintergrund, kontrolliertes Licht, Werbedetails, scharfer Fokus",
      style: "product",
      ratio: "1:1",
      badge: "Commerce",
    },
    {
      id: "fashion",
      title: "Fashion Editorial",
      description: "Gefühl eines Magazin-Covers.",
      prompt:
        "Luxuriöses Fashion-Editorial, weiches filmisches Licht, Premium-Styling, professionelles Porträt",
      style: "fashion",
      ratio: "9:16",
    },
    {
      id: "cinematic",
      title: "Cinematic Scene",
      description: "Ästhetik eines Filmstills.",
      prompt:
        "Cinematic Nachtszene, natürliche Tiefenschärfe, dramatisches Licht, hohe Produktionsqualität",
      style: "cinematic",
      ratio: "16:9",
    },
    {
      id: "anime",
      title: "Anime Visual",
      description: "Anime-Stil mit Posterwirkung.",
      prompt:
        "Detailliertes Anime-Key-Visual, starke Komposition, atmosphärischer Hintergrund, Premium-Posterqualität",
      style: "anime",
      ratio: "16:9",
    },
  ],
  ku: [
    {
      id: "product",
      title: "Hero ya hilberê",
      description: "Kompozîsyona reklamê ya paqij.",
      prompt:
        "Wêneya hero ya hilbera premium, paşxaneya paqij, ronahiya kontrolkirî, detaya reklamê, fokusê tûj",
      style: "product",
      ratio: "1:1",
      badge: "Commerce",
    },
    {
      id: "fashion",
      title: "Fashion editorial",
      description: "Hesta bergê kovarê.",
      prompt:
        "Wênekişandina moda ya luks, ronahiya sînematîk a nerm, styling premium, portreya profesyonel",
      style: "fashion",
      ratio: "9:16",
    },
    {
      id: "cinematic",
      title: "Dîmena sînematîk",
      description: "Estetîka kareya filmê.",
      prompt:
        "Dîmena şevê ya sînematîk, kûrahiya lensê ya xwezayî, ronahiya dramatîk, kalîteya hilberîna bilind",
      style: "cinematic",
      ratio: "16:9",
    },
    {
      id: "anime",
      title: "Anime visual",
      description: "Stîla anime ya posterê.",
      prompt:
        "Anime key visual bi detay, kompozîsyona bihêz, paşxaneya atmosferîk, kalîteya posterê ya premium",
      style: "anime",
      ratio: "16:9",
    },
  ],
};

export default function TextToImagePage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = COPY[safeLanguage];
  const ratioOptions = useMemo(() => getRatioOptions(safeLanguage), [safeLanguage]);
  const visualStyleOptions = useMemo(
    () => getVisualStyleOptions(safeLanguage),
    [safeLanguage]
  );

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    if (source !== "showcase" && source !== "community_showcase") return;

    const nextPrompt = params.get("prompt");
    const nextStyle = params.get("style");
    const nextRatio = params.get("ratio");

    if (nextPrompt) setPrompt(nextPrompt);
    if (isVisualStyle(nextStyle)) setStyle(nextStyle);
    if (isAspectRatio(nextRatio)) setRatio(nextRatio);
    setNotice("");
  }, []);

  const templates = useMemo<StudioTemplate[]>(
    () => {
      const staticTemplates = TEMPLATES[safeLanguage].map((template) => ({
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
          description: t.generatedTemplateDescription,
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
    [generation, recentImages, safeLanguage, t.generatedTemplateDescription]
  );

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setGeneration({ status: "error", message: t.promptRequired });
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
      const title = compactTitle(cleanPrompt, t.generatedTitle);

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
      : { label: t.done };

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
              options={visualStyleOptions}
            />
          </StudioField>
          <StudioField label={t.ratio}>
            <StudioSegmented<AspectRatio>
              value={ratio}
              onChange={setRatio}
              options={ratioOptions}
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
