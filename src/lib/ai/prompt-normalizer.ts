// lib/ai/prompt-normalizer.ts

export type NormalizedPromptResult = {
  originalPrompt: string;
  normalizedPrompt: string;
  detectedLanguage: "tr" | "en" | "unknown";
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function detectLanguage(prompt: string): "tr" | "en" | "unknown" {
  const lower = prompt.toLowerCase();

  const turkishSignals = [
    " bir ",
    " ve ",
    " ile ",
    " için ",
    " gibi ",
    " gece ",
    " gündüz ",
    " araba ",
    " adam ",
    " kadın ",
    " çocuk ",
    " şehir ",
    " sokak ",
    " deniz ",
    " dağ ",
    " orman ",
    " içinde ",
    " üzerinde ",
    " altında ",
    " neon ışık",
    " lüks ",
    " siyah ",
    " kırmızı ",
    " hızlı ",
    " koşan ",
    " yürüyen ",
  ];

  if (
    /[çğıöşüÇĞİÖŞÜ]/.test(prompt) ||
    turkishSignals.some((token) => lower.includes(token))
  ) {
    return "tr";
  }

  const englishSignals = [
    " the ",
    " and ",
    " with ",
    " in ",
    " on ",
    " at ",
    " car ",
    " city ",
    " street ",
    " luxury ",
    " black ",
    " cinematic ",
    " realistic ",
    " night ",
    " day ",
    " woman ",
    " man ",
    " child ",
  ];

  if (englishSignals.some((token) => lower.includes(token))) {
    return "en";
  }

  return "unknown";
}

function applyDictionaryTranslation(prompt: string) {
  let text = ` ${prompt.toLowerCase()} `;

  const replacements: Array<[RegExp, string]> = [
    [/\blüks\b/g, "luxury"],
    [/\bsiyah\b/g, "black"],
    [/\bbeyaz\b/g, "white"],
    [/\bkırmızı\b/g, "red"],
    [/\bmavi\b/g, "blue"],
    [/\baraba\b/g, "car"],
    [/\bspor araba\b/g, "sports car"],
    [/\bgece\b/g, "at night"],
    [/\bgündüz\b/g, "in daylight"],
    [/\bsokak\b/g, "street"],
    [/\bsokaklarda\b/g, "streets"],
    [/\bşehir\b/g, "city"],
    [/\byağmurlu\b/g, "rainy"],
    [/\bıslak\b/g, "wet"],
    [/\bneon\b/g, "neon"],
    [/\bhızlı\b/g, "fast"],
    [/\bhızla\b/g, "quickly"],
    [/\bgiden\b/g, "moving"],
    [/\byürüyen\b/g, "walking"],
    [/\bkoşan\b/g, "running"],
    [/\buçan\b/g, "flying"],
    [/\bduran\b/g, "standing"],
    [/\boturan\b/g, "sitting"],
    [/\bkadın\b/g, "woman"],
    [/\berkek\b/g, "man"],
    [/\bçocuk\b/g, "child"],
    [/\borman\b/g, "forest"],
    [/\bdeniz\b/g, "sea"],
    [/\bdağ\b/g, "mountain"],
    [/\bTokyo\b/gi, "Tokyo"],
    [/\bİstanbul\b/gi, "Istanbul"],
    [/\bistanbul\b/g, "Istanbul"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/\bve\b/g, "and")
    .replace(/\bile\b/g, "with")
    .replace(/\biçinde\b/g, "inside")
    .replace(/\büzerinde\b/g, "on")
    .replace(/\bal tında\b/g, "under")
    .replace(/\bışıklı\b/g, "lit")
    .replace(/\bışıklar\b/g, "lights")
    .replace(/\bgece vakti\b/g, "at night")
    .replace(/\bneon ışıklı\b/g, "neon-lit");

  return normalizeWhitespace(text);
}

function enhancePrompt(prompt: string) {
  return normalizeWhitespace(
    [
      prompt,
      "ultra realistic",
      "cinematic",
      "clear subject",
      "high detail",
    ].join(", ")
  );
}

export function normalizeUserPrompt(input: string): NormalizedPromptResult {
  const originalPrompt = normalizeWhitespace(input);
  const detectedLanguage = detectLanguage(originalPrompt);

  let normalizedPrompt = originalPrompt;

  if (detectedLanguage === "tr") {
    normalizedPrompt = applyDictionaryTranslation(originalPrompt);
  }

  normalizedPrompt = enhancePrompt(normalizedPrompt);

  return {
    originalPrompt,
    normalizedPrompt,
    detectedLanguage,
  };
}