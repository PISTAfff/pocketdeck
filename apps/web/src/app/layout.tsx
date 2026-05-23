import type { Metadata, Viewport } from 'next';
import { SceneRoot } from '@/components/scene/SceneRoot';
import { ChromeRoot } from '@/components/layout/ChromeRoot';
import './globals.css';

export const metadata: Metadata = {
  title: 'PocketDeck — fingerboard in your pocket',
  description:
    'A 96mm fingerboard skate built for the desk. Configure your deck, wheels, trucks and grip.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'PocketDeck',
    description: 'A 96mm fingerboard skate built for the desk.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07070a',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Root layout.
 *
 * <SceneRoot /> is the persistent fixed-position R3F canvas. It must NOT
 * unmount when routes change — that's why it lives here and not in a page.
 *
 * <ChromeRoot /> wraps {children} with the cursor, the Lenis scroll provider,
 * page transitions, and any other persistent UI chrome.
 *
 * Pages read scene state and drive section changes via the Zustand store
 * exposed by SceneRoot (see apps/web/src/store/scene.ts).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SceneRoot />
        <ChromeRoot>{children}</ChromeRoot>
      </body>
    </html>
  );
}
