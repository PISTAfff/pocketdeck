# Demo clip

`docs/demo.mp4` in this folder is a placeholder file (0 bytes by intent, the
README references the path so the badge resolves once a real clip is dropped
in). To record one:

1. `pnpm dev` from the repo root.
2. Open http://localhost:3000 in a fresh browser window sized 1440×900.
3. Wait for the preloader to clear (~1.2s).
4. Use the OS screen-recorder (macOS: ⌘⇧5, Windows: Win+G → Game Bar) to
   capture ~20s while scrolling slowly through every section.
5. Trim and export at 1080p, H.264, 8–12 Mbps.
6. Replace `docs/demo.mp4` with the export.

The capture should hit, in order:

- 00:00–00:03  Hero, headline reveal, deck idle float.
- 00:03–00:06  Manifesto, barrel rolls behind the pinned copy.
- 00:06–00:10  Anatomy, exploded view, labels reveal.
- 00:10–00:14  Configurator, click each swatch row and watch the deck
  re-color in real time.
- 00:14–00:17  Tricks, hover the tiles to scrub the loops.
- 00:17–00:20  Order, settle on the form with the summary card.
