"use client";

import { useEffect, useState } from "react";

type MotionComponent = typeof import("./Motion").Motion;
type Overlays = {
  FilmGrain: typeof import("./FilmGrain").FilmGrain;
};

type IdleWindow = typeof window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Keep animation libraries out of the first render. Motion (GSAP/Lenis, intro loader, scroll scenes)
 * loads first; the cosmetic film grain overlay loads in a later idle slot so
 * their work never stacks into the same long task as the main scene setup.
 */
export function DeferredEffects() {
  const [Motion, setMotion] = useState<MotionComponent | null>(null);
  const [overlays, setOverlays] = useState<Overlays | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const idleIds: number[] = [];
    const idleWindow = window as IdleWindow;

    const whenIdle = (callback: () => void, timeout: number, fallbackDelay: number) => {
      if (idleWindow.requestIdleCallback) idleIds.push(idleWindow.requestIdleCallback(callback, { timeout }));
      else timers.push(window.setTimeout(callback, fallbackDelay));
    };

    const loadOverlays = () => {
      void import("./FilmGrain").then((grain) => {
        if (cancelled) return;
        setOverlays({ FilmGrain: grain.FilmGrain });
      });
    };

    const loadMotion = () => {
      if (cancelled || Motion) return;
      document.documentElement.dataset.motionIntent = "true";
      window.removeEventListener("pointermove", onIntent);
      window.removeEventListener("pointerdown", onIntent);
      window.removeEventListener("touchstart", onIntent);
      window.removeEventListener("wheel", onIntent);
      window.removeEventListener("keydown", onIntent);
      void import("./Motion").then((motion) => {
        if (cancelled) return;
        setMotion(() => motion.Motion);
        whenIdle(loadOverlays, 1200, 400);
      });
    };

    const onIntent = () => loadMotion();
    window.addEventListener("pointermove", onIntent, { passive: true });
    window.addEventListener("pointerdown", onIntent, { passive: true });
    window.addEventListener("touchstart", onIntent, { passive: true });
    window.addEventListener("wheel", onIntent, { passive: true });
    window.addEventListener("keydown", onIntent);

    return () => {
      cancelled = true;
      window.removeEventListener("pointermove", onIntent);
      window.removeEventListener("pointerdown", onIntent);
      window.removeEventListener("touchstart", onIntent);
      window.removeEventListener("wheel", onIntent);
      window.removeEventListener("keydown", onIntent);
      idleIds.forEach((id) => idleWindow.cancelIdleCallback?.(id));
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <>
      {Motion && <Motion />}
      {overlays && <overlays.FilmGrain />}
    </>
  );
}
