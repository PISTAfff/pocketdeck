/**
 * Invoice HTML builder.
 *
 * Produces a self-contained, print-ready document. We render it inside
 * an iframe in the admin app (see `InvoiceModal.tsx`) rather than a
 * popup so the admin page never navigates away and popup blockers are
 * a non-issue. Calling `iframe.contentWindow.print()` scopes the print
 * dialog to the invoice document, so "Save as PDF" in the system
 * dialog produces the invoice — not the admin page.
 */
import type { Order } from '@pocketdeck/types';
import { PACKAGE_OFFERS } from '@pocketdeck/types';
import { formatEGP } from './format';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Per-deck surcharge. Matches the product seed — premium graphics add
 * 75 EGP each (per the configurator copy "Premium decks add 75 EGP").
 * Kept here as a static lookup so the invoice can break down per-board
 * costs without needing the live product document.
 */
const DECK_SURCHARGE: Record<string, number> = {
  noir: 0,
  sunburst: 75,
  circuit: 75,
  'gold-leaf': 75,
};

interface BoardLine {
  baseShare: number;
  surcharge: number;
  total: number;
}

/**
 * Split the order total across its boards. Each board gets:
 *   - an equal share of the package base price (last board absorbs any
 *     integer rounding remainder so the sum stays exact)
 *   - its own deck surcharge from DECK_SURCHARGE
 * Sum of all boards' `total` equals `order.totalEGP`.
 */
function computeBoardLines(order: Order): BoardLine[] {
  const offer = PACKAGE_OFFERS.find((o) => o.size === order.packageSize);
  const packageBase = offer?.basePriceEGP ?? 0;
  const n = Math.max(1, order.selections.length);
  const baseShare = Math.floor(packageBase / n);
  const remainder = packageBase - baseShare * n;
  return order.selections.map((sel, i) => {
    const surcharge = DECK_SURCHARGE[sel.deck] ?? 0;
    const myBase = baseShare + (i === n - 1 ? remainder : 0);
    return { baseShare: myBase, surcharge, total: myBase + surcharge };
  });
}

export function buildInvoiceHtml(order: Order): string {
  const created = order.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : '—';
  const idShort = order.id.slice(-8).toUpperCase();
  const lines = computeBoardLines(order);
  const offer = PACKAGE_OFFERS.find((o) => o.size === order.packageSize);
  const packageBase = offer?.basePriceEGP ?? 0;
  const upgradesTotal = lines.reduce((sum, l) => sum + l.surcharge, 0);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>PocketDeck invoice ${escape(idShort)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #0a0a0a; font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif; }
  .page { max-width: 820px; margin: 0 auto; padding: 56px 64px 72px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 32px; border-bottom: 2px solid #0a0a0a; padding-bottom: 24px; }
  h1 { font-family: 'Anton', 'Archivo Black', Impact, sans-serif; font-weight: 400; font-size: 44px; letter-spacing: 0.02em; margin: 0; text-transform: uppercase; }
  .ember { color: #ff5b14; }
  .mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
  .kicker { font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase; color: #6b6b6b; margin-bottom: 6px; display: block; }
  .meta { text-align: right; font-size: 12px; color: #4a4a4a; min-width: 200px; }
  .meta strong { color: #0a0a0a; font-size: 13px; }
  .meta p { margin: 0 0 12px; }
  .meta p:last-child { margin-bottom: 0; }
  section { margin-top: 32px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .field-label { font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #6b6b6b; margin-bottom: 6px; }
  .field-value { font-size: 14px; color: #0a0a0a; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { padding: 12px 8px; text-align: left; }
  th { font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #6b6b6b; border-bottom: 1px solid #d0d0d0; }
  td { border-bottom: 1px solid #eee; vertical-align: top; }
  td.amount, th.amount { text-align: right; }
  .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
  .totals table { width: 320px; }
  .totals td { border: none; padding: 6px 0; }
  .totals tr.grand td { border-top: 2px solid #0a0a0a; padding-top: 12px; font-weight: 800; font-size: 18px; }
  footer { margin-top: 56px; padding-top: 20px; border-top: 1px solid #d0d0d0; font-size: 11px; color: #6b6b6b; display: flex; justify-content: space-between; gap: 16px; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; border: 1px solid #0a0a0a; color: #0a0a0a; }
  @media print {
    /* Remove the browser's own page margin and rely on .page's
       padding instead. Some browsers ignore @page margin or replace it
       with their print-dialog "Default" setting, which is why the
       previous "@page { margin: 16mm }" rule wasn't applied. Keeping
       the padding in CSS guarantees the saved PDF has breathing room
       regardless of what the user picks in the print dialog. */
    @page { margin: 0; }
    html, body { background: #fff; }
    .page { max-width: none; padding: 18mm 20mm 22mm; }
  }
</style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <span class="kicker mono">Invoice</span>
        <h1>Pocket<span class="ember">Deck.</span></h1>
        <p class="mono" style="margin:8px 0 0;color:#6b6b6b;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">Fingerboard in your pocket</p>
      </div>
      <div class="meta mono">
        <p><span class="kicker">Invoice no.</span><strong>#${escape(idShort)}</strong></p>
        <p><span class="kicker">Issued</span>${escape(created)}</p>
        <p><span class="kicker">Status</span><span class="status">${escape(order.status)}</span></p>
      </div>
    </header>

    <section class="grid">
      <div>
        <p class="field-label">Billed to</p>
        <p class="field-value"><strong>${escape(order.customer.name)}</strong></p>
        <p class="field-value mono" style="margin-top:6px;">${escape(order.customer.phone)}</p>
        <p class="field-value" style="margin-top:6px;">${escape(order.customer.address)}</p>
        <p class="field-value" style="margin-top:2px;">${escape(order.customer.governorate)}</p>
      </div>
      <div>
        <p class="field-label">Shipped from</p>
        <p class="field-value"><strong>PocketDeck workshop</strong></p>
        <p class="field-value" style="margin-top:6px;">Cairo, Egypt</p>
        <p class="field-value mono" style="margin-top:6px;">orders@pocketdeck.local</p>
      </div>
    </section>

    <section>
      <p class="field-label">Build summary · ${order.packageSize}-board package</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>SKU</th>
            <th>Configuration</th>
            <th class="amount">Board cost</th>
          </tr>
        </thead>
        <tbody>
          ${order.selections
            .map((sel, i) => {
              const line = lines[i]!;
              const surchargeNote =
                line.surcharge > 0
                  ? `<span style="color:#ff5b14;">+${escape(formatEGP(line.surcharge))}</span> deck upgrade`
                  : `<span style="color:#6b6b6b;">no upgrades</span>`;
              return `
          <tr>
            <td class="mono" style="font-size:12px;color:#6b6b6b;">${i + 1}</td>
            <td class="mono" style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${escape(order.skus[i] ?? '')}</td>
            <td>
              <strong>Board ${i + 1}</strong>
              <div class="mono" style="margin-top:4px;font-size:11px;color:#6b6b6b;letter-spacing:0.12em;text-transform:uppercase;">
                Deck · ${escape(sel.deck)}<br/>
                Wheels · ${escape(sel.wheel)}<br/>
                Trucks · ${escape(sel.truck)}<br/>
                Grip · ${escape(sel.grip)}
              </div>
            </td>
            <td class="amount">
              <strong>${escape(formatEGP(line.total))}</strong>
              <div style="margin-top:4px;font-size:11px;color:#6b6b6b;">
                ${escape(formatEGP(line.baseShare))} share &middot; ${surchargeNote}
              </div>
            </td>
          </tr>`;
            })
            .join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>${escape(offer?.label ?? 'Package')} package base</td>
            <td class="amount">${escape(formatEGP(packageBase))}</td>
          </tr>
          ${
            upgradesTotal > 0
              ? `<tr>
            <td>Deck upgrades</td>
            <td class="amount">+${escape(formatEGP(upgradesTotal))}</td>
          </tr>`
              : ''
          }
          <tr><td>Subtotal</td><td class="amount">${escape(formatEGP(order.totalEGP))}</td></tr>
          <tr><td>Shipping</td><td class="amount">Included</td></tr>
          <tr class="grand"><td>Total due</td><td class="amount">${escape(formatEGP(order.totalEGP))}</td></tr>
        </table>
      </div>
    </section>

    <footer>
      <span>Thanks for skating with PocketDeck.</span>
      <span class="mono">${escape(idShort)} · ${escape(created)}</span>
    </footer>
  </div>
</body>
</html>`;
}
