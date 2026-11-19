"use client";

import { useEffect } from "react";

type Point = { x: number; y: number; t: number; width: number; duration: number };

const LIFE = 620;
const MAX_POINTS = 36;
const WIDTH = 7;
const ALPHA = 0.09;
const FOLLOW_MS = 20;
const LIGHT_SURFACES = ".work, .about, .availability";

/** A short, soft, tapered pointer trail. Idle when the pointer is still and skipped for touch. */
export function CursorSmear() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const canvas = document.createElement("canvas");
    canvas.className = "cursor-fluid";
    canvas.setAttribute("aria-hidden", "true");
    const halo = document.createElement("div");
    halo.className = "cursor-fluid__halo is-hidden";
    halo.setAttribute("aria-hidden", "true");
    const context = canvas.getContext("2d");
    if (!context) return;

    let ratio = 1;
    let raf = 0;
    let last = 0;
    let target: { x: number; y: number } | null = null;
    let head: { x: number; y: number } | null = null;
    let onLight = false;
    let overPhoto = false;
    const points: Point[] = [];

    let photoEl: HTMLElement | null = null;
    let haloSize = "";
    const getPhotoRect = () => {
      if (!photoEl || !photoEl.isConnected) photoEl = document.querySelector<HTMLElement>(".flowmap-image");
      return photoEl ? photoEl.getBoundingClientRect() : null;
    };
    const applyPhotoHaloSize = (width: number) => {
      const next = `${Math.max(40, Math.min(90, width * 0.065))}px`;
      if (next === haloSize) return;
      haloSize = next;
      halo.style.setProperty("--cursor-photo-size", next);
    };
    const syncPhotoHaloSize = () => {
      const rect = getPhotoRect();
      if (rect) applyPhotoHaloSize(rect.width);
    };
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; syncPhotoHaloSize(); });
    };

    const resize = () => {
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
      canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      syncPhotoHaloSize();
    };

    const frame = (now: number) => {
      const dt = Math.min(48, Math.max(4, now - last || 16));
      last = now;
      if (target) {
        if (!head) head = { ...target };
        const k = 1 - Math.exp(-dt / FOLLOW_MS);
        head.x += (target.x - head.x) * k;
        head.y += (target.y - head.y) * k;
        halo.style.transform = `translate3d(${head.x}px, ${head.y}px, 0) translate(-50%, -50%)`;
        const tail = points[points.length - 1];
        if (!tail || Math.hypot(head.x - tail.x, head.y - tail.y) > 1.8) {
          points.push({ x: head.x, y: head.y, t: now, width: overPhoto ? 0.72 : 0.52, duration: overPhoto ? LIFE : LIFE * 0.62 });
          if (points.length > MAX_POINTS) points.shift();
        }
      }
      while (points.length && now - points[0].t > points[0].duration) points.shift();

      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const rgb = onLight ? "20,20,20" : "238,238,232";
      context.filter = overPhoto ? "blur(7px)" : "blur(4px)";
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const next = points[i + 1] ?? current;
        const life = Math.max(0, 1 - (now - current.t) / current.duration);
        if (life < 0.015) continue;
        const startX = i === 1 ? previous.x : (previous.x + current.x) * 0.5;
        const startY = i === 1 ? previous.y : (previous.y + current.y) * 0.5;
        const endX = i === points.length - 1 ? current.x : (current.x + next.x) * 0.5;
        const endY = i === points.length - 1 ? current.y : (current.y + next.y) * 0.5;
        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(current.x, current.y, endX, endY);
        context.strokeStyle = `rgba(${rgb},${ALPHA * life * life * 0.42})`;
        context.lineWidth = WIDTH * current.width * life * 3.1;
        context.stroke();
      }
      context.filter = "none";
      for (let i = 1; i < points.length; i += 1) {
        const previous = points[i - 1];
        const current = points[i];
        const next = points[i + 1] ?? current;
        const life = Math.max(0, 1 - (now - current.t) / current.duration);
        if (life < 0.015) continue;
        const startX = i === 1 ? previous.x : (previous.x + current.x) * 0.5;
        const startY = i === 1 ? previous.y : (previous.y + current.y) * 0.5;
        const endX = i === points.length - 1 ? current.x : (current.x + next.x) * 0.5;
        const endY = i === points.length - 1 ? current.y : (current.y + next.y) * 0.5;
        context.beginPath();
        context.moveTo(startX, startY);
        context.quadraticCurveTo(current.x, current.y, endX, endY);
        context.strokeStyle = `rgba(${rgb},${ALPHA * life * life})`;
        context.lineWidth = WIDTH * current.width * life * 0.82;
        context.stroke();
      }

      const settled = !target || (head && Math.hypot(target.x - head.x, target.y - head.y) < 0.5);
      if (points.length === 0 && settled) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const wake = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      target = { x: event.clientX, y: event.clientY };
      onLight = event.target instanceof Element && event.target.closest(LIGHT_SURFACES) !== null;
      const photo = getPhotoRect();
      if (photo) applyPhotoHaloSize(photo.width);
      overPhoto = Boolean(photo && event.clientX >= photo.left && event.clientX <= photo.right && event.clientY >= photo.top && event.clientY <= photo.bottom);
      halo.classList.remove("is-hidden");
      halo.classList.toggle("is-light", onLight);
      halo.classList.toggle("is-photo", overPhoto);
      wake();
    };
    const onLeave = () => {
      target = null;
      head = null;
      halo.classList.add("is-hidden");
    };

    document.body.append(halo, canvas);
    resize();
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      canvas.remove();
      halo.remove();
    };
  }, []);

  return null;
}
