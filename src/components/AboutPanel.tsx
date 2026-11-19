"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * About panel: slides in from the right over a dimmed page, like surya-aditya.com/about.
 * Opens from any <a href="#about"> and from the #about hash. Closes with Esc, the CLOSE button or a click on the dimmed area.
 */
export function AboutPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (window.location.hash === "#about") window.history.pushState(null, "", window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    const sync = () => setOpen(window.location.hash === "#about");
    sync();

    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href="#about"]') : null;
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (window.location.hash !== "#about") window.history.pushState(null, "", "#about");
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    // Keep the page behind the panel still (Lenis would otherwise keep scrolling it).
    const blockScroll = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
    const backdrop = backdropRef.current;

    document.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    backdrop?.addEventListener("wheel", blockScroll, { passive: false });
    backdrop?.addEventListener("touchmove", blockScroll, { passive: false });
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      backdrop?.removeEventListener("wheel", blockScroll);
      backdrop?.removeEventListener("touchmove", blockScroll);
    };
  }, [close]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <div ref={backdropRef} className="about-backdrop" data-open={open} onClick={close} aria-hidden="true" />
      <aside id="about-panel" ref={panelRef} className="about-panel" data-open={open} role="dialog" aria-modal="true" aria-label="About" aria-hidden={!open} tabIndex={-1}>
        <button className="about-panel__close" type="button" onClick={close}>CLOSE ✕</button>
        <div className="about-panel__scroll" data-lenis-prevent="">
          <div className="about-panel__inner">  
            <header className="about-panel__intro">
              <p className="about-panel__side about-panel__side--left">SYAWALI PUTRA IS<br />BASED IN PERTH, AUSTRALIA,</p>
              <div className="about-panel__center">
                <span className="about-panel__mark logo-mark logo-mark--dark"><Image src="/images/logo-transparent.svg" alt="" width={1672} height={941} /></span>
                <div className="about-panel__portrait"><Image src="/images/potrait.webp" alt="Portrait of Syawali Putra" fill sizes="240px" quality={90} /></div>
              </div>
              <p className="about-panel__side about-panel__side--right">ASPIRING DEVELOPER<br />PROGRAMMING, AI &amp; TECHNOLOGY</p>
              <p className="about-panel__line">LEARNING THROUGH EXPERIMENTATION</p>
            </header>

            <section className="about-panel__row">
              <span className="about-panel__label">ABOUT:</span>
              <div className="about-panel__copy">
                <p>I am a curious individual with a growing interest in programming, artificial intelligence, and technology.</p>
                <p>I enjoy exploring new ideas, learning through experimentation, and building things along the way.</p>
                <p>This portfolio is a personal space to document my progress, projects, and learning journey.</p>
              </div>
            </section>

            <figure className="about-panel__photo"><Image src="/images/potrait.webp" alt="" fill sizes="2000px" quality={95} /></figure>

            <section className="about-panel__row about-panel__row--tight">
              <span className="about-panel__label">RECOGNITIONS:</span>
              <div className="about-panel__copy about-panel__copy--list">
                <p>2ND PLACE — SKOMDA INNOVATION DEMO DAY (2022)</p>
                <p>IOTASTIC · UI/UX DESIGNER · SMK TELKOM SIDOARJO</p>
              </div>
            </section>

            <section className="about-panel__row about-panel__row--contact">
              <span className="about-panel__label">STATUS:</span>
              <div className="about-panel__copy">
                <p>Not currently seeking employment or freelance opportunities.</p>
                <p>This portfolio is for personal documentation.</p>
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
