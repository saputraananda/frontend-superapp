import { api } from "../../../lib/api";
import { formatEmployeeName } from "./notaLayout.js";

export const FIELD_LABELS = [
  { key: "show_outlet_name", label: "Nama Outlet" },
  { key: "show_datetime", label: "Tanggal / Waktu" },
  { key: "show_customer_name", label: "Nama Pelanggan" },
  { key: "show_customer_phone", label: "No. Telepon" },
  { key: "show_customer_address", label: "Alamat Pelanggan" },
  { key: "show_cashier", label: "Nama Kasir" },
  { key: "show_item_price", label: "Harga Item" },
  { key: "show_item_detail", label: "Detail Item (merk/warna/ukuran)" },
  { key: "show_perfume", label: "Aroma Parfum" },
  { key: "show_express", label: "Tipe Pengerjaan" },
  { key: "show_delivery", label: "Tipe Pengambilan" },
  { key: "show_discount", label: "Diskon Promo" },
  { key: "show_total", label: "Total Tagihan" },
  { key: "show_payment", label: "Rincian Pembayaran" },
  { key: "show_member_balance", label: "Saldo Member" },
  { key: "show_notes", label: "Catatan Order" },
  { key: "show_qr", label: "QR Tracking" },
  { key: "show_perhatian", label: "Syarat & Ketentuan" },
  { key: "show_footer_thanks", label: "Footer Terima Kasih" },
];

export const DEFAULT_CUSTOMER_SETTINGS = Object.fromEntries(
  FIELD_LABELS.map((f) => [f.key, 1])
);

export const DEFAULT_INTERNAL_SETTINGS = {
  ...DEFAULT_CUSTOMER_SETTINGS,
  show_customer_address: 0,
  show_cashier: 0,
  show_item_price: 0,
  show_item_detail: 0,
  show_express: 0,
  show_delivery: 0,
  show_discount: 0,
  show_total: 0,
  show_member_balance: 0,
  show_perhatian: 0,
  show_footer_thanks: 0,
};

export function on(settings, key) {
  return Number(settings?.[key]) === 1;
}

export async function fetchPrinterSettings(outletId = 0) {
  const res = await api(`/waschen/printer-settings?outletId=${encodeURIComponent(outletId)}`);
  return res.data;
}

export async function savePrinterSettings(outletId, customer, internal) {
  const res = await api("/waschen/printer-settings", {
    method: "PUT",
    body: JSON.stringify({ outletId, customer, internal }),
  });
  return res.data;
}

export async function fetchLatestReceiptFromDb(outletId) {
  const preview = await api(
    `/waschen/printer-settings/preview-receipt${outletId ? `?outletId=${encodeURIComponent(outletId)}` : ""}`
  );
  if (!preview.data?.orderNo) return null;

  const detail = await api(`/waschen/transactions/${encodeURIComponent(preview.data.orderNo)}`);
  return mapDbTransactionToReceipt(detail.data);
}

/** Map response GET /waschen/transactions/:id → shape receipt kanonik. */
export function mapDbTransactionToReceipt(payload) {
  const order = payload?.order || {};
  const items = payload?.items || [];

  const createdAtRaw = order.orderDate || order.createdAt || null;
  const createdAt = createdAtRaw
    ? new Date(createdAtRaw).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const speed = String(order.speedName || "").toLowerCase();
  const isExpress = speed.includes("express") || speed.includes("kilat") || speed.includes("1x24");

  return {
    id: order.orderNo || order.id,
    dbId: order.id,
    barcode: order.barcode || order.orderNo,
    branch: order.branch || order.outletName || "Waschen Laundry",
    outletAddress: order.outletAddress || null,
    outletPhone: null,
    createdAt,
    createdAtRaw,
    orderDate: order.orderDate,
    customerName: order.customerName || "—",
    customerPhone: order.customerPhone || "—",
    customerAddress: order.customerAddress || "—",
    cashierName: formatEmployeeName(order.cashierName),
    items: items.map((item) => ({
      name: item.service_name || item.name || "Layanan",
      qty: Number(item.qty) || 0,
      unit: item.unit || "Pcs",
      qtyDisplay: `${Number(item.qty) || 0} ${item.unit || ""}`.trim(),
      unitPrice: Number(item.unit_price) || 0,
      effectiveSubtotal: Number(item.subtotal) || 0,
      subtotal: Number(item.subtotal) || 0,
      isDryClean: Number(item.laundry_method_id) === 2 || item.laundry_method_code === "DC",
      isCleanox: Boolean(item.is_cleanox),
      laundry_method_code: Number(item.laundry_method_id) === 2 ? "DC" : "WC",
      size: item.size || "-",
      brand: item.brand || "-",
      color: item.color || "-",
      note: item.condition_notes || "-",
    })),
    perfume: order.parfumeName || "—",
    isExpress,
    isDelivery: Boolean(order.isDelivery),
    discountAmount: Number(order.discountAmount) || 0,
    grandTotal: Number(order.grandTotal) || 0,
    paidAmount: Number(order.paidAmount) || 0,
    changeAmount: Number(order.changeAmount) || 0,
    depositAdded: Number(order.depositAdded) || 0,
    paymentStatus: order.paymentStatus || "Outstanding",
    paymentMethod: order.paymentMethod || "-",
    paymentBatchNo: order.paymentBatchNo || null,
    customerBalance: order.depositBalance != null ? Number(order.depositBalance) : null,
    generalNotes: order.specialNotes || order.generalNotes || "-",
    estimatedFinishedAt: order.estimatedFinishedAt || null,
    totalPcs: Number(order.totalPcs) || 0,
    totalWeightKg: Number(order.totalWeightKg) || 0,
    outletId: order.outletId,
  };
}

/** Alias backward-compat untuk komponen lama. */
export const mapTxnToThermalReceipt = mapDbTransactionToReceipt;
