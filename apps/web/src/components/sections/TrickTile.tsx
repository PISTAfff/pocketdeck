'use client';

/**
 * TrickTile, one looping video with hover-scrub plus a chunky street label
 * stack. Each trick gets:
 *   - a big number (01..N) set in Archivo Black
 *   - the trick name in the condensed display face
 *   - a unique SVG glyph that visualizes its motion (board path, rotation
 *     arrow, grind rail) so the tiles are distinguishable even without real
 *     clip footage
 *
 * Hover affordances stay: centered play icon (idle), scrub bar (active),
 * one-shot "Drag to scrub" hint on first hover per session.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { TrickGlyph } from './TrickGlyph';

interface TrickTileProps {
  id: string;
  number: number;
  name: string;
  description: string;
  src?: string;
}

const SCRUB_DURATION_FALLBACK = 4.2;
const FIRST_HOVER_HINT_KEY = 'pocketdeck:tricks-hint';

export function TrickTile({ id, number, name, description, src }: TrickTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [scrubPct, setScrubPct] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.sessionStorage.getItem(FIRST_HOVER_HINT_KEY)) {
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
      // Some browsers throw on seeking before metadata is loaded.
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
    void video.play().catch(() => {});
  }, []);

  return (
    <article
      className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-bone-50/10 bg-ink-900"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      data-cursor="link"
      aria-label={`${name}, hover and drag horizontally to scrub the clip`}
    >
      {/* Background gradient seeded by the trick id */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: poster(id) }}
      />

      {/* Subtle halftone dot field overlay */}
      <div
        aria-hidden
        className="halftone absolute inset-0 opacity-25 [mask-image:radial-gradient(110%_85%_at_50%_50%,#000,transparent_75%)]"
      />

      {/* Trick motion glyph */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <TrickGlyph
          id={id}
          className="h-[70%] w-[70%] text-bone-50/30 transition-transform duration-700 group-hover:scale-105 group-hover:text-bone-50/55"
        />
      </div>

      {/* Optional <video> when a real clip is wired in */}
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

      {/* Sticker number, top-right corner, slightly rotated */}
      <div className="absolute top-4 right-4 z-10">
        <span className="sticker sticker-ember">
          {String(number).padStart(2, '0')}
        </span>
      </div>

      {/* Centered play icon (idle) */}
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          hovering ? 'opacity-0' : 'opacity-100',
        )}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950/55 ring-1 ring-bone-50/15 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            className="translate-x-[1px] text-bone-50"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>

      {/* First-hover hint */}
      {showHint && hovering && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink-950/90 px-4 py-1.5 font-mono text-[10px] tracking-[0.28em] text-bone-50 uppercase ring-1 ring-bone-50/10 backdrop-blur"
        >
          Drag to scrub
        </div>
      )}

      {/* Label stack, bottom-left, oversized */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/0 p-5 pt-12 pb-7">
        <div>
          <h3
            className="display-headline leading-[0.9] text-bone-50"
            style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)' }}
          >
            {name}
          </h3>
          <p className="mt-1 max-w-[18ch] font-sans text-sm text-bone-100">
            {description}
          </p>
        </div>
        <p className="font-mono text-[10px] tracking-[0.32em] text-bone-200 uppercase tabular-nums">
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
