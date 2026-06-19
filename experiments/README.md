# Experiments

This folder is for ongoing research artifacts that are useful to preserve but
are not yet stable publication pages or portfolio projects.

## Current Layout

- `symbolic-fused-lalm-experiments/`: canonical evidence dashboard for the
  Symbolic-Aware LALM experiment line.
- `symbolic-fused-lalm-exp-progress-slides/`: smaller progress-slide companion
  demo for the same experiment line.
- The root-level `symbolic-fused-lalm-experiments/demo/` path is kept only as a
  compatibility redirect to preserve older public links.

## Maintenance Rules

- Keep unfinished or claim-boundary-sensitive work in `experiments/`, not at the
  site root.
- Promote a page to `publications/<slug>/` only when it is attached to a paper,
  venue, or stable public demo.
- Keep generated assets next to the page that consumes them, under predictable
  `assets/audio`, `assets/figures`, and `assets/data` subfolders.
- Avoid committing caches, build products, and interpreter artifacts such as
  `__pycache__` or `.mplconfig`.
- Prefer lowercase kebab-case folder names and stable slugs, because folder
  names become public GitHub Pages URLs.
