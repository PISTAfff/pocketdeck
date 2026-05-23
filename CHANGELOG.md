# CHANGELOG

Numbered items reference the 61-item visual / UX fix list.

## Wave 1, Global foundation

- **#2 Spacing scale** — explicit `--space-1` through `--space-32` tokens added to the Tailwind 4 `@theme` block (4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px).
- **#4 Line-heights** — `--leading-display: 1.05`, `--leading-sub-display: 1.15`, `--leading-body: 1.55`, `--leading-caption: 1.45`; new `.display-headline`, `.sub-display`, `.caption` utilities.
- **#5 Horizontal overflow** — `overflow-x: hidden` on `html`, `body`, and `main`.
- **#6 Smooth scroll** — `scrollToHash` and `scrollToY` helpers now run at 600 ms with an ease-out-cubic.
- **#7 Focus rings** — `:focus-visible` renders a 2 px ember outline with 2 px offset on every focusable element.
- **#50 Grain overlay** — opacity dropped from 0.18 to 0.06.
- **#51 Texture divider** — new `.texture-divider` utility (12 px fractal-noise band).
- **#53 Sticker rotation + torn edge** — `.sticker` / `.sticker-ember` use a `clip-path` polygon mask + `-1.5deg` rotation.
- **#56 Halftone in card corners** — `.halftone-corner` utility.
- **#57 Contrast bump** — bone-50 = `#f5f5f0`, AA+ against ink-950. New `--color-ink-600` and `--color-bone-500`.
- **#59 Reduced motion** — `@media (prefers-reduced-motion: reduce)` clamps animation durations + stops grain drift.
- **#60 Skip to content** — `.skip-link` as the first child of `<body>`.

## Wave 2, Hero (9-13)

- **#9** Duplicate "96 mm · fingerboard · skate" tape pill removed; only the inline 96 MM + MADE · CAIRO stickers remain.
- **#10** Hero deck keyframe to `(1.7, -0.55, 0)` so the wheels sit at the bottom-right.
- **#11** Primary "Configure yours →" + ghost "See the build" CTA pair under the body copy.
- **#12** Headline `line-height: 1.02` with explicit 16 px gap between "A skatepark" and "in your pocket.".
- **#13** Badges moved inline above the headline (no more floating absolute zone).

## Wave 3, Manifesto (14-17)

- **#14** Pin removed; section flows in normal scroll.
- **#15** 2x2 grid of declarations: large ember number + condensed display title + supporting sentence.
- **#16** Per-section opacity cap: `SCENE_OPACITY['manifesto'] = 0.3`, wired through SceneRoot so the deck reads as a faded background element.
- **#17** All copy in bone-50 for AA+ contrast.

## Wave 4, Anatomy (18-24)

- **#18** Anatomy deck scales 0.38–0.42 and `X = 1.1`, so the model stays under ~45vw and never crosses the centerline.
- **#19** Progress chips upgraded to `<button role="tab">`s; clicking jumps via `scrollToY`.
- **#20** Active part picks up an ember emissive glow on top of the existing dim-the-rest behavior (`applyGlow` helper in `Deck.tsx`).
- **#21** Each progress chip has a 32x48 px tap target.
- **#22** Duplicate "scroll for next part" copy removed; only the bottom-right arrow + small label remains.
- **#23** Slide crossfade now overlapping (no AnimatePresence `mode="wait"`); 0.5s transition with no black gap.
- **#24** Spec line set in mono uppercase ember-400 at ~70% of the part name's size.

## Wave 5, Configure (25-31)

- **#25** Step indicator reads STEP X / 04; Review is a separate non-numbered final dot.
- **#26** Dim + glow extended to the configurator: non-active parts fall to 0.4 opacity, the active part picks up the ember emissive. Per-section `dimOpacityFor()` returns 0.32 in anatomy and 0.4 in configurator.
- **#27** Configurator deck rescaled to 0.55 and pulled to (1.5, 0.85, 0); wheels never crop on the right edge.
- **#28** Back and Next equal-weight: same radius, padding, font. Back is filled ink-700 secondary, Next is ember.
- **#29** Wizard card + Review card use the spec'd background `rgba(245,245,240,0.04)` with `1px rgba(245,245,240,0.08)` border and exactly 24 px padding, plus the `.halftone-corner` accent.
- **#30** Swatch label "Noir · included" / "Circuit · +75 EGP" renders directly under the selected swatch; inactive swatches reserve the same vertical space.
- **#31** Final-stage CTA "Review & order →"; smooth scrolls to `#order` via `scrollToHash`.

## Wave 6, Tricks (32-37)

- **#32** Section top padding halved (`md:pt-20` was `md:py-36`).
- **#33** Card hovers scale to 1.02, an ember outer glow appears at ~20% alpha, and the `<video>` autoplays muted on hover.
- **#34** Bottom-right "LOOP" text replaced with a small loop icon (SVG).
- **#35** Play indicator increased to 56 px diameter, outline white, fills ember on hover.
- **#36** Trick color buckets: flip (kickflip + heelflip) gets a wood-tone amber, transition (ollie + manual + shuvit) gets a desaturated sky-blue, grind (50-50) gets concrete grey.
- **#37** Title weight bumped to 600, description steps down to 0.8125rem and lightens to bone-200.

## Wave 7, Order (38-44)

- **#38** Summary aside has `md:mt-[30px]` so its top aligns with the form's first INPUT (not its label).
- **#39** All labels in sentence case + normal weight (Name, Phone, Address, Governorate). No more all-caps decorative tags.
- **#40** Inputs carry a permanent `1px rgba(255,255,255,0.12)` border, 2 px ember focus border + 0.35 alpha focus ring, exactly 12 px vertical / 16 px horizontal padding.
- **#41** Submit button is always live. Pressing while invalid runs `validate()`, surfaces inline errors, and focuses the first invalid field. Once valid the label reads "Confirm order".
- **#42** Live character counter under the Address textarea (`{current} / 200`, `aria-live="polite"`).
- **#43** Helper copy softened: "Where should the courier drop it off?", "Cairo, Giza, and Alexandria ship next day."
- **#44** Full-section success state: ember "Confirmed" sticker + order id, display headline ("Your deck is on the way."), and a four-row spec card (SKU, total, ETA, ship-to). ETA = "24 hours" for Cairo/Giza/Alex, "2 to 4 days" elsewhere.

## Wave 8, Footer (45-49)

- **#45** Newsletter headline demoted from display to a sub-display (~28 px on desktop).
- **#46** Email field widened to fill the column; Subscribe pill button now sits INSIDE the input on the right.
- **#47** Pages column uses 32 px line-height; each link has a 2 px ember underline that animates from 0 → full width on hover.
- **#48** All three columns share `items-start` on the grid → single top baseline.
- **#49** Fine-print row at `opacity-50`.

## Wave 9, Visual polish + accessibility (52, 54, 58, 61)

- **#52** Active nav item carries a brush-stroked SVG underline (mask-image with a hand-pulled stroke path) instead of a clean rectangle.
- **#54** New `.spray-text` utility wraps the ember accent words (`POCKET.`, `RIDE.`, `ONE POCKET.`, `STEP BY STEP.`, `DO.`, `THE WAY.`) with an SVG `feDisplacementMap` filter + soft ember halo, giving a spray-paint edge.
- **#58** Audit pass: progress chip buttons + spec-card icons + scroll cues all carry `aria-label` or `aria-hidden`. Configurator step rail upgraded from `<span>`s to `<button role="tab">`s.
- **#61** Configurator step rail now supports arrow / Home / End keyboard navigation (matching the Anatomy rail).

## Notes / deferred

- **#1 deck max-width 55vw** is enforced by deck scale per section (already < 55vw at all keyframes). Per-section text containers wrap their copy in the `.text-tint` utility so the radial-gradient backdrop keeps copy legible behind the canvas.
- **#3 96/64 px section padding** applied where I touched sections in Waves 2–8. A residual audit shows two sections (Hero, Tricks) at slightly larger top padding because of nav clearance; these remain intentional.
- **#8 single-orange-per-viewport** enforced section-by-section in Waves 2–8: hero pairs primary ember CTA with a ghost; configurator pairs ember Next with ink-700 Back; order has ember Confirm with no second primary; footer has ember Subscribe with neutral pages/social.
- **#55 grotesque-mono** — JetBrains Mono is already loaded as `--font-mono`. Switching to Departure Mono would add a network dep without a meaningful improvement; documented as the choice.
- **#33 hover autoplay** — `videoRef.current.play()` runs on `onPointerEnter`. Real clip files still need to be dropped into `apps/web/public/tricks/<id>.mp4` and passed via `src`; the bucket-tinted gradient + glyph stand in until then.

No new runtime dependencies were added in this pass.
