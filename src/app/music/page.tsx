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
  getMusicDurationOptions,
  getSongLanguageOptions,
  getVocalModeOptions,
  getVocalPresetOptions,
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
      "Ses örneği kaydedildi. Aktif müzik akışı ses klonlamayı desteklemiyorsa seçilen dilde native AI vokal kullanır.",
    promptOrTitleRequired: "Prompt veya şarkı adı gerekli.",
    lyricsError: "Şarkı sözleri üretilemedi.",
    promptTooShort: "Prompt en az 10 karakter olmalı.",
    voiceRequired: "Kendi ses modu için ses örneği yüklemelisin.",
    lyricsRequired: "Şarkı sözleri gerekli.",
    generatedTemplateDescription: "Son üretilen şarkıdan müzik brief’i.",
    generatedTitle: "Üretilen Şarkı",
    instrumentalLyrics: "Vokalsiz enstrümantal düzenleme.",
    seconds: "sn",
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
      "Voice sample saved. If the active music flow does not support voice cloning, it will use a native AI vocal in the selected language.",
    promptOrTitleRequired: "Prompt or song title is required.",
    lyricsError: "Lyrics could not be generated.",
    promptTooShort: "Prompt must be at least 10 characters.",
    voiceRequired: "Upload a voice sample for own-voice mode.",
    lyricsRequired: "Lyrics are required.",
    generatedTemplateDescription: "Music brief from the latest generated song.",
    generatedTitle: "Generated Song",
    instrumentalLyrics: "Instrumental arrangement without lead vocal.",
    seconds: "sec",
  },
  de: {
    title: "Musikstudio",
    description:
      "Steuere Sprache, Vokalcharakter, Lyrics und Stimmprobe in einem professionellen Musikstudio.",
    inputTitle: "Songbrief",
    inputDescription:
      "Lyrics, Genre, Vokal, Sprache und eigene Stimme in einem Panel.",
    songTitle: "Songtitel",
    titlePlaceholder: "Mein Song",
    prompt: "Musikprompt",
    promptPlaceholder:
      "Erzeuge einen emotionalen, aber rhythmischen Song mit moderner Produktion und starkem Refrain.",
    lyrics: "Lyrics",
    lyricsPlaceholder: "Schreibe Lyrics oder erzeuge sie automatisch.",
    style: "Genre / Gefühl",
    language: "Songsprache",
    vocalPreset: "Vokalcharakter",
    vocalMode: "Vokalquelle",
    voiceSample: "Eigene Stimmprobe",
    uploadVoice: "Stimmprobe hochladen",
    voiceDescription: "Lade eine kurze, saubere Sprach- oder Gesangsaufnahme hoch.",
    instrumental: "Instrumental erzeugen",
    instrumentalDescription: "Nutze das, wenn du nur die Begleitung möchtest.",
    duration: "Dauer",
    generateLyrics: "Lyrics erzeugen",
    generatingLyrics: "Lyrics werden vorbereitet...",
    generate: "Musik erzeugen",
    reset: "Zurücksetzen",
    previewTitle: "Preview",
    previewDescription: "Der erzeugte Song wird hier abgespielt.",
    emptyTitle: "Noch keine Musik",
    emptyText: "Vervollständige Prompt und Vokaleinstellungen und starte die Erstellung.",
    templatesTitle: "Fertige Songbriefs",
    templatesDescription: "Wähle einen schnellen Start nach Sprache und Genre.",
    loading: "Musik wird erzeugt...",
    uploading: "Stimme wird hochgeladen...",
    done: "Bereit",
    error: "Musikerzeugung fehlgeschlagen.",
    credits: "Credits",
    addToEditor: "Zum Editor hinzufügen",
    prepareClip: "Für Clip vorbereiten",
    download: "Download",
    editorReady: "Musik wurde an den Editor gesendet.",
    clipReady: "Musik wurde für die Clip-Erzeugung vorbereitet.",
    voiceFallback:
      "Stimmprobe gespeichert. Wenn der aktive Musikablauf Voice Cloning nicht unterstützt, wird ein nativer KI-Vokal in der ausgewählten Sprache genutzt.",
    promptOrTitleRequired: "Prompt oder Songtitel ist erforderlich.",
    lyricsError: "Lyrics konnten nicht erzeugt werden.",
    promptTooShort: "Prompt muss mindestens 10 Zeichen lang sein.",
    voiceRequired: "Lade für den eigenen Stimm-Modus eine Stimmprobe hoch.",
    lyricsRequired: "Lyrics sind erforderlich.",
    generatedTemplateDescription: "Musikbrief aus dem zuletzt erzeugten Song.",
    generatedTitle: "Erzeugter Song",
    instrumentalLyrics: "Instrumentales Arrangement ohne Lead-Vokal.",
    seconds: "Sek.",
  },
  ku: {
    title: "Stûdyoya Muzîkê",
    description:
      "Ziman, karaktera vokalê, gotin û nimûneya dengê di yek stûdyoya muzîkê ya profesyonel de rêve bibe.",
    inputTitle: "Briefa stranê",
    inputDescription:
      "Gotin, cure, vokal, ziman û dengê xwe di yek panelê de.",
    songTitle: "Navê stranê",
    titlePlaceholder: "Strana Min",
    prompt: "Prompta muzîkê",
    promptPlaceholder:
      "Stranek bi hilberîna modern, nakarata bihêz, hestyar lê rîtimîk çêke.",
    lyrics: "Gotinên stranê",
    lyricsPlaceholder: "Gotinan binivîse an bixweber çêke.",
    style: "Cure / hest",
    language: "Zimanê stranê",
    vocalPreset: "Karaktera vokalê",
    vocalMode: "Çavkaniya vokalê",
    voiceSample: "Nimûneya dengê xwe",
    uploadVoice: "Nimûneya deng bar bike",
    voiceDescription: "Tomarek kurt û paqij a axaftin an stranê bar bike.",
    instrumental: "Enstrûmental çêke",
    instrumentalDescription: "Ger vokal nexwazî, tenê altyapı çêke.",
    duration: "Dem",
    generateLyrics: "Gotinan çêke",
    generatingLyrics: "Gotin têne amadekirin...",
    generate: "Muzîk çêke",
    reset: "Ji nû ve",
    previewTitle: "Preview",
    previewDescription: "Strana çêkirî li vir tê bihîstin.",
    emptyTitle: "Hê muzîk tune",
    emptyText: "Prompt û mîhengên vokalê temam bike û dest bi çêkirinê bike.",
    templatesTitle: "Briefên stranê yên amade",
    templatesDescription: "Li gor ziman û cure destpêkek zû hilbijêre.",
    loading: "Muzîk tê çêkirin...",
    uploading: "Deng tê barkirin...",
    done: "Amade",
    error: "Çêkirina muzîkê bi ser neket.",
    credits: "Kredit",
    addToEditor: "Li editorê zêde bike",
    prepareClip: "Ji bo klîpê amade bike",
    download: "Daxe",
    editorReady: "Muzîk ji editorê re hate şandin.",
    clipReady: "Muzîk ji bo çêkirina klîpê hate amadekirin.",
    voiceFallback:
      "Nimûneya deng hate tomar kirin. Ger herikîna muzîkê voice cloning piştgirî neke, ew ê di zimanê hilbijartî de vokala AI ya xwezayî bikar bîne.",
    promptOrTitleRequired: "Prompt an navê stranê pêwîst e.",
    lyricsError: "Gotinên stranê nehatin çêkirin.",
    promptTooShort: "Prompt divê herî kêm 10 karakter be.",
    voiceRequired: "Ji bo moda dengê xwe, nimûneya deng bar bike.",
    lyricsRequired: "Gotinên stranê pêwîst in.",
    generatedTemplateDescription: "Briefa muzîkê ji strana dawî ya çêkirî.",
    generatedTitle: "Strana Çêkirî",
    instrumentalLyrics: "Rêkxistina enstrûmental bê vokala sereke.",
    seconds: "sn",
  },
} as const;

const MUSIC_STYLE_VALUES = [
  "Pop / Commercial",
  "Halay / Folk Pop",
  "Arabesk / Emotional",
  "Rap / Melodic",
  "Cinematic Ballad",
  "Electronic Dance",
] as const;

const MUSIC_STYLE_LABELS: Record<
  keyof typeof COPY,
  Record<(typeof MUSIC_STYLE_VALUES)[number], string>
> = {
  tr: {
    "Pop / Commercial": "Pop / Ticari",
    "Halay / Folk Pop": "Halay / Folk Pop",
    "Arabesk / Emotional": "Arabesk / Duygusal",
    "Rap / Melodic": "Rap / Melodik",
    "Cinematic Ballad": "Sinematik Balad",
    "Electronic Dance": "Elektronik Dans",
  },
  en: {
    "Pop / Commercial": "Pop / Commercial",
    "Halay / Folk Pop": "Halay / Folk Pop",
    "Arabesk / Emotional": "Arabesk / Emotional",
    "Rap / Melodic": "Rap / Melodic",
    "Cinematic Ballad": "Cinematic Ballad",
    "Electronic Dance": "Electronic Dance",
  },
  de: {
    "Pop / Commercial": "Pop / Kommerziell",
    "Halay / Folk Pop": "Halay / Folk Pop",
    "Arabesk / Emotional": "Arabesk / Emotional",
    "Rap / Melodic": "Rap / Melodisch",
    "Cinematic Ballad": "Cinematic Ballade",
    "Electronic Dance": "Electronic Dance",
  },
  ku: {
    "Pop / Commercial": "Pop / Bazirganî",
    "Halay / Folk Pop": "Govenda Halay / Folk Pop",
    "Arabesk / Emotional": "Arabesk / Hestyar",
    "Rap / Melodic": "Rap / Melodîk",
    "Cinematic Ballad": "Balada Sînematîk",
    "Electronic Dance": "Dance ya Elektronîk",
  },
};

function getMusicStyleOptions(language: keyof typeof COPY) {
  const labels = MUSIC_STYLE_LABELS[language];
  return MUSIC_STYLE_VALUES.map((value) => ({
    value,
    label: labels[value],
  }));
}

type MusicTemplate = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  titleValue: string;
  style: string;
  songLanguage: SongLanguage;
  vocalPreset: VocalPreset;
  badge?: string;
};

const TEMPLATES: Record<keyof typeof COPY, MusicTemplate[]> = {
  tr: [
    {
      id: "tr-pop",
      title: "Türkçe pop",
      description: "Net nakarat ve modern prodüksiyon.",
      prompt:
        "Türkçe, modern pop prodüksiyonlu, güçlü nakaratlı, duygusal ama ritmik bir şarkı üret.",
      titleValue: "Yeni Gün",
      style: "Pop / Commercial",
      songLanguage: "tr",
      vocalPreset: "female",
      badge: "TR",
    },
    {
      id: "ku-halay",
      title: "Kürtçe halay",
      description: "Kürtçe ritim ve modern altyapı.",
      prompt:
        "Kürtçe halay enerjisi olan, modern prodüksiyonlu, güçlü nakaratlı ve sahnede söylenecek bir şarkı üret.",
      titleValue: "Gulamin",
      style: "Halay / Folk Pop",
      songLanguage: "ku",
      vocalPreset: "male",
    },
    {
      id: "de-ballad",
      title: "Almanca balad",
      description: "Duygusal Alman vokal yönü.",
      prompt:
        "Almanca pop balad, duygusal hikaye anlatımı, sinematik nakarat, parlak modern prodüksiyon.",
      titleValue: "Bleib Hier",
      style: "Cinematic Ballad",
      songLanguage: "de",
      vocalPreset: "female",
    },
    {
      id: "en-rap",
      title: "İngilizce melodik rap",
      description: "Melodik rap akışı.",
      prompt:
        "English melodic rap song with a memorable hook, modern drums, emotional verses, clean commercial mix.",
      titleValue: "City Lights",
      style: "Rap / Melodic",
      songLanguage: "en",
      vocalPreset: "rap",
    },
  ],
  en: [
    {
      id: "tr-pop",
      title: "Turkish pop",
      description: "Clear chorus and modern production.",
      prompt:
        "Create a Turkish modern pop song with a strong chorus, emotional but rhythmic energy.",
      titleValue: "Yeni Gun",
      style: "Pop / Commercial",
      songLanguage: "tr",
      vocalPreset: "female",
      badge: "TR",
    },
    {
      id: "ku-halay",
      title: "Kurdish halay",
      description: "Kurdish rhythm with modern production.",
      prompt:
        "Create a Kurdish halay-inspired song with modern production, a powerful chorus, and stage-ready energy.",
      titleValue: "Gulamin",
      style: "Halay / Folk Pop",
      songLanguage: "ku",
      vocalPreset: "male",
    },
    {
      id: "de-ballad",
      title: "German ballad",
      description: "Emotional German vocal direction.",
      prompt:
        "German pop ballad, emotional storytelling, cinematic chorus, polished modern production.",
      titleValue: "Bleib Hier",
      style: "Cinematic Ballad",
      songLanguage: "de",
      vocalPreset: "female",
    },
    {
      id: "en-rap",
      title: "English melodic rap",
      description: "Melodic rap flow.",
      prompt:
        "English melodic rap song with a memorable hook, modern drums, emotional verses, clean commercial mix.",
      titleValue: "City Lights",
      style: "Rap / Melodic",
      songLanguage: "en",
      vocalPreset: "rap",
    },
  ],
  de: [
    {
      id: "tr-pop",
      title: "Türkischer Pop",
      description: "Klarer Refrain und moderne Produktion.",
      prompt:
        "Erzeuge einen türkischen modernen Popsong mit starkem Refrain, emotionaler aber rhythmischer Energie.",
      titleValue: "Yeni Gun",
      style: "Pop / Commercial",
      songLanguage: "tr",
      vocalPreset: "female",
      badge: "TR",
    },
    {
      id: "ku-halay",
      title: "Kurdischer Halay",
      description: "Kurdischer Rhythmus mit moderner Produktion.",
      prompt:
        "Erzeuge einen kurdischen Halay-Song mit moderner Produktion, starkem Refrain und bühnentauglicher Energie.",
      titleValue: "Gulamin",
      style: "Halay / Folk Pop",
      songLanguage: "ku",
      vocalPreset: "male",
    },
    {
      id: "de-ballad",
      title: "Deutsche Ballade",
      description: "Emotionale deutsche Vokalrichtung.",
      prompt:
        "Deutsche Pop-Ballade, emotionales Storytelling, cinematic Refrain, moderne polierte Produktion.",
      titleValue: "Bleib Hier",
      style: "Cinematic Ballad",
      songLanguage: "de",
      vocalPreset: "female",
    },
    {
      id: "en-rap",
      title: "Englischer melodischer Rap",
      description: "Melodischer Rap-Flow.",
      prompt:
        "Englischer melodischer Rap-Song mit einprägsamem Hook, modernen Drums, emotionalen Versen und sauberem kommerziellem Mix.",
      titleValue: "City Lights",
      style: "Rap / Melodic",
      songLanguage: "en",
      vocalPreset: "rap",
    },
  ],
  ku: [
    {
      id: "tr-pop",
      title: "Popa Tirkî",
      description: "Nakarata zelal û hilberîna modern.",
      prompt:
        "Stranek pop a Tirkî bi hilberîna modern, nakarata bihêz, hestyar lê rîtimîk çêke.",
      titleValue: "Yeni Gun",
      style: "Pop / Commercial",
      songLanguage: "tr",
      vocalPreset: "female",
      badge: "TR",
    },
    {
      id: "ku-halay",
      title: "Halaya Kurdî",
      description: "Rîtma Kurdî û altyapıya modern.",
      prompt:
        "Stranek Kurdî bi enerjiyê halayê, hilberîna modern, nakarata bihêz û hêza sahneyê çêke.",
      titleValue: "Gulamin",
      style: "Halay / Folk Pop",
      songLanguage: "ku",
      vocalPreset: "male",
    },
    {
      id: "de-ballad",
      title: "Balada Almanî",
      description: "Rêberiya vokala Almanî ya hestyar.",
      prompt:
        "Balada pop a Almanî, çîrokbêjiya hestyar, nakarata sînematîk, hilberîna modern û paqij.",
      titleValue: "Bleib Hier",
      style: "Cinematic Ballad",
      songLanguage: "de",
      vocalPreset: "female",
    },
    {
      id: "en-rap",
      title: "Rapa melodîk a Îngilîzî",
      description: "Herikîna rapê ya melodîk.",
      prompt:
        "Strana rap a melodîk bi Îngilîzî, hook a mayînde, drumên modern, verseyên hestyar û mixa paqij.",
      titleValue: "City Lights",
      style: "Rap / Melodic",
      songLanguage: "en",
      vocalPreset: "rap",
    },
  ],
};

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
  const t = COPY[safeLanguage];
  const musicDurationOptions = useMemo(
    () => getMusicDurationOptions(safeLanguage),
    [safeLanguage]
  );
  const musicStyleOptions = useMemo(
    () => getMusicStyleOptions(safeLanguage),
    [safeLanguage]
  );
  const songLanguageOptions = useMemo(
    () => getSongLanguageOptions(safeLanguage),
    [safeLanguage]
  );
  const vocalModeOptions = useMemo(
    () => getVocalModeOptions(safeLanguage),
    [safeLanguage]
  );
  const vocalPresetOptions = useMemo(
    () => getVocalPresetOptions(safeLanguage),
    [safeLanguage]
  );

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState<string>(t.promptPlaceholder);
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("Pop / Commercial");
  const [songLanguage, setSongLanguage] = useState<SongLanguage>(
    safeLanguage === "tr"
      ? "tr"
      : safeLanguage === "de"
      ? "de"
      : safeLanguage === "ku"
      ? "ku"
      : "en"
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
      const staticTemplates = TEMPLATES[safeLanguage].map((template) => ({
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
          description: t.generatedTemplateDescription,
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
    [generation, recentMusic, safeLanguage, style, t.generatedTemplateDescription]
  );

  async function requestLyrics() {
    const cleanPrompt = prompt.trim();
    const cleanTitle = title.trim();

    if (!cleanPrompt && !cleanTitle) {
      throw new Error(t.promptOrTitleRequired);
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
      throw new Error(data?.error || t.lyricsError);
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
      setGeneration({ status: "error", message: t.promptTooShort });
      return;
    }

    if (vocalMode === "own_voice" && !voiceSampleUrl) {
      setGeneration({ status: "error", message: t.voiceRequired });
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
        throw new Error(t.lyricsRequired);
      }

      const duration = Number(durationSec);
      const songTitle = title.trim() || compactTitle(cleanPrompt, t.generatedTitle);

      const res = await fetch(GENERATE_SONG_ROUTE, {
        method: "POST",
        headers: buildSessionHeaders(user),
        body: JSON.stringify({
          mode: "song",
          title: songTitle,
          prompt: cleanPrompt,
          lyrics: instrumental ? t.instrumentalLyrics : finalLyrics,
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
    setSongLanguage(
      safeLanguage === "tr"
        ? "tr"
        : safeLanguage === "de"
        ? "de"
        : safeLanguage === "ku"
        ? "ku"
        : "en"
    );
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
      : { label: t.done };

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
        { label: t.duration, value: `${durationSec} ${t.seconds}` },
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
            <StudioSelect value={style} onChange={setStyle} options={musicStyleOptions} />
          </StudioField>
          <StudioField label={t.language}>
            <StudioSelect<SongLanguage>
              value={songLanguage}
              onChange={setSongLanguage}
              options={songLanguageOptions}
            />
          </StudioField>
          <StudioField label={t.vocalPreset}>
            <StudioSelect<VocalPreset>
              value={vocalPreset}
              onChange={setVocalPreset}
              options={vocalPresetOptions}
            />
          </StudioField>
          <StudioField label={t.vocalMode}>
            <StudioSegmented<VocalMode>
              value={vocalMode}
              onChange={setVocalMode}
              options={vocalModeOptions}
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
              options={musicDurationOptions}
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
