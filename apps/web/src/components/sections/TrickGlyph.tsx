'use client';

/**
 * TrickGlyph, per-trick motion illustrations.
 *
 * Each glyph is a simple SVG that visually telegraphs the trick: the path
 * the board takes, a rotation arrow, or the rail line for a grind. They
 * make every tile distinguishable at a glance even without real clip footage.
 *
 * The strokes use `currentColor` so the parent decides intensity (we fade
 * them up on hover from 30% to 55% of bone-50).
 */
interface TrickGlyphProps {
  id: string;
  className?: string;
}

export function TrickGlyph({ id, className }: TrickGlyphProps) {
  switch (id) {
    case 'ollie':
      return <Ollie className={className} />;
    case 'kickflip':
      return <Kickflip className={className} />;
    case 'heelflip':
      return <Heelflip className={className} />;
    case 'shuvit':
      return <Shuvit className={className} />;
    case 'manual':
      return <Manual className={className} />;
    case 'grind':
      return <Grind className={className} />;
    default:
      return null;
  }
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function Board({ x = 30, y = 80, w = 60, rot = 0 }: { x?: number; y?: number; w?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={0} y={-3} width={w} height={6} rx={3} {...stroke} />
      <circle cx={8} cy={6} r={2.5} {...stroke} />
      <circle cx={w - 8} cy={6} r={2.5} {...stroke} />
    </g>
  );
}

function Ollie({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      {/* Arc trajectory */}
      <path d="M 14 92 Q 60 14 106 92" {...stroke} strokeDasharray="3 5" />
      {/* Board at apex */}
      <Board x={45} y={36} rot={-3} />
      {/* Take-off and landing markers */}
      <line x1={14} y1={96} x2={14} y2={104} {...stroke} />
      <line x1={106} y1={96} x2={106} y2={104} {...stroke} />
    </Frame>
  );
}

function Kickflip({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M 12 92 Q 60 18 108 92" {...stroke} strokeDasharray="3 5" />
      {/* Flipping board frames */}
      <Board x={42} y={38} rot={-15} />
      <Board x={42} y={56} rot={180} />
      <Board x={42} y={74} rot={-345} />
      {/* Rotation arrow */}
      <path d="M 90 22 Q 100 30 95 42" {...stroke} />
      <polygon points="90,42 95,48 99,40" fill="currentColor" />
    </Frame>
  );
}

function Heelflip({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      <path d="M 12 92 Q 60 18 108 92" {...stroke} strokeDasharray="3 5" />
      <Board x={42} y={40} rot={15} />
      <Board x={42} y={58} rot={-160} />
      <Board x={42} y={76} rot={345} />
      <path d="M 30 22 Q 20 30 25 42" {...stroke} />
      <polygon points="30,42 25,48 21,40" fill="currentColor" />
    </Frame>
  );
}

function Shuvit({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      {/* Horizontal rotation viewed from above: ellipse with arrowhead */}
      <ellipse cx={60} cy={60} rx={40} ry={22} {...stroke} strokeDasharray="3 5" />
      <Board x={30} y={60} rot={0} />
      <Board x={28} y={58} rot={90} w={20} />
      <polygon points="100,60 92,55 92,65" fill="currentColor" />
    </Frame>
  );
}

function Manual({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      {/* Tilted board on two wheels */}
      <line x1={18} y1={90} x2={104} y2={90} {...stroke} strokeDasharray="3 4" />
      <g transform="translate(34 70) rotate(-22)">
        <rect x={0} y={-3} width={56} height={6} rx={3} {...stroke} />
        <circle cx={48} cy={6} r={3.4} {...stroke} />
      </g>
      {/* Wobble arc */}
      <path d="M 30 56 Q 60 50 90 60" {...stroke} strokeDasharray="2 4" />
    </Frame>
  );
}

function Grind({ className }: { className?: string }) {
  return (
    <Frame className={className}>
      {/* Rail line */}
      <line x1={10} y1={84} x2={110} y2={84} {...stroke} />
      {/* Board on rail at an angle */}
      <g transform="translate(34 68) rotate(-4)">
        <rect x={0} y={-3} width={52} height={6} rx={3} {...stroke} />
        <circle cx={8} cy={6} r={2.5} {...stroke} />
        <circle cx={44} cy={6} r={2.5} {...stroke} />
      </g>
      {/* Spark marks */}
      <path d="M 92 84 l 6 -8 M 96 84 l 4 -10 M 100 84 l 6 -6" {...stroke} />
    </Frame>
  );
}
