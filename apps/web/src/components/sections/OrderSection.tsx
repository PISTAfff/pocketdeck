'use client';

/**
 * Order, the checkout form. Submits via Axios to POST /api/orders with the
 * current selection (from the scene store). Maps 422 errors[].field (dot
 * path like "customer.phone") onto the corresponding inline error.
 *
 * Wave 7 changes:
 *   - Sentence-case labels (#39)
 *   - Spec'd inputs in OrderFields.tsx (#40)
 *   - Live submit button: always clickable. Pressing while invalid runs
 *     local validation and surfaces inline errors. Once valid the label
 *     reads "Confirm order" (#41).
 *   - Address counter (#42)
 *   - Softer helper copy (#43)
 *   - Full-section success state with SKU, total, and ETA (#44)
 *   - Summary card top margin aligns with the first input baseline (#38)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CreateOrderRequest, Governorate, Order } from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';
import { useConfiguratorStore } from '@/store/configurator';
import { createOrder } from '@/lib/api';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { GOVERNORATES } from './governorates';
import { Field, FieldError, fieldBase } from './OrderFields';
import { OrderSummary } from './OrderSummary';
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
      // Focus the first invalid field for keyboard users.
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

  // Show errors only after the first submit attempt (or after the server
  // returns 422). Otherwise the form would scream at users as they type.
  const visibleErrors = submitAttempted ? errors : {};

  // #38: align summary card top with first input baseline. The form's
  // first input sits below its sentence-case label (~22 px label + 8 px gap
  // = 30 px total). We push the aside down by `mt-[30px]` to match.
  return (
    <section
      ref={sectionRef}
      id="order"
      className="relative bg-ink-950 px-6 pt-24 pb-24 sm:px-10 md:px-14 md:pt-24"
    >
      {status.kind === 'success' ? (
        <OrderSuccess order={status.order} totalLabel={summaryTotal(product, selection)} />
      ) : (
        <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[0.85fr_1fr] md:gap-20">
          <aside className="md:mt-[30px]">
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
              <div className="relative">
                <select
                  id="governorate"
                  value={form.governorate}
                  onChange={(e) => onChange('governorate', e.target.value as Governorate)}
                  data-cursor="link"
                  aria-invalid={Boolean(visibleErrors['customer.governorate'])}
                  className={`${fieldBase} appearance-none pr-12`}
                >
                  <option value="" disabled className="bg-ink-900 text-bone-300">
                    Select your governorate
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g} className="bg-ink-900 text-bone-50">
                      {g}
                    </option>
                  ))}
                </select>
                <span
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-5 -translate-y-1/2 text-bone-300"
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
              </div>
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
      )}
    </section>
  );
}

/** Full-section confirmation rendered after a successful POST (#44). */
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
