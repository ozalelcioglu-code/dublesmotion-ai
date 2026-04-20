"use client";

import React, { useEffect, useMemo, useState } from "react";

type RobotAvatarProps = {
  isSpeaking: boolean;
  size?: number;
  name?: string;
  className?: string;
};

export default function RobotAvatar({
  isSpeaking,
  size = 220,
  name = "Assistant",
  className,
}: RobotAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [headTilt, setHeadTilt] = useState(0);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleBlink = () => {
      const delay = 3200 + Math.random() * 2000;
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 160);
        scheduleBlink();
      }, delay);
    };

    scheduleBlink();

    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
    };
  }, []);

  useEffect(() => {
    let mouthTimer: ReturnType<typeof setInterval> | null = null;
    let headTimer: ReturnType<typeof setInterval> | null = null;

    if (isSpeaking) {
      mouthTimer = setInterval(() => {
        setMouthOpen((prev) => !prev);
      }, 140 + Math.random() * 80);

      headTimer = setInterval(() => {
        setHeadTilt((prev) => (prev === 0 ? -2 : prev === -2 ? 2 : 0));
      }, 450);
    } else {
      setMouthOpen(false);
      setHeadTilt(0);
    }

    return () => {
      if (mouthTimer) clearInterval(mouthTimer);
      if (headTimer) clearInterval(headTimer);
    };
  }, [isSpeaking]);

  const styles = useMemo(() => {
    const faceSize = size * 0.72;
    const eyeSize = size * 0.08;
    const mouthWidth = size * 0.22;
    const mouthHeight = mouthOpen ? size * 0.07 : size * 0.03;

    return {
      wrapper: {
        width: size,
        height: size + 30,
      },
      head: {
        width: size,
        height: size,
        borderRadius: "32px",
        background: "linear-gradient(180deg, #2B3648 0%, #1A2230 100%)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        position: "relative" as const,
        transform: `rotate(${headTilt}deg)`,
        transition: "transform 0.18s ease",
        border: "1px solid rgba(255,255,255,0.08)",
      },
      face: {
        width: faceSize,
        height: faceSize,
        borderRadius: "26px",
        background: "linear-gradient(180deg, #EAF0FF 0%, #C7D3E8 100%)",
        position: "absolute" as const,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        overflow: "hidden",
      },
      eye: {
        width: eyeSize,
        height: blink ? eyeSize * 0.16 : eyeSize,
        borderRadius: 999,
        background: "#17202E",
        position: "absolute" as const,
        top: size * 0.23,
        transition: "height 0.08s ease",
      },
      mouth: {
        width: mouthWidth,
        height: mouthHeight,
        borderRadius: 999,
        background: "#17202E",
        position: "absolute" as const,
        bottom: size * 0.19,
        left: "50%",
        transform: "translateX(-50%)",
        transition: "height 0.08s ease, width 0.08s ease",
      },
      antenna: {
        width: 6,
        height: size * 0.14,
        background: "#8FB3FF",
        position: "absolute" as const,
        top: -size * 0.11,
        left: "50%",
        transform: "translateX(-50%)",
        borderRadius: 999,
      },
      antennaDot: {
        width: 14,
        height: 14,
        borderRadius: 999,
        background: isSpeaking ? "#4ADE80" : "#8FB3FF",
        position: "absolute" as const,
        top: -size * 0.12,
        left: "50%",
        transform: "translateX(-50%)",
        boxShadow: isSpeaking
          ? "0 0 18px rgba(74,222,128,0.7)"
          : "0 0 12px rgba(143,179,255,0.35)",
      },
      label: {
        marginTop: 10,
        color: "#E8EEF9",
        fontSize: 14,
        opacity: 0.85,
        textAlign: "center" as const,
      },
      glow: {
        position: "absolute" as const,
        inset: 0,
        borderRadius: "32px",
        boxShadow: isSpeaking
          ? "0 0 0 1px rgba(74,222,128,0.15), 0 0 36px rgba(74,222,128,0.15)"
          : "0 0 0 1px rgba(143,179,255,0.08)",
        pointerEvents: "none" as const,
      },
      eyeLeft: {
        left: size * 0.23,
      },
      eyeRight: {
        right: size * 0.23,
      },
    };
  }, [blink, headTilt, isSpeaking, mouthOpen, size]);

  return (
    <div className={className} style={styles.wrapper}>
      <div style={styles.head}>
        <div style={styles.glow} />
        <div style={styles.antenna} />
        <div style={styles.antennaDot} />

        <div style={styles.face}>
          <div style={{ ...styles.eye, ...styles.eyeLeft }} />
          <div style={{ ...styles.eye, ...styles.eyeRight }} />
          <div style={styles.mouth} />
        </div>
      </div>

      <div style={styles.label}>
        {name} {isSpeaking ? "speaking..." : "idle"}
      </div>
    </div>
  );
}
