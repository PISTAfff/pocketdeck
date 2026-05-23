'use client';

/**
 * Reusable form-field primitives for the order section. Keeps the main
 * OrderSection file lean.
 */
import { motion } from 'framer-motion';

export const fieldBase =
  'w-full rounded-xl border border-ink-700/60 bg-ink-900/60 px-5 py-3 font-sans text-sm text-bone-50 placeholder:text-bone-300/60 focus:border-ember-500 focus:outline-none aria-invalid:border-red-500';

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
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
  placeholder,
  inputMode,
  autoComplete,
  multiline,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase"
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
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={fieldBase}
          placeholder={placeholder}
        />
      )}
      <FieldError message={error} />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      className="font-mono text-[11px] tracking-wider text-red-400"
    >
      {message}
    </motion.p>
  );
}
