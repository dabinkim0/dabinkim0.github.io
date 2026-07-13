# dabinkim0.github.io

Personal website hosted with GitHub Pages.

## Directory Structure

```text
.
├── index.html
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
├── experiments/                # unpublished or in-progress experiment pages
├── exps/                       # short public routes for active experiment dashboards
├── symbolic-fused-lalm-experiments/
│   └── demo/                   # legacy redirect to experiments/.../demo/
├── scripts/
│   └── build_cv_pdf.py
├── assets/
│   ├── css/
│   │   ├── adatt.css
│   │   ├── ddsp-carsound.css
│   │   ├── index.css
│   │   ├── projects.css
│   │   ├── publications.css
│   │   ├── site-shell.css
│   │   └── typography.css
│   ├── images/
│   │   └── profile/
│   ├── docs/
│   │   └── dabin-kim-cv.pdf
│   └── js/
│       ├── adatt.js
│       ├── index.js
│       ├── mathjax-config.js
│       ├── projects.js
│       └── publications.js
└── favicon.svg
```

## Route Rules

- Canonical publication demo pages live at `publications/<slug>/`.
- AdaTT's canonical page is `publications/adatt/`.
- `adatt/` is a short compatibility redirect for `https://dabinkim0.github.io/adatt/`.
- `publications/timbre-transfer/` is a legacy compatibility redirect for older AdaTT demo links.
- `symbolic-fused-lalm-experiments/demo/` is a legacy compatibility redirect to `experiments/symbolic-fused-lalm-experiments/demo/`.
- `exps/symbolic-tg/` is the active short URL for the Symbolic Temporal Grounding inspection dashboard.
- Do not add demo media, CSS, or JavaScript to redirect-only folders. Put those files in the canonical page folder or in `assets/`.

## Frontend Organization

- Shared layout, navigation, contact, and footer rules live in `assets/css/site-shell.css`.
- Page-specific styles are stored in the remaining `assets/css/*.css` files and linked after the shared stylesheet.
- Page-specific scripts are stored in `assets/js/*.js`.
- Shared site-wide images such as profile photos are stored in `assets/images/`.
- Project-page figure assets live under `projects/figs/`; poster assets live under `projects/posters/`.
- Publication demo pages keep their own media next to the page, for example `publications/adatt/figs` and `publications/ddsp-carsound/figs`.
- Publication entries without standalone pages store representative figures in `publications/figs/<slug>/`.

## Editing Rules

- Prefer editing CSS/JS files in `assets/` instead of adding new large inline `<style>` or `<script>` blocks.
- Keep static resources near the page that owns them (`publications/adatt/audio`, `publications/ddsp-carsound/figs`, etc.).
- Active experiment dashboards under `exps/` may keep page-local CSS, JavaScript, JSON, and small MIDI assets together for easier inspection and sharing.
- Avoid creating root-level folders unless they are required for stable public URLs.
- If a public URL changes, keep a tiny redirect page at the old path and document it under Route Rules.
- When adding demo audio in `publications/adatt/audio`, generate matching spectrograms in `publications/adatt/spectrograms`.
- Update `assets/docs/dabin-kim-cv.pdf` by editing and running `scripts/build_cv_pdf.py`.

## CV PDF

Run:

```bash
python3 scripts/build_cv_pdf.py
```

This regenerates `assets/docs/dabin-kim-cv.pdf`, which is used by the `Download CV` links.

## Spectrogram Generation

Run:

```bash
MPLCONFIGDIR=/tmp/mpl python3 publications/adatt/scripts/generate_spectrograms.py
```

This generates PNG spectrograms from all WAV files in `publications/adatt/audio/` to `publications/adatt/spectrograms/`.
