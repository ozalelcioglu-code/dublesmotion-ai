"use client";

import { useSyncExternalStore } from "react";

function subscribeToResize(callback: () => void) {
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);

  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

export function useIsMobile(maxWidth = 900) {
  return useSyncExternalStore(
    subscribeToResize,
    () => window.innerWidth <= maxWidth,
    () => false
  );
}
