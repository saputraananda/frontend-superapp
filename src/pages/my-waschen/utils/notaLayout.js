export const PERHATIAN_ITEMS = [
  "Cucian yang tidak diambil lebih dari 14 hari akan dikenakan biaya penyimpanan.",
  "Cucian yang tidak diambil lebih dari 30 hari dianggap sudah tidak diambil.",
  "Waschen Laundry tidak bertanggung jawab atas kehilangan barang berharga.",
  "Klaim kehilangan/kerusakan maksimal 3 hari setelah pengambilan.",
  "Nota wajib dibawa saat pengambilan cucian.",
  "Periksa cucian Anda sebelum meninggalkan outlet.",
  "Barang hilang/rusak tanpa nota tidak dapat diproses.",
  "Terima kasih atas kepercayaan Anda.",
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function rupiah(n) {
  const v = Math.round(Number(n) || 0);
  return `Rp${v.toLocaleString("id-ID")}`;
}

export function formatNotaDateTime(value, addDays = 0) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  if (addDays) d.setDate(d.getDate() + addDays);
  const day = DAY_NAMES[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}, ${dd}/${mm}/${yy} ${hh}:${min}`;
}

export function getQrValue(receipt) {
  const id = encodeURIComponent(receipt?.id || receipt?.barcode || "");
  return `${window.location.origin}/my-waschen/transactions/${id}`;
}

export function getRemaining(receipt) {
  const total = Number(receipt?.grandTotal) || 0;
  const paid = Number(receipt?.paidAmount) || 0;
  return Math.max(0, total - paid);
}

export function getPaymentStatusShort(receipt) {
  const ps = receipt?.paymentStatus || "Outstanding";
  if (ps === "Lunas") return "Lunas";
  if (ps === "DP") return "DP";
  return "Belum Lunas";
}

export function getReceivedLabel(receipt) {
  return formatNotaDateTime(receipt?.createdAtRaw || receipt?.orderDate || receipt?.createdAt);
}

export function getEstimasiLabel(receipt) {
  if (receipt?.estimatedFinishedAt) {
    return formatNotaDateTime(receipt.estimatedFinishedAt);
  }
  if (receipt?.estimatedAt || receipt?.estimatedCompletion) {
    return receipt.estimatedAt || receipt.estimatedCompletion;
  }
  const addDays = receipt?.isExpress ? 1 : 2;
  return formatNotaDateTime(receipt?.createdAtRaw || receipt?.orderDate || receipt?.createdAt, addDays);
}

export function getOutletPhone(receipt) {
  return receipt?.outletPhone || receipt?.customerPhone || "—";
}

export function getOutletAddress(receipt) {
  return receipt?.outletAddress || receipt?.branch || "—";
}

export function countTotalBarang(items) {
  return (items || []).reduce((sum, it) => {
    const q = Number(it.qty ?? it.qtyCount);
    return sum + (Number.isFinite(q) ? Math.max(1, Math.round(q)) : 1);
  }, 0);
}

export function formatItemTitle(item) {
  const qty = item.qtyDisplay || `${Number(item.qty) || 0} ${item.unit || ""}`.trim();
  const name = item.name || item.serviceName || "Layanan";
  const unitLabel = item.unit ? `(${item.unit})` : "";
  return `${qty} - ${name} ${unitLabel}`.trim();
}

export function formatCustomerItemName(item) {
  const name = item.name || item.serviceName || "Layanan";
  const qty = Number(item.qty) || 0;
  const unit = item.unit || (item.qtyDisplay || "").split(" ").slice(1).join(" ") || "Pcs";
  return `${name} ${qty} ${unit}`.trim();
}

export function getUnitPrice(item) {
  if (item.unitPrice != null) return Number(item.unitPrice) || 0;
  const qty = Number(item.qty) || 1;
  const sub = Number(item.effectiveSubtotal ?? item.subtotal) || 0;
  return qty > 0 ? sub / qty : sub;
}

export function getItemQtyCount(item) {
  const q = Number(item.qty);
  return Number.isFinite(q) && q > 0 ? Math.round(q) : 1;
}

export function getCashierStamp(receipt) {
  const raw = receipt?.createdAtRaw || receipt?.orderDate || receipt?.createdAt;
  const d = raw ? new Date(raw) : new Date();
  const dateStr = Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const name = receipt?.cashierName || "—";
  return `${dateStr}  ${name}`;
}

export function getRackOrMeta(receipt) {
  if (receipt?.rackNo) return String(receipt.rackNo);
  if (receipt?.queueNo) return String(receipt.queueNo);
  const pcs = Number(receipt?.totalPcs);
  if (pcs > 0) return String(pcs);
  return countTotalBarang(receipt?.items).toString();
}

export function formatEmployeeName(name) {
  if (!name) return "—";
  return String(name)
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
