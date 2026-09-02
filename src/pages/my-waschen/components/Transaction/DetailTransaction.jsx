import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlinePrinter,
  HiOutlineUser,
  HiOutlineBuildingStorefront,
  HiOutlineChevronDown,
  HiOutlineClipboardDocument,
  HiOutlineDocumentText,
} from "react-icons/hi2";
import { api, waschenUploadUrl } from "../../../../lib/api";
import PageHero from "../PageHero";
import ThermalNota, { mapTxnToThermalReceipt } from "./ThermalNota";
import { PhotoViewerModal } from "../HRIS/hrisShared";
import { fmtEmployeeName } from "../../utils/hrisUtils";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

const ITEM_STATUSES = [
  "Antrean",
  "Pencucian",
  "Penyetrikaan",
  "Pengemasan",
  "Siap Diambil",
  "Siap Diantar",
  "Selesai",
  "Dibatalkan",
];

function statusTone(status) {
  const map = {
    Antrean: "bg-slate-100 text-slate-700 border-slate-200",
    Pencucian: "bg-sky-50 text-sky-700 border-sky-200",
    Penyetrikaan: "bg-violet-50 text-violet-700 border-violet-200",
    Pengemasan: "bg-amber-50 text-amber-800 border-amber-200",
    "Siap Diambil": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Siap Diantar": "bg-teal-50 text-teal-700 border-teal-200",
    Selesai: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Dibatalkan: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return map[status] || "bg-slate-100 text-slate-600 border-slate-200";
}

function PaymentTone({ status }) {
  const ps = status || "Outstanding";
  if (ps === "Lunas") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
        <HiOutlineCheckCircle className="h-3.5 w-3.5" />
        Lunas
      </span>
    );
  }
  if (ps === "DP") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
        DP
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
      <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />
      Outstanding
    </span>
  );
}

function AttrCell({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-800 break-words leading-snug">{value || "—"}</p>
    </div>
  );
}

function fulfillmentLabel(v) {
  if (v === "Delivery_Kurir") return "Diantar Kurir";
  if (v === "Ambil_Di_Outlet") return "Ambil di Outlet";
  return v || "—";
}

const STAGE_LABELS = {
  frontliner: "Frontliner",
  washing: "Pencucian",
  ironing: "Penyetrikaan",
  packing: "Pengemasan",
  delivery: "Pengiriman",
};

function parseLogNotes(notes) {
  if (!notes) return { detail: null, meta: null };
  const qc = notes.match(/^\[(\w+)\]\s*QC\s*(\w+)\s*[—–-]\s*(\w+)(?:\s*:\s*(.+))?$/i);
  if (qc) {
    return {
      meta: `${STAGE_LABELS[qc[1]] || qc[1]} · QC ${qc[2]} · ${qc[3]}`,
      detail: qc[4]?.trim() || null,
    };
  }
  const hold = notes.match(/^Hold resolved \((\w+)\) oleh (.+?) : (.+)$/i);
  if (hold) {
    return {
      meta: `Hold diselesaikan (${hold[1]})`,
      detail: hold[3]?.trim() || null,
      worker: hold[2]?.trim(),
    };
  }
  return { detail: notes, meta: null };
}

function uniqueWorkers(workers = []) {
  const seen = new Set();
  return workers.filter((w) => {
    const key = `${w.stage}-${w.employee_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(w.employee_name);
  });
}

function ItemWorkersRow({ workers }) {
  const list = uniqueWorkers(workers);
  if (!list.length) {
    return (
      <p className="mt-1.5 text-[10px] text-slate-400 italic">Belum ada petugas produksi tercatat</p>
    );
  }
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {list.map((w) => (
        <span
          key={`${w.stage}-${w.employee_id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
          title={w.role_used ? `Role: ${w.role_used}` : undefined}
        >
          <HiOutlineUser className="h-3 w-3 text-[#5f1340]/70 shrink-0" />
          <span className="text-slate-400">{w.stage_label || STAGE_LABELS[w.stage] || w.stage}:</span>
          <span className="text-slate-800">{fmtEmployeeName(w.employee_name)}</span>
        </span>
      ))}
    </div>
  );
}

const PHOTO_TYPE_LABELS = {
  qc: "QC",
  temuan: "Temuan",
  hasil: "Hasil",
};

function ProgressPhotos({ photos, onView }) {
  if (!photos?.length) return null;
  return (
    <div className="mt-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Foto produksi</p>
      <div className="flex flex-wrap gap-2">
        {photos.map((ph) => {
          const url = ph.photo_url || waschenUploadUrl(ph.photo_path);
          if (!url) return null;
          const label = PHOTO_TYPE_LABELS[ph.photo_type] || ph.photo_type || "Foto";
          return (
            <button
              key={ph.id}
              type="button"
              onClick={() => onView?.({ url, label })}
              className="group relative h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 hover:border-[#5f1340]/40 transition"
            >
              <img src={url} alt={label} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[9px] font-bold text-white text-center">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ItemProgressTimeline({ workers, onViewPhoto }) {
  if (!workers?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Alur pengerjaan item</p>
      <div className="relative space-y-0">
        {workers.map((w, idx) => {
          const isLast = idx === workers.length - 1;
          return (
            <div key={w.id || idx} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && <span className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-slate-200" aria-hidden />}
              <span
                className={cn(
                  "relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  isLast ? "border-[#5f1340] bg-[#5f1340]" : "border-emerald-400 bg-emerald-50",
                )}
              >
                {isLast ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                ) : (
                  <HiOutlineCheckCircle className="h-3 w-3 text-emerald-600" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold", statusTone(w.stage_label || w.stage))}>
                    {w.stage_label || STAGE_LABELS[w.stage] || w.stage}
                  </span>
                  <span className="text-[10px] text-slate-400">{fmtDate(w.completed_at)}</span>
                </div>
                {w.employee_name && (
                  <p className="mt-1 text-xs font-semibold text-slate-800">
                    <HiOutlineUser className="inline h-3.5 w-3.5 mr-1 text-[#5f1340]" />
                    {fmtEmployeeName(w.employee_name)}
                    {w.role_used ? <span className="font-normal text-slate-500"> · {w.role_used}</span> : null}
                  </p>
                )}
                {(w.notes || w.qc_status) && (
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    QC {w.qc_status}{w.qc_decision ? ` · ${w.qc_decision}` : ""}
                    {w.notes ? ` — ${w.notes}` : ""}
                  </p>
                )}
                <ProgressPhotos photos={w.photos} onView={onViewPhoto} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusTimeline({ logs, items }) {
  const itemMap = Object.fromEntries((items || []).map((i) => [i.id, i]));
  if (!logs?.length) return null;

  return (
    <div className="relative max-w-2xl">
      {logs.map((log, idx) => {
        const isLast = idx === logs.length - 1;
        const parsed = parseLogNotes(log.notes);
        const worker = log.employee_name || parsed.worker || null;
        const item = log.transaction_detail_id ? itemMap[log.transaction_detail_id] : null;

        return (
          <div key={log.id} className="relative flex gap-3 sm:gap-4 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute left-[11px] sm:left-[13px] top-7 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 to-slate-200" aria-hidden />
            )}
            <div className="relative z-10 shrink-0 pt-0.5">
              <span
                className={cn(
                  "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full border-2 shadow-sm",
                  isLast
                    ? "border-[#5f1340] bg-[#5f1340] text-white ring-4 ring-[#5f1340]/15"
                    : "border-white bg-emerald-500 text-white",
                )}
              >
                {isLast ? (
                  <span className="h-2 w-2 rounded-full bg-white" />
                ) : (
                  <HiOutlineCheckCircle className="h-4 w-4" />
                )}
              </span>
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5",
                isLast ? "border-[#5f1340]/25 bg-[#5f1340]/[0.04]" : "border-slate-200 bg-slate-50/90",
              )}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <span className={cn("inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold", statusTone(log.status))}>
                    {log.status}
                  </span>
                  {item && (
                    <p className="mt-1.5 text-xs font-semibold text-slate-700 truncate">
                      {item.service_name || `Item #${log.transaction_detail_id}`}
                      {item.service_code ? (
                        <span className="ml-1.5 font-mono text-[10px] text-[#5f1340]">{item.service_code}</span>
                      ) : null}
                    </p>
                  )}
                  {!item && log.transaction_detail_id && (
                    <p className="mt-1.5 text-[10px] text-slate-500">Item #{log.transaction_detail_id}</p>
                  )}
                </div>
                <time className="text-[10px] sm:text-[11px] font-semibold text-slate-400 shrink-0 tabular-nums">
                  {fmtDate(log.created_at)}
                </time>
              </div>
              {worker && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                  <HiOutlineUser className="h-3.5 w-3.5 text-[#5f1340] shrink-0" />
                  {fmtEmployeeName(worker)}
                </p>
              )}
              {parsed.meta && (
                <p className="mt-2 text-[11px] font-medium text-slate-500">{parsed.meta}</p>
              )}
              {parsed.detail && (
                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed break-words">{parsed.detail}</p>
              )}
              {isLast && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#5f1340]">Status terkini</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemCard({ item, index, saving, onStatusChange, open, onToggle, onViewPhoto }) {
  const photo = item.photo_url ? waschenUploadUrl(item.photo_url) : null;
  const methodName =
    item.laundry_method_name ||
    (Number(item.laundry_method_id) === 2 ? "Dry Clean" : "Wet Clean");
  const methodCode =
    item.laundry_method_code || (Number(item.laundry_method_id) === 2 ? "DC" : "WC");

  return (
    <li className="px-3 sm:px-4 py-2 first:pt-3 last:pb-3">
      <div className={cn("rounded-2xl border bg-white shadow-sm overflow-hidden transition-colors", open ? "border-[#5f1340]/30" : "border-slate-200")}>
        {/* Summary row — always visible */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-3.5 py-3">
          <button
            type="button"
            onClick={onToggle}
            className="min-w-0 flex-1 flex items-center gap-3 text-left group"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#5f1340] text-[11px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-[#5f1340]">
                  {item.service_name || "Layanan"}
                </p>
                <HiOutlineChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                    open && "rotate-180 text-[#5f1340]"
                  )}
                />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {item.service_code && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#5f1340]">
                    {item.service_code}
                  </span>
                )}
                <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-bold", statusTone(item.item_work_status))}>
                  {item.item_work_status}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {fmtQty(item.qty)} {item.unit || ""} · {fmtIDR(item.subtotal)}
                </span>
              </div>
              <ItemWorkersRow workers={item.workers} />
            </div>
          </button>

          <div className="sm:w-40 shrink-0" onClick={(e) => e.stopPropagation()}>
            <select
              value={item.item_work_status}
              disabled={saving}
              onChange={(e) => onStatusChange(item.id, e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#5f1340] disabled:opacity-60"
              title="Ubah status item"
            >
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Detail — accordion */}
        {open && (
          <div className="border-t border-slate-100 bg-slate-50/40 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-24 shrink-0">
                {photo ? (
                  <a href={photo} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={photo}
                      alt={item.service_name || "Item"}
                      className="h-24 w-full sm:w-24 rounded-xl object-cover border border-slate-200 bg-slate-100"
                    />
                  </a>
                ) : (
                  <div className="flex h-24 w-full sm:w-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-[10px] font-semibold text-slate-400 text-center px-2">
                    Tidak ada foto
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                <AttrCell label="Merk / Brand" value={item.brand} />
                <AttrCell label="Warna" value={item.color} />
                <AttrCell label="Material" value={item.material} />
                <AttrCell label="Ukuran" value={item.size} />
                <AttrCell label="Metode Cuci" value={`${methodName} (${methodCode})`} />
                <AttrCell label="Pengambilan" value={fulfillmentLabel(item.fulfillment_type)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Qty</p>
                <p className="mt-0.5 text-xs font-bold text-slate-800 font-mono">
                  {fmtQty(item.qty)} {item.unit || ""}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Harga Satuan</p>
                <p className="mt-0.5 text-xs font-bold text-slate-800">{fmtIDR(item.unit_price)}</p>
              </div>
              <div className="rounded-xl border border-[#5f1340]/20 bg-[#5f1340]/5 px-3 py-2 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5f1340]/70">Subtotal</p>
                <p className="mt-0.5 text-xs font-bold text-[#5f1340]">{fmtIDR(item.subtotal)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700/70">Kondisi / Catatan</p>
              <p className="mt-1 text-xs font-medium text-amber-950 leading-relaxed break-words">
                {item.condition_notes && String(item.condition_notes).trim() !== "" && item.condition_notes !== "-"
                  ? item.condition_notes
                  : "Tidak ada catatan kondisi"}
              </p>
            </div>

            <ItemProgressTimeline workers={item.workers} onViewPhoto={onViewPhoto} />
          </div>
        )}
      </div>
    </li>
  );
}

export default function DetailTransaction() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingItem, setSavingItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [thermalReceipt, setThermalReceipt] = useState(null);
  const [openItemId, setOpenItemId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const copyOrderNo = async () => {
    const text = String(data?.order?.orderNo || data?.order?.barcode || id || "");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("error", "Gagal menyalin nomor nota");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api(`/waschen/transactions/${id}`);
      setData(res.data || null);
    } catch (err) {
      setError(err.message || "Gagal memuat detail");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateItemStatus = async (itemId, status) => {
    setSavingItem(itemId);
    try {
      await api(`/waschen/transactions/${id}/items/${itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("success", "Status item diperbarui");
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal update status");
    } finally {
      setSavingItem(null);
    }
  };

  const order = data?.order;
  const items = data?.items || [];
  const logs = data?.statusLogs || [];
  const remaining = Math.max(0, (order?.grandTotal || 0) - (order?.paidAmount || 0));

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 max-w-[100rem] mx-auto">
      <button
        type="button"
        onClick={() => navigate("/my-waschen/transactions")}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#5f1340] transition-colors"
      >
        <HiOutlineArrowLeft className="h-4 w-4" />
        Kembali ke Riwayat
      </button>

      <PageHero className="!items-stretch sm:!items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-mono">
            {order?.orderNo || id}
          </h1>
          <p className="mt-1.5 text-sm text-white/75 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <HiOutlineUser className="h-3.5 w-3.5" />
              {order?.customerName || "—"}
            </span>
            <span className="text-white/40">·</span>
            <span className="inline-flex items-center gap-1">
              <HiOutlineBuildingStorefront className="h-3.5 w-3.5" />
              {order?.branch || order?.outletName || "—"}
            </span>
            {order?.paymentStatus && (
              <>
                <span className="text-white/40">·</span>
                <PaymentTone status={order.paymentStatus} />
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => data && setThermalReceipt(mapTxnToThermalReceipt(data))}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md disabled:opacity-50"
          >
            <HiOutlinePrinter className="h-4 w-4" />
            Cetak Struk
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </PageHero>

      {toast && (
        <div
          className={cn(
            "rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2",
            toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
          )}
        >
          {toast.type === "error" ? (
            <HiOutlineExclamationTriangle className="h-4 w-4" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200" />
      ) : order ? (
        <>
          {/* Rincian Nota — full info */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-4 sm:px-5 py-3.5">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5f1340]/10 text-[#5f1340]">
                  <HiOutlineDocumentText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800">
                    Rincian Nota{" "}
                    <span className="font-mono text-[#5f1340]">{order.orderNo}</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {fmtDate(order.orderDate)} · {order.branch || order.outletName || "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyOrderNo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <HiOutlineClipboardDocument className="h-3.5 w-3.5" />
                  {copied ? "Tersalin" : "Salin"}
                </button>
                <button
                  type="button"
                  onClick={() => data && setThermalReceipt(mapTxnToThermalReceipt(data))}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#5f1340] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4d0f33]"
                >
                  <HiOutlinePrinter className="h-4 w-4" />
                  Cetak Nota
                </button>
              </div>
            </div>

            {/* Ringkasan bayar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-100 border-b border-slate-100">
              <div className="bg-white px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tagihan</p>
                <p className="mt-1 text-base font-bold text-slate-800">{fmtIDR(order.grandTotal)}</p>
              </div>
              <div className="bg-white px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Dibayar</p>
                <p className="mt-1 text-base font-bold text-emerald-700">{fmtIDR(order.paidAmount)}</p>
              </div>
              <div className="bg-white px-4 py-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600/80">Sisa</p>
                <p className="mt-1 text-base font-bold text-rose-700">{fmtIDR(remaining)}</p>
              </div>
              <div className="bg-white px-4 py-3.5 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <PaymentTone status={order.paymentStatus} />
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                    {Math.round(order.workStatus || 0)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-5 sm:items-start">
              <div className="mx-auto sm:mx-0 shrink-0 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <QRCodeSVG
                  value={`${window.location.origin}/my-waschen/transactions/${encodeURIComponent(order.orderNo || id)}`}
                  size={100}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <dl className="min-w-0 flex-1 divide-y divide-slate-100">
                <div className="flex gap-3 py-2.5 first:pt-0">
                  <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pelanggan
                  </dt>
                  <dd className="min-w-0 text-sm">
                    <p className="font-bold text-slate-800 break-words">{order.customerName || "—"}</p>
                    {order.customerPhone ? (
                      <a
                        href={`https://wa.me/${String(order.customerPhone).replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        {order.customerPhone}
                      </a>
                    ) : null}
                    {order.customerAddress ? (
                      <p className="text-[11px] text-slate-500 break-words">{order.customerAddress}</p>
                    ) : null}
                  </dd>
                </div>
                <div className="flex gap-3 py-2.5">
                  <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Layanan
                  </dt>
                  <dd className="min-w-0 text-sm text-slate-800">
                    <p className="font-semibold">
                      {[order.orderCategory, order.speedName].filter(Boolean).join(" · ") || "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        order.parfumeName ? `Aroma ${order.parfumeName}` : null,
                        order.isDelivery ? "Diantar kurir" : "Ambil di outlet",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </dd>
                </div>
                <div className="flex gap-3 py-2.5">
                  <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pembayaran
                  </dt>
                  <dd className="min-w-0 text-sm">
                    <p className="font-semibold text-slate-800">
                      {order.paymentMethod && order.paymentMethod !== "-"
                        ? order.paymentMethod
                        : "Belum ada metode bayar"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Dibayar {fmtIDR(order.paidAmount)} · Sisa {fmtIDR(remaining)}
                    </p>
                  </dd>
                </div>
                <div className="flex gap-3 py-2.5 last:pb-0">
                  <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Frontliner
                  </dt>
                  <dd className="min-w-0 text-sm">
                    <p className="font-semibold text-slate-800 break-words">{fmtEmployeeName(order.cashierName)}</p>
                    {order.specialNotes && order.specialNotes !== "-" ? (
                      <p className="text-xs text-slate-500 break-words">{order.specialNotes}</p>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          {/* Item Transaksi — full width below */}
          <section className="rounded-2xl border border-slate-200 bg-slate-50/40 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-5 py-3.5">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Item Transaksi</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {items.length} item · klik baris untuk lihat rincian
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400 bg-white">Tidak ada item pada nota ini</p>
            ) : (
              <ul className="divide-y divide-transparent">
                {items.map((item, idx) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    index={idx}
                    saving={savingItem === item.id}
                    onStatusChange={updateItemStatus}
                    open={openItemId === item.id}
                    onToggle={() =>
                      setOpenItemId((prev) => (prev === item.id ? null : item.id))
                    }
                    onViewPhoto={setPhotoViewer}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Log Status Pengerjaan */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5f1340]/10 text-[#5f1340]">
                <HiOutlineArrowPath className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Log Status Pengerjaan</h3>
                <p className="text-xs text-slate-500">Alur perubahan status dari awal hingga terkini</p>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center">
                <p className="text-xs font-semibold text-slate-400">Belum ada log status</p>
              </div>
            ) : (
              <StatusTimeline logs={logs} items={items} />
            )}
          </section>
        </>
      ) : null}

      <ThermalNota
        createdOrderReceipt={thermalReceipt}
        onClose={() => setThermalReceipt(null)}
        outletId={order?.outletId}
      />

      <PhotoViewerModal
        open={Boolean(photoViewer?.url)}
        url={photoViewer?.url}
        label={photoViewer?.label}
        onClose={() => setPhotoViewer(null)}
      />
    </div>
  );
}
