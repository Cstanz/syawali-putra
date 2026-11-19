"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

/* Scene length in svh units of pinned scroll. Must match .portrait-flow height (100svh + PIN svh) in globals.css.
   The last 100svh is the "curtain": the Projects section slides over the pinned portrait (.work margin-top: -100svh). */
const PIN = 280;

export function Motion() {
  const pathname = usePathname();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const skipIntro = reduced || document.documentElement.dataset.motionIntent === "true";
    const loader = document.querySelector<HTMLElement>(".intro-loader");
    if (skipIntro && loader) loader.style.display = "none";

    // Keep native scrolling on touch devices; Lenis' always-running ticker is for desktop only.
    const lenis = reduced || !finePointer ? null : new Lenis({ lerp: 0.09, smoothWheel: true });
    if (lenis) gsap.ticker.lagSmoothing(0);
    if (lenis) lenis.on("scroll", ScrollTrigger.update);
    const tick = lenis ? (time: number) => lenis.raf(time * 1000) : null;
    if (tick) gsap.ticker.add(tick);
    const cleanups: Array<() => void> = [];

    const onAnchorClick = (event: MouseEvent) => {
      if (!lenis || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const hash = link?.getAttribute("href");
      if (!link || !hash || hash.length < 2) return;
      let target: HTMLElement | null = null;
      try { target = document.querySelector<HTMLElement>(hash); } catch { return; }
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, {
        duration: 1.5,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
        onComplete: () => {
          if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        },
      });
      history.pushState(null, "", hash);
    };
    document.addEventListener("click", onAnchorClick);
    cleanups.push(() => document.removeEventListener("click", onAnchorClick));

    const context = gsap.context(() => {
      if (loader && !skipIntro) {
        gsap.set(loader, { display: "grid", autoAlpha: 1, clipPath: "inset(0 0 0 0)" });
        gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: () => { loader.style.display = "none"; } })
          .fromTo(".intro-loader__thumb", { y: 54, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.52, stagger: 0.08 }, 0)
          .fromTo(".intro-loader__wordmark", { y: 34, autoAlpha: 0, clipPath: "inset(0 0 100% 0)" }, { y: 0, autoAlpha: 1, clipPath: "inset(0 0 0 0)", duration: 0.66, ease: "power4.out" }, 0.16)
          .fromTo(".intro-loader__top, .intro-loader__bottom", { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, stagger: 0.06 }, 0.12)
          .fromTo(".intro-loader__progress span", { scaleX: 0 }, { scaleX: 1, duration: 0.86, ease: "power2.inOut" }, 0.2)
          .to(".intro-loader__track", { xPercent: -3, duration: 0.86, ease: "power2.inOut" }, 0.18)
          .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 0.62, ease: "power4.inOut" }, 1.02);
      }

      {
        const flow = document.querySelector<HTMLElement>(".portrait-flow");
        const stage = flow?.querySelector<HTMLElement>(".portrait-flow__stage");
        const frame = flow?.querySelector<HTMLElement>(".portrait-flow__frame");
        const image = flow?.querySelector<HTMLElement>(".portrait-flow__image");
        const shade = flow?.querySelector<HTMLElement>(".portrait-flow__shade");
        const header = flow?.querySelector<HTMLElement>(".site-header");
        const captions = flow?.querySelectorAll<HTMLElement>(".portrait-flow__caption, .portrait-flow__scroll");
        const story = flow?.querySelector<HTMLElement>(".portrait-story__content");

        // Keep the photo zoom independent from the optional text and shading layers. This ensures
        // the main scroll effect still runs if any copy layer is edited or temporarily omitted.
        if (flow && stage && frame && image) {
          const startFrame = () => {
            const s = stage.getBoundingClientRect();
            const f = frame.getBoundingClientRect();
            return { left: f.left - s.left + f.width / 2, top: f.top - s.top + f.height / 2, width: f.width, height: f.height };
          };

          const start = startFrame();
          // The frame's position inside the stage only changes on resize/refresh, so measure it then
          // instead of forcing a layout read on every scroll frame.
          let measured = start;
          const measure = () => { measured = startFrame(); };
          const monogram = flow.querySelector<HTMLElement>(".portrait-flow__monogram");
          const followers = flow.querySelectorAll<HTMLElement>(".portrait-flow__caption:not(.portrait-flow__monogram)");
          const zoomEase = gsap.parseEase("power1.inOut");
          const paintZoom = (scrollProgress: number) => {
            const mix = gsap.utils.interpolate;
            const progress = zoomEase(gsap.utils.clamp(0, 1, scrollProgress / 0.46));
            const cur = measured;

            const width = mix(cur.width, stage.clientWidth, progress);
            const height = mix(cur.height, stage.clientHeight, progress);
            const top = mix(cur.top, 0, progress);
            const yPercent = mix(-50, 0, progress);

            gsap.set(image, {
              left: mix(cur.left, 0, progress),
              top,
              width,
              height,
              xPercent: mix(-50, 0, progress),
              yPercent,
            });

            // Tepi atas dan bawah foto dibanding posisi awal
            const edgeTop = top + (yPercent / 100) * height;
            const edgeBottom = edgeTop + height;
            const startTop = cur.top - cur.height / 2;
            const startBottom = cur.top + cur.height / 2;

            if (monogram) gsap.set(monogram, { y: edgeTop - startTop }); // naik mengikuti tepi atas foto
            gsap.set(followers, { y: edgeBottom - startBottom });        // turun mengikuti tepi bawah foto
          };

          gsap.set(image, {
            left: start.left,
            top: start.top,
            width: start.width,
            height: start.height,
            xPercent: -50,
            yPercent: -50,
          });

          ScrollTrigger.create({
            trigger: flow,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.45,
            invalidateOnRefresh: true,
            onUpdate: (self) => paintZoom(self.progress),
            onRefresh: (self) => { measure(); paintZoom(self.progress); },
          });

          const syncPortraitZoom = () => {
            const rect = flow.getBoundingClientRect();
            const range = Math.max(1, rect.height - window.innerHeight);
            const progress = gsap.utils.clamp(0, 1, -rect.top / range);
            paintZoom(progress);
          };
          let syncRaf = 0;
          const queueSync = () => {
            if (syncRaf) return;
            syncRaf = requestAnimationFrame(() => { syncRaf = 0; syncPortraitZoom(); });
          };
          const onResizeSync = () => { measure(); queueSync(); };
          syncPortraitZoom();
          window.addEventListener("scroll", queueSync, { passive: true });
          window.addEventListener("resize", onResizeSync);
          const frameObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onResizeSync) : null;
          frameObserver?.observe(stage);
          cleanups.push(() => {
            if (syncRaf) cancelAnimationFrame(syncRaf);
            frameObserver?.disconnect();
            window.removeEventListener("scroll", queueSync);
            window.removeEventListener("resize", onResizeSync);
          });
          document.fonts?.ready.then(() => ScrollTrigger.refresh());
        }

        if (flow && shade && header && captions && story) {
          gsap.set(header.querySelectorAll<HTMLElement>(".site-header__title, .site-header__info, .site-header__subrow"), { clearProps: "opacity,visibility,transform" });
          gsap.set(header, { autoAlpha: 1, yPercent: 0 });
          const scene = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: flow, start: "top top", end: "bottom bottom", scrub: 0.5, invalidateOnRefresh: true },
          });
          scene.to(header, { yPercent: -14, duration: 70, ease: "none" }, 0);
          scene.to(header, { autoAlpha: 0, duration: 30, ease: "power2.in" }, 50);
          scene.to(".portrait-flow__scroll", { autoAlpha: 0, duration: 14, ease: "power2.out" }, 0);
          scene.to(".portrait-flow__monogram", { autoAlpha: 0, duration: 20, ease: "power2.in" }, 30);
          // Gentle dim keeps the green copy legible on any photo, then settles into the Projects curtain.
          scene.fromTo(shade, { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 70 }, 40);
          scene.to(shade, { autoAlpha: 0.85, duration: 90 }, 190);
          scene.fromTo(story, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 26, ease: "power2.out" }, 84);
          scene.to(story, { y: -14, autoAlpha: 0, duration: 24, ease: "power2.in" }, 168);
          document.fonts?.ready.then(() => ScrollTrigger.refresh());
        }

        if (finePointer) gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(element, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.65, ease: "power3.out", clearProps: "all", scrollTrigger: { trigger: element, start: "top 88%", once: true } });
        });
      }

      if (finePointer) {
      const preview = document.createElement("div");
      preview.className = "project-cursor-preview";
      preview.setAttribute("aria-hidden", "true");
      const previewImages = [document.createElement("img"), document.createElement("img")];
      previewImages.forEach((image) => {
        image.alt = "";
        image.className = "project-cursor-preview__image";
        preview.append(image);
      });
      document.body.append(preview);
      let visibleImage = 0;
      let activeCard: HTMLElement | null = null;
      let lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const movePreviewX = gsap.quickTo(preview, "left", { duration: 0.2, ease: "power3.out" });
      const movePreviewY = gsap.quickTo(preview, "top", { duration: 0.2, ease: "power3.out" });
      const rotatePreview = gsap.quickTo(preview, "rotation", { duration: 0.32, ease: "power3.out" });
      gsap.set(preview, { autoAlpha: 0, scale: 0.76, rotate: 4, clipPath: "inset(16% 12% 16% 12%)" });
      gsap.set(previewImages, { autoAlpha: 0, scale: 1.12, clipPath: "inset(0 0 100% 0)" });
      const placePreview = (x: number, y: number, snap = false) => {
        if (snap) {
          preview.style.left = `${x}px`;
          preview.style.top = `${y}px`;
          return;
        }
        movePreviewX(x);
        movePreviewY(y);
      };

      const cards = gsap.utils.toArray<HTMLElement>(".project-card");
      const projectList = document.querySelector<HTMLElement>(".project-list");
      const sources = new Map(cards.map((card) => [card, card.querySelector<HTMLImageElement>(".project-card__preview-source img")]));
      const activateCard = (card: HTMLElement, pointer?: { clientX: number; clientY: number }) => {
        const source = sources.get(card);
        if (!source || activeCard === card) return;
        activeCard = card;
        if (pointer) {
          lastPointer = { x: pointer.clientX, y: pointer.clientY };
          placePreview(lastPointer.x, lastPointer.y, true);
        } else {
          lastPointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          placePreview(lastPointer.x, lastPointer.y, true);
        }
        cards.forEach((item) => item.classList.toggle("is-active", item === card));
        const nextSource = source.currentSrc || source.src;
        const nextImage = previewImages[1 - visibleImage];
        const currentImage = previewImages[visibleImage];
        if (nextImage.src !== nextSource) {
          nextImage.src = nextSource;
          gsap.killTweensOf([nextImage, currentImage, preview]);
          gsap.set(nextImage, { autoAlpha: 1, scale: 1.08, clipPath: "inset(0 0 100% 0)" });
          if (reduced) {
            gsap.set(nextImage, { autoAlpha: 1, scale: 1, clipPath: "inset(0 0 0% 0)" });
            gsap.set(currentImage, { autoAlpha: 0 });
          } else {
            gsap.timeline({ defaults: { ease: "power2.inOut" } })
              .to(nextImage, { clipPath: "inset(0 0 0% 0)", scale: 1, duration: 0.68 }, 0)
              .to(currentImage, { autoAlpha: 0, duration: 0.38 }, 0.08);
          }
          visibleImage = 1 - visibleImage;
        }
        if (reduced) gsap.set(preview, { autoAlpha: 1, scale: 1, rotate: 0, clipPath: "inset(0% 0 0% 0)" });
        else gsap.to(preview, { autoAlpha: 1, scale: 1, rotate: 0, clipPath: "inset(0% 0 0% 0)", duration: 0.64, ease: "power3.out", overwrite: "auto" });
        if (reduced) gsap.set(card.querySelectorAll(".project-card__index, .project-card__title"), { x: 0 });
        else gsap.to(card.querySelectorAll(".project-card__index, .project-card__title"), { x: 7, duration: 0.46, ease: "power3.out", overwrite: "auto" });
        cards.filter((item) => item !== card).forEach((item) => reduced
          ? gsap.set(item.querySelectorAll(".project-card__index, .project-card__title"), { x: 0 })
          : gsap.to(item.querySelectorAll(".project-card__index, .project-card__title"), { x: 0, duration: 0.38, ease: "power3.out", overwrite: "auto" }));
      };
      const deactivateCards = () => {
        activeCard = null;
        cards.forEach((card) => card.classList.remove("is-active"));
        if (reduced) gsap.set(preview, { autoAlpha: 0, scale: 1, rotate: 0 });
        else gsap.to(preview, { autoAlpha: 0, scale: 0.8, rotate: -3, clipPath: "inset(12% 10% 12% 10%)", duration: 0.48, ease: "power2.out", overwrite: "auto" });
        if (reduced) gsap.set(cards.flatMap((card) => Array.from(card.querySelectorAll(".project-card__index, .project-card__title"))), { x: 0 });
        else gsap.to(cards.flatMap((card) => Array.from(card.querySelectorAll(".project-card__index, .project-card__title"))), { x: 0, duration: 0.35, ease: "power2.out", overwrite: "auto" });
      };
      cards.forEach((card) => {
        if (!sources.get(card) || reduced) return;
        gsap.fromTo(card, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out", clearProps: "all", scrollTrigger: { trigger: card, start: "top 92%", once: true } });
      });
      if (projectList) {
        const onPointerOver = (event: PointerEvent) => {
          if (event.pointerType === "touch") return;
          const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".project-card") : null;
          if (target) activateCard(target, event);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerType === "touch") return;
          const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".project-card") : null;
          if (!target) return;
          if (activeCard !== target) activateCard(target, event);
          const dx = event.clientX - lastPointer.x;
          lastPointer = { x: event.clientX, y: event.clientY };
          placePreview(lastPointer.x, lastPointer.y);
          if (reduced) gsap.set(preview, { rotation: 0 });
          else rotatePreview(gsap.utils.clamp(-4, 4, dx * 0.035));
        };
        projectList.addEventListener("pointerover", onPointerOver);
        projectList.addEventListener("pointermove", onPointerMove);
        projectList.addEventListener("pointerleave", deactivateCards);
        cleanups.push(() => {
          projectList.removeEventListener("pointerover", onPointerOver);
          projectList.removeEventListener("pointermove", onPointerMove);
          projectList.removeEventListener("pointerleave", deactivateCards);
        });
      }
      cards.forEach((card) => {
        const onFocus = () => activateCard(card);
        const onFocusOut = (event: FocusEvent) => {
          if (!card.contains(event.relatedTarget as Node | null)) deactivateCards();
        };
        card.addEventListener("focusin", onFocus);
        card.addEventListener("focusout", onFocusOut);
        cleanups.push(() => {
          card.removeEventListener("focusin", onFocus);
          card.removeEventListener("focusout", onFocusOut);
        });
      });
      cleanups.push(() => preview.remove());
      }
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, [pathname]);

  return null;
}
