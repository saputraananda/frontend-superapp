import {
  countTotalBarang,
  formatCustomerItemName,
  formatItemTitle,
  getCashierStamp,
  getEstimasiLabel,
  getItemQtyCount,
  getOutletAddress,
  getOutletPhone,
  getPaymentStatusShort,
  getQrValue,
  getRackOrMeta,
  getReceivedLabel,
  getRemaining,
  getUnitPrice,
  PERHATIAN_ITEMS,
  rupiah,
} from "./notaLayout.js";
import { on } from "./printerSettings.js";

export const NOTA_WIDTH = 32;
export const NOTA_DASH = "-".repeat(26);

export function wrapNotaText(str, width = NOTA_WIDTH) {
  const text = String(str || "").trim();
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > width ? w.slice(0, width) : w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export function padNotaRow(left, right, width = NOTA_WIDTH) {
  const l = String(left || "");
  const r = String(right || "");
  const gap = Math.max(1, width - l.length - r.length);
  return `${l}${" ".repeat(gap)}${r}`.slice(0, width);
}

function pushText(rows, text, opts = {}) {
  if (!text && text !== 0) return;
  rows.push({ type: "text", text: String(text), align: "left", bold: false, size: "normal", ...opts });
}

function pushDash(rows) {
  rows.push({ type: "dash" });
}

function pushBlank(rows) {
  rows.push({ type: "blank" });
}

function buildHeaderRows(receipt, settings, variant) {
  const lines = [];
  if (variant === "internal") {
    if (on(settings, "show_customer_name")) lines.push(receipt.customerName || "—");
    if (on(settings, "show_customer_phone")) lines.push(receipt.customerPhone || "—");
    lines.push(getRackOrMeta(receipt));
  } else {
    lines.push("Waschen Laundry");
    if (on(settings, "show_outlet_name")) lines.push(receipt.branch || "—");
    if (on(settings, "show_outlet_name")) lines.push(getOutletAddress(receipt));
    lines.push(getOutletPhone(receipt));
  }

  return {
    type: "header",
    qr: on(settings, "show_qr") ? getQrValue(receipt) : null,
    lines: lines.filter(Boolean),
  };
}

export function buildInternalNotaModel(receipt, settings) {
  const rows = [];
  rows.push(buildHeaderRows(receipt, settings, "internal"));
  pushBlank(rows);

  pushText(rows, receipt.id || receipt.barcode, { size: "huge", bold: true });

  if (on(settings, "show_outlet_name")) {
    pushText(rows, `Outlet : ${receipt.branch || "—"}`);
  }
  if (on(settings, "show_datetime")) {
    pushText(rows, `Terima : ${getReceivedLabel(receipt)}`);
    pushText(rows, `Estimasi Selesai : ${getEstimasiLabel(receipt)}`);
  }
  if (on(settings, "show_perfume")) {
    pushText(rows, padNotaRow("Parfum :", receipt.perfume || "—"));
  }
  if (on(settings, "show_notes") && receipt.generalNotes && receipt.generalNotes !== "-") {
    pushText(rows, receipt.generalNotes);
  }

  pushDash(rows);
  pushText(rows, "Layanan :", { bold: true });
  for (const item of receipt.items || []) {
    pushText(rows, `> ${formatItemTitle(item)}`);
  }

  if (on(settings, "show_payment")) {
    pushDash(rows);
    pushText(rows, padNotaRow("Sisa bayar :", rupiah(getRemaining(receipt))), { bold: true });
    pushText(rows, getPaymentStatusShort(receipt), { align: "center", bold: true });
  }

  return rows;
}

export function buildCustomerNotaModel(receipt, settings) {
  const rows = [];
  rows.push(buildHeaderRows(receipt, settings, "customer"));
  pushBlank(rows);

  pushText(rows, padNotaRow("Nota :", receipt.id || "—"));
  if (on(settings, "show_customer_name")) {
    pushText(rows, padNotaRow("Customer :", receipt.customerName || "—"));
  }
  if (on(settings, "show_customer_phone")) {
    pushText(rows, padNotaRow("Telp :", receipt.customerPhone || "—"));
  }
  if (on(settings, "show_datetime")) {
    pushText(rows, padNotaRow("Terima :", getReceivedLabel(receipt)));
    pushText(rows, padNotaRow("Estimasi Selesai :", getEstimasiLabel(receipt)));
  }
  if (on(settings, "show_perfume")) {
    pushText(rows, padNotaRow("Parfum :", receipt.perfume || "—"));
  }
  if (on(settings, "show_customer_address")) {
    pushText(rows, padNotaRow("Alamat Konsumen :", receipt.customerAddress || "Kosong"));
  }

  pushDash(rows);
  pushText(rows, "Layanan :", { bold: true });

  for (const item of receipt.items || []) {
    const subtotal = Number(item.effectiveSubtotal ?? item.subtotal) || 0;
    const lineName = formatCustomerItemName(item);
    if (on(settings, "show_item_price")) {
      pushText(rows, padNotaRow(lineName, rupiah(subtotal)));
      pushText(rows, `@ ${rupiah(getUnitPrice(item))}`);
      pushText(rows, `- ${getItemQtyCount(item)} Barang`);
    } else {
      pushText(rows, lineName);
    }
    if (on(settings, "show_item_detail")) {
      const details = [item.brand, item.color, item.size].filter((v) => v && v !== "-");
      if (details.length) pushText(rows, details.join(" · "));
    }
  }

  pushText(rows, `Total item: ${countTotalBarang(receipt.items)} Item`);

  if (on(settings, "show_total")) {
    pushDash(rows);
    pushText(rows, padNotaRow("Total :", rupiah(receipt.grandTotal)), { bold: true });
    pushText(rows, padNotaRow("Grand Total :", rupiah(receipt.grandTotal)), { bold: true, size: "tall" });
  }

  if (on(settings, "show_payment")) {
    const method = receipt.paymentMethod && receipt.paymentMethod !== "-" ? receipt.paymentMethod : "—";
    const paid = Number(receipt.paidAmount) || 0;
    if (paid > 0) {
      pushText(rows, padNotaRow("Pembayaran :", `- ${method} ${rupiah(paid)}`));
    }
    pushDash(rows);
    pushText(rows, padNotaRow("Status :", getPaymentStatusShort(receipt)), { bold: true, size: "tall" });
  }

  if (on(settings, "show_discount") && Number(receipt.discountAmount) > 0) {
    pushText(rows, padNotaRow("Diskon :", `- ${rupiah(receipt.discountAmount)}`));
  }

  if (on(settings, "show_member_balance") && receipt.customerBalance != null) {
    pushText(rows, padNotaRow("Saldo Member :", rupiah(receipt.customerBalance)));
  }

  if (on(settings, "show_cashier")) {
    pushBlank(rows);
    pushText(rows, getCashierStamp(receipt));
  }

  if (on(settings, "show_perhatian")) {
    pushBlank(rows);
    pushText(rows, "PERHATIAN :", { bold: true });
    PERHATIAN_ITEMS.forEach((item, idx) => {
      pushText(rows, `${idx + 1}. ${item}`);
    });
  }

  if (on(settings, "show_footer_thanks")) {
    pushBlank(rows);
    pushText(rows, "Terima kasih", { align: "center", bold: true });
  }

  return rows;
}

export function buildNotaModel(receipt, settings, variant = "customer") {
  if (variant === "internal") return buildInternalNotaModel(receipt, settings);
  return buildCustomerNotaModel(receipt, settings);
}
