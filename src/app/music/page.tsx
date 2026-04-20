"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  GenerationStudio,
  StudioCheckbox,
  StudioDownloadLink,
  StudioEmpty,
  StudioField,
  StudioInput,
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
  makeHistoryId,
  setV2EditorPrefill,
} from "@/lib/v2-store";
import {
  MUSIC_DURATION_OPTIONS,
  SONG_LANGUAGE_OPTIONS,
  VOCAL_MODE_OPTIONS,
  VOCAL_PRESET_OPTIONS,
  type SongLanguage,
  type VocalMode,
  type VocalPreset,
} from "@/lib/generation/options";
import {
  buildSessionHeaders,
  compactTitle,
  getSafeGenerationLanguage,
  uploadGenerationAsset,
} from "@/lib/generation/client";

const GENERATE_SONG_ROUTE = "/api/music";
const GENERATE_LYRICS_ROUTE = "/api/music/lyrics";

type GenerationState =
  | { status: "idle" }
  | { status: "loading"; phase: string }
  | {
      status: "done";
      audioUrl: string;
      title: string;
      prompt: string;
      lyrics: string;
      durationSec: number;
      songLanguage: SongLanguage;
      vocalPreset: VocalPreset;
      vocalMode: VocalMode;
      voiceSampleUrl?: string;
      instrumental: boolean;
      voiceCloningEnabled: boolean;
      voiceCloneApplied: boolean;
      voiceCloneModelConfigured: boolean;
      voiceCloneNote?: string;
      remainingCredits: number | null;
    }
  | { status: "error"; message: string };

const COPY = {
  tr: {
    title: "Müzik Üretimi",
    description:
      "Dil, vokal karakteri, söz ve ses örneğini tek profesyonel müzik stüdyosunda yönet.",
    inputTitle: "Şarkı brief’i",
    inputDescription:
      "Söz, tür, vokal, dil ve kendi ses seçeneği aynı üretim panelinde.",
    songTitle: "Şarkı adı",
    titlePlaceholder: "Gulamin",
    prompt: "Müzik promptu",
    promptPlaceholder:
      "Modern prodüksiyonlu, güçlü nakaratlı, duygusal ama ritmik bir şarkı üret.",
    lyrics: "Şarkı sözleri",
    lyricsPlaceholder: "Sözleri yaz veya otomatik üret.",
    style: "Tür / his",
    language: "Şarkı dili",
    vocalPreset: "Vokal karakteri",
    vocalMode: "Vokal kaynağı",
    voiceSample: "Kendi ses örneğin",
    uploadVoice: "Ses örneği yükle",
    voiceDescription:
      "Kısa, temiz ve konuşma/şarkı içeren bir kayıt yükle.",
    instrumental: "Enstrümantal üret",
    instrumentalDescription: "Vokal istemiyorsan yalnızca altyapı üret.",
    duration: "Süre",
    generateLyrics: "Söz üret",
    generatingLyrics: "Söz hazırlanıyor...",
    generate: "Müzik üret",
    reset: "Sıfırla",
    previewTitle: "Preview",
    previewDescription: "Üretilen şarkı burada dinlenir.",
    emptyTitle: "Henüz müzik yok",
    emptyText: "Promptu ve vokal ayarlarını tamamlayıp üretimi başlat.",
    templatesTitle: "Hazır şarkı briefleri",
    templatesDescription: "Dile ve türe göre hızlı bir başlangıç seç.",
    loading: "Müzik üretiliyor...",
    uploading: "Ses yükleniyor...",
    done: "Hazır",
    error: "Müzik üretimi başarısız oldu.",
    credits: "Kredi",
    addToEditor: "Editöre ekle",
    prepareClip: "Klip için hazırla",
    download: "İndir",
    editorReady: "Müzik editöre gönderildi.",
    clipReady: "Müzik klip üretimi için hazırlandı.",
    voiceFallback:
      "Ses örneği kaydedildi. Aktif müzik modeli ses klonlamayı desteklemiyorsa seçilen dilde native AI vokal kullanır.",
  },
  en: {
    title: "Music Studio",
    description:
      "Control language, vocal character, lyrics, and voice references inside one professional music studio.",
    inputTitle: "Song brief",
    inputDescription:
      "Lyrics, genre, vocal, language, and own-voice options in one panel.",
    songTitle: "Song title",
    titlePlaceholder: "My Song",
    prompt: "Music prompt",
    promptPlaceholder:
      "Create an emotional but rhythmic song with modern production and a strong chorus.",
    lyrics: "Lyrics",
    lyricsPlaceholder: "Write lyrics or generate them automatically.",
    style: "Genre / feel",
    language: "Song language",
    vocalPreset: "Vocal character",
    vocalMode: "Vocal source",
    voiceSample: "Own voice sample",
    uploadVoice: "Upload voice sample",
    voiceDescription: "Upload a short clean speech or singing recording.",
    instrumental: "Generate instrumental",
    instrumentalDescription: "Use this when you want only the backing track.",
    duration: "Duration",
    generateLyrics: "Generate lyrics",
    generatingLyrics: "Preparing lyrics...",
    generate: "Generate music",
    reset: "Reset",
    previewTitle: "Preview",
    previewDescription: "The generated song plays here.",
    emptyTitle: "No music yet",
    emptyText: "Complete the prompt and vocal settings, then generate.",
    templatesTitle: "Ready song briefs",
    templatesDescription: "Pick a quick start by language and genre.",
    loading: "Generating music...",
    uploading: "Uploading voice...",
    done: "Ready",
    error: "Music generation failed.",
    credits: "Credits",
    addToEditor: "Add to editor",
    prepareClip: "Prepare clip",
    download: "Download",
    editorReady: "Music sent to editor.",
    clipReady: "Music prepared for clip generation.",
    voiceFallback:
      "Voice sample saved. If the active music model does not support voice cloning, it will use a native AI vocal in the selected language.",
  },
} as const;

const MUSIC_STYLE_OPTIONS = [
  { value: "Pop / Commercial", label: "Pop / Commercial" },
  { value: "Halay / Folk Pop", label: "Halay / Folk Pop" },
  { value: "Arabesk / Emotional", label: "Arabesk / Emotional" },
  { value: "Rap / Melodic", label: "Rap / Melodic" },
  { value: "Cinematic Ballad", label: "Cinematic Ballad" },
  { value: "Electronic Dance", label: "Electronic Dance" },
];

const TEMPLATES = [
  {
    id: "tr-pop",
    title: "Türkçe pop",
    description: "Net nakarat ve modern prodüksiyon.",
    prompt:
      "Türkçe, modern pop prodüksiyonlu, güçlü nakaratlı, duygusal ama ritmik bir şarkı üret.",
    titleValue: "Yeni Gün",
    style: "Pop / Commercial",
    songLanguage: "tr" as SongLanguage,
    vocalPreset: "female" as VocalPreset,
    badge: "TR",
  },
  {
    id: "ku-halay",
    title: "Kurdish halay",
    description: "Kürtçe ritim ve modern altyapı.",
    prompt:
      "Kürtçe halay enerjisi olan, modern prodüksiyonlu, güçlü nakaratlı ve sahnede söylenecek bir şarkı üret.",
    titleValue: "Gulamin",
    style: "Halay / Folk Pop",
    songLanguage: "ku" as SongLanguage,
    vocalPreset: "male" as VocalPreset,
  },
  {
    id: "de-ballad",
    title: "Deutsch ballad",
    description: "Duygusal Alman vokal yönü.",
    prompt:
      "Deutsch pop ballad, emotional storytelling, cinematic chorus, polished modern production.",
    titleValue: "Bleib Hier",
    style: "Cinematic Ballad",
    songLanguage: "de" as SongLanguage,
    vocalPreset: "female" as VocalPreset,
  },
  {
    id: "en-rap",
    title: "English melodic rap",
    description: "Melodik rap akışı.",
    prompt:
      "English melodic rap song with a memorable hook, modern drums, emotional verses, clean commercial mix.",
    titleValue: "City Lights",
    style: "Rap / Melodic",
    songLanguage: "en" as SongLanguage,
    vocalPreset: "rap" as VocalPreset,
  },
];

function mapVocalType(vocalPreset: VocalPreset) {
  if (vocalPreset === "male") return "ai_male";
  if (vocalPreset === "duet") return "duet";
  if (vocalPreset === "rap") return "rap";
  return "ai_female";
}

function mapVocalPresetFromType(value: unknown): VocalPreset {
  if (value === "ai_male") return "male";
  if (value === "duet") return "duet";
  if (value === "rap") return "rap";
  return "female";
}

export default function MusicPage() {
  const { language } = useLanguage();
  const { user, refreshSession } = useSession();
  const isMobile = useIsMobile(980);
  const safeLanguage = getSafeGenerationLanguage(language);
  const t = safeLanguage === "tr" ? COPY.tr : COPY.en;

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("Pop / Commercial");
  const [songLanguage, setSongLanguage] = useState<SongLanguage>(
    safeLanguage === "tr" ? "tr" : safeLanguage === "de" ? "de" : "en"
  );
  const [vocalPreset, setVocalPreset] = useState<VocalPreset>("female");
  const [vocalMode, setVocalMode] = useState<VocalMode>("preset");
  const [voiceSampleUrl, setVoiceSampleUrl] = useState("");
  const [durationSec, setDurationSec] = useState("60");
  const [instrumental, setInstrumental] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const [notice, setNotice] = useState("");
  const recentMusic = useGenerationHistory({
    user,
    type: "music",
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
          setTitle(template.titleValue);
          setPrompt(template.prompt);
          setStyle(template.style);
          setSongLanguage(template.songLanguage);
          setVocalPreset(template.vocalPreset);
          setVocalMode("preset");
          setInstrumental(false);
          setNotice("");
        },
      }));

      const activeGeneration =
        generation.status === "done"
          ? [
              {
                id: "current-music",
                title: generation.title,
                prompt: generation.prompt,
                lyrics: generation.lyrics,
                durationSec: generation.durationSec,
                metadata: {
                  genre: style,
                  mood: style,
                  language: generation.songLanguage,
                  vocalType: mapVocalType(generation.vocalPreset),
                  vocalMode: generation.vocalMode,
                  voiceSampleUrl: generation.voiceSampleUrl ?? null,
                  instrumental: generation.instrumental,
                },
              },
            ]
          : [];
      const generatedTemplates = [...activeGeneration, ...recentMusic].map(
        (item) => ({
          id: `generated-${item.id}`,
          title: item.title,
          description: "Son üretilen şarkıdan müzik brief’i.",
          badge: "Neon",
          onSelect: () => {
            const nextStyle = String(
              item.metadata?.genre || item.metadata?.mood || "Pop / Commercial"
            );
            const nextLanguage = String(
              item.metadata?.language || "en"
            ) as SongLanguage;
            const nextVocalMode =
              item.metadata?.vocalMode === "own_voice"
                ? "own_voice"
                : "preset";
            const nextVoiceSample =
              typeof item.metadata?.voiceSampleUrl === "string"
                ? item.metadata.voiceSampleUrl
                : "";

            setTitle(item.title);
            setPrompt(item.prompt || item.title);
            setLyrics(item.lyrics || "");
            setStyle(nextStyle);
            setSongLanguage(nextLanguage);
            setVocalPreset(mapVocalPresetFromType(item.metadata?.vocalType));
            setVocalMode(nextVocalMode);
            setVoiceSampleUrl(nextVoiceSample);
            setInstrumental(Boolean(item.metadata?.instrumental));
            setDurationSec(String(item.durationSec || 60));
            setNotice("");
          },
        })
      );

      return [...staticTemplates, ...generatedTemplates];
    },
    [generation, recentMusic, style]
  );

  async function requestLyrics() {
    const cleanPrompt = prompt.trim();
    const cleanTitle = title.trim();

    if (!cleanPrompt && !cleanTitle) {
      throw new Error("Prompt veya şarkı adı gerekli.");
    }

    const res = await fetch(GENERATE_LYRICS_ROUTE, {
      method: "POST",
      headers: buildSessionHeaders(user),
      body: JSON.stringify({
        prompt: cleanPrompt,
        title: cleanTitle,
        language: songLanguage,
        mood: style,
        genre: style,
        cleanLyrics: true,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok || !data?.lyrics) {
      throw new Error(data?.error || "Şarkı sözleri üretilemedi.");
    }

    return String(data.lyrics).trim();
  }

  async function handleGenerateLyrics() {
    try {
      setLyricsLoading(true);
      setNotice("");
      const generatedLyrics = await requestLyrics();
      setLyrics(generatedLyrics);
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    } finally {
      setLyricsLoading(false);
    }
  }

  async function handleVoiceUpload(file: File) {
    try {
      setUploading(true);
      setNotice("");
      const uploadedUrl = await uploadGenerationAsset(file, "audio");
      setVoiceSampleUrl(uploadedUrl);
      setVocalMode("own_voice");
    } catch (error) {
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateMusic() {
    const cleanPrompt = prompt.trim();

    if (cleanPrompt.length < 10) {
      setGeneration({ status: "error", message: "Prompt en az 10 karakter olmalı." });
      return;
    }

    if (vocalMode === "own_voice" && !voiceSampleUrl) {
      setGeneration({ status: "error", message: "Kendi ses modu için ses örneği yüklemelisin." });
      return;
    }

    try {
      setNotice("");
      setGeneration({ status: "loading", phase: t.loading });

      let finalLyrics = lyrics.trim();
      if (!instrumental && !finalLyrics) {
        setLyricsLoading(true);
        finalLyrics = await requestLyrics();
        setLyrics(finalLyrics);
        setLyricsLoading(false);
      }

      if (!instrumental && !finalLyrics) {
        throw new Error("Şarkı sözleri gerekli.");
      }

      const duration = Number(durationSec);
      const songTitle = title.trim() || compactTitle(cleanPrompt, "Generated Song");

      const res = await fetch(GENERATE_SONG_ROUTE, {
        method: "POST",
        headers: buildSessionHeaders(user),
        body: JSON.stringify({
          mode: "song",
          title: songTitle,
          prompt: cleanPrompt,
          lyrics: instrumental ? "Instrumental arrangement without lead vocal." : finalLyrics,
          durationSec: duration,
          language: songLanguage,
          vocalType: mapVocalType(vocalPreset),
          vocalMode,
          voiceSampleUrl: vocalMode === "own_voice" ? voiceSampleUrl : undefined,
          mood: style,
          genre: style,
          tempo: "orta",
          instrumental,
          cleanLyrics: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.audioUrl) {
        throw new Error(data?.error || t.error);
      }

      const audioUrl = String(data.audioUrl);
      const resultLyrics = typeof data.lyrics === "string" ? data.lyrics : finalLyrics;
      const voiceCloningEnabled = Boolean(data.voiceCloningEnabled);
      const voiceCloneApplied = Boolean(data.voiceCloneApplied);
      const voiceCloneModelConfigured = Boolean(data.voiceCloneModelConfigured);
      const voiceCloneNote =
        typeof data.voiceCloneNote === "string" ? data.voiceCloneNote : undefined;

      setGeneration({
        status: "done",
        audioUrl,
        title: songTitle,
        prompt: cleanPrompt,
        lyrics: resultLyrics,
        durationSec: duration,
        songLanguage,
        vocalPreset,
        vocalMode,
        voiceSampleUrl: vocalMode === "own_voice" ? voiceSampleUrl : undefined,
        instrumental,
        voiceCloningEnabled,
        voiceCloneApplied,
        voiceCloneModelConfigured,
        voiceCloneNote,
        remainingCredits:
          typeof data.remainingCredits === "number" ? data.remainingCredits : null,
      });

      addV2HistoryItem({
        id: makeHistoryId("music"),
        type: "music",
        title: songTitle,
        createdAt: new Date().toISOString(),
        url: audioUrl,
        prompt: cleanPrompt,
        durationSec: duration,
      });

      if (voiceCloneNote) {
        setNotice(voiceCloneNote);
      } else if (vocalMode === "own_voice" && !voiceCloningEnabled) {
        setNotice(t.voiceFallback);
      }

      await refreshSession();
    } catch (error) {
      setLyricsLoading(false);
      setGeneration({
        status: "error",
        message: error instanceof Error ? error.message : t.error,
      });
    }
  }

  function handleReset() {
    setTitle("");
    setPrompt(t.promptPlaceholder);
    setLyrics("");
    setStyle("Pop / Commercial");
    setSongLanguage(safeLanguage === "tr" ? "tr" : safeLanguage === "de" ? "de" : "en");
    setVocalPreset("female");
    setVocalMode("preset");
    setVoiceSampleUrl("");
    setDurationSec("60");
    setInstrumental(false);
    setGeneration({ status: "idle" });
    setNotice("");
  }

  function handleAddToEditor() {
    if (generation.status !== "done") return;

    setV2EditorPrefill({
      type: "music",
      source: "music",
      createdAt: new Date().toISOString(),
      title: generation.title,
      prompt: generation.prompt,
      lyrics: generation.lyrics,
      audioUrl: generation.audioUrl,
      duration: generation.durationSec,
      songLanguage: generation.songLanguage,
      vocalPreset: generation.vocalPreset,
      vocalMode: generation.vocalMode,
      voiceSampleUrl: generation.voiceSampleUrl,
      instrumental: generation.instrumental,
    });
    setNotice(t.editorReady);
  }

  function handlePrepareClip() {
    if (generation.status !== "done") return;

    setV2EditorPrefill({
      type: "music",
      source: "music-clip-seed",
      createdAt: new Date().toISOString(),
      title: generation.title,
      prompt: generation.prompt,
      lyrics: generation.lyrics,
      audioUrl: generation.audioUrl,
      duration: generation.durationSec,
      songLanguage: generation.songLanguage,
      vocalPreset: generation.vocalPreset,
      vocalMode: generation.vocalMode,
      voiceSampleUrl: generation.voiceSampleUrl,
      instrumental: generation.instrumental,
      clipAtmosphereMode: true,
    });
    setNotice(t.clipReady);
  }

  const busy = uploading || lyricsLoading || generation.status === "loading";
  const status =
    uploading
      ? { label: t.uploading, tone: "warning" as const }
      : lyricsLoading
      ? { label: t.generatingLyrics, tone: "warning" as const }
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
      currentPath="/music"
      title={t.title}
      description={t.description}
      badge="Duble-S Motion"
      isMobile={isMobile}
      status={status}
      metrics={[
        { label: t.credits, value: credits ?? "-" },
        { label: t.language, value: songLanguage.toUpperCase() },
        { label: t.duration, value: `${durationSec} sn` },
      ]}
      inputTitle={t.inputTitle}
      inputDescription={t.inputDescription}
      inputPanel={
        <>
          <StudioField label={t.songTitle}>
            <StudioInput
              value={title}
              onChange={setTitle}
              placeholder={t.titlePlaceholder}
            />
          </StudioField>
          <StudioField label={t.prompt}>
            <StudioTextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={t.promptPlaceholder}
              rows={5}
            />
          </StudioField>
          <StudioField label={t.lyrics}>
            <StudioTextArea
              value={lyrics}
              onChange={setLyrics}
              placeholder={t.lyricsPlaceholder}
              rows={7}
            />
          </StudioField>
          <StudioField label={t.style}>
            <StudioSelect value={style} onChange={setStyle} options={MUSIC_STYLE_OPTIONS} />
          </StudioField>
          <StudioField label={t.language}>
            <StudioSelect<SongLanguage>
              value={songLanguage}
              onChange={setSongLanguage}
              options={SONG_LANGUAGE_OPTIONS}
            />
          </StudioField>
          <StudioField label={t.vocalPreset}>
            <StudioSelect<VocalPreset>
              value={vocalPreset}
              onChange={setVocalPreset}
              options={VOCAL_PRESET_OPTIONS}
            />
          </StudioField>
          <StudioField label={t.vocalMode}>
            <StudioSegmented<VocalMode>
              value={vocalMode}
              onChange={setVocalMode}
              options={VOCAL_MODE_OPTIONS}
            />
          </StudioField>
          {vocalMode === "own_voice" ? (
            <StudioField label={t.voiceSample}>
              <StudioUpload
                title={t.uploadVoice}
                description={t.voiceDescription}
                accept="audio/*"
                mediaType="audio"
                value={voiceSampleUrl}
                busy={uploading}
                onChange={handleVoiceUpload}
              />
            </StudioField>
          ) : null}
          <StudioCheckbox
            checked={instrumental}
            onChange={setInstrumental}
            label={t.instrumental}
            description={t.instrumentalDescription}
          />
          <StudioField label={t.duration}>
            <StudioSelect
              value={durationSec}
              onChange={setDurationSec}
              options={MUSIC_DURATION_OPTIONS}
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
              kind="audio"
              src={generation.audioUrl}
              title={generation.title}
            />
            <StudioDownloadLink href={generation.audioUrl} label={t.download} />
          </div>
        ) : (
          <StudioEmpty title={t.emptyTitle} text={t.emptyText} />
        )
      }
      primaryAction={{
        label: generation.status === "loading" ? t.loading : t.generate,
        onClick: handleGenerateMusic,
        disabled: busy,
      }}
      secondaryActions={[
        {
          label: lyricsLoading ? t.generatingLyrics : t.generateLyrics,
          onClick: handleGenerateLyrics,
          disabled: busy,
        },
        { label: t.reset, onClick: handleReset, disabled: generation.status === "loading" },
        {
          label: t.addToEditor,
          onClick: handleAddToEditor,
          disabled: generation.status !== "done",
        },
        {
          label: t.prepareClip,
          onClick: handlePrepareClip,
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
