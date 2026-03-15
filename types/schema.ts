import { z } from "zod";

export const RenderRequestSchema = z.object({
  id: z.string(),
  inputProps: z.object({
    title: z.string().optional(),
    prompt: z.string().optional(),
    ratio: z.enum(["square", "vertical", "horizontal"]).optional(),
    storyboard: z
      .object({
        title: z.string().optional(),
        ratio: z.enum(["square", "vertical", "horizontal"]).optional(),
        scenes: z.array(
          z.object({
            id: z.string().optional(),
            title: z.string().optional(),
            prompt: z.string(),
            imagePrompt: z.string().optional(),
            onScreenText: z.string().optional(),
            durationSec: z.number(),
            imageUrl: z.string().optional(),
            videoUrl: z.string().optional(),
          })
        ),
      })
      .optional(),
  }),
});

export type SSEMessage =
  | {
      type: "phase";
      phase: string;
      progress: number;
      subtitle?: string;
    }
  | {
      type: "done";
      url: string;
      size: number;
    }
  | {
      type: "error";
      message: string;
    };