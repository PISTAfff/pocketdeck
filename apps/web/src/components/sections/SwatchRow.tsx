'use client';

/**
 * SwatchRow, generic axis selector for the configurator.
 *
 * Layout per row:
 *   - small caps axis label on top
 *   - swatch buttons in a flex row (56 x 56)
 *   - the currently selected variant name with its price modifier below
 *
 * Each swatch is a real radio with a visible focus ring and a checkmark when
 * active.
 */
import clsx from 'clsx';
import type { VariantOption } from '@pocketdeck/types';

interface SwatchRowProps<T extends string> {
  axis: string;
  options: VariantOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

export function SwatchRow<T extends string>({
  axis,
  options,
  value,
  onChange,
}: SwatchRowProps<T>) {
  const active = options.find((o) => o.value === value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-xs tracking-[0.32em] text-bone-200 uppercase">
          {axis}
        </h3>
        <span className="font-mono text-[11px] tracking-[0.16em] text-bone-300">
          {options.length} options
        </span>
      </div>

      <div role="radiogroup" aria-label={axis} className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={opt.label}
              onClick={() => onChange(opt.value)}
              data-cursor="link"
              className={clsx(
                'group relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-200',
                'outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
                isActive
                  ? 'ring-2 ring-ember-500 ring-offset-2 ring-offset-ink-950'
                  : 'ring-1 ring-bone-50/15 hover:ring-bone-50/40',
              )}
              style={{
                background: opt.swatchHex ?? 'var(--color-ink-800)',
              }}
              title={opt.label}
            >
              {!opt.swatchHex && opt.thumbnail && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={opt.thumbnail}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              )}
              {!opt.swatchHex && !opt.thumbnail && (
                <span className="font-mono text-[10px] tracking-widest text-bone-50 uppercase">
                  {opt.label.slice(0, 2)}
                </span>
              )}
              {isActive && (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember-500 text-ink-950"
                >
                  <svg
                    viewBox="0 0 12 12"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 6.5 L5 9.5 L10 3" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[12px] tracking-[0.16em] text-bone-100">
        <span className="uppercase">{active?.label ?? value}</span>
        {active?.priceModifier ? (
          <span className="ml-2 text-ember-400">
            +{active.priceModifier} EGP
          </span>
        ) : (
          <span className="ml-2 text-bone-500/70">included</span>
        )}
      </p>
    </div>
  );
}
