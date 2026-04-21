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
    imageRequired: "Önce kaynak görsel yüklemelisin.",
    promptRequired: "Prompt alanı boş olamaz.",
    generatedTemplateDescription: "Son resimden video üretiminden hareket brief’i.",
    generatedTitle: "Resimden Video",
    seconds: "sn",
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
    imageRequired: "Upload a source image first.",
    promptRequired: "Prompt cannot be empty.",
    generatedTemplateDescription: "Motion brief from the latest image-to-video generation.",
    generatedTitle: "Image Motion Video",
    seconds: "sec",
  },
  de: {
    title: "Bild zu Video",
    description:
      "Lade ein Bild hoch, beschreibe die Bewegung und verwandle es im gleichen Studioablauf in Video.",
    inputTitle: "Bewegungsbrief",
    inputDescription: "Quellbild, Bewegungsprompt, Stil und Format in einem Panel.",
    sourceImage: "Quellbild",
    uploadImage: "Bild hochladen",
    uploadDescription: "Wähle eine PNG-, JPG- oder WebP-Datei.",
    prompt: "Bewegungsprompt",
    promptPlaceholder:
      "Die Kamera fährt langsam näher, Haare bewegen sich leicht, das Licht bleibt natürlich, filmische Bewegung",
    style: "Stil",
    ratio: "Format",
    duration: "Dauer",
    generate: "In Video umwandeln",
    reset: "Zurücksetzen",
    previewTitle: "Preview",
    previewDescription: "Quellbild und erzeugtes Video erscheinen hier.",
    emptyTitle: "Noch kein Bild",
    emptyText: "Lade zuerst ein Quellbild hoch und beschreibe dann die Bewegung.",
    templatesTitle: "Fertige Bewegungsbriefs",
    templatesDescription: "Wähle schnell eine passende Kamerabewegung.",
    loading: "Video wird vorbereitet...",
    uploading: "Bild wird hochgeladen...",
    done: "Bereit",
    error: "Bild-zu-Video-Erzeugung fehlgeschlagen.",
    credits: "Credits",
    addToEditor: "Zum Editor hinzufügen",
    download: "Download",
    editorReady: "Video wurde an den Editor gesendet.",
    imageRequired: "Lade zuerst ein Quellbild hoch.",
    promptRequired: "Prompt darf nicht leer sein.",
    generatedTemplateDescription: "Bewegungsbrief aus der letzten Bild-zu-Video-Erzeugung.",
    generatedTitle: "Bildbewegungs-Video",
    seconds: "Sek.",
  },
  ku: {
    title: "Ji Wêneyê Vîdyo",
    description:
      "Wêneyek bar bike, tevgerê şirove bike û wê di heman stûdyoyê de bike vîdyo.",
    inputTitle: "Briefa tevgerê",
    inputDescription: "Wêneya çavkanî, prompta tevgerê, stîl û format di yek panelê de.",
    sourceImage: "Wêneya çavkanî",
    uploadImage: "Wêne bar bike",
    uploadDescription: "Pela PNG, JPG an WebP hilbijêre.",
    prompt: "Prompta tevgerê",
    promptPlaceholder:
      "Kamera hêdî nêzîk bibe, por hinekî bileve, ronahî xwezayî bimîne, tevgera sînematîk be",
    style: "Stîl",
    ratio: "Format",
    duration: "Dem",
    generate: "Bike vîdyo",
    reset: "Ji nû ve",
    previewTitle: "Preview",
    previewDescription: "Wêneya çavkanî û vîdyoya çêkirî li vir xuya dibin.",
    emptyTitle: "Hê wêne tune",
    emptyText: "Pêşî wêneya çavkanî bar bike, paşê tevgerê şirove bike.",
    templatesTitle: "Briefên tevgerê yên amade",
    templatesDescription: "Ji bo wêneya xwe tevgera kamerayê zû hilbijêre.",
    loading: "Vîdyo tê amadekirin...",
    uploading: "Wêne tê barkirin...",
    done: "Amade",
    error: "Çêkirina ji-wêneyê-vîdyo bi ser neket.",
    credits: "Kredit",
    addToEditor: "Li editorê zêde bike",
    download: "Daxe",
    editorReady: "Vîdyo ji editorê re hate şandin.",
    imageRequired: "Pêşî wêneya çavkanî bar bike.",
    promptRequired: "Prompt vala nabe.",
    generatedTemplateDescription: "Briefa tevgerê ji hilberîna dawî ya ji-wêneyê-vîdyo.",
    generatedTitle: "Vîdyoya Tevgera Wêneyê",
    seconds: "sn",
  },
} as const;

type MotionTemplate = {
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

const TEMPLATES: Record<keyof typeof COPY, MotionTemplate[]> = {
  tr: [
    {
      id: "portrait",
      title: "Portre canlandırma",
      description: "Yumuşak yaklaşma ve doğal mikro hareket.",
      prompt:
        "Kamera yavaşça yaklaşsın, gözler canlı kalsın, saç ve kıyafet hafif hareket etsin, yüz doğal ve stabil olsun",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
      badge: "Portrait",
    },
    {
      id: "product",
      title: "Ürün kamera turu",
      description: "Ürünü merkezde tutan premium hareket.",
      prompt:
        "Kamera ürün etrafında yumuşak dönüş yapsın, yansımalar kontrollü kalsın, reklam filmi kalitesinde hareket olsun",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "landscape",
      title: "Manzara parallax",
      description: "Derinlik ve atmosfer ekler.",
      prompt:
        "Ön plan ve arka plan arasında doğal parallax oluşsun, kamera yavaşça süzülsün, atmosfer sinematik olsun",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
    },
    {
      id: "fashion",
      title: "Fashion loop",
      description: "Editorial hareket ve ışık.",
      prompt:
        "Model sabit kompozisyonda kalsın, kumaş ve ışık hafif hareket etsin, dergi kapağı kalitesinde video olsun",
      style: "fashion",
      ratio: "9:16",
      duration: "6",
    },
  ],
  en: [
    {
      id: "portrait",
      title: "Portrait animation",
      description: "Soft push-in and natural micro motion.",
      prompt:
        "Camera slowly pushes in, eyes stay alive, hair and clothing move subtly, face remains natural and stable",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
      badge: "Portrait",
    },
    {
      id: "product",
      title: "Product camera orbit",
      description: "Premium motion keeping the product centered.",
      prompt:
        "Camera softly orbits around the product, reflections stay controlled, commercial-grade motion",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "landscape",
      title: "Landscape parallax",
      description: "Adds depth and atmosphere.",
      prompt:
        "Natural parallax between foreground and background, camera glides slowly, cinematic atmosphere",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
    },
    {
      id: "fashion",
      title: "Fashion loop",
      description: "Editorial motion and light.",
      prompt:
        "Model stays in a stable composition, fabric and light move subtly, magazine-cover-quality video",
      style: "fashion",
      ratio: "9:16",
      duration: "6",
    },
  ],
  de: [
    {
      id: "portrait",
      title: "Porträt animieren",
      description: "Sanfte Annäherung und natürliche Mikro-Bewegung.",
      prompt:
        "Die Kamera fährt langsam näher, Augen bleiben lebendig, Haare und Kleidung bewegen sich leicht, das Gesicht bleibt natürlich und stabil",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
      badge: "Portrait",
    },
    {
      id: "product",
      title: "Produkt-Kamerafahrt",
      description: "Premiumbewegung mit Produkt im Zentrum.",
      prompt:
        "Die Kamera dreht sich weich um das Produkt, Reflexionen bleiben kontrolliert, Bewegung in Werbefilmqualität",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "landscape",
      title: "Landschaft-Parallax",
      description: "Fügt Tiefe und Atmosphäre hinzu.",
      prompt:
        "Natürlicher Parallax zwischen Vorder- und Hintergrund, Kamera gleitet langsam, filmische Atmosphäre",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
    },
    {
      id: "fashion",
      title: "Fashion Loop",
      description: "Editoriale Bewegung und Licht.",
      prompt:
        "Das Model bleibt stabil in der Komposition, Stoff und Licht bewegen sich leicht, Video in Magazin-Cover-Qualität",
      style: "fashion",
      ratio: "9:16",
      duration: "6",
    },
  ],
  ku: [
    {
      id: "portrait",
      title: "Zindîkirina portreyê",
      description: "Nêzîkbûna nerm û tevgera xwezayî ya piçûk.",
      prompt:
        "Kamera hêdî nêzîk bibe, çav zindî bimînin, por û cil hinekî bilevin, rû xwezayî û stabîl bimîne",
      style: "realistic",
      ratio: "9:16",
      duration: "6",
      badge: "Portrait",
    },
    {
      id: "product",
      title: "Geroka kamerayê ya hilberê",
      description: "Tevgera premium ku hilberê li navendê digire.",
      prompt:
        "Kamera bi nermî li dora hilberê bizivire, ronahî û vedîtin kontrolkirî bimînin, tevgera kalîteya reklamê",
      style: "product",
      ratio: "1:1",
      duration: "8",
    },
    {
      id: "landscape",
      title: "Parallax ya dîmenê",
      description: "Kûrahî û atmosfer zêde dike.",
      prompt:
        "Di navbera pêşzemîn û paşzemînê de parallaxa xwezayî çêbibe, kamera hêdî bisûze, atmosfer sînematîk be",
      style: "cinematic",
      ratio: "16:9",
      duration: "8",
    },
    {
      id: "fashion",
      title: "Fashion loop",
      description: "Tevger û ronahiya editorial.",
      prompt:
        "Model di kompozîsyona stabîl de bimîne, qumaş û ronahî hinekî bilevin, vîdyo bi kalîteya bergê kovarê be",
      style: "fashion",
      ratio: "9:16",
      duration: "6",
    },
  ],
};

export default function ImageToVideoPage() {
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
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");
    const hasQueryPrefill =
      source === "showcase" || source === "community_showcase";

    if (hasQueryPrefill) {
      const nextPrompt = params.get("prompt");
      const nextImageUrl = params.get("imageUrl");
      const nextStyle = params.get("style");
      const nextRatio = params.get("ratio");
      const nextDuration = params.get("durationSec");

      if (nextPrompt) setPrompt(nextPrompt);
      if (nextImageUrl) setImageUrl(nextImageUrl);
      if (isVisualStyle(nextStyle)) setStyle(nextStyle);
      if (isAspectRatio(nextRatio)) setRatio(nextRatio);
      if (nextDuration && /^\d+$/.test(nextDuration)) {
        setDurationSec(nextDuration);
      }
      setNotice("");
    }

    const prefill = hasQueryPrefill
      ? null
      : getV2Prefill<{
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
          description: t.generatedTemplateDescription,
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
    [generation, recentImageVideos, safeLanguage, t.generatedTemplateDescription]
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
      setGeneration({ status: "error", message: t.imageRequired });
      return;
    }

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
      const title = compactTitle(cleanPrompt, t.generatedTitle);

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
      : { label: t.done };

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
        { label: t.duration, value: `${durationSec} ${t.seconds}` },
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
