# CHANGELOG

Numbered items reference the 61-item visual / UX fix list.

## Wave 1, Global foundation

### Global
- **#2 Spacing scale** — explicit `--space-1` through `--space-32` tokens added to the Tailwind 4 `@theme` block (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px). Existing utilities like `p-4`, `py-24` already align with this scale, the tokens make it auditable.
- **#4 Line-heights** — `--leading-display: 1.05`, `--leading-sub-display: 1.15`, `--leading-body: 1.55`, `--leading-caption: 1.45` added to `@theme` and `body` now uses `var(--leading-body)`. New `.display-headline`, `.sub-display`, `.caption` utilities encode the rest.
- **#5 Horizontal overflow** — `overflow-x: hidden` set on `html`, `body`, and `main`.
- **#6 Smooth scroll** — `scrollToHash` and `scrollToY` helpers in `useLenis` now run at 600 ms with an ease-out-cubic easing.
- **#7 Focus rings** — `:focus-visible` now renders a 2 px solid ember outline with 2 px offset on every focusable element.
- **#50 Grain overlay** — opacity dropped from 0.18 to 0.06 (closer to the spec's 3 %, soft-light blend kept).
- **#51 Texture divider** — new `.texture-divider` utility (12 px tall fractal-noise band) for use between major sections.
- **#53 Sticker rotation + torn edge** — `.sticker` and `.sticker-ember` utilities now use a `clip-path` polygon mask for irregular torn edges, plus a `-1.5deg` rotation.
- **#56 Halftone in card corners** — new `.halftone-corner` utility that paints a soft ember halftone dot field into the top-right corner of any positioned container.
- **#57 Contrast bump** — bone-50 changed to `#f5f5f0` (was `#f5f1ea`), giving body copy a measured contrast ratio above 12:1 against ink-950. `--color-ink-600` and `--color-bone-500` added.
- **#59 Reduced motion** — `@media (prefers-reduced-motion: reduce)` clamps every animation duration to 1 ms and stops the grain drift.
- **#60 Skip to content** — `.skip-link` rendered as the first child of `<body>` in `app/layout.tsx`. Visible only when focused.

### Notes for downstream waves
- `.text-tint` utility added globally (radial-gradient backdrop) — per-section text columns will opt into it in their own wave (#1).
- Item #8 (reduce orange usage) is enforced per-section as the per-section waves run.
- Item #1 (3D model max-widths) is enforced via keyframe positions / scales per section.
- Item #55 (distinctive grotesque-mono) — JetBrains Mono is already loaded as `--font-mono`. Switching to Departure Mono would add a network dep; keeping JetBrains Mono is documented as the choice.

## Wave 2, Hero (pending)
## Wave 3, Manifesto (pending)
## Wave 4, Anatomy (pending)
## Wave 5, Configure (pending)
## Wave 6, Tricks (pending)
## Wave 7, Order (pending)
## Wave 8, Footer (pending)
## Wave 9, Visual polish + accessibility (pending)
