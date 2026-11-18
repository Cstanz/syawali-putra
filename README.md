# Editorial portfolio

A one-page portfolio starter for an independent creative web developer. Personal details and project specifics are deliberately left as editable placeholders. The three local SVG artworks are abstract visual stand-ins, not representations of real client work.

## Run locally

1. Install Node.js 20.9 or newer.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local address printed in the terminal.
4. For a production build, run `npm run build` followed by `npm start`.

The Google Fonts import is optional; if offline, the page falls back to system sans-serif fonts.

## Update content

- Replace the identity, bio, availability, recognition, and contact placeholders in `src/app/page.tsx`.
- Edit project entries in `src/data/projects.ts` and replace images in `public/images/`.
- Add a real email and professional social URLs before publishing. Recognition is optional; remove that section if there is nothing to list.
- Replace the portrait by editing `--portrait-image` (and `--portrait-position` to choose the framed area) at the top of `src/app/globals.css`; the intro opens that single image from a wide band to full-bleed while it pushes in.
- Update the page title and description in `src/app/layout.tsx` and robots metadata when the site is ready for indexing.

## Structure and choices

- `src/app/page.tsx` is the server-rendered page and holds the reusable section composition.
- `src/components/ProjectCard.tsx` is a reusable, data-driven project card. `src/data/projects.ts` keeps project content separate.
- `src/components/Motion.tsx` is the only client component. It connects Lenis to GSAP's ticker and ScrollTrigger, with reveal and image interactions; reduced-motion users receive static content and native scrolling.
- `src/app/globals.css` contains the responsive editorial design, visible keyboard focus, skip link, and reduced-motion fallback.
- Next.js Image handles local project artwork sizing; local SVG stand-ins keep the starter lightweight and avoid invented project photography.
