"use client";

import { useEffect, useState } from "react";

type Effects = {
  Motion: typeof import("./Motion").Motion;
  CursorSmear: typeof import("./CursorSmear").CursorSmear;
  FilmGrain: typeof import("./FilmGrain").FilmGrain;
};

/** Keep animation libraries out of the first render; load them once the browser is idle. */
export function DeferredEffects() {
  const [effects, setEffects] = useState<Effects | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    const load = () => {
      void Promise.all([
        import("./Motion"),
        import("./CursorSmear"),
        import("./FilmGrain"),
      ]).then(([motion, cursor, grain]) => {
        if (cancelled) return;
        setEffects({
          Motion: motion.Motion,
          CursorSmear: cursor.CursorSmear,
          FilmGrain: grain.FilmGrain,
        });
      });
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(load, { timeout: 800 });
    } else {
      timeoutId = window.setTimeout(load, 250);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  if (!effects) return null;
  const { Motion, CursorSmear, FilmGrain } = effects;
  return <><Motion /><CursorSmear /><FilmGrain /></>;
}
