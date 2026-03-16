// lib/ai/cinematic-prompt-engine.ts

export type ShotType =
  | "establishing"
  | "hero"
  | "action"
  | "detail"
  | "closing";

export type CameraMotion =
  | "slow dolly in"
  | "slow dolly out"
  | "gentle pan left"
  | "gentle pan right"
  | "smooth tracking shot"
  | "subtle push in"
  | "cinematic orbit"
  | "static cinematic frame";

export type CinematicScene = {
  index: number;
  title: string;
  purpose: string;
  shotType: ShotType;
  cameraMotion: CameraMotion;
  durationSec: number;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
};

export type CinematicPlan = {
  masterPrompt: string;
  stylePreset: string;
  visualAnchor: string;
  scenes: CinematicScene[];
};

const DEFAULT_NEGATIVE_PROMPT = [
  "low quality",
  "blurry",
  "noise",
  "grainy artifacts",
  "flicker",
  "jitter",
  "frame inconsistency",
  "warped objects",
  "distorted anatomy",
  "deformed hands",
  "extra limbs",
  "bad proportions",
  "oversaturated colors",
  "flat lighting",
  "cheap CGI look",
  "cartoonish render",
  "muddy details",
  "ghosting",
  "duplicate objects",
  "unstable motion",
].join(", ");

function clampSceneCount(count: number) {
  if (count <= 1) return 1;
  if (count >= 5) return 5;
  return count;
}

function normalizePrompt(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function detectSceneCountByPlan(plan: string) {
  switch ((plan || "free").toLowerCase()) {
    case "free":
      return 1;
    case "starter":
      return 2;
    case "pro":
      return 4;
    case "agency":
      return 5;
    default:
      return 2;
  }
}

function getStylePreset(mode?: string) {
  switch ((mode || "").toLowerCase()) {
    case "product":
      return "premium commercial product advertisement, ultra realistic, luxury branding, cinematic studio quality";
    case "portrait":
      return "cinematic portrait film look, ultra realistic skin detail, dramatic lighting, premium editorial quality";
    case "realestate":
      return "high-end architectural cinematic showcase, clean composition, luxury property film aesthetic";
    default:
      return "cinematic premium commercial, ultra realistic, filmic contrast, high production value, detailed textures";
  }
}

function buildVisualAnchor(userPrompt: string) {
  return [
    "Maintain the same core subject identity across all scenes",
    `Primary subject and concept: ${userPrompt}`,
    "Keep environment, mood, color tone, and subject design visually consistent",
    "Preserve realism, premium cinematic look, and continuity between shots",
  ].join(". ");
}

function buildSceneBlueprints(sceneCount: number) {
  const presets: Array<{
    shotType: ShotType;
    title: string;
    purpose: string;
    cameraMotion: CameraMotion;
  }> = [
    {
      shotType: "establishing",
      title: "Establishing Shot",
      purpose: "Introduce the environment, mood, and visual world",
      cameraMotion: "gentle pan right",
    },
    {
      shotType: "hero",
      title: "Hero Shot",
      purpose: "Reveal the main subject in a premium cinematic way",
      cameraMotion: "subtle push in",
    },
    {
      shotType: "action",
      title: "Action Shot",
      purpose: "Show movement, energy, and dynamic storytelling",
      cameraMotion: "smooth tracking shot",
    },
    {
      shotType: "detail",
      title: "Detail Shot",
      purpose: "Highlight fine details, texture, and craftsmanship",
      cameraMotion: "slow dolly in",
    },
    {
      shotType: "closing",
      title: "Closing Shot",
      purpose: "End with a memorable cinematic final image",
      cameraMotion: "slow dolly out",
    },
  ];

  return presets.slice(0, sceneCount);
}

function shotTypePromptAddon(shotType: ShotType) {
  switch (shotType) {
    case "establishing":
      return "wide cinematic establishing shot, immersive environment, balanced composition";
    case "hero":
      return "hero shot, premium subject reveal, dramatic composition, striking focal emphasis";
    case "action":
      return "dynamic action framing, cinematic motion energy, controlled movement, visually powerful";
    case "detail":
      return "close-up detail shot, texture emphasis, premium material detail, shallow depth of field";
    case "closing":
      return "cinematic ending frame, emotionally strong final composition, memorable visual finish";
    default:
      return "cinematic composition";
  }
}

function motionPromptAddon(cameraMotion: CameraMotion) {
  switch (cameraMotion) {
    case "slow dolly in":
      return "slow forward camera movement, smooth cinematic dolly in";
    case "slow dolly out":
      return "slow backward camera movement, elegant cinematic dolly out";
    case "gentle pan left":
      return "gentle cinematic pan to the left, smooth stable motion";
    case "gentle pan right":
      return "gentle cinematic pan to the right, smooth stable motion";
    case "smooth tracking shot":
      return "smooth cinematic tracking shot, stable motion, premium action feel";
    case "subtle push in":
      return "subtle push-in movement, elegant cinematic emphasis";
    case "cinematic orbit":
      return "slow cinematic orbit movement around the subject, smooth controlled motion";
    case "static cinematic frame":
      return "mostly static cinematic frame with subtle natural motion";
    default:
      return "smooth cinematic movement";
  }
}

function getDurationPerScene(plan: string, sceneCount: number) {
  const p = (plan || "free").toLowerCase();

  if (p === "free") return 5;
  if (p === "starter") return 5;
  if (p === "pro") return sceneCount >= 4 ? 4 : 5;
  if (p === "agency") return 4;

  return 5;
}

export function buildCinematicPlan(input: {
  prompt: string;
  plan?: string;
  mode?: string;
  sceneCount?: number;
}) {
  const masterPrompt = normalizePrompt(input.prompt);
  const plan = input.plan || "free";
  const detectedSceneCount = detectSceneCountByPlan(plan);
  const sceneCount = clampSceneCount(input.sceneCount ?? detectedSceneCount);
  const stylePreset = getStylePreset(input.mode);
  const visualAnchor = buildVisualAnchor(masterPrompt);
  const blueprints = buildSceneBlueprints(sceneCount);
  const durationSec = getDurationPerScene(plan, sceneCount);

  const scenes: CinematicScene[] = blueprints.map((bp, i) => {
    const shotAddon = shotTypePromptAddon(bp.shotType);
    const motionAddon = motionPromptAddon(bp.cameraMotion);

    const imagePrompt = [
      masterPrompt,
      shotAddon,
      stylePreset,
      "ultra realistic",
      "filmic lighting",
      "high detail",
      "natural depth of field",
      "premium color grading",
      "high-end commercial aesthetic",
      visualAnchor,
    ].join(", ");

    const videoPrompt = [
      masterPrompt,
      shotAddon,
      motionAddon,
      stylePreset,
      "cinematic motion",
      "stable composition",
      "realistic movement",
      "high-end advertisement quality",
      visualAnchor,
    ].join(", ");

    return {
      index: i + 1,
      title: bp.title,
      purpose: bp.purpose,
      shotType: bp.shotType,
      cameraMotion: bp.cameraMotion,
      durationSec,
      imagePrompt,
      videoPrompt,
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    };
  });

  return {
    masterPrompt,
    stylePreset,
    visualAnchor,
    scenes,
  } satisfies CinematicPlan;
}