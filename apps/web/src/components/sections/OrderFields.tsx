'use client';

/**
 * Reusable form-field primitives for the order section.
 *
 * Spec (#39-#42):
 *   - Labels in sentence case, normal weight (no more all-caps tags).
 *   - Inputs carry a permanent 1 px rgba(255,255,255,0.12) border, 2 px
 *     ember border on focus, 12 px vertical / 16 px horizontal padding.
 *   - Field supports an optional counter (current/max) for the address
 *     textarea (#42).
 *   - Helper copy is one short, friendly sentence (#43).
 */
import { motion } from 'framer-motion';

/**
 * Tailwind classes encoding the input spec. Border colour is overridden
 * inline when the field is in an error state so React doesn't have to
 * juggle two class lists.
 */
export const fieldBase =
  'w-full rounded-xl bg-ink-900/60 px-4 py-3 font-sans text-base text-bone-50 ' +
  'placeholder:text-bone-300/55 transition-colors ' +
  'border border-[rgba(255,255,255,0.12)] ' +
  'focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/35 ' +
  'aria-invalid:border-red-500/70 aria-invalid:focus:ring-red-500/30';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  multiline?: boolean;
  counter?: { current: number; max: number };
}

export function Field({
  id,
  label,
  value,
  onChange,
  error,
  helper,
  placeholder,
  inputMode,
  autoComplete,
  multiline,
  counter,
}: FieldProps) {
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-sans text-sm font-medium text-bone-50"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          autoComplete={autoComplete}
          rows={3}
          className={fieldBase}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={fieldBase}
          placeholder={placeholder}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-h-[18px] flex-1">
          {error ? (
            <FieldError id={`${id}-error`} message={error} />
          ) : helper ? (
            <p
              id={`${id}-helper`}
              className="font-sans text-[12px] text-bone-300"
              style={{ lineHeight: 'var(--leading-caption)' }}
            >
              {helper}
            </p>
          ) : null}
        </div>
        {counter && (
          <p
            aria-live="polite"
            className="shrink-0 font-mono text-[11px] tabular-nums text-bone-300"
          >
            {counter.current} / {counter.max}
          </p>
        )}
      </div>
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      role="alert"
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 font-sans text-[12px] text-red-400"
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
      {message}
    </motion.p>
  );
}
