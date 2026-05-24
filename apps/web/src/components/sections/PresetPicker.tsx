'use client';

/**
 * PresetPicker, curated quick-pick combinations for the configurator.
 *
 * Each preset sets all four axes at once via the scene store. Each card
 * shows the preset name, vibe blurb, and the four swatch colors as a
 * horizontal stripe (deck/wheel/truck/grip) so the user reads the build
 * at a glance without parsing axis labels.
 *
 * Mobile: scroll-snap horizontal row so all five presets stay one line.
 * Desktop: 5-column flush grid.
 */
import type { ConfigurationSelection } from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';

interface Preset {
  id: string;
  label: string;
  vibe: string;
  selection: ConfigurationSelection;
  swatches: [string, string, string, string]; // deck, wheel, truck, grip
}

const PRESETS: Preset[] = [
  {
    id: 'street',
    label: 'Street',
    vibe: 'Stealth grit',
    selection: { deck: 'noir', wheel: 'bone', truck: 'silver', grip: 'classic' },
    swatches: ['#0b0b0d', '#efe6d6', '#bcc0c5', '#6e6e76'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    vibe: 'Heat + chrome',
    selection: { deck: 'sunburst', wheel: 'ember', truck: 'rose-gold', grip: 'tiger' },
    swatches: ['#f4a93a', '#d94a2b', '#b76e79', '#f59e0b'],
  },
  {
    id: 'lab',
    label: 'Lab',
    vibe: 'Circuit + topo',
    selection: { deck: 'circuit', wheel: 'chrome', truck: 'silver', grip: 'topo' },
    swatches: ['#1a4d4a', '#bcbec4', '#bcc0c5', '#34d399'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    vibe: 'Deep blue',
    selection: { deck: 'noir', wheel: 'midnight', truck: 'gunmetal', grip: 'topo' },
    swatches: ['#0b0b0d', '#1f2238', '#3a3d44', '#34d399'],
  },
  {
    id: 'goldleaf',
    label: 'Gold Leaf',
    vibe: 'Pure flex',
    selection: { deck: 'gold-leaf', wheel: 'bone', truck: 'rose-gold', grip: 'tiger' },
    swatches: ['#c9a14a', '#efe6d6', '#b76e79', '#f59e0b'],
  },
];

function selectionsEqual(
  a: ConfigurationSelection,
  b: ConfigurationSelection,
): boolean {
  return (
    a.deck === b.deck &&
    a.wheel === b.wheel &&
    a.truck === b.truck &&
    a.grip === b.grip
  );
}

export function PresetPicker() {
  const selection = useSceneStore((s) => s.selection);
  const setSelection = useSceneStore((s) => s.setSelection);
  const activeId = PRESETS.find((p) => selectionsEqual(selection, p.selection))?.id ?? null;

  return (
    <section
      aria-label="Preset styles"
      className="rounded-2xl border border-bone-50/10 bg-white/[0.03] p-4"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-ember-500 uppercase">
            Quick styles
          </p>
          <p className="mt-0.5 text-xs text-bone-50/70">
            Skip the wizard - tap a vibe.
          </p>
        </div>
      </header>

      {/* All 5 presets fit in a single row of the narrow card column.
          Cards are compact - shorter swatch stripe, smaller text - so the
          panel reads as a tight 5-up palette rather than a row of full
          product tiles. No horizontal scroll. */}
      <ul className="mt-3 grid grid-cols-5 gap-1.5">
        {PRESETS.map((p) => {
          const active = activeId === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelection(p.selection)}
                aria-pressed={active}
                title={`${p.label} - ${p.vibe}`}
                className={`group relative flex h-full w-full flex-col items-stretch overflow-hidden rounded-lg border text-left transition-all ${
                  active
                    ? 'border-ember-500/70 bg-ember-500/[0.08] shadow-[0_0_0_1px_rgba(255,123,52,0.18)]'
                    : 'border-bone-50/10 bg-white/[0.02] hover:border-bone-50/30 hover:bg-white/[0.06]'
                }`}
              >
                <div aria-hidden className="flex h-6 w-full">
                  {p.swatches.map((c, i) => (
                    <span
                      key={i}
                      style={{ background: c }}
                      className="flex-1"
                    />
                  ))}
                </div>

                <div className="flex flex-1 flex-col gap-0.5 px-1.5 py-1.5">
                  <span className="truncate text-[11px] font-bold leading-tight text-bone-50">
                    {p.label}
                  </span>
                  <span className="truncate text-[9px] leading-tight text-bone-50/55">
                    {p.vibe}
                  </span>
                </div>

                {active && (
                  <span
                    aria-hidden
                    className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-ember-500 text-[7px] font-bold text-ink-950"
                  >
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
