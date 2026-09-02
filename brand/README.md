# PocketDeck brand assets

Everything a link preview or a browser tab needs, in one place. The copies that ship are in `apps/web/public/`; this folder is the source of truth to edit from.

## Files

- `favicon.svg`: the mark, vector. Used for the browser tab.
- `favicon-32x32.png`: the same mark rasterised for browsers that ignore SVG icons.
- `apple-touch-icon.png`: 180x180, shown when the site is added to an iPhone or iPad home screen.
- `icon-512.png`: 512x512 master, for a web app manifest or any place a large icon is needed.
- `og.png`: the 1200x630 share image served at `/og.png`, the one WhatsApp, Slack, LinkedIn and Twitter show.
- `share-card.html`: the editable source of that image. Open it in Chrome, set the window to 1200x630, and screenshot, or drop it into the generator.

## The mark

The existing fingerboard mark (kept as is).

## Palette

| Name | Hex | Used for |
|---|---|---|
| Black | `#07070A` | background |
| Bone | `#F5F5F0` | type |
| Orange | `#FF5B14` | accent and stickers |

## Type

Anton for headlines, Archivo Black for stickers, Inter for body.

## Rules

- Icons have a full bleed square background on purpose. iOS rounds corners itself; transparent corners come out black there.
- Keep the share image under 300KB, WhatsApp stops rendering previews above that.
- WhatsApp caches a preview per URL. After changing the image, test with `?v=2` on the link to see the new one.
- Never put text that depends on an installed font inside the SVG icon. Shapes only, or convert text to paths.
