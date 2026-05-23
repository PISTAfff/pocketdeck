'use client';

/**
 * Order ("Review & Buy") section.
 *
 * New in this wave:
 *   - Rotating-deck preview panel at the top. Click "Expand" or the
 *     preview itself to grow it to fullscreen. All other DOM content
 *     fades out and a fixed Back button collapses it again.
 *   - Governorate uses CustomSelect for a dark-themed dropdown (the old
 *     native <select> rendered with OS chrome that clashed with the
 *     rest of the form).
 *   - Form keeps Wave 7 behavior: sentence-case labels, spec'd inputs,
 *     live submit, address counter, friendlier helpers, success state.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CreateOrderRequest, Governorate, Order } from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';
import { useConfiguratorStore } from '@/store/configurator';
import { createOrder } from '@/lib/api';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { GOVERNORATES } from './governorates';
import { Field, FieldError } from './OrderFields';
import { OrderSummary } from './OrderSummary';
import { OrderPreview } from './OrderPreview';
import {
  handleSubmitError,
  type FieldErrors,
  type OrderStatus,
} from './OrderHelpers';

const PRODUCT_SLUG = 'pocketdeck';
const ADDRESS_MAX = 200;
const PHONE_RE = /^01[0-2,5]\d{8}$/;

interface CustomerForm {
  name: string;
  phone: string;
  address: string;
  governorate: Governorate | '';
}

const EMPTY_FORM: CustomerForm = {
  name: '',
  phone: '',
  address: '',
  governorate: '',
};

interface ValidationResult {
  ok: boolean;
  errors: FieldErrors;
}

function validate(form: CustomerForm): ValidationResult {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) {
    errors['customer.name'] = 'Your name is required (at least 2 characters).';
  }
  if (!PHONE_RE.test(form.phone.trim())) {
    errors['customer.phone'] = 'Use an 11-digit Egyptian mobile, starting with 01.';
  }
  if (form.address.trim().length < 5) {
    errors['customer.address'] = 'Add a delivery address (at least 5 characters).';
  } else if (form.address.trim().length > ADDRESS_MAX) {
    errors['customer.address'] = `Keep the address under ${ADDRESS_MAX} characters.`;
  }
  if (!form.governorate) {
    errors['customer.governorate'] = 'Pick a governorate so we know where to ship.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function OrderSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const selection = useSceneStore((s) => s.selection);
  const product = useConfiguratorStore((s) => s.product);
  const sectionRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<OrderStatus>({ kind: 'idle' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const validation = useMemo(() => validate(form), [form]);
  const ready = validation.ok;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.3) {
            setActiveSection('order');
          }
        }
      },
      { threshold: [0.3] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [setActiveSection]);

  // Esc closes the fullscreen preview. Lock body scroll while expanded
  // so the user can't accidentally scroll the page underneath.
  useEffect(() => {
    if (!previewExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewExpanded]);

  const onChange = <K extends keyof CustomerForm>(key: K, value: CustomerForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[`customer.${key}`]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`customer.${key}`];
        return next;
      });
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === 'submitting') return;
    setSubmitAttempted(true);

    const result = validate(form);
    if (!result.ok) {
      setErrors(result.errors);
      const firstKey = Object.keys(result.errors)[0];
      if (firstKey) {
        const idPart = firstKey.split('.')[1];
        if (idPart) {
          const el = document.getElementById(idPart);
          el?.focus({ preventScroll: false });
        }
      }
      return;
    }

    setStatus({ kind: 'submitting' });
    setErrors({});
    const req: CreateOrderRequest = {
      productSlug: PRODUCT_SLUG,
      selection,
      quantity: 1,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        governorate: form.governorate as Governorate,
      },
    };
    try {
      const order = await createOrder(req);
      setStatus({ kind: 'success', order });
    } catch (err) {
      handleSubmitError(err, setErrors, setStatus);
    }
  };

  const visibleErrors = submitAttempted ? errors : {};

  return (
    <section
      ref={sectionRef}
      id="order"
      className="relative bg-ink-950 px-6 pt-24 pb-24 sm:px-10 md:px-14 md:pt-24"
    >
      {status.kind === 'success' ? (
        <OrderSuccess order={status.order} totalLabel={summaryTotal(product, selection)} />
      ) : (
        <div className="mx-auto max-w-[1400px]">
          {/* "Review & Buy" header */}
          <header className="mb-12 max-w-2xl">
            <span className="tape inline-block">05 · review &amp; buy</span>
            <h2
              className="display-headline mt-6 text-bone-50"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
            >
              Review,
              <br />
              <span className="spray-text text-ember-500">then ship it.</span>
            </h2>
            <p
              className="mt-5 max-w-md font-sans text-base text-bone-50"
              style={{ lineHeight: 'var(--leading-body)' }}
            >
              Spin the build to give it a last look. Expand the preview if
              you want it big. Then drop your details below.
            </p>
          </header>

          {/* Preview + summary + form layout */}
          <div
            className="grid gap-12 transition-opacity duration-500 md:grid-cols-[0.85fr_1fr] md:gap-20"
            style={{
              opacity: previewExpanded ? 0 : 1,
              pointerEvents: previewExpanded ? 'none' : 'auto',
            }}
          >
            <aside className="flex flex-col gap-6">
              {/* Rotating preview, collapsed state */}
              <button
                type="button"
                onClick={() => setPreviewExpanded(true)}
                data-cursor="link"
                aria-label="Expand the build preview to fullscreen"
                className="group relative overflow-hidden rounded-2xl border border-bone-50/10 text-left transition-shadow hover:shadow-[0_22px_60px_-18px_rgba(255,91,20,0.35)]"
                style={{
                  background: 'rgba(245, 245, 240, 0.04)',
                  height: '320px',
                }}
              >
                <OrderPreview expanded={false} />
                <span className="pointer-events-none absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-ink-950/80 px-3 py-1.5 font-mono text-[10px] tracking-[0.28em] text-bone-100 uppercase ring-1 ring-bone-50/15 backdrop-blur transition-colors group-hover:bg-ember-500 group-hover:text-ink-950">
                  Expand
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 2 L5 2 M2 2 L2 5 M10 10 L7 10 M10 10 L10 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="pointer-events-none absolute top-4 left-4 inline-block font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase">
                  Live preview · auto-rotate
                </span>
              </button>

              <OrderSummary
                productSlug={PRODUCT_SLUG}
                selection={selection}
                product={product}
              />
            </aside>

            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-6"
              noValidate
              aria-busy={status.kind === 'submitting'}
            >
              <Field
                id="name"
                label="Name"
                value={form.name}
                onChange={(v) => onChange('name', v)}
                error={visibleErrors['customer.name']}
                placeholder="Your full name"
                autoComplete="name"
              />
              <Field
                id="phone"
                label="Phone"
                value={form.phone}
                onChange={(v) => onChange('phone', v)}
                error={visibleErrors['customer.phone']}
                placeholder="01XXXXXXXXX"
                helper="Egyptian mobile, 11 digits starting with 01."
                inputMode="tel"
                autoComplete="tel"
              />
              <Field
                id="address"
                label="Address"
                value={form.address}
                onChange={(v) => onChange('address', v)}
                error={visibleErrors['customer.address']}
                placeholder="Street, building, apartment"
                helper="Where should the courier drop it off?"
                autoComplete="street-address"
                multiline
                counter={{ current: form.address.length, max: ADDRESS_MAX }}
              />
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="governorate"
                  className="font-sans text-sm font-medium text-bone-50"
                >
                  Governorate
                </label>
                <CustomSelect<Governorate>
                  id="governorate"
                  value={form.governorate as Governorate | ''}
                  options={GOVERNORATES}
                  placeholder="Select your governorate"
                  invalid={Boolean(visibleErrors['customer.governorate'])}
                  ariaLabel="Governorate"
                  onChange={(v) => onChange('governorate', v)}
                />
                <div className="min-h-[18px]">
                  {visibleErrors['customer.governorate'] ? (
                    <FieldError message={visibleErrors['customer.governorate']} />
                  ) : (
                    <p
                      className="font-sans text-[12px] text-bone-300"
                      style={{ lineHeight: 'var(--leading-caption)' }}
                    >
                      Cairo, Giza, and Alexandria ship next day.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-col items-start gap-4 border-t border-bone-50/10 pt-6">
                <MagneticButton
                  type="submit"
                  disabled={status.kind === 'submitting'}
                  innerClassName="rounded-full bg-ember-500 px-10 py-4 font-mono text-sm font-medium tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] transition-colors hover:bg-ember-400 disabled:opacity-60"
                >
                  {status.kind === 'submitting' ? 'Placing order...' : 'Confirm order'}
                </MagneticButton>
                {status.kind === 'error' && (
                  <p role="alert" className="font-sans text-[12px] text-red-400">
                    {status.message}
                  </p>
                )}
                {!ready && submitAttempted && (
                  <p
                    role="status"
                    className="font-sans text-[12px] text-bone-300"
                    style={{ lineHeight: 'var(--leading-caption)' }}
                  >
                    Sort the highlighted fields above to continue.
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen preview overlay */}
      <AnimatePresence>
        {previewExpanded && (
          <motion.div
            key="preview-overlay"
            className="fixed inset-0 z-[80] bg-ink-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
              className="absolute inset-0"
            >
              <OrderPreview expanded />
            </motion.div>
            <motion.button
              type="button"
              onClick={() => setPreviewExpanded(false)}
              data-cursor="link"
              aria-label="Close fullscreen preview and return"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
              exit={{ y: -16, opacity: 0 }}
              className="absolute top-6 left-6 z-10 inline-flex items-center gap-3 rounded-full bg-ink-900/70 px-5 py-3 font-mono text-xs tracking-[0.28em] text-bone-50 uppercase ring-1 ring-bone-50/15 backdrop-blur-xl transition-colors hover:bg-ink-900 md:top-10 md:left-10"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M9 3 L5 7 L9 11"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </motion.button>
            {/* Bottom-right meta */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.35 } }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute right-6 bottom-6 hidden font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase md:right-10 md:bottom-10 md:block"
            >
              <span className="text-bone-100">Your build · </span>
              {selection.deck} / {selection.wheel} / {selection.truck} / {selection.grip}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Confirmation state. */
function OrderSuccess({
  order,
  totalLabel,
}: {
  order: Order;
  totalLabel: string;
}) {
  const eta = etaDays(order.customer.governorate);
  return (
    <div className="mx-auto flex max-w-[900px] flex-col items-start gap-10">
      <div className="flex items-center gap-3">
        <span className="sticker sticker-ember">Confirmed</span>
        <span className="font-mono text-[11px] tracking-[0.32em] text-bone-300 uppercase">
          Order #{order.id.slice(-6)}
        </span>
      </div>
      <h2
        className="display-headline text-bone-50"
        style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}
      >
        Your deck is on
        <br />
        <span className="spray-text text-ember-500">the way.</span>
      </h2>
      <p
        className="max-w-xl font-sans text-bone-50"
        style={{ fontSize: '1.0625rem', lineHeight: 'var(--leading-body)' }}
      >
        We saved the build, locked the stock, and queued the call. Expect a
        ring from the courier in the next hour to confirm the address, then
        delivery within {eta}.
      </p>

      <dl
        className="grid w-full max-w-md gap-5 rounded-2xl border border-bone-50/10 p-7"
        style={{ background: 'rgba(245, 245, 240, 0.04)' }}
      >
        <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
          <dt className="tracking-[0.24em] text-bone-300 uppercase">SKU</dt>
          <dd className="text-right text-bone-50" style={{ wordBreak: 'break-all' }}>
            {order.sku}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
          <dt className="tracking-[0.24em] text-bone-300 uppercase">Total</dt>
          <dd className="text-right">
            <span className="font-display text-3xl text-bone-50">{totalLabel}</span>
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
          <dt className="tracking-[0.24em] text-bone-300 uppercase">ETA</dt>
          <dd className="text-right text-bone-50">{eta}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
          <dt className="tracking-[0.24em] text-bone-300 uppercase">Ship to</dt>
          <dd
            className="max-w-[220px] text-right text-bone-50"
            style={{ lineHeight: 'var(--leading-body)' }}
          >
            {order.customer.name}, {order.customer.governorate}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function etaDays(governorate: Governorate | string): string {
  const fast: Governorate[] = ['Cairo', 'Giza', 'Alexandria'];
  if (fast.includes(governorate as Governorate)) return '24 hours';
  return '2 to 4 days';
}

function summaryTotal(
  product: ReturnType<typeof useConfiguratorStore.getState>['product'],
  selection: { deck: string },
): string {
  if (!product) return '—';
  const deck = product.options.deck.find((d) => d.value === selection.deck);
  const total = product.basePriceEGP + (deck?.priceModifier ?? 0);
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(total);
}
