"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  GenerationStudio,
  StudioCheckbox,
  StudioDownloadLink,
  StudioEmpty,
  StudioField,
  StudioMediaPreview,
  StudioSegmented,
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
  makeHistoryId,
  setV2EditorPrefill,
} from "@/lib/v2-store";
import {
  getCloneModeOptions,
  getCloneVoiceModeOptions,
  type CloneMode,
  type CloneVoiceMode,
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
      sourceVideoUrl: string;
      referenceImageUrl: string;
      voiceSampleUrl?: string;
      prompt: string;
      title: string;
      cloneMode: CloneMode;
      voiceMode: CloneVoiceMode;
      preserveAudio: boolean;
      voiceCloneApplied: boolean;
      voiceCloneModelConfigured: boolean;
      voiceCloneNote?: string;
      remainingCredits: number | null;
    }
  | { status: "error"; message: string };

const COPY = {
  tr: {
    title: "Video Clone",
    description:
      "Kaynak videoyu koru; ister komple karakteri, ister sadece yüzü değiştir.",
    inputTitle: "Clone kontrolü",
    inputDescription:
      "Kaynak video, referans görsel, clone modu ve ses davranışı aynı panelde.",
    sourceVideo: "Kaynak video",
    uploadVideo: "Video yükle",
    uploadVideoDescription: "MP4, MOV veya WebM kaynak video.",
    referenceImage: "Referans görsel",
    uploadReference: "Referans yükle",
    referenceDescription: "Karakter veya yüz için net referans görsel.",
    voiceSample: "Ses örneği",
    uploadVoice: "Ses örneği yükle",
    voiceDescription: "Kendi ses tonun için kısa ve temiz bir kayıt yükle.",
    cloneMode: "Clone modu",
    voiceMode: "Ses modu",
    preserveAudio: "Ana videonun ses yapısını koru",
    preserveAudioDescription:
      "Şarkı, konuşma, ritim ve zamanlama korunarak video üretilir.",
    prompt: "Yönlendirme",
    promptPlaceholder:
      "Hareket, kadraj, ışık ve zamanlama korunsun; referans doğal biçimde videoya yerleşsin.",
    generate: "Clone başlat",
    reset: "Sıfırla",
    previewTitle: "Preview",
    previewDescription: "Kaynak video veya clone sonucu burada oynatılır.",
    emptyTitle: "Henüz kaynak video yok",
    emptyText: "Kaynak video ve referans görsel yükleyerek başla.",
    templatesTitle: "Hazır clone briefleri",
    templatesDescription: "Kullanım amacına göre hızlı başlangıç seç.",
    loading: "Clone hazırlanıyor...",
    uploading: "Yükleniyor...",
    done: "Hazır",
    error: "Video clone işlemi başarısız oldu.",
    credits: "Kredi",
    addToEditor: "Editöre ekle",
    download: "İndir",
    editorReady: "Clone video editöre gönderildi.",
    sourceRequired: "Önce kaynak video yüklemelisin.",
    referenceRequired: "Önce referans görsel yüklemelisin.",
    voiceRequired: "Kendi ses modu için ses örneği yüklemelisin.",
    promptRequired: "Yönlendirme alanı boş olamaz.",
    generatedTemplateDescription: "Son video clone işleminden brief.",
    generatedTitle: "Klonlanan Video",
    characterValue: "Karakter",
    faceValue: "Yüz",
    ownVoiceValue: "Kendi sesim",
    originalVoiceValue: "Orijinal",
  },
  en: {
    title: "Video Clone",
    description:
      "Preserve the source video while replacing the full character or only the face.",
    inputTitle: "Clone control",
    inputDescription:
      "Source video, reference image, clone mode, and voice behavior in one panel.",
    sourceVideo: "Source video",
    uploadVideo: "Upload video",
    uploadVideoDescription: "MP4, MOV, or WebM source video.",
    referenceImage: "Reference image",
    uploadReference: "Upload reference",
    referenceDescription: "Clear character or face reference image.",
    voiceSample: "Voice sample",
    uploadVoice: "Upload voice sample",
    voiceDescription: "Upload a short clean recording for your voice tone.",
    cloneMode: "Clone mode",
    voiceMode: "Voice mode",
    preserveAudio: "Preserve the source audio structure",
    preserveAudioDescription:
      "Song, speech, rhythm, and timing stay aligned with the original video.",
    prompt: "Direction",
    promptPlaceholder:
      "Preserve motion, framing, lighting, and timing; integrate the reference naturally into the video.",
    generate: "Start clone",
    reset: "Reset",
    previewTitle: "Preview",
    previewDescription: "The source video or clone result plays here.",
    emptyTitle: "No source video yet",
    emptyText: "Upload a source video and reference image first.",
    templatesTitle: "Ready clone briefs",
    templatesDescription: "Pick a quick start for your use case.",
    loading: "Preparing clone...",
    uploading: "Uploading...",
    done: "Ready",
    error: "Video clone failed.",
    credits: "Credits",
    addToEditor: "Add to editor",
    download: "Download",
    editorReady: "Clone video sent to editor.",
    sourceRequired: "Upload a source video first.",
    referenceRequired: "Upload a reference image first.",
    voiceRequired: "Upload a voice sample for own-voice mode.",
    promptRequired: "Direction cannot be empty.",
    generatedTemplateDescription: "Brief from the latest video clone.",
    generatedTitle: "Cloned Video",
    characterValue: "Character",
    faceValue: "Face",
    ownVoiceValue: "Own voice",
    originalVoiceValue: "Original",
  },
  de: {
    title: "Video Clone",
    description:
      "Bewahre das Quellvideo und ersetze entweder die ganze Figur oder nur das Gesicht.",
    inputTitle: "Clone-Steuerung",
    inputDescription:
      "Quellvideo, Referenzbild, Clone-Modus und Audioverhalten in einem Panel.",
    sourceVideo: "Quellvideo",
    uploadVideo: "Video hochladen",
    uploadVideoDescription: "MP4-, MOV- oder WebM-Quellvideo.",
    referenceImage: "Referenzbild",
    uploadReference: "Referenz hochladen",
    referenceDescription: "Klares Referenzbild für Figur oder Gesicht.",
    voiceSample: "Stimmprobe",
    uploadVoice: "Stimmprobe hochladen",
    voiceDescription: "Lade eine kurze, saubere Aufnahme für deine Stimmfarbe hoch.",
    cloneMode: "Clone-Modus",
    voiceMode: "Audiomodus",
    preserveAudio: "Audiostruktur des Hauptvideos bewahren",
    preserveAudioDescription:
      "Song, Sprache, Rhythmus und Timing bleiben im Video erhalten.",
    prompt: "Anweisung",
    promptPlaceholder:
      "Bewegung, Bildausschnitt, Licht und Timing beibehalten; Referenz natürlich ins Video integrieren.",
    generate: "Clone starten",
    reset: "Zurücksetzen",
    previewTitle: "Preview",
    previewDescription: "Quellvideo oder Clone-Ergebnis wird hier abgespielt.",
    emptyTitle: "Noch kein Quellvideo",
    emptyText: "Starte mit Quellvideo und Referenzbild.",
    templatesTitle: "Fertige Clone-Briefs",
    templatesDescription: "Wähle einen schnellen Start passend zum Einsatzzweck.",
    loading: "Clone wird vorbereitet...",
    uploading: "Wird hochgeladen...",
    done: "Bereit",
    error: "Video-Clone fehlgeschlagen.",
    credits: "Credits",
    addToEditor: "Zum Editor hinzufügen",
    download: "Download",
    editorReady: "Clone-Video wurde an den Editor gesendet.",
    sourceRequired: "Lade zuerst ein Quellvideo hoch.",
    referenceRequired: "Lade zuerst ein Referenzbild hoch.",
    voiceRequired: "Lade für den eigenen Stimm-Modus eine Stimmprobe hoch.",
    promptRequired: "Anweisung darf nicht leer sein.",
    generatedTemplateDescription: "Brief aus dem letzten Video-Clone.",
    generatedTitle: "Geklontes Video",
    characterValue: "Figur",
    faceValue: "Gesicht",
    ownVoiceValue: "Meine Stimme",
    originalVoiceValue: "Original",
  },
  ku: {
    title: "Klona Vîdyoyê",
    description:
      "Vîdyoya çavkanî biparêze; yan karaktera tevahî, yan jî tenê rûyê biguherîne.",
    inputTitle: "Kontrola clone",
    inputDescription:
      "Vîdyoya çavkanî, wêneya referans, moda clone û deng di yek panelê de.",
    sourceVideo: "Vîdyoya çavkanî",
    uploadVideo: "Vîdyo bar bike",
    uploadVideoDescription: "Vîdyoya çavkanî ya MP4, MOV an WebM.",
    referenceImage: "Wêneya referans",
    uploadReference: "Referans bar bike",
    referenceDescription: "Wêneya referans a zelal ji bo karakter an rû.",
    voiceSample: "Nimûneya deng",
    uploadVoice: "Nimûneya deng bar bike",
    voiceDescription: "Tomarek kurt û paqij ji bo tonê dengê xwe bar bike.",
    cloneMode: "Moda clone",
    voiceMode: "Moda deng",
    preserveAudio: "Struktura dengê vîdyoya sereke biparêze",
    preserveAudioDescription:
      "Stran, axaftin, rîtim û dem di vîdyoyê de têne parastin.",
    prompt: "Rêberî",
    promptPlaceholder:
      "Tevger, kadraj, ronahî û dem bimînin; referans bi awayekî xwezayî bike nav vîdyoyê.",
    generate: "Clone dest pê bike",
    reset: "Ji nû ve",
    previewTitle: "Preview",
    previewDescription: "Vîdyoya çavkanî an encama clone li vir tê lîstin.",
    emptyTitle: "Hê vîdyoya çavkanî tune",
    emptyText: "Bi barkirina vîdyoya çavkanî û wêneya referans dest pê bike.",
    templatesTitle: "Briefên clone yên amade",
    templatesDescription: "Li gor armanca xwe destpêkek zû hilbijêre.",
    loading: "Clone tê amadekirin...",
    uploading: "Tê barkirin...",
    done: "Amade",
    error: "Pêvajoya video clone bi ser neket.",
    credits: "Kredit",
    addToEditor: "Li editorê zêde bike",
    download: "Daxe",
    editorReady: "Vîdyoya clone ji editorê re hate şandin.",
    sourceRequired: "Pêşî vîdyoya çavkanî bar bike.",
    referenceRequired: "Pêşî wêneya referans bar bike.",
    voiceRequired: "Ji bo moda dengê xwe, nimûneya deng bar bike.",
    promptRequired: "Qada rêberiyê vala nabe.",
    generatedTemplateDescription: "Brief ji pêvajoya video clone ya dawî.",
    generatedTitle: "Vîdyoya Clone",
    characterValue: "Karakter",
    faceValue: "Rû",
    ownVoiceValue: "Dengê min",
    originalVoiceValue: "Orîjînal",
  },
} as const;

type CloneTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  cloneMode: CloneMode;
  badge?: string;
};

const TEMPLATES: Record<keyof typeof COPY, CloneTemplate[]> = {
  tr: [
    {
      id: "character",
      title: "Komple karakter",
      description: "Vücut, yüz ve sahne uyumu birlikte korunur.",
      prompt:
        "Kaynak videodaki hareket, kadraj, ışık, sahne akışı ve zamanlama korunsun. Referans karakter doğal, gerçekçi ve stabil biçimde videodaki kişinin yerine geçsin.",
      cloneMode: "character",
      badge: "Önerilen",
    },
    {
      id: "face",
      title: "Sadece yüz",
      description: "Performans korunur, yalnızca yüz değiştirilir.",
      prompt:
        "Kaynak videodaki vücut, performans, kamera ve ses aynen korunsun. Sadece yüz referans görseldeki kişiyle doğal ve stabil biçimde değişsin.",
      cloneMode: "face",
    },
    {
      id: "voice",
      title: "Ses tonu hazır",
      description: "Kendi ses örneğiyle çalışacak akış.",
      prompt:
        "Görüntü doğal kalsın, ana videodaki konuşma veya şarkının zamanlaması bozulmasın, referans kişi ve ses tonu mümkün olduğunca tutarlı olsun.",
      cloneMode: "character",
    },
    {
      id: "music",
      title: "Şarkılı video",
      description: "Müzik ve ritim korunarak clone.",
      prompt:
        "Videodaki müzik, ritim, dudak ve performans zamanlaması korunsun. Referans karakter sahneye doğal şekilde yerleşsin.",
      cloneMode: "character",
    },
  ],
  en: [
    {
      id: "character",
      title: "Full character",
      description: "Body, face, and scene consistency are preserved together.",
      prompt:
        "Preserve motion, framing, lighting, scene flow, and timing from the source video. Replace the person with the reference character naturally, realistically, and stably.",
      cloneMode: "character",
      badge: "Recommended",
    },
    {
      id: "face",
      title: "Face only",
      description: "Performance is preserved while only the face changes.",
      prompt:
        "Keep body, performance, camera, and audio from the source video unchanged. Replace only the face with the reference image naturally and stably.",
      cloneMode: "face",
    },
    {
      id: "voice",
      title: "Voice tone ready",
      description: "Flow prepared for your own voice sample.",
      prompt:
        "Keep the image natural, preserve the timing of speech or song in the main video, and keep the reference person and voice tone as consistent as possible.",
      cloneMode: "character",
    },
    {
      id: "music",
      title: "Music video",
      description: "Clone while preserving music and rhythm.",
      prompt:
        "Preserve music, rhythm, lip timing, and performance timing from the video. Place the reference character into the scene naturally.",
      cloneMode: "character",
    },
  ],
  de: [
    {
      id: "character",
      title: "Ganze Figur",
      description: "Körper, Gesicht und Szene bleiben gemeinsam konsistent.",
      prompt:
        "Bewegung, Bildausschnitt, Licht, Szenenfluss und Timing des Quellvideos beibehalten. Die Person natürlich, realistisch und stabil durch die Referenzfigur ersetzen.",
      cloneMode: "character",
      badge: "Empfohlen",
    },
    {
      id: "face",
      title: "Nur Gesicht",
      description: "Performance bleibt erhalten, nur das Gesicht ändert sich.",
      prompt:
        "Körper, Performance, Kamera und Audio des Quellvideos unverändert lassen. Nur das Gesicht natürlich und stabil durch das Referenzbild ersetzen.",
      cloneMode: "face",
    },
    {
      id: "voice",
      title: "Stimmfarbe bereit",
      description: "Ablauf für eigene Stimmprobe.",
      prompt:
        "Bild natürlich halten, Timing von Sprache oder Song im Hauptvideo bewahren, Referenzperson und Stimmfarbe möglichst konsistent halten.",
      cloneMode: "character",
    },
    {
      id: "music",
      title: "Musikvideo",
      description: "Clone mit bewahrter Musik und Rhythmik.",
      prompt:
        "Musik, Rhythmus, Lippen- und Performance-Timing des Videos bewahren. Referenzfigur natürlich in die Szene integrieren.",
      cloneMode: "character",
    },
  ],
  ku: [
    {
      id: "character",
      title: "Karaktera tevahî",
      description: "Laş, rû û lihevhatina dîmenê bi hev re tê parastin.",
      prompt:
        "Tevger, kadraj, ronahî, herikîna dîmenê û dem ji vîdyoya çavkanî biparêze. Karaktera referans bi awayekî xwezayî, rastîn û stabîl li şûna kesê vîdyoyê bixe.",
      cloneMode: "character",
      badge: "Pêşniyar",
    },
    {
      id: "face",
      title: "Tenê rû",
      description: "Performans tê parastin, tenê rû diguhere.",
      prompt:
        "Laş, performans, kamera û dengê vîdyoya çavkanî wek xwe bimînin. Tenê rû bi wêneya referans bi awayekî xwezayî û stabîl biguhere.",
      cloneMode: "face",
    },
    {
      id: "voice",
      title: "Tonê deng amade",
      description: "Herikîn ji bo nimûneya dengê xwe.",
      prompt:
        "Wêne xwezayî bimîne, demkirina axaftin an stranê di vîdyoya sereke de neyê xirakirin, kesê referans û tonê deng bi qasî gengaz lihevhatî bin.",
      cloneMode: "character",
    },
    {
      id: "music",
      title: "Vîdyoya stranê",
      description: "Clone bi parastina muzîk û rîtimê.",
      prompt:
        "Muzîk, rîtim, demkirina lêv û performansê di vîdyoyê de biparêze. Karaktera referans bi awayekî xwezayî li dîmenê bicih bike.",
      cloneMode: "character",
    },
  ],
};

type UploadSlot = "source" | "reference" | "voice" | null;

export default function VideoClonePage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = COPY[safeLanguage];
  const cloneModeOptions = useMemo(
    () => getCloneModeOptions(safeLanguage),
    [safeLanguage]
  );
  const cloneVoiceModeOptions = useMemo(
    () => getCloneVoiceModeOptions(safeLanguage),
    [safeLanguage]
  );

  const [sourceVideoUrl, setSourceVideoUrl] = useState("");
  const [referenceImageUrl, setReferenceImageUrl] = useState("");
  const [voiceSampleUrl, setVoiceSampleUrl] = useState("");
  const [uploadSlot, setUploadSlot] = useState<UploadSlot>(null);
  const [cloneMode, setCloneMode] = useState<CloneMode>("character");
  const [voiceMode, setVoiceMode] = useState<CloneVoiceMode>("original");
  const [preserveAudio, setPreserveAudio] = useState(true);
  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [notice, setNotice] = useState("");
  const recentClones = useGenerationHistory({
    user,
    type: "video_clone",
    limit: 8,
  });

  const templates = useMemo<StudioTemplate[]>(
    () => {
      const staticTemplates = TEMPLATES[safeLanguage].map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description,
        badge: template.badge,
        onSelect: () => {
          setPrompt(template.prompt);
          setCloneMode(template.cloneMode);
          if (template.id === "voice") setVoiceMode("own_voice");
          setPreserveAudio(true);
          setNotice("");
        },
      }));

      const activeGeneration =
        generation.status === "done"
          ? [
              {
                id: "current-video-clone",
                title: generation.title,
                prompt: generation.prompt,
                thumbnailUrl: generation.referenceImageUrl,
                metadata: {
                  sourceVideoUrl: generation.sourceVideoUrl,
                  referenceImageUrl: generation.referenceImageUrl,
                  cloneMode: generation.cloneMode,
                  voiceMode: generation.voiceMode,
                  voiceSampleUrl: generation.voiceSampleUrl ?? null,
                  preserveAudio: generation.preserveAudio,
                },
              },
            ]
          : [];
      const generatedTemplates = [...activeGeneration, ...recentClones].map(
        (item) => ({
          id: `generated-${item.id}`,
          title: item.title,
          description: t.generatedTemplateDescription,
          badge: "Neon",
          onSelect: () => {
            const nextSource =
              typeof item.metadata?.sourceVideoUrl === "string"
                ? item.metadata.sourceVideoUrl
                : "";
            const nextReference =
              typeof item.metadata?.referenceImageUrl === "string"
                ? item.metadata.referenceImageUrl
                : item.thumbnailUrl || "";
            const nextVoiceSample =
              typeof item.metadata?.voiceSampleUrl === "string"
                ? item.metadata.voiceSampleUrl
                : "";

            setPrompt(item.prompt || item.title);
            if (nextSource) setSourceVideoUrl(nextSource);
            if (nextReference) setReferenceImageUrl(nextReference);
            setVoiceSampleUrl(nextVoiceSample);
            setCloneMode(
              item.metadata?.cloneMode === "face" ? "face" : "character"
            );
            setVoiceMode(
              item.metadata?.voiceMode === "own_voice" ? "own_voice" : "original"
            );
            setPreserveAudio(item.metadata?.preserveAudio !== false);
            setNotice("");
          },
        })
      );

      return [...staticTemplates, ...generatedTemplates];
    },
    [generation, recentClones, safeLanguage, t.generatedTemplateDescription]
  );

  async function uploadIntoSlot(file: File, slot: Exclude<UploadSlot, null>) {
    try {
      setUploadSlot(slot);
      setNotice("");

      const kind = slot === "source" ? "video" : slot === "voice" ? "audio" : "image";
      const uploadedUrl = await uploadGenerationAsset(file, kind);

      if (slot === "source") setSourceVideoUrl(uploadedUrl);
      if (slot === "reference") setReferenceImageUrl(uploadedUrl);
      if (slot === "voice") setVoiceSampleUrl(uploadedUrl);
      setGeneration({ status: "idle" });
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    } finally {
      setUploadSlot(null);
    }
  }

  async function handleGenerate() {
    const cleanPrompt = prompt.trim();

    if (!sourceVideoUrl) {
      setGeneration({ status: "error", message: t.sourceRequired });
      return;
    }

    if (!referenceImageUrl) {
      setGeneration({ status: "error", message: t.referenceRequired });
      return;
    }

    if (voiceMode === "own_voice" && !voiceSampleUrl) {
      setGeneration({ status: "error", message: t.voiceRequired });
      return;
    }

    if (!cleanPrompt) {
      setGeneration({ status: "error", message: t.promptRequired });
      return;
    }

    try {
      setNotice("");
      setGeneration({ status: "loading", phase: t.loading });

      const res = await fetch("/api/video-clone", {
        method: "POST",
        headers: buildSessionHeaders(user),
        body: JSON.stringify({
          sourceVideoUrl,
          referenceImageUrl,
          voiceSampleUrl: voiceMode === "own_voice" ? voiceSampleUrl : undefined,
          prompt: cleanPrompt,
          title: compactTitle(cleanPrompt, t.generatedTitle),
          cloneMode,
          voiceMode,
          preserveAudio,
          resolution: "720",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.videoUrl) {
        throw new Error(data?.error || t.error);
      }

      const videoUrl = String(data.videoUrl);
      const title = compactTitle(cleanPrompt, t.generatedTitle);
      const voiceCloneNote =
        typeof data.voiceCloneNote === "string" ? data.voiceCloneNote : undefined;

      setGeneration({
        status: "done",
        videoUrl,
        sourceVideoUrl,
        referenceImageUrl,
        voiceSampleUrl: voiceMode === "own_voice" ? voiceSampleUrl : undefined,
        prompt: cleanPrompt,
        title,
        cloneMode,
        voiceMode,
        preserveAudio,
        voiceCloneApplied: Boolean(data.voiceCloneApplied),
        voiceCloneModelConfigured: Boolean(data.voiceCloneModelConfigured),
        voiceCloneNote,
        remainingCredits:
          typeof data.remainingCredits === "number" ? data.remainingCredits : null,
      });

      addV2HistoryItem({
        id: makeHistoryId("video-clone"),
        type: "video_clone",
        title,
        createdAt: new Date().toISOString(),
        url: videoUrl,
        thumbnailUrl: referenceImageUrl,
        prompt: cleanPrompt,
      });

      if (voiceCloneNote) {
        setNotice(voiceCloneNote);
      }

      await refreshSession();
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    }
  }

  function handleReset() {
    setSourceVideoUrl("");
    setReferenceImageUrl("");
    setVoiceSampleUrl("");
    setCloneMode("character");
    setVoiceMode("original");
    setPreserveAudio(true);
    setPrompt(t.promptPlaceholder);
    setGeneration({ status: "idle" });
    setNotice("");
  }

  function handleAddToEditor() {
    if (generation.status !== "done") return;

    setV2EditorPrefill({
      type: "video_clone",
      source: "video-clone",
      createdAt: new Date().toISOString(),
      title: generation.title,
      prompt: generation.prompt,
      videoUrl: generation.videoUrl,
      thumbnailUrl: generation.referenceImageUrl,
      duration: undefined,
      sourceVideoUrl: generation.sourceVideoUrl,
      referenceImageUrl: generation.referenceImageUrl,
      cloneMode: generation.cloneMode,
      voiceMode: generation.voiceMode,
      voiceSampleUrl: generation.voiceSampleUrl,
      preserveAudio: generation.preserveAudio,
    });
    setNotice(t.editorReady);
  }

  const busy = uploadSlot !== null || generation.status === "loading";
  const status =
    uploadSlot
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
      currentPath="/video-clone"
      title={t.title}
      description={t.description}
      badge="Duble-S Motion"
      isMobile={isMobile}
      status={status}
      metrics={[
        { label: t.credits, value: credits ?? "-" },
        { label: t.cloneMode, value: cloneMode === "face" ? t.faceValue : t.characterValue },
        { label: t.voiceMode, value: voiceMode === "own_voice" ? t.ownVoiceValue : t.originalVoiceValue },
      ]}
      inputTitle={t.inputTitle}
      inputDescription={t.inputDescription}
      inputPanel={
        <>
          <StudioField label={t.sourceVideo}>
            <StudioUpload
              title={t.uploadVideo}
              description={t.uploadVideoDescription}
              accept="video/*"
              mediaType="video"
              value={sourceVideoUrl}
              busy={uploadSlot === "source"}
              onChange={(file) => uploadIntoSlot(file, "source")}
            />
          </StudioField>
          <StudioField label={t.referenceImage}>
            <StudioUpload
              title={t.uploadReference}
              description={t.referenceDescription}
              accept="image/*"
              mediaType="image"
              value={referenceImageUrl}
              busy={uploadSlot === "reference"}
              onChange={(file) => uploadIntoSlot(file, "reference")}
            />
          </StudioField>
          <StudioField label={t.cloneMode}>
            <StudioSegmented<CloneMode>
              value={cloneMode}
              onChange={setCloneMode}
              options={cloneModeOptions}
            />
          </StudioField>
          <StudioField label={t.voiceMode}>
            <StudioSegmented<CloneVoiceMode>
              value={voiceMode}
              onChange={setVoiceMode}
              options={cloneVoiceModeOptions}
            />
          </StudioField>
          {voiceMode === "own_voice" ? (
            <StudioField label={t.voiceSample}>
              <StudioUpload
                title={t.uploadVoice}
                description={t.voiceDescription}
                accept="audio/*"
                mediaType="audio"
                value={voiceSampleUrl}
                busy={uploadSlot === "voice"}
                onChange={(file) => uploadIntoSlot(file, "voice")}
              />
            </StudioField>
          ) : null}
          <StudioCheckbox
            checked={preserveAudio}
            onChange={setPreserveAudio}
            label={t.preserveAudio}
            description={t.preserveAudioDescription}
          />
          <StudioField label={t.prompt}>
            <StudioTextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={t.promptPlaceholder}
              rows={5}
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
        ) : sourceVideoUrl ? (
          <StudioMediaPreview kind="video" src={sourceVideoUrl} title={t.sourceVideo} />
        ) : (
          <StudioEmpty title={t.emptyTitle} text={t.emptyText} />
        )
      }
      primaryAction={{
        label: generation.status === "loading" ? t.loading : t.generate,
        onClick: handleGenerate,
        disabled: busy,
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
