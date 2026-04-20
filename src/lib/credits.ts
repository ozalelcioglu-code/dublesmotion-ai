export type CreditAction =
  | "chat_basic"
  | "chat_advanced"
  | "chat_file"
  | "lyrics"
  | "song"
  | "song_with_clip"
  | "clip_only"
  | "image"
  | "image_premium"
  | "text_to_video"
  | "text_to_video_premium"
  | "image_to_video"
  | "image_to_video_premium"
  | "video_clone"
  | "video_clone_premium"
  | "editor_export"
  | "editor_export_premium";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  chat_basic: 1,
  chat_advanced: 10,
  chat_file: 25,

  lyrics: 6,
  song: 20,
  song_with_clip: 50,
  clip_only: 35,

  image: 10,
  image_premium: 15,

  text_to_video: 32,
  text_to_video_premium: 45,

  image_to_video: 26,
  image_to_video_premium: 36,

  video_clone: 60,
  video_clone_premium: 80,

  editor_export: 8,
  editor_export_premium: 15,
};

export function getCreditCost(action: CreditAction): number {
  return CREDIT_COSTS[action] ?? 0;
}
export function hasEnoughCredits(
  currentCredits: number,
  action: CreditAction
): boolean {
  const cost = getCreditCost(action);
  return currentCredits >= cost;
}

export function consumeCredits(
  currentCredits: number,
  action: CreditAction
): number {
  const cost = getCreditCost(action);
  return Math.max(currentCredits - cost, 0);
}
export function refundCredits(
  currentCredits: number,
  action: CreditAction
): number {
  const cost = getCreditCost(action);
  return currentCredits + cost;
}
