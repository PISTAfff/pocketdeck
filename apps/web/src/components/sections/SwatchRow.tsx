'use client';

/**
 * SwatchRow — generic axis selector for the configurator. Each swatch is
 * accessible via keyboard (radiogroup) and shows the swatch hex or thumbnail.
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
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-xs tracking-[0.32em] text-bone-300 uppercase">
          {axis}
        </h3>
        <p className="font-mono text-xs tracking-[0.24em] text-bone-100 uppercase">
          {active?.label ?? value}
          {active?.priceModifier
            ? ` · +${active.priceModifier} EGP`
            : ''}
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label={axis}
        className="flex flex-wrap gap-3"
      >
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
                'group relative h-14 w-14 rounded-full border transition-all',
                'flex items-center justify-center',
                isActive
                  ? 'border-ember-500 ring-2 ring-ember-500/40 ring-offset-2 ring-offset-ink-950'
                  : 'border-ink-700/60 hover:border-bone-200/80',
              )}
              style={{
                background: opt.swatchHex ?? 'var(--color-ink-800)',
              }}
              title={opt.label}
            >
              {!opt.swatchHex && opt.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
