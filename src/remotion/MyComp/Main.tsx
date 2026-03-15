import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { MyCompProps } from "../types/constants";

const getSceneFrames = (durationSec: number, fps: number) => {
  const safeDuration =
    Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 3;
  return Math.max(1, Math.round(safeDuration * fps));
};

type SceneItem = NonNullable<MyCompProps["storyboard"]>["scenes"][number];

const getMotionPreset = (index: number) => {
  const presets = [
    { fromScale: 1.08, toScale: 1.02, fromX: 0, toX: -1.2, fromY: 0, toY: -0.8 },
    { fromScale: 1.04, toScale: 1.1, fromX: -1.2, toX: 1, fromY: 0, toY: 0.6 },
    { fromScale: 1.1, toScale: 1.03, fromX: 1, toX: -1, fromY: -0.6, toY: 0.8 },
    { fromScale: 1.06, toScale: 1.12, fromX: 0, toX: 1.2, fromY: -0.8, toY: 0.4 },
    { fromScale: 1.12, toScale: 1.04, fromX: -1, toX: 0.4, fromY: 0.8, toY: -0.8 },
  ];

  return presets[index % presets.length];
};

const isHttpUrl = (url?: string) => {
  if (!url || typeof url !== "string") return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

const isRenderableVideoUrl = (url?: string) => {
  if (!isHttpUrl(url)) return false;

  const lower = url!.toLowerCase();

  return (
    lower.includes(".public.blob.vercel-storage.com") ||
    lower.includes("blob.vercel-storage.com") ||
    lower.includes("vercel-storage.com") ||
    lower.includes("dublesmotion.com") ||
    lower.includes("www.dublesmotion.com") ||
    lower.includes("app.dublesmotion.com") ||
    lower.includes("video-saas-sooty.vercel.app") ||
    lower.includes("replicate.delivery") ||
    lower.includes("replicate.com")
  );
};

const MediaLayer: React.FC<{
  scene: SceneItem;
  sceneIndex: number;
}> = ({ scene, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const preset = getMotionPreset(sceneIndex);

  const scale = interpolate(
    frame,
    [0, durationInFrames - 1],
    [preset.fromScale, preset.toScale]
  );

  const translateX = interpolate(
    frame,
    [0, durationInFrames - 1],
    [preset.fromX, preset.toX]
  );

  const translateY = interpolate(
    frame,
    [0, durationInFrames - 1],
    [preset.fromY, preset.toY]
  );

  const animatedStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
  };

  // Öncelik: sahne videosu varsa onu kullan
  if (scene.videoUrl && isRenderableVideoUrl(scene.videoUrl)) {
    return (
      <OffthreadVideo
        src={scene.videoUrl}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }

  // Fallback: sahne görseli varsa onunla render al
  if (scene.imageUrl && isHttpUrl(scene.imageUrl)) {
    return <Img src={scene.imageUrl} style={animatedStyle} />;
  }

  return null;
};

const CinematicOverlay: React.FC<{ sceneIndex: number }> = ({ sceneIndex }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const vignetteOpacity = interpolate(
    frame,
    [0, durationInFrames * 0.2, durationInFrames],
    [0.28, 0.4, 0.36]
  );

  const lightSweep = interpolate(frame, [0, durationInFrames], [-35, 35]);

  return (
    <>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 20%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.14) 65%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "-10%",
          left: `${lightSweep}%`,
          width: "30%",
          height: "120%",
          transform: "rotate(12deg)",
          background:
            sceneIndex % 2 === 0
              ? "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%)"
              : "linear-gradient(90deg, rgba(255,220,180,0) 0%, rgba(255,220,180,0.05) 50%, rgba(255,220,180,0) 100%)",
          filter: "blur(18px)",
          pointerEvents: "none",
        }}
      />
    </>
  );
};

const FallbackLayer: React.FC<{ prompt?: string }> = ({ prompt }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const glowMove = interpolate(frame, [0, durationInFrames], [-140, 140]);

  const getPromptGradient = (value?: string) => {
    const text = (value || "").toLowerCase();

    if (
      text.includes("luxury") ||
      text.includes("premium") ||
      text.includes("gold") ||
      text.includes("cinematic")
    ) {
      return "linear-gradient(135deg, #0f172a 0%, #1e293b 35%, #7c3aed 100%)";
    }

    if (
      text.includes("nature") ||
      text.includes("green") ||
      text.includes("forest") ||
      text.includes("eco")
    ) {
      return "linear-gradient(135deg, #052e16 0%, #166534 45%, #86efac 100%)";
    }

    if (
      text.includes("tech") ||
      text.includes("ai") ||
      text.includes("digital") ||
      text.includes("future")
    ) {
      return "linear-gradient(135deg, #020617 0%, #0f172a 35%, #2563eb 100%)";
    }

    if (
      text.includes("warm") ||
      text.includes("sunset") ||
      text.includes("orange") ||
      text.includes("food")
    ) {
      return "linear-gradient(135deg, #431407 0%, #9a3412 45%, #fdba74 100%)";
    }

    return "linear-gradient(135deg, #111827 0%, #1f2937 45%, #4f46e5 100%)";
  };

  return (
    <AbsoluteFill
      style={{
        background: getPromptGradient(prompt),
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          left: glowMove,
          width: 340,
          height: 340,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.11)",
          filter: "blur(55px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -110,
          bottom: -110,
          width: 280,
          height: 280,
          borderRadius: 9999,
          background: "rgba(255,255,255,0.09)",
          filter: "blur(42px)",
        }}
      />
    </AbsoluteFill>
  );
};

const SceneCard: React.FC<{
  scene: SceneItem;
  sceneIndex: number;
}> = ({ scene, sceneIndex }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 6, durationInFrames - 8, durationInFrames - 1],
    [0, 1, 1, 0]
  );

  const enterScale = spring({
    fps,
    frame,
    config: {
      damping: 180,
      stiffness: 100,
      mass: 0.9,
    },
  });

  const wrapperScale = interpolate(enterScale, [0, 1], [1.02, 1]);

  const hasMedia = Boolean(
    (scene.videoUrl && isRenderableVideoUrl(scene.videoUrl)) ||
      (scene.imageUrl && isHttpUrl(scene.imageUrl))
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `scale(${wrapperScale})`,
        overflow: "hidden",
        backgroundColor: "black",
      }}
    >
      {hasMedia ? (
        <MediaLayer scene={scene} sceneIndex={sceneIndex} />
      ) : (
        <FallbackLayer prompt={scene.prompt} />
      )}

      <CinematicOverlay sceneIndex={sceneIndex} />
    </AbsoluteFill>
  );
};

const EmptyState: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #111827 45%, #312e81 100%)",
      }}
    />
  );
};

export const Main: React.FC<MyCompProps> = ({ storyboard }) => {
  const { fps } = useVideoConfig();
  const scenes = storyboard?.scenes ?? [];

  if (scenes.length === 0) {
    return <EmptyState />;
  }

  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {scenes.map((scene, index) => {
        const durationInFrames = getSceneFrames(scene.durationSec, fps);
        const from = cursor;
        cursor += durationInFrames;

        return (
          <Sequence
            key={scene.id ?? `${index}-${scene.prompt}`}
            from={from}
            durationInFrames={durationInFrames}
          >
            <SceneCard scene={scene} sceneIndex={index} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};