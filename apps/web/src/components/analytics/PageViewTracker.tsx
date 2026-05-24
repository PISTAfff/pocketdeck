'use client';

/**
 * Fires one /admin/track ping per pathname change. Visitor identity is a
 * random id persisted in localStorage so unique-visitor counts can be
 * computed server-side without storing IPs. Failures are swallowed by
 * the API client.
 *
 * Mounted once in the root layout; sits invisibly above the canvas.
 */
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/api';

const VISITOR_KEY = 'pocketdeck:visitorId';

function getVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    // Private mode etc. — generate an ephemeral id; the server will
    // still record a view, it just won't dedupe across sessions.
    return Math.random().toString(36).slice(2);
  }
}

export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // Skip admin paths so dashboard browsing doesn't pollute the
    // numbers the dashboard itself reports.
    if (pathname.startsWith('/admin')) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const visitorId = getVisitorId();
    const referrer =
      typeof document !== 'undefined' ? document.referrer || undefined : undefined;
    void trackPageView({ path: pathname, visitorId, referrer });
  }, [pathname]);

  return null;
}
