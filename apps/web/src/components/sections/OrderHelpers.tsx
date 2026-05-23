'use client';

/**
 * Internal helpers for OrderSection — status line + error normalizer. Kept
 * here so the main section file stays under the 250-line cap.
 */
import type { Order } from '@pocketdeck/types';
import { ApiError, ApiValidationError } from '@/lib/api';

export type FieldErrors = Partial<Record<string, string>>;

export type OrderStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; order: Order }
  | { kind: 'error'; message: string };

export function handleSubmitError(
  err: unknown,
  setErrors: (e: FieldErrors) => void,
  setStatus: (s: OrderStatus) => void,
) {
  if (err instanceof ApiValidationError) {
    const map: FieldErrors = {};
    for (const e of err.errors) map[e.field] = e.message;
    setErrors(map);
    setStatus({ kind: 'error', message: err.message });
    return;
  }
  if (err instanceof ApiError) {
    setStatus({
      kind: 'error',
      message:
        err.code === 'OUT_OF_STOCK'
          ? 'That mix just sold out. Try a different combination.'
          : err.code === 'RATE_LIMITED'
            ? 'Too many requests — give it a minute.'
            : err.message,
    });
    return;
  }
  if (err instanceof Error) {
    setStatus({ kind: 'error', message: err.message });
    return;
  }
  setStatus({ kind: 'error', message: 'Order failed.' });
}

export function FormStatusLine({ status }: { status: OrderStatus }) {
  if (status.kind === 'success') {
    return (
      <p role="status" className="font-mono text-xs text-ember-400">
        Order #{status.order.id.slice(-6)} confirmed — we&apos;ll call to verify.
      </p>
    );
  }
  if (status.kind === 'error') {
    return (
      <p role="alert" className="font-mono text-xs text-red-400">
        {status.message}
      </p>
    );
  }
  return null;
}
