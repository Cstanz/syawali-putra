"use client";

import { useEffect, useState } from "react";

type MotionComponent = typeof import("./Motion").Motion;
type Overlays = {
  CursorSmear: typeof import("./CursorSmear").CursorSmear;
  FilmGrain: typeof import("./FilmGrain").FilmGrain;
};

type IdleWindow = typeof window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Keep animation libraries out of the first render. Motion (GSAP/Lenis, intro loader, scroll scenes)
 * loads first; the purely cosmetic overlays (cursor trail, film grain) load in a later idle slot so
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
      void Promise.all([import("./CursorSmear"), import("./FilmGrain")]).then(([cursor, grain]) => {
        if (cancelled) return;
        setOverlays({ CursorSmear: cursor.CursorSmear, FilmGrain: grain.FilmGrain });
      });
    };

    const loadMotion = () => {
      void import("./Motion").then((motion) => {
        if (cancelled) return;
        setMotion(() => motion.Motion);
        whenIdle(loadOverlays, 1200, 400);
      });
    };

    whenIdle(loadMotion, 800, 250);

    return () => {
      cancelled = true;
      idleIds.forEach((id) => idleWindow.cancelIdleCallback?.(id));
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <>
      {Motion && <Motion />}
      {overlays && <><overlays.CursorSmear /><overlays.FilmGrain /></>}
    </>
  );
}
