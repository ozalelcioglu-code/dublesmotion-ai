export type VideoStyle =
  | "realistic"
  | "cinematic"
  | "3d_animation"
  | "anime"
  | "pixar"
  | "cartoon";

const STYLE_SUFFIX: Record<VideoStyle, string> = {
  realistic:
    "photorealistic, real camera, natural lighting, realistic textures, documentary realism",
  cinematic:
    "cinematic film look, dramatic lighting, premium commercial style, high-end movie composition",
  "3d_animation":
    "high quality 3D animation, stylized animated characters, polished lighting, animation movie quality",
  anime:
    "anime style, japanese animation look, expressive characters, clean anime composition",
  pixar:
    "pixar style 3D animation, charming stylized characters, family-friendly cinematic lighting",
  cartoon:
    "cartoon style animation, colorful characters, animated world, stylized illustration look",
};

export function applyStyle(prompt: string, style: VideoStyle) {
  const suffix = STYLE_SUFFIX[style] ?? STYLE_SUFFIX.cinematic;
  return `${prompt}, ${suffix}`;
}