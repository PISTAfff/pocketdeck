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
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
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
import { SkateSwitcher } from './SkateSwitcher';
import { StreetSprite } from '@/components/ui/StreetSprite';
import { pauseScroll, resumeScroll } from '@/hooks/useLenis';
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
  const selections = useSceneStore((s) => s.selections);
  const packageSize = useSceneStore((s) => s.packageSize);
  const activeSkateIndex = useSceneStore((s) => s.activeSkateIndex);
  const product = useConfiguratorStore((s) => s.product);
  const sectionRef = useRef<HTMLElement | null>(null);

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<OrderStatus>({ kind: 'idle' });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  // SSR-safe portal target. `document.body` only exists on the client; we
  // wait one render to capture it.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

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

  // While the fullscreen preview is open:
  //   - Esc collapses it back
  //   - body overflow is locked (defence in depth)
  //   - Lenis is stopped so wheel / touch / arrow keys can't scroll the
  //     page underneath; OrbitControls still receives wheel for zoom.
  useEffect(() => {
    if (!previewExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    pauseScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      resumeScroll();
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
      packageSize,
      selections,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        governorate: form.governorate as Governorate,
      },
    };
    try {
      const order = await createOrder(req);
      // Persist a lightweight pointer in localStorage so the customer
      // can find this order again from /track-order without typing the
      // full ID. Only id + phone is saved (enough for the lookup).
      try {
        const key = 'pocketdeck:recentOrders';
        const existing = JSON.parse(
          window.localStorage.getItem(key) ?? '[]',
        ) as { id: string; phone: string; createdAt: string }[];
        const next = [
          { id: order.id, phone: order.customer.phone, createdAt: order.createdAt },
          ...existing.filter((o) => o.id !== order.id),
        ].slice(0, 5);
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // localStorage blocked? Carry on - the order succeeded.
      }
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
      {/* Street-sprite scatter for the order section */}
      <StreetSprite
        kind="tag"
        size={40}
        color="ember"
        rotate={-18}
        hover="pop"
        className="absolute top-20 right-[8%] z-0"
      />
      <StreetSprite
        kind="spark"
        size={30}
        color="bone"
        rotate={0}
        hover="spin"
        className="absolute top-[35%] left-6 z-0 md:left-12"
      />
      <StreetSprite
        kind="wave"
        size={56}
        color="mute"
        rotate={-5}
        hover="none"
        className="absolute bottom-20 left-[40%] z-0 hidden md:inline-flex"
      />
      <StreetSprite
        kind="star"
        size={22}
        color="ember"
        rotate={25}
        hover="wiggle"
        className="absolute bottom-32 right-12 z-0"
      />

      {status.kind === 'success' ? (
        <OrderSuccess
          order={status.order}
          totalLabel={summaryTotal(product, packageSize, selections)}
        />
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
              {/* Rotating preview, collapsed state. We render the
                  SkateSwitcher OVER the button (z-10) so it can flip
                  boards without triggering the expand-fullscreen
                  handler. */}
              <div
                className="relative overflow-hidden rounded-2xl border border-bone-50/10"
                style={{
                  background: 'rgba(245, 245, 240, 0.04)',
                  height: '320px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewExpanded(true)}
                  data-cursor="link"
                  aria-label="Expand the build preview to fullscreen"
                  className="group absolute inset-0 text-left transition-shadow hover:shadow-[0_22px_60px_-18px_rgba(255,91,20,0.35)]"
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
                {packageSize > 1 && (
                  <div className="pointer-events-auto absolute top-3 right-3 z-10">
                    <SkateSwitcher compact />
                  </div>
                )}
              </div>

              <OrderSummary
                productSlug={PRODUCT_SLUG}
                packageSize={packageSize}
                selections={selections}
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

      {/*
        Fullscreen preview overlay. Rendered via createPortal to <body> so it
        escapes the .page-root stacking context (z-index: 1). Without the
        portal, the overlay's z-[80] was trapped inside page-root and the
        nav (z-50 in the document root) was painting over the Back pill.
        With the portal, the overlay sits as a sibling of the nav at the
        root level and z-[120] beats z-50 cleanly.
      */}
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {previewExpanded && (
              <motion.div
                key="preview-overlay"
                className="fixed inset-0 z-[120] bg-ink-950"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
              >
                {/* 3D scene — full-bleed behind the chrome. */}
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                  className="absolute inset-0"
                >
                  <OrderPreview expanded />
                </motion.div>

                {/*
                  Mobile overlay chrome — a proper header bar on top + a
                  structured info strip on the bottom so the modal reads as
                  an app-style sheet rather than a bare 3D scene. Hidden
                  from `md` upward where the minimal floating Back pill
                  feels right against the wide canvas.
                */}
                <motion.header
                  initial={{ y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ y: -16, opacity: 0 }}
                  className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-bone-50/10 bg-ink-950/80 px-4 py-3 backdrop-blur-xl md:hidden"
                  style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] tracking-[0.32em] text-ember-400 uppercase">
                      Live preview
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.28em] text-bone-200 uppercase">
                      {packageSize}-board package
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewExpanded(false)}
                    data-cursor="link"
                    aria-label="Close fullscreen preview"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink-900/80 text-bone-50 ring-1 ring-bone-50/15 transition-colors hover:bg-ink-900"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </motion.header>

                <motion.footer
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.3 } }}
                  exit={{ y: 16, opacity: 0 }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-10 border-t border-bone-50/10 bg-ink-950/75 px-4 py-3 backdrop-blur-xl md:hidden"
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[9px] tracking-[0.28em] text-bone-300 uppercase">
                        Board {activeSkateIndex + 1} · configured
                      </span>
                      <span className="font-mono text-[11px] tracking-[0.18em] text-bone-50">
                        {selections[activeSkateIndex]?.deck}
                        {' · '}
                        {selections[activeSkateIndex]?.wheel}
                        {' · '}
                        {selections[activeSkateIndex]?.truck}
                      </span>
                    </div>
                    <span className="rounded-full bg-bone-50/5 px-3 py-1 font-mono text-[9px] tracking-[0.24em] text-bone-300 uppercase ring-1 ring-bone-50/10">
                      Drag · pinch
                    </span>
                  </div>
                </motion.footer>

                {/* Desktop chrome — minimalist floating Back pill +
                    bottom-right package meta. Hidden below `md` because
                    the structured mobile bars above replace them. */}
                <motion.button
                  type="button"
                  onClick={() => setPreviewExpanded(false)}
                  data-cursor="link"
                  aria-label="Close fullscreen preview and return"
                  initial={{ y: -16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ y: -16, opacity: 0 }}
                  className="absolute top-10 left-10 z-10 hidden items-center gap-3 rounded-full bg-ink-900/85 px-5 py-3 font-mono text-xs tracking-[0.28em] text-bone-50 uppercase ring-1 ring-bone-50/15 backdrop-blur-xl transition-colors hover:bg-ink-900 md:inline-flex"
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.35 } }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute right-10 bottom-10 z-10 hidden font-mono text-[10px] tracking-[0.32em] text-bone-300 uppercase md:block"
                >
                  <span className="text-bone-100">
                    {packageSize}-board package
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}
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
  const [copied, setCopied] = useState(false);
  const trackHref = `/track-order?id=${encodeURIComponent(order.id)}&phone=${encodeURIComponent(order.customer.phone)}`;

  async function copyId() {
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked - silent; the user can still select the
      // text in the box manually.
    }
  }

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

      {/* Demo banner — front-and-center so nobody thinks they actually
          bought a fingerboard. Sits between the headline and the courier
          copy so it's the first paragraph the customer reads. */}
      <div
        className="w-full max-w-xl rounded-2xl border border-ember-500/40 px-5 py-4"
        style={{ background: 'rgba(255, 91, 20, 0.08)' }}
        role="note"
      >
        <p className="font-mono text-[10px] tracking-[0.28em] text-ember-300 uppercase">
          Heads up — this is a demo
        </p>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-bone-100">
          PocketDeck is a portfolio piece. Your order won&rsquo;t actually
          ship, nobody will call, and no money was charged — every order is
          a test of the flow. If you&rsquo;d like a site like this built for
          you, reach me through my portfolio at{' '}
          <a
            href="https://pistasspot.com"
            target="_blank"
            rel="noreferrer"
            className="font-mono tracking-[0.06em] text-ember-400 underline-offset-4 transition-colors hover:text-ember-300 hover:underline"
          >
            pistasspot.com
          </a>
          .
        </p>
      </div>

      <p
        className="max-w-xl font-sans text-bone-50"
        style={{ fontSize: '1.0625rem', lineHeight: 'var(--leading-body)' }}
      >
        We saved the build, locked the stock, and queued the call. Expect a
        ring from the courier in the next hour to confirm the address, then
        delivery within {eta}.
      </p>

      {/* Full order id surfaced so the customer can plug it into
          /track-order on any device. The 6-char short id at the top
          is just for human-friendliness; the lookup requires the
          full 24-char value. */}
      <div
        className="w-full max-w-xl rounded-2xl border border-ember-500/30 p-5"
        style={{ background: 'rgba(255, 91, 20, 0.06)' }}
      >
        <p className="font-mono text-[10px] tracking-[0.28em] text-ember-300 uppercase">
          Your tracking ID
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 overflow-x-auto rounded-lg bg-ink-950/60 px-3 py-2.5 font-mono text-[12px] tracking-wider text-bone-50">
            {order.id}
          </code>
          <button
            type="button"
            onClick={copyId}
            className="shrink-0 rounded-full border border-bone-50/15 px-4 py-2 font-mono text-[10px] tracking-[0.22em] text-bone-50 uppercase transition-colors hover:border-ember-500/50 hover:text-ember-300"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-3 font-sans text-[12px] text-bone-300">
          Keep this safe — you&rsquo;ll need it (plus your phone number)
          to look up the order on the tracking page.
        </p>
        <Link
          href={trackHref}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ember-500 px-5 py-2.5 font-mono text-[11px] tracking-[0.24em] text-ink-950 uppercase transition-opacity hover:opacity-90"
        >
          Track this order →
        </Link>
      </div>

      <dl
        className="grid w-full max-w-md gap-5 rounded-2xl border border-bone-50/10 p-7"
        style={{ background: 'rgba(245, 245, 240, 0.04)' }}
      >
        <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
          <dt className="tracking-[0.24em] text-bone-300 uppercase">Package</dt>
          <dd className="text-right text-bone-50">
            {order.packageSize} board{order.packageSize > 1 ? 's' : ''}
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
  packageSize: 1 | 2 | 3,
  selections: { deck: string }[],
): string {
  if (!product) return '—';
  // Mirror packageTotalEGP() from @pocketdeck/types but with a forgiving
  // signature so we can call it before the full Order type is wired in.
  const PACKAGE_BASES = { 1: 350, 2: 600, 3: 800 } as const;
  let surcharge = 0;
  for (const sel of selections) {
    const deck = product.options.deck.find((d) => d.value === sel.deck);
    surcharge += deck?.priceModifier ?? 0;
  }
  const total = PACKAGE_BASES[packageSize] + surcharge;
  return new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(total);
}
