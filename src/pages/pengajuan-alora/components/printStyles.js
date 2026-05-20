// ── Shared print CSS for PR & PO documents ───────────────────────────────────
// Self-contained — no external dependency (Tailwind CDN doesn't support arbitrary values)

export const PRINT_CSS = `
@page { size: A4 portrait; margin: 18mm 20mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 12px; color: #1e293b; background: #fff;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

/* Layout */
.flex { display: flex; } .items-start { align-items: flex-start; } .items-center { align-items: center; }
.justify-between { justify-content: space-between; } .text-right { text-align: right; } .text-center { text-align: center; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; }
.space-y > * + * { margin-top: 12px; }
.mb-4 { margin-bottom: 16px; } .mb-5 { margin-bottom: 20px; } .mb-6 { margin-bottom: 24px; }
.mt-6 { margin-top: 24px; } .mt-8 { margin-top: 32px; } .pt-4 { padding-top: 16px; }

/* Typography */
.text-2xl { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
.text-xl { font-size: 17px; font-weight: 900; }
.text-base { font-size: 14px; font-weight: 700; }
.text-sm { font-size: 12px; } .text-xs { font-size: 11px; } .text-xxs { font-size: 10px; }
.font-bold { font-weight: 700; } .font-extrabold { font-weight: 800; } .font-semibold { font-weight: 600; }
.uppercase { text-transform: uppercase; } .tracking-wider { letter-spacing: 0.05em; } .tracking-widest { letter-spacing: 0.1em; }
.mono { font-family: "Courier New", monospace; }
.tabular { font-variant-numeric: tabular-nums; }

/* Colors */
.text-900 { color: #0f172a; } .text-800 { color: #1e293b; } .text-700 { color: #334155; }
.text-600 { color: #475569; } .text-500 { color: #64748b; } .text-400 { color: #94a3b8; }
.text-300 { color: #cbd5e1; } .text-emerald { color: #059669; }

/* Kop */
.kop { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1e293b; padding-bottom: 18px; margin-bottom: 24px; }

/* Info section label */
.section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 12px; }
.info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 2px; }
.info-value { font-size: 13px; font-weight: 700; color: #1e293b; }
.info-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
.info-code { font-size: 11px; color: #94a3b8; margin-top: 1px; }
.info-item { margin-bottom: 10px; }

/* Table */
.item-table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; margin-bottom: 20px; }
.item-table thead tr { background: #f1f5f9; }
.item-table th { padding: 10px 12px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
.item-table th.r { text-align: right; } .item-table th.c { text-align: center; }
.item-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.item-table td.r { text-align: right; } .item-table td.c { text-align: center; }
.item-table td.no { color: #94a3b8; }
.item-name { font-weight: 700; color: #0f172a; font-size: 13px; }
.item-desc { font-size: 10px; color: #94a3b8; margin-top: 2px; }
.item-total { font-weight: 800; color: #059669; }
.item-table tfoot tr { background: #f8fafc; }
.item-table tfoot td { padding: 11px 12px; border-top: 2px solid #cbd5e1; font-weight: 700; color: #475569; }
.total-amount { font-size: 16px; font-weight: 900; color: #059669; }

/* Note box */
.note-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
.note-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 4px; }
.note-text { font-size: 12px; color: #475569; line-height: 1.5; }

/* Signature */
.sig-box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
.sig-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 10px; }
.sig-space { height: 52px; border-bottom: 1.5px dashed #cbd5e1; margin-bottom: 10px; }
.sig-name { font-size: 12px; font-weight: 700; color: #334155; }
.sig-role { font-size: 10px; color: #64748b; margin-top: 3px; }
.sig-date { font-size: 10px; color: #94a3b8; margin-top: 3px; }

/* Footer */
.doc-footer { display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 32px; }
`;

export function buildPrintWindow(title, bodyHTML) {
    const win = window.open("", "_blank", "width=900,height=750");
    win.document.open();
    win.document.write(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"/><title>${title}</title><style>${PRINT_CSS}</style></head><body>${bodyHTML}</body></html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
    setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 800);
}
