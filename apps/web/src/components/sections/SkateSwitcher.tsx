'use client';

/**
 * SkateSwitcher, a compact "‹ Board K / N ›" pill that drives the
 * scene store's activeSkateIndex. Shown both inside the configurator
 * (above the wizard card) and in the order preview, so the user can
 * flip through their custom boards anywhere a preview is visible.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '@/store/scene';
import clsx from 'clsx';

export function SkateSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** Smaller padding + label, used inside the order preview overlay. */
  compact?: boolean;
}) {
  const packageSize = useSceneStore((s) => s.packageSize);
  const activeSkateIndex = useSceneStore((s) => s.activeSkateIndex);
  const setActiveSkateIndex = useSceneStore((s) => s.setActiveSkateIndex);

  if (packageSize <= 1) return null;

  const go = (delta: 1 | -1) => {
    const next = (activeSkateIndex + delta + packageSize) % packageSize;
    setActiveSkateIndex(next);
  };

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border border-bone-50/15 bg-ink-900/70 backdrop-blur',
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous board"
        data-cursor="link"
        className={clsx(
          'flex items-center justify-center rounded-full text-bone-100 transition-colors hover:bg-ember-500 hover:text-ink-950',
          compact ? 'h-6 w-6' : 'h-7 w-7',
        )}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M6.5 1.5 L3 5 L6.5 8.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div
        className={clsx(
          'flex min-w-[68px] items-center justify-center font-mono uppercase',
          compact
            ? 'text-[9px] tracking-[0.22em] text-bone-100'
            : 'text-[10px] tracking-[0.26em] text-bone-50',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={activeSkateIndex}
            initial={{ y: 4, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -4, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            Board {activeSkateIndex + 1} / {packageSize}
          </motion.span>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next board"
        data-cursor="link"
        className={clsx(
          'flex items-center justify-center rounded-full text-bone-100 transition-colors hover:bg-ember-500 hover:text-ink-950',
          compact ? 'h-6 w-6' : 'h-7 w-7',
        )}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M3.5 1.5 L7 5 L3.5 8.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dots indicator for direct jump */}
      <div className="ml-1 flex items-center gap-1 pl-1 border-l border-bone-50/15">
        {Array.from({ length: packageSize }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveSkateIndex(i)}
            aria-label={`Jump to board ${i + 1}`}
            className={clsx(
              'rounded-full transition-all',
              i === activeSkateIndex
                ? 'h-1.5 w-3 bg-ember-500'
                : 'h-1.5 w-1.5 bg-bone-50/30 hover:bg-bone-50/60',
            )}
          />
        ))}
      </div>
    </div>
  );
}
