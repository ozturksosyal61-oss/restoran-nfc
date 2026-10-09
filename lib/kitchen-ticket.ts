"use client";

import type { BoardOrder } from "./staff-board";

// Mutfak fişi: 80 mm termal yazıcı için, fiyatsız. Gizli bir çerçevede
// hazırlanıp tarayıcının yazdırma komutuyla basılır. Chrome
// "--kiosk-printing" ile açılırsa yazdırma penceresi çıkmadan doğrudan basar.

function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function ticketHtml(order: BoardOrder, restaurantName: string) {
  const time = new Date(order.createdAt).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const items = order.items
    .map((item) => `<tr><td class="q">${item.quantity}×</td><td>${escape(item.name)}</td></tr>`)
    .join("");
  const customer = order.customer && order.customer !== "Misafir" ? `<p>${escape(order.customer)}</p>` : "";
  const note = order.note ? `<p class="note">NOT: ${escape(order.note)}</p>` : "";

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Fiş #${order.number}</title><style>
@page { size: 80mm auto; margin: 0; }
* { box-sizing: border-box; }
body { width: 72mm; margin: 0 auto; padding: 4mm 0 8mm; font: 13px/1.35 "Courier New", monospace; color: #000; }
h1 { margin: 0; font-size: 30px; text-align: center; letter-spacing: 1px; }
.meta { display: flex; justify-content: space-between; margin: 2mm 0; font-size: 13px; }
.brand { text-align: center; font-size: 11px; margin: 0 0 2mm; }
hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
table { width: 100%; border-collapse: collapse; font-size: 16px; font-weight: 700; }
td { padding: 1mm 0; vertical-align: top; }
td.q { width: 12mm; white-space: nowrap; }
.note { margin: 2mm 0 0; padding: 1.5mm; border: 2px solid #000; font-size: 15px; font-weight: 700; }
p { margin: 1mm 0; }
</style></head><body>
<p class="brand">${escape(restaurantName)} · MUTFAK</p>
<h1>MASA ${escape(order.table)}</h1>
<div class="meta"><span>#${order.number}</span><span>${time}</span></div>
<hr><table>${items}</table><hr>
${customer}${note}
</body></html>`;
}

// Sırayla basılır; yazdırma penceresi açıkken gelen fiş bir sonrakini bekler.
let queue: Promise<void> = Promise.resolve();

export function printKitchenTicket(order: BoardOrder, restaurantName: string) {
  queue = queue.then(
    () =>
      new Promise<void>((resolve) => {
        const frame = document.createElement("iframe");
        frame.setAttribute("aria-hidden", "true");
        frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
        document.body.appendChild(frame);

        const finish = () => {
          window.setTimeout(() => {
            frame.remove();
            resolve();
          }, 500);
        };

        frame.onload = () => {
          try {
            frame.contentWindow?.focus();
            frame.contentWindow?.print();
          } finally {
            finish();
          }
        };
        frame.srcdoc = ticketHtml(order, restaurantName);
      })
  );
  return queue;
}
