"use client";

import { useEffect } from "react";

/** Scales the hero name so it spans the full header width, like an edge-to-edge wordmark. */
export function FitTitle() {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".site-header__title");
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      if (window.matchMedia("(max-width: 760px)").matches) { el.style.fontSize = ""; return; }
      el.style.fontSize = "100px";
      const w = el.getBoundingClientRect().width;
      if (w > 0) el.style.fontSize = `${(100 * box.clientWidth) / w}px`;
      el.style.visibility = "visible";
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);
  return null;
}
