# Ration — website refresh

A redesigned marketing site for [Ration](https://www.ration.works/): a secure messaging and
collaboration platform built by Stackchase Limited.

The build is intentionally dependency-free at runtime — plain HTML, CSS and JavaScript with
[GSAP](https://gsap.com/) for motion. There is no build step: deploy the repository root.

## What changed

- **Hero** aligned with the live site’s copy and motion: the “Work. Communicate. Collaborate.”
  headline with a gold rotating final word (Seamlessly / All-in-one place / Securely), the live subtext and all three CTAs. The preview is a
  GSAP 3D coverflow of browser-framed app captures — active card in front, angled neighbours
  behind — with a 5-second auto-advance, swipe, keyboard support and simple dot navigation. The grey
  preview panel is gone, so the coverflow sits directly on the grid background. Five captures are
  included — Mail, Chat, Meet, Calendar and Forms — with the latest Chat/Forms/Meet screenshots
  cropped into the browser cards.
- **“Eight apps, one workspace”** reworked in the spirit of Ease Health’s
  “An EHR designed for how clinicians actually work” section: a large editorial callout with
  concentric rings, followed by a pinned horizontal track of eight app panels.
- Each panel has a bespoke, animated product mockup (Mail, Chat, Meet, Calendar, Contacts, Tasks,
  Notes, Forms) instead of a static screenshot, so the visuals stay crisp at any size and can
  react to scroll.
- **Sovereign cloud** uses the original centred, two-line headline and gold mask wipe.
  The scan line follows the reveal with softened scroll tracking and fades at both ends.
  The introduction flows naturally into the Africa map, twelve interactive app/document
  doodles and an aligned five-card region grid that wraps without clipping on smaller
  screens. Reduced-motion views show the complete statement.
- **Where Ration runs** uses a native sticky edition sequence inspired by Varco Pruden's “Thinking
  beyond the expected” section. Scrolling moves complete edition cards through a continuous,
  scrubbed vertical transition while the headline remains fixed;
  tabs and arrows navigate to each edition's reading pause. The sticky frame works
  independently of GSAP, and includes compact layouts for smaller windows. Each card places its text beside
  its visual on desktop, with the same soft blue, green and sand tints used by the app panels
  making each transition distinct. Compact screens keep the edition text in view; windows too
  short to fit the complete frame and reduced-motion views use direct controls; without JavaScript, all editions remain readable.
- **Closing CTA** is back to the concentric ring layout, with only a faint blue cursor
  spotlight adding movement.
- Supporting sections refreshed: proof strip, audience cards, pricing with monthly/annual
  toggle, FAQ accordion and footer.
- **Whimsy layer**: scroll progress bar, a faint light-blue trailing cursor ring, subtle magnetic
  buttons, gentle 3D tilt on cards, a restrained hero tilt, soft blue cursor spotlights, and
  doodles that drift away from the pointer around the cloud map.
- Motion throughout via GSAP + ScrollTrigger, with `prefers-reduced-motion` support and a
  no-JavaScript fallback for the pinned section.

## Structure

```
.
├── index.html                  # the page
├── assets
│   ├── css/styles.css          # design system + all section styles
│   ├── js/main.js              # GSAP motion, slider, accordions, interactions
│   ├── fonts/                  # self-hosted Inter (latin + latin-ext)
│   ├── img/                    # logos, app screenshots, map, OG image, icons
│   └── vendor/                 # GSAP, ScrollTrigger, ScrollToPlugin (vendored)
├── scripts/serve.js            # zero-dependency local static server
├── robots.txt
├── sitemap.xml
└── package.json                # dev tooling only
```

## Local development

Requires Node 18+.

```bash
npm install        # optional: only GSAP/Playwright dev tooling
npm run dev        # http://localhost:5173
```

The site is static, so `python3 -m http.server 5173` works just as well.

## Deployment

Upload the repository root to any static host (Nginx, Cloudflare Pages, Netlify, GitHub Pages).
There is nothing to compile. Keep the `assets/` directory alongside `index.html`.

- `robots.txt` and `sitemap.xml` assume `https://www.ration.works/`.
- `og-image.png` is 1200×630 and lives at `assets/img/og-image.png`.
- Fonts and GSAP are self-hosted, so there are no third-party runtime requests.

### Share a preview with Vercel

[Deploy the preview to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FHelenAgbro%2FRation%2Ftree%2Fration-share-preview&project-name=ration-design-preview&repository-name=ration-design-preview).
Sign in with GitHub and complete Vercel's Create and Deploy steps. Vercel then
provides the public HTTPS URL to share. The link uses the `ration-share-preview`
branch. `vercel.json` deploys the repository root as a static site, with no
dependency installation or build command needed.

## Motion and accessibility

- All interactive motion is progressive enhancement; the content is readable if JS fails.
- `prefers-reduced-motion: reduce` disables autoplay and scroll animation, and converts the
  horizontal app track into a stacked, readable list; the hero stops the word rotation and
  shows a single front card.
- The slider supports arrow keys, tab/arrow buttons and touch swipes; captions are announced
  through `aria-live`.
- Skip link, visible focus styles, labelled sections and semantic headings are included.

## Updating GSAP

GSAP is vendored so production never depends on a CDN.

```bash
npm install gsap@latest
cp node_modules/gsap/dist/gsap.min.js assets/vendor/
cp node_modules/gsap/dist/ScrollTrigger.min.js assets/vendor/
cp node_modules/gsap/dist/ScrollToPlugin.min.js assets/vendor/
```

## Notes on content

Copy is based on the live ration.works site and the supplied design direction. Product
screenshots in the hero are the existing Ration Mail, Chat, Calendar and Forms captures. The
in-panel mockups use representative product content (Ogun State rollout) for continuity.

The security and collaboration spread after Pricing pairs a rotatable globe of Ration apps with
the supplied conference meeting photo, served as an optimised WebP. It uses product statements rather than customer testimonials.

The globe responds to mouse movement, dragging and arrow keys. One gold light travels
along one wire at a time; automatic motion pauses offscreen and respects reduced motion.
