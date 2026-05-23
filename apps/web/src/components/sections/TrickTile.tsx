'use client';

/**
 * TrickTile, one looping <video> with hover-scrub.
 *
 * Affordances added in the polish pass:
 *   - centered play icon on idle; tile shows "Drag to scrub" tooltip on first
 *     hover so the interaction is discoverable
 *   - scrub progress bar pinned to the bottom that fills with pointer x
 *   - opaque label backdrop so the OLLIE / KICKFLIP / etc. text always reads
 *     against the gradient
 *
 * Real clip URLs can be passed via `src`; without one the gradient poster
 * stands in.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface TrickTileProps {
  id: string;
  name: string;
  description: string;
  src?: string;
  /** Optional taller tile in the grid. */
  accent?: boolean;
}

const SCRUB_DURATION_FALLBACK = 4.2;
const FIRST_HOVER_HINT_KEY = 'pocketdeck:tricks-hint';

export function TrickTile({ id, name, description, src, accent }: TrickTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [scrubPct, setScrubPct] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.sessionStorage.getItem(FIRST_HOVER_HINT_KEY)) {
      // Show the hint only on the very first hover, repo-wide.
      setShowHint(true);
    }
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const video = videoRef.current;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setScrubPct(pct);
    if (!video) return;
    const total =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : SCRUB_DURATION_FALLBACK;
    try {
      video.pause();
      video.currentTime = pct * total;
    } catch {
      // Some browsers throw on seeking before metadata is loaded, ignore.
    }
  }, []);

  const onEnter = useCallback(() => {
    setHovering(true);
    if (showHint && typeof window !== 'undefined') {
      window.sessionStorage.setItem(FIRST_HOVER_HINT_KEY, '1');
      window.setTimeout(() => setShowHint(false), 1600);
    }
    const video = videoRef.current;
    if (!video) return;
    video.pause();
  }, [showHint]);

  const onLeave = useCallback(() => {
    setHovering(false);
    setShowHint(false);
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Autoplay can be blocked, no-op, the poster remains visible.
    });
  }, []);

  return (
    <article
      className={clsx(
        'group relative overflow-hidden rounded-xl border border-bone-50/10 bg-ink-900',
        accent ? 'md:col-span-2' : '',
        // Equal-height tiles via fixed aspect on every card.
        'aspect-[4/5]',
      )}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      data-cursor="link"
      aria-label={`${name}, hover and drag horizontally to scrub the clip`}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: poster(id) }}
      />
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        autoPlay
        preload="metadata"
        src={src}
        className={clsx(
          'absolute inset-0 h-full w-full object-cover transition-opacity',
          src ? 'opacity-95' : 'opacity-0',
          hovering && 'opacity-100',
        )}
      />

      {/* Centered play icon (idle) */}
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          hovering ? 'opacity-0' : 'opacity-100',
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950/55 backdrop-blur-md ring-1 ring-bone-50/15 transition-transform duration-300 group-hover:scale-110">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-bone-50 translate-x-[1px]">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>

      {/* First-hover hint */}
      {showHint && hovering && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/85 px-4 py-1.5 font-mono text-[10px] tracking-[0.28em] text-bone-50 uppercase ring-1 ring-bone-50/10 backdrop-blur"
        >
          Drag to scrub
        </div>
      )}

      {/* Label block with opaque backdrop so contrast is always AA+ */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/0 p-5 pb-7">
        <div>
          <p className="font-mono text-xs font-medium tracking-[0.32em] text-ember-400 uppercase">
            {name}
          </p>
          <p className="mt-1 font-sans text-sm text-bone-100">{description}</p>
        </div>
        <p className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase tabular-nums">
          {hovering ? `${Math.round(scrubPct * 100)}%` : 'loop'}
        </p>
      </div>

      {/* Scrub bar */}
      <div
        aria-hidden
        className={clsx(
          'absolute right-0 bottom-0 left-0 h-[3px] bg-bone-50/5 transition-opacity duration-300',
          hovering ? 'opacity-100' : 'opacity-0',
        )}
      >
        <div
          className="h-full bg-ember-500"
          style={{ width: `${scrubPct * 100}%` }}
        />
      </div>
    </article>
  );
}

function poster(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 360;
  }
  return `radial-gradient(120% 120% at 30% 20%, hsl(${h}, 38%, 24%) 0%, #07070a 70%)`;
}
