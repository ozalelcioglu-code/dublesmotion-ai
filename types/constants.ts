import { z } from "zod";

export const COMP_NAME = "Main";

export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1280;
export const VIDEO_HEIGHT = 720;

export const RatioSchema = z.enum(["square", "vertical", "horizontal"]);

export const SceneSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  prompt: z.string(),
  imagePrompt: z.string().optional(),
  onScreenText: z.string().optional(),
  durationSec: z.number(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
});

export const StoryboardSchema = z.object({
  title: z.string().optional(),
  ratio: RatioSchema.optional(),
  scenes: z.array(SceneSchema),
});

export const CompositionPropsSchema = z.object({
  title: z.string().optional(),
  prompt: z.string().optional(),
  ratio: RatioSchema.optional(),
  storyboard: StoryboardSchema.optional(),
});

export type Ratio = z.infer<typeof RatioSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Storyboard = z.infer<typeof StoryboardSchema>;
export type MyCompProps = z.infer<typeof CompositionPropsSchema>;
export type CompositionProps = MyCompProps;

export const defaultMyCompProps: MyCompProps = {
  title: "AI Video",
  prompt: "demo prompt",
  ratio: "horizontal",
  storyboard: {
    title: "Demo Storyboard",
    ratio: "horizontal",
    scenes: [
      {
        id: "scene-1",
        title: "Scene 1",
        prompt: "modern cinematic intro",
        onScreenText: "Welcome",
        durationSec: 6,
      },
    ],
  },
};

export const getSceneFrames = (sec: number): number => {
  const safeSec = Number.isFinite(sec) && sec > 0 ? sec : 3;
  return Math.max(1, Math.round(safeSec * VIDEO_FPS));
};

export const getCompositionDurationInFrames = (
  props: MyCompProps
): number => {
  const scenes = props.storyboard?.scenes ?? [];
  if (!scenes.length) return 180;

  return scenes.reduce((acc, scene) => {
    return acc + getSceneFrames(scene.durationSec);
  }, 0);
};

export const getVideoDimensions = (ratio?: Ratio) => {
  switch (ratio) {
    case "square":
      return { width: 1080, height: 1080 };
    case "vertical":
      return { width: 1080, height: 1920 };
    case "horizontal":
    default:
      return { width: VIDEO_WIDTH, height: VIDEO_HEIGHT };
  }
};