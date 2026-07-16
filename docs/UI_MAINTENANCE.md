# UI maintenance

## Archive contract

Projects and Publications use the same archive primitives:

- `archive-layout.css` owns the page shell, card grid, DOM areas, and the shared `920px` / `720px` breakpoints.
- `archive-controls.css` owns view buttons and filter controls.
- `archive-view.js` owns `list`, `grid`, and `grid-compact` state through one `data-view` attribute.
- `projects.css` and `publications.css` contain only page-specific card content and media treatment.
- Card DOM order is always `media -> copy -> meta`. Publications omit `meta`.

Do not add `order` to move whole card regions. Desktop layouts may reposition regions with `grid-template-areas`; the mobile visual order must continue to match the DOM and reading order.

## Responsive rules

- Above `920px`: list, 2-column grid, and 3-column compact grid.
- From `721px` through `920px`: compact grid becomes 2 columns.
- At `720px` and below: every view uses one column and `media -> copy -> meta`.
- Component-specific breakpoints are allowed only when they do not change the archive layout contract.

CSS cascade layers are ordered as `tokens`, `base`, `components`, `pages`, `responsive`, and `utilities`. Add shared behavior to the appropriate common layer rather than increasing selector specificity in a page stylesheet.

## Regression checks

Run `npm run test:ui` before merging UI work. The archive suite covers `390`, `720`, `920`, and `1180px` in all three views. The home suite covers the closed, Recent News, and Background accordion states.

Use `npm run test:ui:update` only after intentionally reviewing every changed screenshot. Keep experimental assets and UI refactors in separate branches so a visual update can be reviewed and reverted independently.
