import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { ChromeRoot } from '@/components/layout/ChromeRoot';
import { Preloader } from '@/components/ui/Preloader';
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
      className={`${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        <Preloader />
        <SceneRoot />
        <ChromeRoot>{children}</ChromeRoot>
      </body>
    </html>
  );
}
