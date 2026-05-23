'use client';

/**
 * Order, the checkout form. Sits on a fully opaque ink-950 background so
 * the WebGL scene (faded by this scroll position) never bleeds onto the
 * inputs.
 *
 * Submits via Axios to POST /api/orders with the current selection (from the
 * scene store). Maps 422 errors[].field (dot path like "customer.phone") onto
 * the corresponding inline error display.
 */
import { useEffect, useRef, useState } from 'react';
import type { CreateOrderRequest, Governorate } from '@pocketdeck/types';
import { useSceneStore } from '@/store/scene';
import { useConfiguratorStore } from '@/store/configurator';
import { createOrder } from '@/lib/api';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { GOVERNORATES } from './governorates';
import { Field, FieldError, fieldBase } from './OrderFields';
import { OrderSummary } from './OrderSummary';
import {
  FormStatusLine,
  handleSubmitError,
  type FieldErrors,
  type OrderStatus,
} from './OrderHelpers';

const PRODUCT_SLUG = 'pocketdeck';

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

const PHONE_RE = /^01[0-2,5]\d{8}$/;

function isFormReady(form: CustomerForm): boolean {
  return (
    form.name.trim().length >= 2 &&
    PHONE_RE.test(form.phone.trim()) &&
    form.address.trim().length >= 5 &&
    form.governorate !== ''
  );
}

export function OrderSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const selection = useSceneStore((s) => s.selection);
  const product = useConfiguratorStore((s) => s.product);
  const sectionRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<OrderStatus>({ kind: 'idle' });
  const ready = isFormReady(form);

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
    if (!form.governorate) {
      setErrors({ 'customer.governorate': 'Pick a governorate.' });
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
        governorate: form.governorate,
      },
    };
    try {
      const order = await createOrder(req);
      setStatus({ kind: 'success', order });
      setForm(EMPTY_FORM);
    } catch (err) {
      handleSubmitError(err, setErrors, setStatus);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="order"
      className="relative bg-ink-950 px-6 py-28 sm:px-10 md:px-14 md:py-36"
    >
      <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[0.85fr_1fr] md:gap-20">
        <aside>
          <OrderSummary
            productSlug={PRODUCT_SLUG}
            selection={selection}
            product={product}
          />
        </aside>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-5"
          noValidate
          aria-busy={status.kind === 'submitting'}
        >
          <Field
            id="name"
            label="Name"
            value={form.name}
            onChange={(v) => onChange('name', v)}
            error={errors['customer.name']}
            placeholder="Your full name"
            autoComplete="name"
          />
          <Field
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(v) => onChange('phone', v)}
            error={errors['customer.phone']}
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
            error={errors['customer.address']}
            placeholder="Street, building, apartment"
            helper="Where the courier should drop it off. 5 to 200 characters."
            autoComplete="street-address"
            multiline
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="governorate"
              className="font-mono text-[11px] font-medium tracking-[0.28em] text-bone-200 uppercase"
            >
              Governorate
            </label>
            <p className="font-mono text-[11px] tracking-wide text-bone-300">
              Used to route the courier. Cairo, Giza, and Alexandria ship in 24h.
            </p>
            <div className="relative">
              <select
                id="governorate"
                value={form.governorate}
                onChange={(e) => onChange('governorate', e.target.value as Governorate)}
                data-cursor="link"
                aria-invalid={Boolean(errors['customer.governorate'])}
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
            <FieldError message={errors['customer.governorate']} />
          </div>

          <div className="mt-4 flex flex-col items-start gap-4 border-t border-bone-50/10 pt-6">
            <MagneticButton
              type="submit"
              disabled={status.kind === 'submitting' || !ready}
              innerClassName={
                ready
                  ? 'rounded-full bg-ember-500 px-10 py-5 font-mono text-sm font-medium tracking-[0.24em] text-ink-950 uppercase shadow-[0_0_0_1px_rgba(255,91,20,0.4),0_18px_50px_-12px_rgba(255,91,20,0.55)] transition-colors hover:bg-ember-400 disabled:opacity-60'
                  : 'cursor-not-allowed rounded-full bg-bone-50/10 px-10 py-5 font-mono text-sm tracking-[0.24em] text-bone-300 uppercase'
              }
            >
              {status.kind === 'submitting'
                ? 'Placing order...'
                : ready
                  ? 'Confirm order'
                  : 'Fill the form to continue'}
            </MagneticButton>
            <FormStatusLine status={status} />
          </div>
        </form>
      </div>
    </section>
  );
}
