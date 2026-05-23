import type { Metadata, Viewport } from 'next';
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
 * Root layout. Hosts:
 *   - the persistent <SceneRoot /> WebGL canvas (filled in by Phase 2B)
 *   - the persistent <ChromeRoot /> (cursor, scroll provider, transitions; Phase 2C)
 *   - {children} — page content that may unmount/remount on route change
 *
 * The canvas and chrome MUST NOT unmount when routes change. Pages can read
 * scene state via the Zustand store exposed by Phase 2B.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Phase 2B will replace this placeholder with a real R3F canvas. */}
        <div className="scene-root" aria-hidden />
        {/* Phase 2C will wrap children in ChromeRoot (cursor, lenis provider, page transitions). */}
        <div className="page-root">{children}</div>
      </body>
    </html>
  );
}
