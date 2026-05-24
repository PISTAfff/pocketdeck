'use client';

/**
 * Invoice preview overlay.
 *
 * Renders the invoice HTML inside an iframe so the admin page never
 * navigates away (popups get blocked in many browsers, and
 * `window.location.assign` on a blob URL would have destroyed the
 * current page). The Print button calls `iframe.contentWindow.print()`,
 * which scopes the print dialog to the invoice document — picking
 * "Save as PDF" in that dialog produces the invoice file, not the
 * admin app.
 *
 * ESC and the backdrop close it. Mounted by OrdersPanel.
 */
import { useEffect, useRef } from 'react';
import type { Order } from '@pocketdeck/types';
import { buildInvoiceHtml } from './invoice';

interface Props {
  order: Order | null;
  onClose: () => void;
}

export function InvoiceModal({ order, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!order) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [order, onClose]);

  if (!order) return null;

  const html = buildInvoiceHtml(order);
  const idShort = order.id.slice(-8).toUpperCase();

  function print() {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    // Focus the iframe first; some browsers require the printable
    // window to be focused for `print()` to target it (otherwise the
    // top-level page prints instead).
    w.focus();
    w.print();
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-ink-950/85 backdrop-blur-sm">
      <header className="flex shrink-0 items-center gap-3 border-b border-bone-50/10 bg-ink-950 px-5 py-3">
        <p className="flex-1 font-mono text-[11px] tracking-[0.26em] text-bone-50 uppercase">
          Invoice · #{idShort}
        </p>
        <button
          type="button"
          onClick={print}
          className="rounded-full bg-ember-500 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-ink-950 uppercase transition-opacity hover:opacity-90"
        >
          Print / Save PDF
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-bone-50/15 px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-bone-200 uppercase transition-colors hover:border-ember-500/40 hover:text-ember-500"
        >
          Close
        </button>
      </header>

      <div className="flex-1 overflow-hidden p-4 sm:p-6">
        <div className="mx-auto h-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <iframe
            ref={iframeRef}
            title={`Invoice ${idShort}`}
            srcDoc={html}
            className="block h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
