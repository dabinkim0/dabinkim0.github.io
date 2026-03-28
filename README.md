# dabinkim0.github.io

Personal website hosted with GitHub Pages.

## Directory Structure

```text
.
├── index.html
├── projects/
│   ├── index.html
│   └── posters/
├── publications/
│   ├── index.html
│   ├── ddsp-carsound/
│   │   ├── index.html
│   │   ├── audio/
│   │   ├── figs/
│   │   ├── spectrograms/
│   │   └── scripts/
│   ├── timbre-transfer/
│   │   ├── index.html
│   │   ├── audio/
│   │   ├── figs/
│   │   ├── spectrograms/
│   │   └── scripts/
│   └── figs/
│       ├── pitch-controlnet/
│       └── video-foley/
├── assets/
│   ├── css/
│   │   ├── ddsp-carsound.css
│   │   ├── index.css
│   │   ├── projects.css
│   │   ├── publications.css
│   │   └── timbre-transfer.css
│   ├── images/
│   │   └── profile/
│   └── js/
│       ├── index.js
│       ├── mathjax-config.js
│       └── timbre-transfer.js
└── _legacy/
```

## Frontend Organization

- Page-specific styles are stored in `assets/css/*.css` and linked from each HTML page.
- Page-specific scripts are stored in `assets/js/*.js`.
- Shared site-wide images such as profile photos are stored in `assets/images/`.
- Project-page poster assets live under `projects/posters/`.
- Publication demo pages live under `publications/` and keep their own media next to the page, for example `publications/timbre-transfer/figs` and `publications/ddsp-carsound/figs`.
- Publication entries without standalone pages store representative figures in `publications/figs/<slug>/`.

## Editing Rules

- Prefer editing CSS/JS files in `assets/` instead of adding new large inline `<style>` or `<script>` blocks.
- Keep static resources near the page that owns them (`publications/timbre-transfer/audio`, `publications/ddsp-carsound/figs`, etc.).
- Avoid creating root-level folders that mix shared assets with page-specific media.
- When adding demo audio in `publications/timbre-transfer/audio`, generate matching spectrograms in `publications/timbre-transfer/spectrograms`.

## Spectrogram Generation

Run:

```bash
MPLCONFIGDIR=/tmp/mpl python3 publications/timbre-transfer/scripts/generate_spectrograms.py
```

This generates PNG spectrograms from all WAV files in `publications/timbre-transfer/audio/` to `publications/timbre-transfer/spectrograms/`.
