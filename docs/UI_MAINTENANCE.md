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

## Interaction rules

- Apply lift motion only to controls that change view or filter state, not to archive cards, profile content, institution marks, navigation, or home accordions.
- On fine pointers, inactive controls may use `translateY(-1px)`, the shared petrol tint, and a restrained shadow. Active controls stay fixed with a solid petrol fill.
- Pressed controls return to their resting position. Touch interfaces receive the pressed state without a persistent hover treatment.
- Content links use color, underline, or border feedback without translation. Archive figures keep border-only feedback.
- Disabled and reduced-motion states never translate. Do not add persistent `will-change` declarations.
- Add future demo tabs, sample controls, and modal actions to this contract rather than creating page-specific motion values.

Global element defaults belong in `@layer base`. This is especially important for replaced elements such as `img`, because unlayered defaults otherwise override page-level media sizing rules.

## Regression checks

Run `npm run test:ui` before merging UI work. The archive suite covers `390`, `720`, `920`, and `1180px` in all three views. The home suite covers the closed, Recent News, and Background accordion states.

Use `npm run test:ui:update` only after intentionally reviewing every changed screenshot. Keep experimental assets and UI refactors in separate branches so a visual update can be reviewed and reverted independently.
