'use client';

/**
 * TrickTile — one looping <video> with hover-scrub. The video source itself
 * is stubbed; the integration step will wire real trick clips. The poster
 * is a generated CSS gradient so the layout is testable without assets.
 */
import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';

interface TrickTileProps {
  id: string;
  name: string;
  description: string;
  accent?: boolean;
}

const SCRUB_DURATION_FALLBACK = 4.2; // seconds — used when the video has no metadata yet.

export function TrickTile({ id, name, description, accent }: TrickTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovering, setHovering] = useState(false);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const video = videoRef.current;
    if (!video) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const total =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : SCRUB_DURATION_FALLBACK;
    try {
      video.pause();
      video.currentTime = pct * total;
    } catch {
      // Some browsers throw on seeking before metadata is loaded — ignore.
    }
  }, []);

  const onEnter = useCallback(() => {
    setHovering(true);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, []);

  const onLeave = useCallback(() => {
    setHovering(false);
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Autoplay can be blocked — no-op, the poster remains visible.
    });
  }, []);

  return (
    <article
      className={clsx(
        'group relative aspect-square overflow-hidden rounded-xl border border-ink-700/60 bg-ink-900',
        accent && 'md:row-span-2 md:aspect-auto md:min-h-[560px]',
      )}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      data-cursor="link"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: poster(id),
          mixBlendMode: 'screen',
        }}
      />
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        autoPlay
        preload="metadata"
        className={clsx(
          'absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity',
          hovering && 'opacity-100',
        )}
        // No `src` — integration agent will set this. The poster gradient stands in.
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-950/85 via-ink-950/0 p-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] text-ember-400 uppercase">
            {name}
          </p>
          <p className="mt-1 font-sans text-xs text-bone-200">{description}</p>
        </div>
        <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
          {hovering ? 'scrub' : 'loop'}
        </p>
      </div>
    </article>
  );
}

/**
 * Procedural poster — diagonal gradient seeded by the trick id so each tile is
 * visually distinct without needing image assets.
 */
function poster(id: string): string {
  // Simple deterministic hash → hue.
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `radial-gradient(120% 120% at 30% 20%, hsl(${h}, 36%, 22%) 0%, #07070a 70%)`;
}
