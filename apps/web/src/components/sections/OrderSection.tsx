'use client';

/**
 * Order — checkout form. Submits via Axios to POST /api/orders with the
 * current selection (from the scene store). Maps 422 `errors[].field` (dot
 * paths like "customer.phone") to per-input errors.
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

export function OrderSection() {
  const setActiveSection = useSceneStore((s) => s.setActiveSection);
  const selection = useSceneStore((s) => s.selection);
  const product = useConfiguratorStore((s) => s.product);
  const sectionRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<OrderStatus>({ kind: 'idle' });

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
      className="relative px-6 py-40 md:px-12"
    >
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1fr_1.2fr] md:gap-16">
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
            autoComplete="name"
          />
          <Field
            id="phone"
            label="Phone"
            value={form.phone}
            onChange={(v) => onChange('phone', v)}
            error={errors['customer.phone']}
            placeholder="01XXXXXXXXX"
            inputMode="tel"
            autoComplete="tel"
          />
          <Field
            id="address"
            label="Address"
            value={form.address}
            onChange={(v) => onChange('address', v)}
            error={errors['customer.address']}
            multiline
            autoComplete="street-address"
          />
          <div className="flex flex-col gap-2">
            <label
              htmlFor="governorate"
              className="font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase"
            >
              Governorate
            </label>
            <select
              id="governorate"
              value={form.governorate}
              onChange={(e) => onChange('governorate', e.target.value as Governorate)}
              data-cursor="link"
              aria-invalid={Boolean(errors['customer.governorate'])}
              className={fieldBase}
            >
              <option value="" disabled>
                Select…
              </option>
              {GOVERNORATES.map((g) => (
                <option key={g} value={g} className="bg-ink-900 text-bone-50">
                  {g}
                </option>
              ))}
            </select>
            <FieldError message={errors['customer.governorate']} />
          </div>

          <div className="mt-2 flex flex-col items-start gap-3">
            <MagneticButton
              type="submit"
              disabled={status.kind === 'submitting'}
              innerClassName="rounded-full bg-ember-500 px-10 py-5 font-mono text-sm tracking-[0.24em] text-ink-950 uppercase transition-colors hover:bg-ember-400 disabled:opacity-60"
            >
              {status.kind === 'submitting' ? 'Placing…' : 'Confirm order'}
            </MagneticButton>
            <FormStatusLine status={status} />
          </div>
        </form>
      </div>
    </section>
  );
}
