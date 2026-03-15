import { Composition } from "remotion";
import { Main } from "./MyComp/Main";
import { NextLogo } from "./MyComp/NextLogo";
import type { MyCompProps } from "./types/constants";

const FALLBACK_FPS = 30;

const getSceneFrames = (durationSec: number, fps: number) => {
  const safeDuration =
    Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 3;

  return Math.max(1, Math.round(safeDuration * fps));
};

const getDimensionsFromRatio = (
  ratio?: "square" | "vertical" | "horizontal"
) => {
  if (ratio === "square") {
    return { width: 1080, height: 1080 };
  }

  if (ratio === "vertical") {
    return { width: 1080, height: 1920 };
  }

  return { width: 1280, height: 720 };
};

export default function RemotionRoot() {
  return (
    <>
      <Composition
        id="Main"
        component={Main}
        durationInFrames={900}
        fps={FALLBACK_FPS}
        width={1280}
        height={720}
        defaultProps={{
          title: "AI Video",
          prompt: "demo prompt",
          ratio: "horizontal",
          storyboard: {
            title: "Demo Storyboard",
            ratio: "horizontal",
            scenes: [],
          },
        }}
        calculateMetadata={({ props }) => {
          const typedProps = props as MyCompProps;
          const ratio = typedProps.storyboard?.ratio ?? typedProps.ratio;
          const scenes = typedProps.storyboard?.scenes ?? [];

          const totalFrames =
            scenes.length > 0
              ? scenes.reduce(
                  (sum, scene) =>
                    sum + getSceneFrames(scene.durationSec, FALLBACK_FPS),
                  0
                )
              : 150;

          const dims = getDimensionsFromRatio(ratio);

          return {
            durationInFrames: Math.max(totalFrames, 90),
            fps: FALLBACK_FPS,
            width: dims.width,
            height: dims.height,
          };
        }}
      />

      <Composition
        id="NextLogo"
        component={NextLogo}
        durationInFrames={120}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ outProgress: 0 }}
      />
    </>
  );
}