# Ration — website refresh

A redesigned marketing site for [Ration](https://www.ration.works/): a secure messaging and
collaboration platform built by Stackchase Limited.

The build is intentionally dependency-free at runtime — plain HTML, CSS and JavaScript with
[GSAP](https://gsap.com/) for motion. There is no build step: deploy the repository root.

## What changed

- **Hero** rebuilt to match the supplied direction: quiet white canvas, oversized two-line
  headline and a GSAP 3D coverflow of browser-framed app previews (Mail, Chat, Calendar, Forms).
  It mirrors the live site’s rotating slides — active card in front, angled neighbours behind —
  with autoplay progress, tabs, arrows, keyboard and swipe support.
- **“Eight apps, one workspace”** reworked in the spirit of Ease Health’s
  “An EHR designed for how clinicians actually work” section: a large editorial callout with
  concentric rings, followed by a pinned horizontal track of eight app panels.
- Each panel has a bespoke, animated product mockup (Mail, Chat, Meet, Calendar, Contacts, Tasks,
  Notes, Forms) instead of a static screenshot, so the visuals stay crisp at any size and can
  react to scroll.
- Supporting sections refreshed: proof strip, sovereign-cloud map, audience cards, deployment
  editions, pricing with monthly/annual toggle, FAQ accordion, closing CTA and footer.
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

## Motion and accessibility

- All interactive motion is progressive enhancement; the content is readable if JS fails.
- `prefers-reduced-motion: reduce` disables autoplay and scroll animation, and converts the
  horizontal app track into a stacked, readable list; the hero shows a single front card.
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
