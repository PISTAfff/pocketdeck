'use client';

/**
 * Reusable form-field primitives for the order section.
 *
 * - bigger labels (12px, looser tracking) so they're legible on the dark backdrop
 * - visible focus ring (ember) + invalid border (red)
 * - helper text slot below the input (above the error)
 * - longer touch target (py-3.5) so phones have a comfortable hit area
 */
import { motion } from 'framer-motion';

export const fieldBase =
  'w-full rounded-xl border border-bone-50/12 bg-ink-900/70 px-5 py-3.5 font-sans text-base text-bone-50 placeholder:text-bone-300/50 transition-colors focus:border-ember-500 focus:outline-none focus:ring-2 focus:ring-ember-500/30 aria-invalid:border-red-500/70 aria-invalid:focus:ring-red-500/30';

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
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-mono text-[11px] font-medium tracking-[0.28em] text-bone-200 uppercase"
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
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
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
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={fieldBase}
          placeholder={placeholder}
        />
      )}
      {helper && !error && (
        <p
          id={`${id}-helper`}
          className="font-mono text-[11px] tracking-wide text-bone-300"
        >
          {helper}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
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
      className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-red-400"
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />
      {message}
    </motion.p>
  );
}
