# dabinkim0.github.io

Personal website hosted with GitHub Pages.

## Directory Structure

```text
.
├── index.html
├── 404.html                    # served by GitHub Pages for missing paths (root-absolute URLs only)
├── robots.txt
├── sitemap.xml                 # canonical pages only; no redirects
├── projects/
│   ├── index.html
│   ├── figs/
│   └── posters/
├── publications/
│   ├── index.html
│   ├── README.md
│   ├── adatt/                  # canonical AdaTT demo page and media
│   │   ├── index.html
│   │   ├── audio/
│   │   ├── figs/
│   │   ├── spectrograms/
│   │   └── scripts/
│   ├── ddsp-carsound/          # canonical DDSP car-sound demo page and media
│   │   ├── index.html
│   │   ├── audio/
│   │   ├── figs/
│   │   ├── spectrograms/
│   │   └── scripts/
│   ├── timbre-transfer/        # legacy redirect to publications/adatt/
│   └── figs/                   # figures for publication entries without own pages
├── adatt/                      # short-url redirect to publications/adatt/
├── data/                       # single source for shared content (see "Content and generated HTML")
│   ├── site.json               # name, links, nav, footer, analytics
│   ├── publications.json       # home list, publications archive, JSON-LD, CV fallback
│   ├── news.json
│   └── background.json
├── scripts/
│   ├── build_site.py           # rewrites the marked regions of each page from data/
│   └── build_cv_pdf.py         # plain-text fallback only; see "CV PDF" below
├── assets/
│   ├── css/
│   │   ├── site-shell.css      # layer order, tokens, base, header/nav/footer
│   │   ├── typography.css      # element-level fonts (base layer)
│   │   ├── archive-layout.css  # shared by Projects and Publications
│   │   ├── archive-controls.css
│   │   ├── demo-page.css       # shared by the publication demo pages
│   │   ├── index.css           # page-specific stylesheets below
│   │   ├── projects.css
│   │   ├── publications.css
│   │   ├── adatt.css
│   │   └── ddsp-carsound.css
│   ├── images/
│   │   ├── marks/              # institution/event marks (see marks/README.md)
│   │   └── profile/
│   ├── docs/
│   │   └── dabin-kim-cv.pdf
│   └── js/
│       ├── archive-view.js
│       ├── index.js
│       ├── projects.js
│       └── publications.js
├── docs/
│   └── UI_MAINTENANCE.md
├── tests/
│   ├── __screenshots__/        # Playwright visual baselines
│   ├── archive-layout.spec.mjs
│   ├── home-panels.spec.mjs
│   ├── home-panels.webkit.spec.mjs
│   └── interactions.spec.mjs
└── favicon.svg
```

## Route Rules

- **Demo URLs are frozen.** Papers cite them (for example `https://dabinkim0.github.io/adatt/`), so never rename, move, or delete `adatt/`, `publications/adatt/`, `publications/ddsp-carsound/`, `publications/timbre-transfer/`, or any media file under them. Edit page HTML in place and add new files beside existing ones.
- Canonical publication demo pages live at `publications/<slug>/`.
- AdaTT's canonical page is `publications/adatt/`.
- `adatt/` is a short compatibility redirect for `https://dabinkim0.github.io/adatt/`.
- `publications/timbre-transfer/` is a legacy compatibility redirect for older AdaTT demo links.
- Do not add demo media, CSS, or JavaScript to redirect-only folders. Put those files in the canonical page folder or in `assets/`.

## Content and generated HTML

Pages are plain HTML that you can open and edit directly. Blocks shared between pages are wrapped in marker comments and regenerated from `data/*.json`:

```html
<!-- build:header -->
...generated, do not edit by hand...
<!-- /build:header -->
```

| Region | Source | Pages |
| --- | --- | --- |
| `head-assets`, `header`, `footer`, `analytics` | `data/site.json` | every page |
| `profile-links` | `data/site.json` | home, publications |
| `news`, `background` | `data/news.json`, `data/background.json` | home |
| `home-publications`, `publication-archive` | `data/publications.json` | home, publications |
| `jsonld-person`, `jsonld-article` | `data/site.json`, `data/publications.json` | home, demo pages |
| `ddsp-overview`, `ddsp-cases` | `publications/ddsp-carsound/scripts/build_demo.py` | DDSP demo |

After editing `data/` (for example adding a publication or a news item), run:

```bash
python3 scripts/build_site.py
```

CI runs `python3 scripts/build_site.py --check` and fails if a generated block was edited by hand or not rebuilt. Everything outside the markers stays hand-written.

## Frontend Organization

- Every stylesheet places its rules in the cascade layers declared at the top of `site-shell.css` (`tokens`, `base`, `components`, `pages`, `responsive`, `utilities`), so precedence never depends on `<link>` order or selector specificity tricks.
- Shared layout, navigation, contact, and footer rules live in `assets/css/site-shell.css`; element-level fonts live in `typography.css`. Components set their own font family rather than relying on `typography.css`.
- Publication demo pages share `demo-page.css`; `adatt.css` and `ddsp-carsound.css` hold only what differs per page.
- Projects and Publications share archive layout, controls, and view state through `archive-layout.css`, `archive-controls.css`, and `archive-view.js`.
- Page-specific styles are stored in the remaining `assets/css/*.css` files.
- Page-specific scripts are stored in `assets/js/*.js`.
- Shared site-wide images such as profile photos are stored in `assets/images/`.
- Project-page figure assets live under `projects/figs/`; poster assets live under `projects/posters/`.
- Publication demo pages keep their own media next to the page, for example `publications/adatt/figs` and `publications/ddsp-carsound/figs`.
- Publication entries without standalone pages store representative figures in `publications/figs/<slug>/`.

## Editing Rules

- Prefer editing CSS/JS files in `assets/` instead of adding new large inline `<style>` or `<script>` blocks.
- Keep static resources near the page that owns them (`publications/adatt/audio`, `publications/ddsp-carsound/figs`, etc.).
- Private research workspaces (`exps/`, `experiments/`, `symbolic-fused-lalm-experiments/`) are git-ignored and never published. Keep their build scripts in the private research repository, not here.
- Avoid creating root-level folders unless they are required for stable public URLs.
- If a public URL changes, keep a tiny redirect page at the old path and document it under Route Rules.
- When adding demo audio in `publications/adatt/audio`, generate matching spectrograms in `publications/adatt/spectrograms`.
- The DDSP sample sections are generated: edit `publications/ddsp-carsound/scripts/build_demo.py`, then run it with `--html-only` (markup only) or `--source <AES_ListeningTestset_v2>` (also rebuilds audio and spectrograms).
- Internal links use directory URLs (`publications/`, `../projects/`), matching each page's canonical URL. Do not link to `index.html` directly.
- Project figures ship as a `<name>.jpg` (≤1200px wide) plus a `<name>-640.jpg` variant referenced through `srcset`.
- Follow `docs/UI_MAINTENANCE.md` for archive DOM, responsive, and screenshot-regression rules.

## UI Regression Tests

Run:

```bash
npm ci
npx playwright install chromium
npm run test:ui
```

The Playwright suite verifies Projects and Publications at `390`, `720`, `920`, and `1180px` in all three view modes, plus the home accordion states. Update screenshots with `npm run test:ui:update` only after reviewing the visual changes.

## CV PDF

`assets/docs/dabin-kim-cv.pdf` (used by the `Download CV` links) is the designed CV exported from its own source outside this repository. Replace the file directly when the CV changes.

`scripts/build_cv_pdf.py` only writes a plain-text Helvetica fallback and does **not** reproduce the designed CV, so do not run it over the published PDF.

## Spectrogram Generation

Run:

```bash
MPLCONFIGDIR=/tmp/mpl python3 publications/adatt/scripts/generate_spectrograms.py
```

This generates PNG spectrograms from all WAV files in `publications/adatt/audio/` to `publications/adatt/spectrograms/`.
