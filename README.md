# PocketDeck

A premium, animation-heavy product showcase site for a fictional 96mm
fingerboard skate. Built as a portfolio piece in the spirit of
[lusion.co](https://lusion.co) and [oryzo.ai](https://oryzo.ai), heavy on
scroll-driven 3D, kinetic type, custom cursor work, and a configurator that
re-textures the live model in real time.

![demo](docs/demo.mp4)

---

## Stack

| Layer       | Choice                                                      |
| ----------- | ----------------------------------------------------------- |
| Framework   | **Next.js 16** (App Router, Turbopack, React 19)            |
| Styling     | **Tailwind CSS 4** (CSS-first `@theme` config)              |
| 3D          | **three.js 0.184**, **@react-three/fiber 9**, **drei 10**   |
| Effects     | **@react-three/postprocessing 3** (Bloom · Vignette · CA)   |
| Motion      | **Framer Motion 12** + **GSAP 3** (ScrollTrigger)           |
| Scroll      | **Lenis 1.3** (smooth scroll, drives the GSAP ticker)       |
| State       | **Zustand 5** (scene store + UI store)                      |
| HTTP client | **Axios 1**                                                 |
| API         | **Express 5** + **Mongoose 9** + **Joi 18** + **tsx**       |
| Types       | **TypeScript 5.9**, shared package consumed by both apps   |
| Tooling     | **pnpm workspaces**, ESLint 9 (flat), Prettier 3            |

> Notes on majors. `mongoose@9` and `joi@18` are the latest stable. If you
> need to pin to a previous major on a host that hasn't upgraded yet, change
> the `apps/api/package.json` entry and run `pnpm install`, both have minimal
> public-API changes from `mongoose@8` / `joi@17`.

---

## Layout

```
.
├── apps
│   ├── api                 # Express + Mongoose + Joi (tsx for dev & prod)
│   │   └── src
│   │       ├── app.ts             # createApp(), middleware + routes
│   │       ├── index.ts           # entry, connects Mongo + listens
│   │       ├── lib                # env, db, errors
│   │       ├── middleware         # validate · error · rateLimit
│   │       ├── models             # Product · Order · Subscriber
│   │       ├── routes             # health · products · orders · subscribers
│   │       ├── schemas            # Joi schemas
│   │       └── seed               # data.ts + run.ts
│   └── web                 # Next.js 16, single-page experience
│       └── src
│           ├── app                # layout + page (App Router)
│           ├── components
│           │   ├── layout         # Nav · Footer · ChromeRoot
│           │   ├── scene          # SceneRoot · Deck · Lighting · Effects · SceneCamera
│           │   ├── sections       # Hero · Manifesto · Anatomy · Configurator · Tricks · Order
│           │   └── ui             # Preloader · CustomCursor · MagneticButton · SplitText · PageTransition
│           ├── hooks              # useLenis · useMagnetic · useScrollTrigger · useSceneController
│           ├── lib                # api.ts (Axios) · scene/keyframes · scene/materials
│           └── store              # scene.ts (Zustand) · configurator.ts
├── packages
│   └── types               # @pocketdeck/types, shared TS surface
├── CONTRACT.md             # authoritative HTTP contract, read this first
├── README.md               # you are here
└── pnpm-workspace.yaml
```

---

## Quick start

### Prerequisites

- **Node** ≥ 20 (the repo was built on Node 24)
- **pnpm** ≥ 10
- **MongoDB** ≥ 6 (optional in dev, the API tolerates a missing connection
  and still serves `/api/health`; the configurator + order flow need it)

### Install

```bash
pnpm install
```

### Run both apps

From the repo root:

```bash
pnpm dev
```

That starts **both** apps in parallel:

- `apps/web` on http://localhost:3000
- `apps/api` on http://localhost:4000

The web app dev-proxies `/api/*` → `http://localhost:4000/api/*`, so all
browser requests hit a same-origin URL.

### Seed the catalog

After Mongo is up:

```bash
pnpm seed
```

The seed builds the full **4×5×3×3 = 180 SKUs**, 25 stock each, and upserts
the `pocketdeck` product document. Premium decks (`gold-leaf`, `circuit`)
carry a +75 EGP modifier; everything else is at the base 350 EGP.

### Single-app commands

```bash
pnpm dev:web                       # apps/web only
pnpm dev:api                       # apps/api only
pnpm --filter @pocketdeck/web build
pnpm --filter @pocketdeck/api typecheck
pnpm --filter @pocketdeck/api lint
```

---

## Environment

Copy the examples and adjust:

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

| Var                       | Default                                       | Used by   |
| ------------------------- | --------------------------------------------- | --------- |
| `NEXT_PUBLIC_API_ORIGIN`  | `http://localhost:4000`                       | web (dev proxy target) |
| `PORT`                    | `4000`                                        | api       |
| `NODE_ENV`                | `development`                                 | api       |
| `WEB_ORIGIN`              | `http://localhost:3000`                       | api (CORS) |
| `MONGODB_URI`             | `mongodb://127.0.0.1:27017/pocketdeck`        | api       |
| `RATE_LIMIT_MAX`          | `10` (req / window / IP, POST routes only)    | api       |
| `RATE_LIMIT_WINDOW_MS`    | `60000`                                       | api       |

---

## Architecture (the short version)

### One canvas, many sections

The site is a single Next.js route. Sections live as siblings under `app/page.tsx`
and the **WebGL canvas** is mounted once in `app/layout.tsx` so it survives
client navigations (none today, but designed for it). The DOM sits in a
`.page-root` overlay above the fixed-position canvas. Sections register their
own `IntersectionObserver` and call `setActiveSection(id)` into the Zustand
**scene store**, which the camera + deck pose subscribe to.

### Lenis + GSAP + the scene store

`useLenis` runs once on mount: it constructs a Lenis instance, kicks it from
the GSAP ticker (so both run on the same RAF clock), forwards normalized
scroll progress `0..1` into `scene.scrollProgress`, and registers
ScrollTrigger. Section keyframes in `lib/scene/keyframes.ts` interpolate
camera + deck pose against that progress. The deck does:

- Hero: idle float + slow Y spin
- Manifesto: continuous barrel roll on Z
- Anatomy: exploded-view offset on `exploded === true`
- Configurator: pulled-in turntable, FOV narrowed to 28
- Tricks: kickflip + shuvit combo on a 2s loop
- Order: settles to centered, slight tilt

### Configurator → scene store → materials

`ConfiguratorSection` fetches `/api/products/pocketdeck` once, renders the
four variant axes as `<SwatchRow />`s. Each click hits
`useSceneStore.setDeck/setWheel/setTruck/setGrip(value)`. The deck's
material props read from the store via Zustand selectors and re-color
synchronously on the next R3F frame, there's no waiting on an API round-trip
to see the change.

Price is computed client-side from `product.basePriceEGP + selectedDeck.priceModifier`,
and the server recomputes the same total when the order POSTs, the request
deliberately doesn't carry a `total` field.

### Validation, once on each side, same rules

`@pocketdeck/types` defines `ConfigurationSelection`, `CreateOrderRequest`,
governorate / variant unions, etc. Both the Joi schema (server) and the
client form derive their constraints from the same union literals.
When the server rejects with `422`, `errors[].field` uses dot notation
(`customer.phone`) that `OrderSection` maps directly onto inputs.

### Preloader

`apps/web/src/components/ui/Preloader.tsx` subscribes to Drei's `useProgress`
so any future glTF or texture work shows real progress. Today the scene is
procedural so progress is effectively instant, we enforce a minimum
**1.2s display window** so the brand mark has a moment to land, then fade.

---

## Performance

- `dpr` capped at `[1, 1.5]`, `powerPreference: 'high-performance'`.
- `optimizePackageImports` covers `@react-three/drei`, `@react-three/fiber`,
  `framer-motion`, `gsap` so production bundles only pull what's referenced.
- `transpilePackages: ['three']` keeps the three.js ESM imports tree-shakable.
- Fonts: Inter + JetBrains Mono via `next/font/google` (self-hosted by Next,
  `display: swap`, zero layout shift, preloaded by Next).
- Single static route, Turbopack pre-renders at build time.
- No images today; if you add them later, prefer Next's `<Image />` with the
  optimizer (sharp is already in the dep tree).

---

## Demo clip

`docs/demo.mp4` is a placeholder. To record a real one:

```bash
pnpm dev
# in another shell:
# record http://localhost:3000 with the OS screen-recorder for ~20s,
# scrolling slowly through every section. Trim and drop into docs/demo.mp4.
```

---

## Roadmap / hooks left for later

- Drop real fingerboard trick clips into `apps/web/public/tricks/*.mp4` and
  the `<TrickTile />` will pick them up.
- The deck's graphic textures are hex-only, wire a real graphic by
  replacing the `accent` color in `lib/scene/materials.ts` with a texture
  loaded via `useTexture` and assigning it as the deck's `map`.
- `<PageTransition />` is exported but unmounted (single route). When a
  second route is added, wrap children in it inside `ChromeRoot`.
- The order flow is one-quantity. The Joi schema already allows 1..5;
  flip the configurator UI to expose it.

---

## License

Portfolio project. MIT.
