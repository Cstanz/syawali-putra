"use client";

import { useEffect, useRef } from "react";

const TILE = 256;
const STRENGTH = 0.085; // max alpha of a single grain; kept low so text and faces stay crisp

/**
 * Fine, even film grain. A zero-mean noise tile (light and dark specks of equal weight) is generated once
 * and tiled as a static overlay, so there is no flicker, no blur and no blend-mode cost.
 */
export function FilmGrain() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    const canvas = document.createElement("canvas");
    canvas.width = TILE;
    canvas.height = TILE;
    const context = canvas.getContext("2d");
    if (!element || !context) return;

    const image = context.createImageData(TILE, TILE);
    for (let i = 0; i < image.data.length; i += 4) {
      const n = Math.random() - 0.5;
      const value = n > 0 ? 255 : 0;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = Math.round(Math.abs(n) * 2 * STRENGTH * 255);
    }
    context.putImageData(image, 0, 0);
    element.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
    element.style.backgroundSize = `${TILE / Math.max(1, Math.round(window.devicePixelRatio || 1))}px`;
  }, []);

  return <div ref={ref} className="film-grain" aria-hidden="true" />;
}
