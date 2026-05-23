'use client';

/**
 * TrickTile, one looping clip with hover-scrub.
 *
 * - Hover scales the card 1.02 and applies an ember glow at ~20% (#33).
 * - The `<video>` autoplays muted in a loop (#33) when not being scrubbed.
 * - Background tint is bucket-based: flip / transition / grind, so similar
 *   tricks share visual territory (#36).
 * - Play indicator (idle state) is a 56 px circle, outlined white, that
 *   fills ember on hover (#35).
 * - The bottom-right LOOP text is replaced by a small loop icon (#34).
 * - Card title set in the display face at the full weight; description gets
 *   a step-smaller font and a lighter bone tone (#37).
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

type Bucket = 'flip' | 'transition' | 'grind';

const FLIP_IDS = new Set(['kickflip', 'heelflip']);
const GRIND_IDS = new Set(['grind']);

function bucketFor(id: string): Bucket {
  if (FLIP_IDS.has(id)) return 'flip';
  if (GRIND_IDS.has(id)) return 'grind';
  return 'transition';
}

const BUCKET_BG: Record<Bucket, string> = {
  // Sky-blue for transition / basics (ollie, manual, shuvit).
  transition: 'radial-gradient(120% 120% at 30% 20%, #1f3a52 0%, #07070a 70%)',
  // Warm wood / maple amber for flips.
  flip: 'radial-gradient(120% 120% at 30% 20%, #523a1f 0%, #07070a 70%)',
  // Concrete grey for grinds.
  grind: 'radial-gradient(120% 120% at 30% 20%, #2a2a2e 0%, #07070a 70%)',
};

const SCRUB_DURATION_FALLBACK = 4.2;
const FIRST_HOVER_HINT_KEY = 'pocketdeck:tricks-hint';

export function TrickTile({ id, number, name, description, src }: TrickTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovering, setHovering] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPct, setScrubPct] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const bucket = bucketFor(id);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.sessionStorage.getItem(FIRST_HOVER_HINT_KEY)) {
      setShowHint(true);
    }
  }, []);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setScrubPct(pct);
    // Only treat as "scrubbing" once the user actually moves horizontally.
    if (e.movementX !== 0) setScrubbing(true);
    const video = videoRef.current;
    if (!video || !scrubbing) return;
    const total =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : SCRUB_DURATION_FALLBACK;
    try {
      video.pause();
      video.currentTime = pct * total;
    } catch {
      // Seeking before metadata can throw on some browsers, ignore.
    }
  }, [scrubbing]);

  const onEnter = useCallback(() => {
    setHovering(true);
    if (showHint && typeof window !== 'undefined') {
      window.sessionStorage.setItem(FIRST_HOVER_HINT_KEY, '1');
      window.setTimeout(() => setShowHint(false), 1600);
    }
    // Autoplay the clip on hover (#33).
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      // Autoplay can be blocked; the gradient + glyph stand in.
    });
  }, [showHint]);

  const onLeave = useCallback(() => {
    setHovering(false);
    setScrubbing(false);
    setShowHint(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      /* noop */
    }
  }, []);

  return (
    <article
      className={clsx(
        'group relative aspect-[4/5] overflow-hidden rounded-xl border border-bone-50/10 bg-ink-900 transition-transform duration-300',
        // #33: 1.02 hover scale + soft ember outer glow at ~20% alpha.
        'hover:scale-[1.02] hover:shadow-[0_22px_60px_-18px_rgba(255,91,20,0.35),0_0_0_1px_rgba(255,91,20,0.18)]',
      )}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerMove={onMove}
      data-cursor="link"
      aria-label={`${name}, hover and drag horizontally to scrub the clip`}
    >
      {/* Bucket-tinted gradient background (#36). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: BUCKET_BG[bucket] }}
      />

      {/* Subtle halftone dot field */}
      <div
        aria-hidden
        className="halftone absolute inset-0 opacity-25 [mask-image:radial-gradient(110%_85%_at_50%_50%,#000,transparent_75%)]"
      />

      {/* Motion glyph */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <TrickGlyph
          id={id}
          className="h-[70%] w-[70%] text-bone-50/30 transition-transform duration-700 group-hover:scale-105 group-hover:text-bone-50/55"
        />
      </div>

      {/* Video, only visible when hovering / present */}
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        preload="metadata"
        src={src}
        className={clsx(
          'absolute inset-0 h-full w-full object-cover transition-opacity',
          src && hovering ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Sticker number, top-right corner, slightly rotated */}
      <div className="absolute top-4 right-4 z-10">
        <span className="sticker sticker-ember">
          {String(number).padStart(2, '0')}
        </span>
      </div>

      {/* Play indicator (idle), 56 px diameter, white outline, fills ember
          on hover (#35). */}
      <div
        aria-hidden
        className={clsx(
          'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300',
          hovering ? 'opacity-0' : 'opacity-100',
        )}
      >
        <span
          className={clsx(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 transition-all duration-300',
            'border-bone-50 bg-transparent',
            'group-hover:border-ember-500 group-hover:bg-ember-500 group-hover:scale-110',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="currentColor"
            className="translate-x-[1px] text-bone-50 group-hover:text-ink-950"
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

      {/* Label stack (#37): title at the full display weight, description
          shrunk one step and lightened. */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/0 p-5 pt-12 pb-7">
        <div>
          <h3
            className="display-headline leading-[0.9] text-bone-50"
            style={{
              fontSize: 'clamp(1.6rem, 2.8vw, 2.5rem)',
              fontWeight: 600,
            }}
          >
            {name}
          </h3>
          <p
            className="mt-1 max-w-[18ch] font-sans text-bone-200"
            style={{
              fontSize: '0.8125rem', // step smaller
              lineHeight: 'var(--leading-body)',
            }}
          >
            {description}
          </p>
        </div>
        {/* #34: loop icon instead of "loop" text. Aria-hidden because the
            scrub state is announced via the scrub-bar. */}
        <span
          aria-hidden
          className="flex items-center text-bone-300"
          title={scrubbing ? `${Math.round(scrubPct * 100)}%` : 'Looping'}
        >
          {scrubbing ? (
            <span className="font-mono text-[10px] tracking-[0.32em] text-bone-200 uppercase tabular-nums">
              {String(Math.round(scrubPct * 100)).padStart(2, '0')}%
            </span>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          )}
        </span>
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
