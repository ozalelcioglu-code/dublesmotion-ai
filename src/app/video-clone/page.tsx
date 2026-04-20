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
  CLONE_MODE_OPTIONS,
  CLONE_VOICE_MODE_OPTIONS,
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
  },
} as const;

const TEMPLATES = [
  {
    id: "character",
    title: "Komple karakter",
    description: "Vücut, yüz ve sahne uyumu birlikte korunur.",
    prompt:
      "Kaynak videodaki hareket, kadraj, ışık, sahne akışı ve zamanlama korunsun. Referans karakter doğal, gerçekçi ve stabil biçimde videodaki kişinin yerine geçsin.",
    cloneMode: "character" as CloneMode,
    badge: "Önerilen",
  },
  {
    id: "face",
    title: "Sadece yüz",
    description: "Performans korunur, yalnızca yüz değiştirilir.",
    prompt:
      "Kaynak videodaki vücut, performans, kamera ve ses aynen korunsun. Sadece yüz referans görseldeki kişiyle doğal ve stabil biçimde değişsin.",
    cloneMode: "face" as CloneMode,
  },
  {
    id: "voice",
    title: "Ses tonu hazır",
    description: "Kendi ses örneğiyle çalışacak akış.",
    prompt:
      "Görüntü doğal kalsın, ana videodaki konuşma veya şarkının zamanlaması bozulmasın, referans kişi ve ses tonu mümkün olduğunca tutarlı olsun.",
    cloneMode: "character" as CloneMode,
  },
  {
    id: "music",
    title: "Şarkılı video",
    description: "Müzik ve ritim korunarak clone.",
    prompt:
      "Videodaki müzik, ritim, dudak ve performans zamanlaması korunsun. Referans karakter sahneye doğal şekilde yerleşsin.",
    cloneMode: "character" as CloneMode,
  },
];

type UploadSlot = "source" | "reference" | "voice" | null;

export default function VideoClonePage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = safeLanguage === "tr" ? COPY.tr : COPY.en;

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
      const staticTemplates = TEMPLATES.map((template) => ({
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
          description: "Son video clone işleminden brief.",
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
    [generation, recentClones]
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
      setGeneration({ status: "error", message: "Önce kaynak video yüklemelisin." });
      return;
    }

    if (!referenceImageUrl) {
      setGeneration({ status: "error", message: "Önce referans görsel yüklemelisin." });
      return;
    }

    if (voiceMode === "own_voice" && !voiceSampleUrl) {
      setGeneration({ status: "error", message: "Kendi ses modu için ses örneği yüklemelisin." });
      return;
    }

    if (!cleanPrompt) {
      setGeneration({ status: "error", message: "Yönlendirme alanı boş olamaz." });
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
          title: compactTitle(cleanPrompt, "Cloned Video"),
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
      const title = compactTitle(cleanPrompt, "Cloned Video");
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
      : { label: "Ready" };

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
        { label: t.cloneMode, value: cloneMode === "face" ? "Face" : "Character" },
        { label: t.voiceMode, value: voiceMode === "own_voice" ? "Own voice" : "Original" },
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
              options={CLONE_MODE_OPTIONS}
            />
          </StudioField>
          <StudioField label={t.voiceMode}>
            <StudioSegmented<CloneVoiceMode>
              value={voiceMode}
              onChange={setVoiceMode}
              options={CLONE_VOICE_MODE_OPTIONS}
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
