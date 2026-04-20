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
    description: "Ses örneği yükle; bağlı model destekliyorsa referans olur.",
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
    description: "Video yüz değiştirme motorunu kullanır.",
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
    description: "Ses örneği saklanır; voice conversion motoru bağlanınca uygulanır.",
  },
];
