import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Anton, Archivo_Black } from 'next/font/google';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { ChromeRoot } from '@/components/layout/ChromeRoot';
import { Preloader } from '@/components/ui/Preloader';
import { PageViewTracker } from '@/components/analytics/PageViewTracker';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  weight: ['400', '500', '600'],
});

// Condensed display face for the big headlines. Anton is industrial and tall;
// it carries the skate / street feel without leaning on a stencil cliche.
const anton = Anton({
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
  weight: ['400'],
});

// Chunky grotesque for sticker badges and trick captions.
const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  variable: '--font-archivo-black',
  display: 'swap',
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'PocketDeck, fingerboard in your pocket',
  description:
    'A 96mm fingerboard skate built for the desk. Configure your deck, wheels, trucks and grip.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'PocketDeck',
    description: 'A 96mm fingerboard skate built for the desk.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PocketDeck',
    description: 'A 96mm fingerboard skate built for the desk.',
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#07070a',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout. Hosts:
 *   - <Preloader />: deterministic full-screen reveal driven by Drei's useProgress
 *     and a minimum display time, so the first paint is composed rather than scrappy.
 *   - <SceneRoot />: persistent fixed-position R3F canvas. Survives route changes
 *     so the deck is never re-instantiated between pages.
 *   - <ChromeRoot />: cursor, smooth-scroll provider, page transitions, nav, footer.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable} ${anton.variable} ${archivoBlack.variable}`}
    >
      <body>
        {/* Skip-to-content for keyboard users (#60). */}
        <a href="#hero" className="skip-link">
          Skip to content
        </a>

        {/* Global SVG filters used by the spray-paint accent text (#54) and
            the brush-stroke nav underline (#52). Defined once at the body
            level so any element can reference them via filter: url(#id). */}
        <svg
          aria-hidden
          width="0"
          height="0"
          style={{ position: 'absolute', left: '-9999px' }}
        >
          <defs>
            {/* Spray-paint edge: turbulence offset adds a soft jittered
                outline to whatever text sits inside the filter region. */}
            <filter id="spray-edge" x="-10%" y="-15%" width="120%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.95"
                numOctaves="2"
                seed="7"
                result="noise"
              />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
            </filter>
          </defs>
        </svg>

        <Preloader />
        <SceneRoot />
        <ChromeRoot>{children}</ChromeRoot>
        <PageViewTracker />
        {/* Film grain overlay, pointer-none, overlay blend, fixed under nav */}
        <div aria-hidden className="grain-overlay" />
      </body>
    </html>
  );
}
