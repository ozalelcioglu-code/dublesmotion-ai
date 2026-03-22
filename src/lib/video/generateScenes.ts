export type GeneratedScene = {
  prompt: string;
  durationSec: number;
};

export function generateScenesFromPrompt(prompt: string): GeneratedScene[] {
  return [
    {
      prompt: `${prompt}, cinematic opening shot, establishing scene`,
      durationSec: 8,
    },
    {
      prompt: `${prompt}, main action, dynamic movement, detailed subject`,
      durationSec: 12,
    },
    {
      prompt: `${prompt}, cinematic ending shot, strong closing frame`,
      durationSec: 10,
    },
  ];
}