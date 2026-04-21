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
  getDurationOptions,
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
    promptRequired: "Prompt alanı boş olamaz.",
    generatedTemplateDescription: "Son üretilen videodan brief.",
    generatedTitle: "Üretilen Video",
    seconds: "sn",
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
    promptRequired: "Prompt cannot be empty.",
    generatedTemplateDescription: "Brief from the latest generated video.",
    generatedTitle: "Generated Video",
    seconds: "sec",
  },
  de: {
    title: "Videostudio",
    description:
      "Schreibe die Szene, wähle die Kamerasprache und erzeuge ein kurzes Video für den Editor.",
    inputTitle: "Videobrief",
    inputDescription: "Szene, Bewegung, Stil, Dauer und Format in einem Panel.",
    prompt: "Prompt",
    promptPlaceholder:
      "Eine Figur geht nachts durch Stadtlichter, langsame Tracking-Kamera, filmische Werbequalität",
    style: "Stil",
    ratio: "Format",
    duration: "Dauer",
    generate: "Video erzeugen",
    reset: "Zurücksetzen",
    previewTitle: "Preview",
    previewDescription: "Das erzeugte Video wird hier abgespielt.",
    emptyTitle: "Noch kein Video",
    emptyText: "Vervollständige den Prompt und starte die Erstellung.",
    templatesTitle: "Fertige Videobriefs",
    templatesDescription: "Wähle einen Startpunkt und passe die Szene an.",
    loading: "Video wird vorbereitet...",
    done: "Bereit",
    error: "Videoerzeugung fehlgeschlagen.",
    credits: "Credits",
    addToEditor: "Zum Editor hinzufügen",
    download: "Download",
    editorReady: "Video wurde an den Editor gesendet.",
    promptRequired: "Prompt darf nicht leer sein.",
    generatedTemplateDescription: "Brief aus dem zuletzt erzeugten Video.",
    generatedTitle: "Erzeugtes Video",
    seconds: "Sek.",
  },
  ku: {
    title: "Stûdyoya Vîdyoyê",
    description:
      "Dîmenê binivîse, zimanê kamerayê hilbijêre û vîdyoyeke kurt ji bo editorê çêke.",
    inputTitle: "Briefa vîdyoyê",
    inputDescription: "Dîmen, tevger, stîl, dem û format di yek panelê de.",
    prompt: "Prompt",
    promptPlaceholder:
      "Karakterek di ronahiya bajêr ya şevê de dimeşe, kamera hêdî dişopîne, kalîteya reklamê ya sînematîk",
    style: "Stîl",
    ratio: "Format",
    duration: "Dem",
    generate: "Vîdyo çêke",
    reset: "Ji nû ve",
    previewTitle: "Preview",
    previewDescription: "Vîdyoya çêkirî li vir tê lîstin.",
    emptyTitle: "Hê vîdyo tune",
    emptyText: "Promptê temam bike û dest bi çêkirinê bike.",
    templatesTitle: "Briefên vîdyoyê yên amade",
    templatesDescription: "Destpêkek hilbijêre, paşê dîmenê li gor xwe biguherîne.",
    loading: "Vîdyo tê amadekirin...",
    done: "Amade",
    error: "Çêkirina vîdyoyê bi ser neket.",
    credits: "Kredit",
    addToEditor: "Li editorê zêde bike",
    download: "Daxe",
    editorReady: "Vîdyo ji editorê re hate şandin.",
    promptRequired: "Prompt vala nabe.",
    generatedTemplateDescription: "Brief ji vîdyoya dawî ya çêkirî.",
    generatedTitle: "Vîdyoya Çêkirî",
    seconds: "sn",
  },
} as const;

type VideoTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  style: VisualStyle;
  ratio: AspectRatio;
  duration: string;
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

const TEMPLATES: Record<keyof typeof COPY, VideoTemplate[]> = {
  tr: [
    {
      id: "commercial",
      title: "Premium reklam",
      description: "Parlak marka filmi hissi.",
      prompt:
        "Premium marka reklam filmi, kontrollü ışık, yavaş kamera hareketi, modern şehir atmosferi, yüksek prodüksiyon kalitesi",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
      badge: "Pro",
    },
    {
      id: "social",
      title: "Dikey sosyal video",
      description: "Mobil akışa uygun hareket.",
      prompt:
        "Dikey sosyal medya videosu, enerjik kamera hareketi, net konu, parlak doğal ışık, premium içerik kalitesi",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
    },
    {
      id: "product",
      title: "Ürün hareketi",
      description: "Ürünü merkezde tutar.",
      prompt:
        "Lüks ürün tanıtım videosu, ürün etrafında yumuşak kamera dönüşü, temiz arka plan, reklam kalitesi",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "anime",
      title: "Anime sahne",
      description: "Poster tadında hareket.",
      prompt:
        "Detaylı anime sahnesi, dramatik ışık, karakter odaklı yumuşak hareket, etkileyici atmosfer",
      style: "anime",
      ratio: "16:9",
      duration: "6",
    },
  ],
  en: [
    {
      id: "commercial",
      title: "Premium ad",
      description: "Polished brand film feeling.",
      prompt:
        "Premium brand commercial film, controlled lighting, slow camera move, modern city atmosphere, high production quality",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
      badge: "Pro",
    },
    {
      id: "social",
      title: "Vertical social video",
      description: "Motion built for mobile feeds.",
      prompt:
        "Vertical social media video, energetic camera movement, clear subject, bright natural light, premium content quality",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
    },
    {
      id: "product",
      title: "Product motion",
      description: "Keeps the product centered.",
      prompt:
        "Luxury product promo video, smooth camera orbit around the product, clean background, commercial quality",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "anime",
      title: "Anime scene",
      description: "Poster-like motion.",
      prompt:
        "Detailed anime scene, dramatic lighting, character-focused smooth motion, impressive atmosphere",
      style: "anime",
      ratio: "16:9",
      duration: "6",
    },
  ],
  de: [
    {
      id: "commercial",
      title: "Premium-Werbung",
      description: "Glänzendes Markenfilmgefühl.",
      prompt:
        "Premium Markenwerbefilm, kontrolliertes Licht, langsame Kamerabewegung, moderne Stadtatmosphäre, hohe Produktionsqualität",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
      badge: "Pro",
    },
    {
      id: "social",
      title: "Vertikales Social Video",
      description: "Bewegung für mobile Feeds.",
      prompt:
        "Vertikales Social-Media-Video, energetische Kamerabewegung, klares Motiv, helles natürliches Licht, Premium-Content-Qualität",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
    },
    {
      id: "product",
      title: "Produktbewegung",
      description: "Hält das Produkt im Zentrum.",
      prompt:
        "Luxuriöses Produktvideo, weiche Kameradrehung um das Produkt, sauberer Hintergrund, Werbequalität",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "anime",
      title: "Anime-Szene",
      description: "Bewegung mit Posterwirkung.",
      prompt:
        "Detaillierte Anime-Szene, dramatisches Licht, weiche charakterfokussierte Bewegung, eindrucksvolle Atmosphäre",
      style: "anime",
      ratio: "16:9",
      duration: "6",
    },
  ],
  ku: [
    {
      id: "commercial",
      title: "Reklama premium",
      description: "Hesta filmê brandê ya paqij.",
      prompt:
        "Filmê reklamê ya branda premium, ronahiya kontrolkirî, tevgera kamerayê ya hêdî, atmosfera bajêr ya modern, kalîteya hilberîna bilind",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
      badge: "Pro",
    },
    {
      id: "social",
      title: "Vîdyoya social ya tîk",
      description: "Tevger ji bo mobile feed.",
      prompt:
        "Vîdyoya social media ya tîk, tevgera kamerayê ya enerjîk, mijara zelal, ronahiya xwezayî ya geş, kalîteya naveroka premium",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
    },
    {
      id: "product",
      title: "Tevgera hilberê",
      description: "Hilberê di navendê de dihêle.",
      prompt:
        "Vîdyoya danasîna hilbera luks, kamerayê bi nermî li dora hilberê digere, paşxaneya paqij, kalîteya reklamê",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "anime",
      title: "Dîmena anime",
      description: "Tevgera bi hesta posterê.",
      prompt:
        "Dîmena anime bi detay, ronahiya dramatîk, tevgera nerm a li ser karakterê, atmosfera balkêş",
      style: "anime",
      ratio: "16:9",
      duration: "6",
    },
  ],
};

export default function TextToVideoPage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = COPY[safeLanguage];
  const durationOptions = useMemo(
    () => getDurationOptions(safeLanguage),
    [safeLanguage]
  );
  const ratioOptions = useMemo(() => getRatioOptions(safeLanguage), [safeLanguage]);
  const visualStyleOptions = useMemo(
    () => getVisualStyleOptions(safeLanguage),
    [safeLanguage]
  );

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    if (source !== "showcase" && source !== "community_showcase") return;

    const nextPrompt = params.get("prompt");
    const nextStyle = params.get("style");
    const nextRatio = params.get("ratio");
    const nextDuration = params.get("durationSec");

    if (nextPrompt) setPrompt(nextPrompt);
    if (isVisualStyle(nextStyle)) setStyle(nextStyle);
    if (isAspectRatio(nextRatio)) setRatio(nextRatio);
    if (nextDuration && /^\d+$/.test(nextDuration)) {
      setDurationSec(nextDuration);
    }
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
          description: t.generatedTemplateDescription,
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
    [generation, recentVideos, safeLanguage, t.generatedTemplateDescription]
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
      const title = compactTitle(cleanPrompt, t.generatedTitle);

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
      : { label: t.done };

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
        { label: t.duration, value: `${durationSec} ${t.seconds}` },
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
          <StudioField label={t.duration}>
            <StudioSelect
              value={durationSec}
              onChange={setDurationSec}
              options={durationOptions}
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
