import { getSafeLanguage, type AppLanguage } from "@/lib/i18n";

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type VisualStyle =
  | "cinematic"
  | "realistic"
  | "fashion"
  | "product"
  | "anime"
  | "cartoon"
  | "3d_animation";
export type SongLanguage = "tr" | "ku" | "en" | "de" | "ar" | "fa";
export type VocalPreset = "female" | "male" | "duet" | "rap";
export type VocalMode = "preset" | "own_voice";
export type CloneMode = "character" | "face";
export type CloneVoiceMode = "original" | "own_voice";

export const RATIO_OPTIONS: Array<{ value: AspectRatio; label: string }> = [
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Vertical" },
  { value: "1:1", label: "1:1 Square" },
];

export const VISUAL_STYLE_OPTIONS: Array<{ value: VisualStyle; label: string }> = [
  { value: "cinematic", label: "Cinematic" },
  { value: "realistic", label: "Realistic" },
  { value: "fashion", label: "Fashion" },
  { value: "product", label: "Product" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "3d_animation", label: "3D" },
];

export const DURATION_OPTIONS = [
  { value: "6", label: "6 sn" },
  { value: "8", label: "8 sn" },
  { value: "10", label: "10 sn" },
  { value: "15", label: "15 sn" },
];

export const MUSIC_DURATION_OPTIONS = [
  { value: "30", label: "30 sn" },
  { value: "60", label: "60 sn" },
  { value: "90", label: "90 sn" },
  { value: "120", label: "120 sn" },
];

export const SONG_LANGUAGE_OPTIONS: Array<{
  value: SongLanguage;
  label: string;
}> = [
  { value: "tr", label: "Türkçe" },
  { value: "ku", label: "Kurdish" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "ar", label: "Arabic" },
  { value: "fa", label: "Persian" },
];

export const VOCAL_PRESET_OPTIONS: Array<{
  value: VocalPreset;
  label: string;
}> = [
  { value: "female", label: "Native Female" },
  { value: "male", label: "Native Male" },
  { value: "duet", label: "Duet" },
  { value: "rap", label: "Rap / Melodic" },
];

export const VOCAL_MODE_OPTIONS: Array<{
  value: VocalMode;
  label: string;
  description: string;
}> = [
  {
    value: "preset",
    label: "AI vokal",
    description: "Seçilen dilde native vokal yönlendirmesi.",
  },
  {
    value: "own_voice",
    label: "Kendi sesim",
    description: "Ses örneği yükle; sistem destekliyorsa referans olur.",
  },
];

export const CLONE_MODE_OPTIONS: Array<{
  value: CloneMode;
  label: string;
  description: string;
}> = [
  {
    value: "character",
    label: "Komple karakter",
    description: "Vücut, yüz, ışık ve hareket bütünlüğüyle değiştirir.",
  },
  {
    value: "face",
    label: "Sadece yüz",
    description: "Videodaki yüz akışını hedefler.",
  },
];

export const CLONE_VOICE_MODE_OPTIONS: Array<{
  value: CloneVoiceMode;
  label: string;
  description: string;
}> = [
  {
    value: "original",
    label: "Orijinal sesi koru",
    description: "Şarkı, konuşma ve zamanlama yapısı korunur.",
  },
  {
    value: "own_voice",
    label: "Kendi ses tonum",
    description: "Ses örneği saklanır; uygun altyapı hazırsa uygulanır.",
  },
];

function safeOptionLanguage(language?: string | null): AppLanguage {
  return getSafeLanguage(language);
}

const RATIO_LABELS: Record<AppLanguage, Record<AspectRatio, string>> = {
  tr: {
    "16:9": "16:9 Yatay",
    "9:16": "9:16 Dikey",
    "1:1": "1:1 Kare",
  },
  en: {
    "16:9": "16:9 Landscape",
    "9:16": "9:16 Vertical",
    "1:1": "1:1 Square",
  },
  de: {
    "16:9": "16:9 Querformat",
    "9:16": "9:16 Hochformat",
    "1:1": "1:1 Quadrat",
  },
  ku: {
    "16:9": "16:9 Berfireh",
    "9:16": "9:16 Tîk",
    "1:1": "1:1 Çargoşe",
  },
};

const VISUAL_STYLE_LABELS: Record<AppLanguage, Record<VisualStyle, string>> = {
  tr: {
    cinematic: "Sinematik",
    realistic: "Gerçekçi",
    fashion: "Moda",
    product: "Ürün",
    anime: "Anime",
    cartoon: "Çizgi film",
    "3d_animation": "3D",
  },
  en: {
    cinematic: "Cinematic",
    realistic: "Realistic",
    fashion: "Fashion",
    product: "Product",
    anime: "Anime",
    cartoon: "Cartoon",
    "3d_animation": "3D",
  },
  de: {
    cinematic: "Cinematic",
    realistic: "Realistisch",
    fashion: "Mode",
    product: "Produkt",
    anime: "Anime",
    cartoon: "Cartoon",
    "3d_animation": "3D",
  },
  ku: {
    cinematic: "Sînematîk",
    realistic: "Rastîn",
    fashion: "Moda",
    product: "Hilber",
    anime: "Anime",
    cartoon: "Kartûn",
    "3d_animation": "3D",
  },
};

const SONG_LANGUAGE_LABELS: Record<AppLanguage, Record<SongLanguage, string>> = {
  tr: {
    tr: "Türkçe",
    ku: "Kürtçe",
    en: "İngilizce",
    de: "Almanca",
    ar: "Arapça",
    fa: "Farsça",
  },
  en: {
    tr: "Turkish",
    ku: "Kurdish",
    en: "English",
    de: "German",
    ar: "Arabic",
    fa: "Persian",
  },
  de: {
    tr: "Türkisch",
    ku: "Kurdisch",
    en: "Englisch",
    de: "Deutsch",
    ar: "Arabisch",
    fa: "Persisch",
  },
  ku: {
    tr: "Tirkî",
    ku: "Kurdî",
    en: "Îngilîzî",
    de: "Almanî",
    ar: "Erebî",
    fa: "Farsî",
  },
};

const VOCAL_PRESET_LABELS: Record<AppLanguage, Record<VocalPreset, string>> = {
  tr: {
    female: "Yerel kadın vokal",
    male: "Yerel erkek vokal",
    duet: "Düet",
    rap: "Rap / Melodik",
  },
  en: {
    female: "Native female",
    male: "Native male",
    duet: "Duet",
    rap: "Rap / Melodic",
  },
  de: {
    female: "Natürliche weibliche Stimme",
    male: "Natürliche männliche Stimme",
    duet: "Duett",
    rap: "Rap / Melodisch",
  },
  ku: {
    female: "Vokala jin a xwezayî",
    male: "Vokala mêr a xwezayî",
    duet: "Duet",
    rap: "Rap / Melodîk",
  },
};

const VOCAL_MODE_LABELS: Record<
  AppLanguage,
  Record<VocalMode, { label: string; description: string }>
> = {
  tr: {
    preset: {
      label: "AI vokal",
      description: "Seçilen dilde native vokal yönlendirmesi.",
    },
    own_voice: {
      label: "Kendi sesim",
      description: "Ses örneği yükle; sistem destekliyorsa referans olur.",
    },
  },
  en: {
    preset: {
      label: "AI vocal",
      description: "Native vocal direction in the selected language.",
    },
    own_voice: {
      label: "My voice",
      description: "Upload a voice sample; the system can use it as reference when supported.",
    },
  },
  de: {
    preset: {
      label: "KI-Vokal",
      description: "Native Vokalführung in der ausgewählten Sprache.",
    },
    own_voice: {
      label: "Meine Stimme",
      description: "Lade eine Stimmprobe hoch; das System kann sie bei Unterstützung als Referenz nutzen.",
    },
  },
  ku: {
    preset: {
      label: "Vokala AI",
      description: "Rêberiya vokalê ya xwezayî bi zimanê hilbijartî.",
    },
    own_voice: {
      label: "Dengê min",
      description: "Nimûneyek deng bar bike; sistem piştgir be wê wek referans bikar tîne.",
    },
  },
};

const CLONE_MODE_LABELS: Record<
  AppLanguage,
  Record<CloneMode, { label: string; description: string }>
> = {
  tr: {
    character: {
      label: "Komple karakter",
      description: "Vücut, yüz, ışık ve hareket bütünlüğüyle değiştirir.",
    },
    face: {
      label: "Sadece yüz",
      description: "Videodaki yüz akışını hedefler.",
    },
  },
  en: {
    character: {
      label: "Full character",
      description: "Replaces body, face, lighting, and motion as one character.",
    },
    face: {
      label: "Face only",
      description: "Targets the face flow in the video.",
    },
  },
  de: {
    character: {
      label: "Ganze Figur",
      description: "Ersetzt Körper, Gesicht, Licht und Bewegung gemeinsam.",
    },
    face: {
      label: "Nur Gesicht",
      description: "Zielt auf den Gesichtsablauf im Video.",
    },
  },
  ku: {
    character: {
      label: "Karaktera tevahî",
      description: "Laş, rû, ronahî û tevgerê bi hev re diguherîne.",
    },
    face: {
      label: "Tenê rû",
      description: "Herikîna rû di vîdyoyê de armanc digire.",
    },
  },
};

const CLONE_VOICE_MODE_LABELS: Record<
  AppLanguage,
  Record<CloneVoiceMode, { label: string; description: string }>
> = {
  tr: {
    original: {
      label: "Orijinal sesi koru",
      description: "Şarkı, konuşma ve zamanlama yapısı korunur.",
    },
    own_voice: {
      label: "Kendi ses tonum",
      description: "Ses örneği saklanır; uygun altyapı hazırsa uygulanır.",
    },
  },
  en: {
    original: {
      label: "Keep original audio",
      description: "Song, speech, and timing structure are preserved.",
    },
    own_voice: {
      label: "My voice tone",
      description: "Voice sample is saved and applied when the supported flow is ready.",
    },
  },
  de: {
    original: {
      label: "Originalton behalten",
      description: "Song, Sprache und Timing bleiben erhalten.",
    },
    own_voice: {
      label: "Meine Stimmfarbe",
      description: "Die Stimmprobe wird gespeichert und genutzt, wenn der passende Ablauf bereit ist.",
    },
  },
  ku: {
    original: {
      label: "Dengê orîjînal biparêze",
      description: "Struktura stran, axaftin û demê tê parastin.",
    },
    own_voice: {
      label: "Tonê dengê min",
      description: "Nimûneya deng tê tomar kirin û herikîn amade be tê bikaranîn.",
    },
  },
};

export function getRatioOptions(language?: string | null) {
  const labels = RATIO_LABELS[safeOptionLanguage(language)];
  return RATIO_OPTIONS.map((option) => ({
    ...option,
    label: labels[option.value],
  }));
}

export function getVisualStyleOptions(language?: string | null) {
  const labels = VISUAL_STYLE_LABELS[safeOptionLanguage(language)];
  return VISUAL_STYLE_OPTIONS.map((option) => ({
    ...option,
    label: labels[option.value],
  }));
}

export function getDurationOptions(language?: string | null) {
  const unit = safeOptionLanguage(language) === "en" ? "sec" : "sn";
  return DURATION_OPTIONS.map((option) => ({
    ...option,
    label: `${option.value} ${unit}`,
  }));
}

export function getMusicDurationOptions(language?: string | null) {
  const unit = safeOptionLanguage(language) === "en" ? "sec" : "sn";
  return MUSIC_DURATION_OPTIONS.map((option) => ({
    ...option,
    label: `${option.value} ${unit}`,
  }));
}

export function getSongLanguageOptions(language?: string | null) {
  const labels = SONG_LANGUAGE_LABELS[safeOptionLanguage(language)];
  return SONG_LANGUAGE_OPTIONS.map((option) => ({
    ...option,
    label: labels[option.value],
  }));
}

export function getVocalPresetOptions(language?: string | null) {
  const labels = VOCAL_PRESET_LABELS[safeOptionLanguage(language)];
  return VOCAL_PRESET_OPTIONS.map((option) => ({
    ...option,
    label: labels[option.value],
  }));
}

export function getVocalModeOptions(language?: string | null) {
  const labels = VOCAL_MODE_LABELS[safeOptionLanguage(language)];
  return VOCAL_MODE_OPTIONS.map((option) => ({
    ...option,
    ...labels[option.value],
  }));
}

export function getCloneModeOptions(language?: string | null) {
  const labels = CLONE_MODE_LABELS[safeOptionLanguage(language)];
  return CLONE_MODE_OPTIONS.map((option) => ({
    ...option,
    ...labels[option.value],
  }));
}

export function getCloneVoiceModeOptions(language?: string | null) {
  const labels = CLONE_VOICE_MODE_LABELS[safeOptionLanguage(language)];
  return CLONE_VOICE_MODE_OPTIONS.map((option) => ({
    ...option,
    ...labels[option.value],
  }));
}
