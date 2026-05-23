'use client';

/**
 * CustomSelect, a dark-themed dropdown that replaces native <select>.
 *
 * Why custom: the native dropdown panel is OS-styled (white background,
 * default fonts), which clashes with the dark / ember theme. This
 * component owns its own panel rendering so the dropdown blends with the
 * rest of the form.
 *
 * Features:
 *   - keyboard nav: ArrowDown/Up to move, Enter to commit, Esc to close,
 *     Home / End to jump
 *   - click outside or focus loss closes the panel
 *   - matches the spec for inputs (#40): 1 px rgba(255,255,255,0.12)
 *     border, 2 px ember focus border + ring on focus, 12 px / 16 px
 *     padding, error state via aria-invalid
 *   - rendered with `position: relative` so the panel anchors to the
 *     trigger. Panel max-height + overflow-y so long lists scroll cleanly
 *     with a dark scrollbar
 *
 * The component is generic over the value type but the consuming
 * `OrderSection` uses it for the Governorate enum string.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import clsx from 'clsx';

interface CustomSelectProps<T extends string> {
  id?: string;
  /** Currently-selected value, or empty string for "no selection". */
  value: T | '';
  options: readonly T[];
  /** Label shown in the trigger when no option is selected. */
  placeholder: string;
  onChange: (value: T) => void;
  invalid?: boolean;
  ariaLabel?: string;
}

export function CustomSelect<T extends string>({
  id,
  value,
  options,
  placeholder,
  onChange,
  invalid,
  ariaLabel,
}: CustomSelectProps<T>) {
  const reactId = useId();
  const triggerId = id ?? `select-${reactId}`;
  const listboxId = `${triggerId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    value ? options.indexOf(value as T) : 0,
  );
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Sync the active index when the external value changes.
  useEffect(() => {
    if (!value) return;
    const idx = options.indexOf(value as T);
    if (idx >= 0) setActiveIndex(idx);
  }, [value, options]);

  // Close on outside click and on Escape (when focus is elsewhere).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // Scroll the active option into view when the panel opens or the active
  // index moves outside the visible area.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // When the list opens, move focus into it so arrow keys work without an
  // extra Tab keystroke.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      listRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const commit = useCallback(
    (idx: number) => {
      const next = options[idx];
      if (next === undefined) return;
      onChange(next);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange, options],
  );

  const onTriggerKey = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(activeIndex);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
  };

  const displayLabel = value || placeholder;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        data-cursor="link"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
        className={clsx(
          'w-full rounded-xl bg-ink-900/60 px-4 py-3 text-left font-sans text-base text-bone-50 transition-colors',
          'border border-[rgba(255,255,255,0.12)] focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/35',
          invalid && 'border-red-500/70',
          // Make room for the chevron on the right.
          'pr-12',
        )}
      >
        <span className={value ? 'text-bone-50' : 'text-bone-300/70'}>
          {displayLabel}
        </span>
        <span
          aria-hidden
          className={clsx(
            'pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-bone-300 transition-transform duration-200',
            open && 'rotate-180',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 5 L7 9 L11 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={triggerId}
          aria-activedescendant={`${triggerId}-opt-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKey}
          className={clsx(
            'absolute top-full left-0 right-0 z-50 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.12)] bg-ink-900/95 py-2 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] backdrop-blur-xl focus:outline-none',
          )}
        >
          {options.map((opt, i) => {
            const selected = opt === value;
            const active = i === activeIndex;
            return (
              <li
                key={opt}
                id={`${triggerId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => commit(i)}
                className={clsx(
                  'cursor-pointer px-4 py-2.5 font-sans text-sm transition-colors',
                  active ? 'bg-ember-500/20 text-bone-50' : 'text-bone-100',
                  selected && !active && 'text-bone-50',
                )}
                data-cursor="link"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{opt}</span>
                  {selected && (
                    <svg
                      aria-hidden
                      width="14"
                      height="14"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-ember-400"
                    >
                      <path d="M2 6.5 L5 9.5 L10 3" />
                    </svg>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
