// lib/ai/prompt-director.ts

export type DirectedPrompt = {
  originalPrompt: string;
  detectedLanguage: "tr" | "en" | "unknown";
  normalizedPrompt: string;
  subject: string;
  action: string;
  environment: string;
  timeOfDay: string;
  mood: string;
  style: string;
};

function clean(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function detectLanguage(prompt: string): "tr" | "en" | "unknown" {
  const p = ` ${prompt.toLowerCase()} `;

  if (/[çğıöşüÇĞİÖŞÜ]/.test(prompt)) return "tr";

  const trHints = [
    " bir ",
    " ve ",
    " ile ",
    " içinde ",
    " üzerinde ",
    " altında ",
    " gece ",
    " gündüz ",
    " araba ",
    " kadın ",
    " erkek ",
    " çocuk ",
    " şehir ",
    " sokak ",
    " neon ",
    " lüks ",
    " siyah ",
    " kırmızı ",
  ];

  if (trHints.some((x) => p.includes(x))) return "tr";

  const enHints = [
    " the ",
    " and ",
    " with ",
    " in ",
    " on ",
    " at ",
    " car ",
    " woman ",
    " man ",
    " child ",
    " city ",
    " street ",
    " luxury ",
    " black ",
    " cinematic ",
    " night ",
  ];

  if (enHints.some((x) => p.includes(x))) return "en";

  return "unknown";
}

function translateTrToEn(prompt: string) {
  let text = ` ${prompt.toLowerCase()} `;

  const replacements: Array<[RegExp, string]> = [
    [/\bsiyah spor araba\b/g, "black sports car"],
    [/\blüks spor araba\b/g, "luxury sports car"],
    [/\bspor araba\b/g, "sports car"],
    [/\baraba\b/g, "car"],
    [/\bmotosiklet\b/g, "motorcycle"],
    [/\bkamyon\b/g, "truck"],
    [/\bkadın\b/g, "woman"],
    [/\berkek\b/g, "man"],
    [/\bçocuk\b/g, "child"],
    [/\bköpek\b/g, "dog"],
    [/\bkedi\b/g, "cat"],
    [/\bşehir\b/g, "city"],
    [/\bsokaklar\b/g, "streets"],
    [/\bsokaklarda\b/g, "streets"],
    [/\bsokak\b/g, "street"],
    [/\borman\b/g, "forest"],
    [/\bdeniz\b/g, "sea"],
    [/\bplaj\b/g, "beach"],
    [/\bdağ\b/g, "mountain"],
    [/\byol\b/g, "road"],
    [/\bgece\b/g, "night"],
    [/\bgündüz\b/g, "daylight"],
    [/\byağmurlu\b/g, "rainy"],
    [/\bıslak\b/g, "wet"],
    [/\bneon ışıklı\b/g, "neon-lit"],
    [/\bneon\b/g, "neon"],
    [/\blüks\b/g, "luxury"],
    [/\bsiyah\b/g, "black"],
    [/\bbeyaz\b/g, "white"],
    [/\bkırmızı\b/g, "red"],
    [/\bmavi\b/g, "blue"],
    [/\byeşil\b/g, "green"],
    [/\baltın\b/g, "gold"],
    [/\bgümüş\b/g, "silver"],
    [/\bhızla\b/g, "quickly"],
    [/\bhızlı\b/g, "fast"],
    [/\bgiden\b/g, "moving"],
    [/\bsüren\b/g, "driving"],
    [/\byürüyen\b/g, "walking"],
    [/\bkoşan\b/g, "running"],
    [/\buçan\b/g, "flying"],
    [/\bduran\b/g, "standing"],
    [/\boturan\b/g, "sitting"],
    [/\bparlayan\b/g, "glowing"],
    [/\bfuturistik\b/g, "futuristic"],
    [/\bsinematik\b/g, "cinematic"],
    [/\bgerçekçi\b/g, "realistic"],
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
    .replace(/\bgece vakti\b/g, "at night");

  return clean(text);
}

function normalizePrompt(prompt: string) {
  const original = clean(prompt);
  const detectedLanguage = detectLanguage(original);

  let normalized = original;
  if (detectedLanguage === "tr") {
    normalized = translateTrToEn(original);
  }

  normalized = clean(normalized);
  return { normalized, detectedLanguage };
}

function extractEnvironment(prompt: string) {
  const p = prompt.toLowerCase();

  const envPatterns = [
    /in ([a-z0-9\s-]+?)(?: at night| in daylight| during sunset| with|,|$)/i,
    /through ([a-z0-9\s-]+?)(?: at night| in daylight| during sunset| with|,|$)/i,
    /on ([a-z0-9\s-]+?)(?: at night| in daylight| during sunset| with|,|$)/i,
  ];

  for (const pattern of envPatterns) {
    const match = p.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }

  if (p.includes("tokyo")) return "Tokyo streets";
  if (p.includes("city")) return "city environment";
  if (p.includes("street")) return "street environment";
  if (p.includes("forest")) return "forest";
  if (p.includes("beach")) return "beach";
  if (p.includes("mountain")) return "mountain landscape";
  if (p.includes("road")) return "road";

  return "cinematic environment";
}

function extractTimeOfDay(prompt: string) {
  const p = prompt.toLowerCase();

  if (p.includes("night")) return "at night";
  if (p.includes("daylight") || p.includes("day time") || p.includes("daytime")) return "in daylight";
  if (p.includes("sunset")) return "during sunset";
  if (p.includes("sunrise")) return "during sunrise";

  return "cinematic lighting";
}

function extractAction(prompt: string) {
  const p = prompt.toLowerCase();

  if (p.includes("driving")) return "driving";
  if (p.includes("moving")) return "moving";
  if (p.includes("walking")) return "walking";
  if (p.includes("running")) return "running";
  if (p.includes("flying")) return "flying";
  if (p.includes("standing")) return "standing";
  if (p.includes("sitting")) return "sitting";

  return "present in the scene";
}

function extractSubject(prompt: string) {
  const p = prompt.toLowerCase();

  const subjectPatterns = [
    /(black sports car)/i,
    /(luxury sports car)/i,
    /(sports car)/i,
    /(luxury car)/i,
    /(car)/i,
    /(motorcycle)/i,
    /(truck)/i,
    /(woman)/i,
    /(man)/i,
    /(child)/i,
    /(dog)/i,
    /(cat)/i,
  ];

  for (const pattern of subjectPatterns) {
    const match = p.match(pattern);
    if (match?.[1]) return clean(match[1]);
  }

  const firstChunk = clean(
    p
      .replace(/ultra realistic|cinematic|realistic|high detail|premium/gi, "")
      .split(",")[0] || p
  );

  return firstChunk || "main subject";
}

function extractMood(prompt: string) {
  const p = prompt.toLowerCase();

  if (p.includes("futuristic")) return "futuristic";
  if (p.includes("luxury")) return "luxury";
  if (p.includes("dramatic")) return "dramatic";
  if (p.includes("neon")) return "neon cinematic";
  if (p.includes("rainy") || p.includes("wet")) return "moody atmospheric";
  if (p.includes("dark")) return "dark cinematic";

  return "cinematic premium";
}

function extractStyle(prompt: string) {
  const p = prompt.toLowerCase();

  if (p.includes("commercial")) return "high-end commercial";
  if (p.includes("advertisement") || p.includes("ad")) return "premium advertisement";
  if (p.includes("portrait")) return "cinematic portrait";
  if (p.includes("architectural")) return "architectural cinematic";
  if (p.includes("realistic")) return "ultra realistic";

  return "premium cinematic realism";
}

export function directUserPrompt(input: string): DirectedPrompt {
  const originalPrompt = clean(input);
  const { normalized, detectedLanguage } = normalizePrompt(originalPrompt);

  const subject = extractSubject(normalized);
  const action = extractAction(normalized);
  const environment = extractEnvironment(normalized);
  const timeOfDay = extractTimeOfDay(normalized);
  const mood = extractMood(normalized);
  const style = extractStyle(normalized);

  const normalizedPrompt = clean(
    [
      subject,
      action,
      environment,
      timeOfDay,
      mood,
      style,
      "ultra realistic",
      "clear subject",
      "high detail",
    ].join(", ")
  );

  return {
    originalPrompt,
    detectedLanguage,
    normalizedPrompt,
    subject,
    action,
    environment,
    timeOfDay,
    mood,
    style,
  };
}