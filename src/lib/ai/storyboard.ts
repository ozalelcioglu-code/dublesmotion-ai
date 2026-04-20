type StoryboardScene = {
  id: string;
  prompt: string;
  durationSec: number;
};

type StoryboardResult = {
  mode?: string;
  prompt: string;
  ratio?: string;
  style?: string;
  durationSec: number;
  scenes: StoryboardScene[];
};

function toSafeNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

function toSafeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export async function generateStoryboard(input: any): Promise<StoryboardResult> {
  const prompt = toSafeString(
    input?.prompt,
    "Create a polished cinematic sequence."
  ).trim() || "Create a polished cinematic sequence.";

  const durationSec = Math.max(5, Math.min(120, toSafeNumber(input?.durationSec, 8)));
  const mode = toSafeString(input?.mode);
  const ratio = toSafeString(input?.ratio, "16:9");
  const style = toSafeString(input?.style);

  const scenesCount =
    durationSec <= 8 ? 1 : durationSec <= 20 ? 2 : durationSec <= 45 ? 3 : 4;

  const perScene = Math.max(5, Math.round(durationSec / scenesCount));

  const scenes: StoryboardScene[] = Array.from({ length: scenesCount }).map(
    (_, index) => ({
      id: `scene_${index + 1}`,
      prompt:
        scenesCount === 1
          ? prompt
          : `${prompt} Scene ${index + 1} of ${scenesCount}. Maintain visual continuity, smooth motion, consistent lighting, and cinematic composition.`,
      durationSec: perScene,
    })
  );

  return {
    mode,
    prompt,
    ratio,
    style,
    durationSec,
    scenes,
  };
}