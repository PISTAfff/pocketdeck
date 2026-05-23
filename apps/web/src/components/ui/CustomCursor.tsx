'use client';

/**
 * CustomCursor, a fixed-position bone-colored dot that springs after the pointer.
 * Grows + softens when hovering an element with `[data-cursor="link"]`.
 *
 * Hidden on coarse-pointer devices.
 */
import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 380, damping: 28, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 380, damping: 28, mass: 0.4 });
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fine = window.matchMedia('(pointer: fine)');
    setVisible(fine.matches);
    const onChange = (e: MediaQueryListEvent) => setVisible(e.matches);
    fine.addEventListener('change', onChange);

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      setHovering(Boolean(t.closest('[data-cursor="link"]')));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerover', onOver);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      fine.removeEventListener('change', onChange);
    };
  }, [x, y]);

  if (!visible) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[100] mix-blend-difference"
        style={{ x: sx, y: sy }}
      >
        <motion.div
          animate={{
            scale: hovering ? 2.6 : 1,
            opacity: hovering ? 0.7 : 1,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="-translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-50"
          style={{ width: 14, height: 14 }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[99]"
        style={{ x, y }}
      >
        <div
          className="-translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: 4,
            height: 4,
            background: 'var(--color-ember-500)',
            boxShadow: '0 0 12px var(--color-ember-500)',
          }}
        />
      </motion.div>
    </>
  );
}
