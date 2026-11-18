import Image from "next/image";
import { ProjectCard } from "@/components/ProjectCard";
import { AboutPanel } from "@/components/AboutPanel";
import { FlowmapImage } from "@/components/FlowmapImage";
import { projects } from "@/data/projects";

// Isi URL akun masing-masing di sini. Kalau masih kosong, nama platform tetap tampil tanpa tautan.
const socialLinks: { label: string; href: string }[] = [
  { label: "INSTAGRAM", href: "https://www.instagram.com/syawaliputrahafidin/" },
  { label: "LINKEDIN", href: "https://www.linkedin.com/in/syawali-putra-hafidin-496861310" },
  { label: "GITHUB", href: "https://github.com/Cstanz" },
];

export default function Home() {
  const introProjects = projects;
  return <main id="main">
    <div className="intro-loader" aria-hidden="true">
      <div className="intro-loader__top"><span>PORTFOLIO / 2026</span><span>PROGRAMMING / AI / TECHNOLOGY</span></div>
      <div className="intro-loader__stage">
        <div className="intro-loader__track">{introProjects.map((project) => <div className="intro-loader__thumb" key={project.number}><Image src={project.image} alt="" width={360} height={480} priority /></div>)}</div>
        <span className="intro-loader__wordmark">SYAWALI</span>
      </div>
      <div className="intro-loader__bottom"><span>SELECTED WORK</span><div className="intro-loader__progress" aria-hidden="true"><span /></div><span>PROJECTS / {String(projects.length).padStart(2, "0")}</span></div>
    </div>
    <section className="portrait-flow" id="top" aria-label="Introduction">
      <div className="portrait-flow__stage">
        <header className="site-header shell"><h1 className="site-header__title" id="hero-title">SYAWALI PUTRA</h1><div className="site-header__info"><span>INFO:</span><p>ASPIRING DEVELOPER — EXPLORING PROGRAMMING, AI &amp; TECHNOLOGY.</p></div><div className="site-header__subrow"><nav aria-label="Main navigation"><span>NAV.:</span><a href="#top">HOME</a><a href="#work">PROJECTS ({String(projects.length).padStart(2, "0")})</a><a href="#about">ABOUT</a></nav><span className="site-header__year">©2026</span></div></header>
        {/* One continuous portrait plane. The photo keeps GSAP's existing scroll zoom. */}
        <div className="portrait-flow__plane">
          <FlowmapImage className="portrait-flow__image" src="/images/potrait.jpg" alt="Portrait of Syawali Putra" sizes="100vw" priority imagePosition={[0.5, 0]} distortion={0.06} edgeBend={0.11} shadowStrength={0.43} />
          <div className="portrait-flow__shade" />
        </div>
        <div className="portrait-flow__layout">
          <div className="portrait-flow__caption portrait-flow__caption--left">
            <p className="portrait-flow__lead">SYAWALI PUTRA IS BASED IN<br />PERTH, AUSTRALIA</p>
          </div>
          <div className="portrait-flow__frame" aria-hidden="true" />
          <div className="portrait-flow__monogram portrait-flow__caption" aria-hidden="true"><span className="logo-mark logo-mark--inverse"><Image src="/images/logo-transparent.svg" alt="" width={1672} height={941} /></span></div>
          <div className="portrait-flow__caption portrait-flow__caption--right">
            <p className="portrait-flow__lead">ASPIRING DEVELOPER</p>
            <p className="portrait-flow__detail">EXPLORING PROGRAMMING, AI &amp; TECHNOLOGY</p>
            <p className="portrait-flow__meta"><span>STATUS:</span> NOT SEEKING WORK</p>
          </div>
        </div>
        <a href="#work" className="portrait-flow__scroll"><span>SCROLL TO PROJECTS</span><span aria-hidden="true">↓</span></a>
        <div className="portrait-story__content shell">
          <a className="portrait-story__mark" href="#top" aria-label="Back to top"><span className="logo-mark logo-mark--dark"><Image src="/images/logo-transparent.svg" alt="" width={1672} height={941} /></span></a>
          <div className="portrait-story__recognition"><span>RECOGNITION:</span><p>2ND PLACE — SKOMDA INNOVATION DEMO DAY, 2022</p></div>
          <div className="portrait-story__availability"><span>STATUS:</span><p>PERSONAL DOCUMENTATION</p></div>
          <a className="portrait-story__more" href="#about">MORE ABOUT <span aria-hidden="true">→</span></a>
        </div>
      </div>
    </section>
    <section className="work" id="work" aria-labelledby="work-title"><div className="work__inner shell"><div className="work__intro" data-reveal><span className="eyebrow">SELECTED WORK</span><h2 id="work-title">PROJECTS</h2><p>A personal archive of projects and a learning journey in programming, AI, and technology.</p></div><div className="project-list">{projects.map((project) => <ProjectCard key={project.number} project={project} />)}</div><p className="work__hint"><span className="work__hint-dot" /> NEW PROJECTS WILL APPEAR HERE SOON</p></div></section>
    <footer className="contact" id="contact">
      <div className="contact__inner">
        <div className="contact__top">
          <nav className="contact__nav" aria-label="Footer navigation">
            <span className="contact__label">NAV.:</span>
            <a href="#top">HOME</a>
            <a href="#work">PROJECTS ({String(projects.length).padStart(2, "0")})</a>
            <a href="#about">ABOUT</a>
          </nav>
          <nav className="contact__socials" aria-label="Social platforms">
            <span className="contact__label">SOCIALS:</span>
            {socialLinks.map((social, index) => (
              <span key={social.label}>
                {index > 0 && " / "}
                {social.href ? <a href={social.href} target="_blank" rel="noreferrer">{social.label}</a> : social.label}
              </span>
            ))}
          </nav>
          <div className="contact__credit"><span className="contact__label">DESIGN:</span><strong>SYAWALI PUTRA</strong></div>
        </div>
        <div className="contact__mobile-mark" aria-hidden="true"><span className="logo-mark logo-mark--dark"><Image src="/images/logo-transparent.svg" alt="" width={1672} height={941} /></span></div>
        <div className="contact__bottom">
          <a className="wordmark" href="#top" aria-label="Back to top"><span className="logo-mark logo-mark--dark"><Image src="/images/logo-transparent.svg" alt="" width={1672} height={941} /></span></a>
          <span>PERSONAL LEARNING PORTFOLIO<br />© 2026 SYAWALI PUTRA</span>
          <a className="back-top" href="#top">BACK TO TOP ↑</a>
        </div>
      </div>
    </footer>
    <AboutPanel />
  </main>;
}
