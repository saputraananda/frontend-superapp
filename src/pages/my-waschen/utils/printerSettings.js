import { api } from "../../../lib/api";
import { formatEmployeeName } from "./notaLayout.js";

export const PERHATIAN_ITEMS = [
  "Pengambilan barang harap disertai nota",
  "Barang tidak diambil >1 bulan: biaya penyimpanan Rp1.000/hari",
  "Barang tidak diambil >2 bulan jika hilang/rusak diluar tanggung jawab kami",
  "Barang hilang/rusak karena proses pengerjaan diganti maksimal 10x biaya cuci, Rp300.000",
  "Klaim luntur tidak dipisah diluar tanggungan",
  "Hak klaim berlaku 2 jam setelah barang diambil",
  "Kami tidak bertanggung jawab atas kerusakan karena force majeure seperti bencana alam dll.",
  "Setiap konsumen dianggap setuju dengan isi perhitungan tersebut diatas",
];

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

export const DEFAULT_CUSTOMER_SETTINGS = {
  show_outlet_name: 1,
  show_datetime: 1,
  show_customer_name: 1,
  show_customer_phone: 1,
  show_customer_address: 1,
  show_cashier: 1,
  show_item_price: 1,
  show_item_detail: 1,
  show_perfume: 1,
  show_express: 1,
  show_delivery: 1,
  show_discount: 1,
  show_total: 1,
  show_payment: 1,
  show_member_balance: 1,
  show_notes: 1,
  show_qr: 1,
  show_perhatian: 1,
  show_footer_thanks: 1,
};

export const DEFAULT_INTERNAL_SETTINGS = {
  show_outlet_name: 1,
  show_datetime: 1,
  show_customer_name: 1,
  show_customer_phone: 1,
  show_customer_address: 0,
  show_cashier: 1,
  show_item_price: 0,
  show_item_detail: 1,
  show_perfume: 1,
  show_express: 1,
  show_delivery: 1,
  show_discount: 0,
  show_total: 0,
  show_payment: 0,
  show_member_balance: 0,
  show_notes: 1,
  show_qr: 1,
  show_perhatian: 0,
  show_footer_thanks: 0,
};

export function on(settings, key) {
  return Number(settings?.[key]) === 1;
}

export async function fetchPrinterSettings(outletId = 0) {
  try {
    const res = await api(`/waschen/printer-settings?outletId=${encodeURIComponent(outletId)}`);
    const payload = res?.data || {};
    return {
      outletId: payload.outletId ?? outletId,
      customer: { ...DEFAULT_CUSTOMER_SETTINGS, ...payload.customer },
      internal: { ...DEFAULT_INTERNAL_SETTINGS, ...payload.internal },
      fieldLabels: payload.fieldLabels || FIELD_LABELS,
    };
  } catch (err) {
    console.error("fetchPrinterSettings:", err);
    return {
      outletId: Number(outletId) || 0,
      customer: { ...DEFAULT_CUSTOMER_SETTINGS },
      internal: { ...DEFAULT_INTERNAL_SETTINGS },
      fieldLabels: FIELD_LABELS,
    };
  }
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

/** Map response transaksi → receipt kanonik (sama kontrak my-waschen-new). */
export function mapDbTransactionToReceipt(payload) {
  if (!payload) return null;

  const order = payload.order ? payload.order : payload;
  const items = payload.items || payload.order?.items || order.items || [];

  const createdAtRaw = order.orderDate || order.createdAt || order.order_date || null;
  const createdAt = createdAtRaw
    ? new Date(createdAtRaw).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const speed = String(order.speedName || order.speed_name || "").toLowerCase();
  const isExpress = speed.includes("express") || speed.includes("kilat") || speed.includes("1x24")
    || Number(order.speed_surcharge) > 0;

  const paid = Number(order.paidAmount ?? order.paid_amount) || 0;
  const grand = Number(order.grandTotal ?? order.grand_total) || 0;
  const branch = order.branch || order.outletName || order.outlet_name || "Waschen Laundry";
  const outletAddr = order.outletAddress || order.outlet_address || branch;

  return {
    id: order.orderNo || order.order_no || order.id,
    dbId: order.id,
    barcode: order.barcode || order.orderNo || order.order_no,
    branch,
    outletAddress: outletAddr,
    outletPhone: order.outletPhone || order.outlet_phone || localStorage.getItem("activeOutletPhone") || "",
    createdAt,
    createdAtRaw,
    orderDate: order.orderDate || order.order_date,
    customerName: order.customerName || order.customer_name || "Pelanggan",
    customerPhone: order.customerPhone || order.customer_phone || "-",
    customerAddress: order.customerAddress || order.customer_address || "",
    cashierName: order.cashierName || order.cashier_name || "Kasir Waschen",
    cashierFullName: formatEmployeeName(order.cashierName || order.cashier_name),
    items: (items || []).map((item) => {
      const qty = parseFloat(item.qty) || 0;
      const unit = item.unit || "Pcs";
      return {
        name: item.service_name || item.name || "Layanan",
        qty,
        unit,
        qtyDisplay: `${qty} ${unit}`.trim(),
        unitPrice: Number(item.unit_price ?? item.unitPrice) || 0,
        effectiveSubtotal: Number(item.subtotal ?? item.effectiveSubtotal) || 0,
        subtotal: Number(item.subtotal) || 0,
        isDryClean: Number(item.laundry_method_id) === 2 || item.laundry_method_code === "DC" || item.is_dry_clean === 1,
        isCleanox: Boolean(item.is_cleanox),
        laundry_method_code: item.laundry_method_code || (Number(item.laundry_method_id) === 2 ? "DC" : "WC"),
        size: item.size || "-",
        brand: item.brand || "-",
        color: item.color || "-",
        note: item.condition_notes || item.note || "-",
      };
    }),
    perfume: order.parfumeName || order.parfume_name || "Tanpa parfum",
    isExpress,
    isDelivery: Boolean(order.isDelivery ?? order.is_delivery),
    discountAmount: Number(order.discountAmount ?? order.discount_amount) || 0,
    grandTotal: grand,
    paidAmount: paid,
    changeAmount: Number(order.changeAmount ?? order.change_amount) || 0,
    depositAdded: Number(order.depositAdded ?? order.deposit_added) || 0,
    paymentStatus: order.paymentStatus || order.payment_status || (paid >= grand && grand > 0 ? "Lunas" : "Outstanding"),
    paymentMethod: order.paymentMethod || order.payment_method || "-",
    paymentBatchNo: order.paymentBatchNo || order.payment_batch_no || null,
    customerBalance: Number(order.depositBalance ?? order.member_balance ?? order.customer_deposit_balance ?? 0) || 0,
    generalNotes: order.specialNotes || order.special_notes || order.generalNotes || "",
    rackNo: order.rackNo || order.rack_no || order.queueNo || order.queue_no || (Number(order.totalPcs ?? order.total_pcs) > 0 ? order.totalPcs ?? order.total_pcs : null),
    queueNo: order.queueNo || order.queue_no || null,
    estimatedAt: order.estimatedFinishedAt || order.estimated_finished_at || null,
    estimatedCompletion: order.estimatedFinishedAt || order.estimated_finished_at || null,
    estimatedFinishedAt: order.estimatedFinishedAt || order.estimated_finished_at || null,
    totalPcs: Number(order.totalPcs ?? order.total_pcs) || 0,
    totalWeightKg: Number(order.totalWeightKg ?? order.total_weight_kg) || 0,
    outletId: order.outletId || order.outlet_id,
  };
}

/** Alias backward-compat untuk komponen lama. */
export const mapTxnToThermalReceipt = mapDbTransactionToReceipt;
