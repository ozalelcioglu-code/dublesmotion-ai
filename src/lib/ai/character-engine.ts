export function createCharacterContinuity(prompt: string) {
  return {
    continuityPrompt:
      "same main character, same identity, same outfit, same face, same body proportions, same art direction, same environment continuity",
    storyAnchor: prompt.trim(),
  };
}