/**
 * Lightweight SVG chart primitives for the analytics panel.
 *
 * No charting library — we have one shape language (rounded rects, soft
 * gradients, jet-mono tick labels) and the data shapes are simple
 * enough that hand-rolling keeps bundle size honest and prevents the
 * library's defaults from fighting our type system.
 */
import type { ReactNode } from 'react';

export interface SeriesPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  series: { name: string; color: string; points: SeriesPoint[] }[];
  height?: number;
  yFormatter?: (n: number) => string;
}

/**
 * Multi-series line chart with a soft area gradient on the first
 * series. Assumes every series shares the same X labels (we render the
 * first series' labels). Renders nothing useful with empty data; the
 * caller decides whether to show an empty state.
 */
export function LineChart({
  series,
  height = 220,
  yFormatter = (n) => String(Math.round(n)),
}: LineChartProps) {
  const W = 800;
  const H = height;
  const padL = 48;
  const padR = 16;
  const padT = 18;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const labels = series[0]?.points.map((p) => p.label) ?? [];
  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const max = Math.max(1, ...allValues);
  // Round the max up so the Y axis ends on a clean number.
  const niceMax = niceCeil(max);

  const xFor = (i: number) =>
    labels.length <= 1
      ? padL + plotW / 2
      : padL + (i / (labels.length - 1)) * plotW;
  const yFor = (v: number) => padT + (1 - v / niceMax) * plotH;

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    (niceMax / ticks) * i,
  );

  // Show at most ~6 x-axis labels to avoid overlap.
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-full w-full"
      preserveAspectRatio="none"
      role="img"
    >
      <defs>
        {series.map((s, i) => (
          <linearGradient
            key={i}
            id={`line-grad-${i}`}
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Y gridlines + ticks */}
      {tickValues.map((v, i) => {
        const y = yFor(v);
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-bone-50/40"
              style={{ font: '10px ui-monospace, monospace' }}
            >
              {yFormatter(v)}
            </text>
          </g>
        );
      })}

      {/* Areas first so lines sit on top */}
      {series.map((s, idx) => {
        if (s.points.length < 2) return null;
        const pts = s.points.map((p, i) => `${xFor(i)},${yFor(p.value)}`);
        const area = `${padL},${padT + plotH} ${pts.join(' ')} ${
          xFor(s.points.length - 1)
        },${padT + plotH}`;
        return idx === 0 ? (
          <polyline
            key={`a-${idx}`}
            points={area}
            fill={`url(#line-grad-${idx})`}
            stroke="none"
          />
        ) : null;
      })}

      {series.map((s, idx) => {
        if (s.points.length === 0) return null;
        const pts = s.points.map((p, i) => `${xFor(i)},${yFor(p.value)}`);
        return (
          <g key={`s-${idx}`}>
            <polyline
              points={pts.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {s.points.map((p, i) => (
              <circle
                key={i}
                cx={xFor(i)}
                cy={yFor(p.value)}
                r={2.5}
                fill={s.color}
              >
                <title>{`${p.label} · ${s.name}: ${yFormatter(p.value)}`}</title>
              </circle>
            ))}
          </g>
        );
      })}

      {/* X axis labels */}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={i}
            x={xFor(i)}
            y={H - 12}
            textAnchor="middle"
            className="fill-bone-50/40"
            style={{ font: '10px ui-monospace, monospace' }}
          >
            {l}
          </text>
        ) : null,
      )}
    </svg>
  );
}

interface BarChartProps {
  data: SeriesPoint[];
  color: string;
  height?: number;
  yFormatter?: (n: number) => string;
}

/**
 * Vertical bar chart with the same gridline/tick treatment as
 * LineChart so the two read as a pair when stacked.
 */
export function BarChart({
  data,
  color,
  height = 220,
  yFormatter = (n) => String(Math.round(n)),
}: BarChartProps) {
  const W = 800;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 18;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = niceCeil(max);

  const bw = plotW / Math.max(1, data.length);
  const barWidth = Math.max(2, Math.min(22, bw * 0.65));

  const ticks = 4;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    (niceMax / ticks) * i,
  );

  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-full w-full"
      preserveAspectRatio="none"
      role="img"
    >
      {tickValues.map((v, i) => {
        const y = padT + (1 - v / niceMax) * plotH;
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-bone-50/40"
              style={{ font: '10px ui-monospace, monospace' }}
            >
              {yFormatter(v)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = padL + bw * (i + 0.5);
        const h = (d.value / niceMax) * plotH;
        const y = padT + plotH - h;
        return (
          <g key={i}>
            <rect
              x={cx - barWidth / 2}
              y={y}
              width={barWidth}
              height={Math.max(0, h)}
              rx={3}
              fill={color}
              opacity={d.value > 0 ? 0.85 : 0.2}
            >
              <title>{`${d.label}: ${yFormatter(d.value)}`}</title>
            </rect>
            {i % labelStep === 0 && (
              <text
                x={cx}
                y={H - 12}
                textAnchor="middle"
                className="fill-bone-50/40"
                style={{ font: '10px ui-monospace, monospace' }}
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * Donut chart for status distribution. Renders nothing useful when the
 * total is zero — caller handles that.
 */
export function DonutChart({
  data,
  size = 220,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = size / 2;
  const stroke = 22;
  const innerR = r - stroke / 2;
  const cx = size / 2;
  const cy = size / 2;

  if (total === 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="block h-full w-full">
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        {centerLabel && (
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            className="fill-bone-50/40"
            style={{ font: '11px ui-monospace, monospace' }}
          >
            {centerLabel}
          </text>
        )}
      </svg>
    );
  }

  let acc = 0;
  // Special case: a single non-zero segment renders as a full ring
  // because an SVG arc from the same start to the same end is a no-op.
  const positives = data.filter((d) => d.value > 0);
  const singleSegment = positives.length === 1 ? positives[0] : null;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="block h-full w-full">
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={stroke}
      />
      {singleSegment ? (
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke={singleSegment.color}
          strokeWidth={stroke}
        >
          <title>{`${singleSegment.label}: ${singleSegment.value}`}</title>
        </circle>
      ) : (
        data.map((d, i) => {
          if (d.value <= 0) return null;
          const frac = d.value / total;
          const start = acc;
          acc += frac;
          // SVG arc starts at 3 o'clock; offset so segments start at 12.
          const a0 = (start * 2 - 0.5) * Math.PI;
          const a1 = (acc * 2 - 0.5) * Math.PI;
          const large = frac > 0.5 ? 1 : 0;
          const x0 = cx + innerR * Math.cos(a0);
          const y0 = cy + innerR * Math.sin(a0);
          const x1 = cx + innerR * Math.cos(a1);
          const y1 = cy + innerR * Math.sin(a1);
          return (
            <path
              key={i}
              d={`M ${x0} ${y0} A ${innerR} ${innerR} 0 ${large} 1 ${x1} ${y1}`}
              stroke={d.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </path>
          );
        })
      )}
      {centerValue && (
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-bone-50"
          style={{ font: '700 22px ui-sans-serif, system-ui' }}
        >
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-bone-50/50"
          style={{
            font: '10px ui-monospace, monospace',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
          }}
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

interface HBarsProps {
  data: { label: string; value: number; sub?: string }[];
  color: string;
  formatter?: (n: number) => string;
}

/**
 * Horizontal bar list, used for top pages / top configurations. Each
 * row keeps its bar in proportion to the leader so the eye can scan.
 */
export function HBars({
  data,
  color,
  formatter = (n) => String(Math.round(n)),
}: HBarsProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <li key={i} className="group">
            <div className="flex items-baseline justify-between gap-3 pb-1">
              <div className="min-w-0">
                <p className="truncate font-mono text-[11px] tracking-wider text-bone-200 uppercase">
                  {d.label}
                </p>
                {d.sub && (
                  <p className="font-mono text-[10px] text-bone-50/40">
                    {d.sub}
                  </p>
                )}
              </div>
              <p className="shrink-0 font-bold text-bone-50">
                {formatter(d.value)}
              </p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-bone-50/10 bg-white/[0.03] p-5">
      <header className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] tracking-[0.24em] text-bone-50/50 uppercase">
          {title}
        </p>
        {hint && (
          <p className="font-mono text-[10px] tracking-[0.18em] text-bone-50/40 uppercase">
            {hint}
          </p>
        )}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Round a max up to a "nice" number so axis ticks land cleanly. */
function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / pow;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}
