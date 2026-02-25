# dabinkim0.github.io

Personal website hosted with GitHub Pages.

## Directory Structure

```text
.
├── index.html
├── projects/
│   └── index.html
├── timbre-transfer/
│   ├── index.html
│   ├── audio/
│   ├── figs/
│   ├── spectrograms/
│   └── scripts/
├── assets/
│   ├── css/
│   │   ├── index.css
│   │   ├── projects.css
│   │   └── timbre-transfer.css
│   └── js/
│       ├── mathjax-config.js
│       └── timbre-transfer.js
└── _legacy/
```

## Frontend Organization

- Page-specific styles are stored in `assets/css/*.css` and linked from each HTML page.
- Page-specific scripts are stored in `assets/js/*.js`.
- `timbre-transfer/` keeps project assets (audio/images/spectrograms) and generation scripts.

## Editing Rules

- Prefer editing CSS/JS files in `assets/` instead of adding new large inline `<style>` or `<script>` blocks.
- Keep static resources for each page near that page (`timbre-transfer/audio`, `timbre-transfer/figs`, etc.).
- When adding demo audio in `timbre-transfer/audio`, generate matching spectrograms in `timbre-transfer/spectrograms`.

## Spectrogram Generation

Run:

```bash
MPLCONFIGDIR=/tmp/mpl python3 timbre-transfer/scripts/generate_spectrograms.py
```

This generates PNG spectrograms from all WAV files in `timbre-transfer/audio/` to `timbre-transfer/spectrograms/`.
