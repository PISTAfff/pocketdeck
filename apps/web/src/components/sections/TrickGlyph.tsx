'use client';

/**
 * TrickGlyph, placeholder skateboard illustration for the tricks grid.
 *
 * Previously this dispatched to per-trick motion drawings (arcs, rotation
 * arrows, etc.) but they read as a tangle of lines instead of a recognisable
 * object. Until real trick clips are wired in, every tile shares the same
 * clean side-view skateboard so the grid feels intentional rather than
 * abstract. The `id` prop is kept so callers don't have to change shape —
 * we just ignore it for now.
 *
 * Strokes use `currentColor` so the parent controls intensity (fades from
 * 30% to 55% of bone-50 on hover).
 */
interface TrickGlyphProps {
  /** Trick id. Currently ignored — every tile renders the same skateboard. */
  id?: string;
  className?: string;
}

export function TrickGlyph({ className }: TrickGlyphProps) {
  return <Skateboard className={className} />;
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Skateboard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Ground line — dashed so it reads as a surface, not part of the
          board. Sits slightly below the wheels. */}
      <line
        x1={10}
        y1={92}
        x2={110}
        y2={92}
        {...stroke}
        strokeDasharray="2 4"
        opacity={0.4}
      />

      {/* Deck silhouette: a long bar with upturned kicks at each end. The
          two control points pull the corners up so the ends curve into
          tails instead of stopping flat. */}
      <path
        d="M 10 64
           C 8 56 14 53 22 53
           L 98 53
           C 106 53 112 56 110 64
           C 109 70 102 71 96 70
           L 24 70
           C 18 71 11 70 10 64
           Z"
        fill="currentColor"
        fillOpacity={0.16}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* Top grip-line, hints at the textured top surface of the deck. */}
      <path
        d="M 24 54.5 Q 60 56 96 54.5"
        stroke="currentColor"
        strokeWidth={1}
        strokeOpacity={0.55}
        fill="none"
      />

      {/* Kingpin pillars (the part of the truck that drops from the deck
          underside down to the axle). */}
      <line x1={32} y1={70} x2={32} y2={76} {...stroke} />
      <line x1={88} y1={70} x2={88} y2={76} {...stroke} />

      {/* Axle hangers, the cross-bars the wheels mount to. */}
      <line x1={22} y1={76} x2={42} y2={76} {...stroke} />
      <line x1={78} y1={76} x2={98} y2={76} {...stroke} />

      {/* Wheels — 3/4-style with both wheels per truck visible (front +
          back) so the board reads as a skateboard, not a longboard with
          two wheels. */}
      <ellipse
        cx={26}
        cy={83}
        rx={4.5}
        ry={5.5}
        fill="currentColor"
        fillOpacity={0.35}
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <ellipse
        cx={38}
        cy={83}
        rx={4.5}
        ry={5.5}
        fill="currentColor"
        fillOpacity={0.35}
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <ellipse
        cx={82}
        cy={83}
        rx={4.5}
        ry={5.5}
        fill="currentColor"
        fillOpacity={0.35}
        stroke="currentColor"
        strokeWidth={1.4}
      />
      <ellipse
        cx={94}
        cy={83}
        rx={4.5}
        ry={5.5}
        fill="currentColor"
        fillOpacity={0.35}
        stroke="currentColor"
        strokeWidth={1.4}
      />
    </svg>
  );
}
