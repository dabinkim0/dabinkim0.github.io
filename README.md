# dabinkim0.github.io

Personal website hosted with GitHub Pages.

## Directory Structure

```text
.
├── index.html
├── projects/
│   └── index.html
├── publications/
│   ├── index.html
│   └── figs/
│       ├── pitch-controlnet/
│       └── video-foley/
├── ddsp-carsound/
│   ├── index.html
│   ├── audio/
│   ├── figs/
│   ├── spectrograms/
│   └── scripts/
├── timbre-transfer/
│   ├── index.html
│   ├── audio/
│   ├── figs/
│   ├── spectrograms/
│   └── scripts/
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
- Standalone project/demo pages keep their own media next to the page, for example `timbre-transfer/figs` and `ddsp-carsound/figs`.
- Publication entries without standalone pages store representative figures in `publications/figs/<slug>/`.

## Editing Rules

- Prefer editing CSS/JS files in `assets/` instead of adding new large inline `<style>` or `<script>` blocks.
- Keep static resources near the page that owns them (`timbre-transfer/audio`, `ddsp-carsound/figs`, etc.).
- Avoid creating root-level folders that mix shared assets with page-specific media.
- When adding demo audio in `timbre-transfer/audio`, generate matching spectrograms in `timbre-transfer/spectrograms`.

## Spectrogram Generation

Run:

```bash
MPLCONFIGDIR=/tmp/mpl python3 timbre-transfer/scripts/generate_spectrograms.py
```

This generates PNG spectrograms from all WAV files in `timbre-transfer/audio/` to `timbre-transfer/spectrograms/`.
