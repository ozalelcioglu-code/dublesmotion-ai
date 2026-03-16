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
  "noisy",
  "flicker",
  "jitter",
  "frame inconsistency",
  "warped objects",
  "deformed anatomy",
  "extra limbs",
  "bad proportions",
  "oversaturated",
  "flat lighting",
  "cheap CGI",
  "cartoonish",
  "muddy details",
  "ghosting",
  "duplicate objects",
  "unstable motion",
  "distorted face",
  "distorted hands",
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

function getStylePreset() {
  return "ultra realistic, cinematic lighting, high detail, premium commercial quality, filmic contrast";
}

function buildVisualAnchor(userPrompt: string) {
  return [
    `main subject: ${userPrompt}`,
    "keep the same subject identity across scenes",
    "keep the same environment and mood across scenes",
    "preserve visual continuity and realism",
  ].join(", ");
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
      purpose: "Show the environment and overall cinematic setting",
      cameraMotion: "gentle pan right",
    },
    {
      shotType: "hero",
      title: "Hero Shot",
      purpose: "Reveal the main subject clearly and beautifully",
      cameraMotion: "subtle push in",
    },
    {
      shotType: "action",
      title: "Action Shot",
      purpose: "Show the main action or movement of the subject",
      cameraMotion: "smooth tracking shot",
    },
    {
      shotType: "detail",
      title: "Detail Shot",
      purpose: "Show close details, texture, materials, or expression",
      cameraMotion: "slow dolly in",
    },
    {
      shotType: "closing",
      title: "Closing Shot",
      purpose: "Create a strong final cinematic image",
      cameraMotion: "slow dolly out",
    },
  ];

  return presets.slice(0, sceneCount);
}

function shotTypeImageAddon(shotType: ShotType) {
  switch (shotType) {
    case "establishing":
      return "wide establishing shot, cinematic environment, balanced composition";
    case "hero":
      return "hero shot, clear subject reveal, strong composition, visually striking";
    case "action":
      return "dynamic action framing, energetic composition, realistic movement implied";
    case "detail":
      return "close-up detail shot, texture focus, shallow depth of field";
    case "closing":
      return "cinematic closing shot, memorable composition, elegant final frame";
    default:
      return "cinematic composition";
  }
}

function shotTypeVideoAction(shotType: ShotType, prompt: string) {
  switch (shotType) {
    case "establishing":
      return `${prompt}, show the environment clearly in a wide cinematic shot`;
    case "hero":
      return `${prompt}, reveal the main subject clearly with a premium cinematic look`;
    case "action":
      return `${prompt}, show the main action clearly with realistic motion`;
    case "detail":
      return `${prompt}, focus on close details of the subject`;
    case "closing":
      return `${prompt}, end with a strong cinematic final image`;
    default:
      return prompt;
  }
}

function motionPromptAddon(cameraMotion: CameraMotion) {
  switch (cameraMotion) {
    case "slow dolly in":
      return "slow dolly in";
    case "slow dolly out":
      return "slow dolly out";
    case "gentle pan left":
      return "gentle pan left";
    case "gentle pan right":
      return "gentle pan right";
    case "smooth tracking shot":
      return "smooth tracking shot";
    case "subtle push in":
      return "subtle push in";
    case "cinematic orbit":
      return "slow cinematic orbit";
    case "static cinematic frame":
      return "mostly static cinematic frame";
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

function cleanPromptForModel(prompt: string) {
  return prompt
    .replace(/\s+/g, " ")
    .replace(/[.]{2,}/g, ".")
    .trim();
}

function buildImagePrompt(params: {
  masterPrompt: string;
  shotType: ShotType;
  stylePreset: string;
  visualAnchor: string;
}) {
  const parts = [
    params.masterPrompt,
    shotTypeImageAddon(params.shotType),
    params.stylePreset,
    "natural realistic textures",
    "realistic lighting",
    "clean composition",
    "high subject clarity",
    params.visualAnchor,
  ];

  return cleanPromptForModel(parts.join(", "));
}

function buildVideoPrompt(params: {
  masterPrompt: string;
  shotType: ShotType;
  cameraMotion: CameraMotion;
}) {
  const parts = [
    shotTypeVideoAction(params.shotType, params.masterPrompt),
    motionPromptAddon(params.cameraMotion),
    "realistic motion",
    "stable camera",
    "clear subject",
  ];

  return cleanPromptForModel(parts.join(", "));
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
  const stylePreset = getStylePreset();
  const visualAnchor = buildVisualAnchor(masterPrompt);
  const blueprints = buildSceneBlueprints(sceneCount);
  const durationSec = getDurationPerScene(plan, sceneCount);

  const scenes: CinematicScene[] = blueprints.map((bp, i) => {
    const imagePrompt = buildImagePrompt({
      masterPrompt,
      shotType: bp.shotType,
      stylePreset,
      visualAnchor,
    });

    const videoPrompt = buildVideoPrompt({
      masterPrompt,
      shotType: bp.shotType,
      cameraMotion: bp.cameraMotion,
    });

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