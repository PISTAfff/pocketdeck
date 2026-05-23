'use client';

/**
 * MagneticButton — wraps a child in a motion.div that springs toward the
 * pointer. Marks itself with `data-cursor="link"` so the custom cursor reacts.
 */
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useMagnetic } from '@/hooks/useMagnetic';

type MotionDivProps = ComponentPropsWithoutRef<typeof motion.div>;

interface MagneticButtonProps
  extends Omit<MotionDivProps, 'children' | 'ref' | 'style'> {
  children: ReactNode;
  /** Optional href: renders an `<a>` inside the magnet. */
  href?: string;
  /** Optional click handler. */
  onClick?: () => void;
  /** Button `type` — defaults to `button` (no implicit form submit). */
  type?: 'button' | 'submit' | 'reset';
  /** Disable the inner button. */
  disabled?: boolean;
  /** Extra classes on the inner button/anchor. */
  innerClassName?: string;
  /** Pull radius — defaults to 80px. */
  radius?: number;
  /** Pull strength 0..1 — defaults to 0.45. */
  strength?: number;
}

export function MagneticButton({
  children,
  href,
  onClick,
  type = 'button',
  disabled,
  className,
  innerClassName,
  radius,
  strength,
  ...rest
}: MagneticButtonProps) {
  const { ref, x, y } = useMagnetic<HTMLDivElement>({ radius, strength });

  const inner = href ? (
    <a href={href} className={innerClassName} onClick={onClick}>
      {children}
    </a>
  ) : (
    <button
      type={type}
      className={innerClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );

  return (
    <motion.div
      ref={ref}
      data-cursor="link"
      className={clsx('inline-flex', className)}
      style={{ x, y }}
      {...rest}
    >
      {inner}
    </motion.div>
  );
}
