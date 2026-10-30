import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlinePrinter,
  HiOutlineXMark,
  HiOutlinePaperClip,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import ThermalNota, { mapTxnToThermalReceipt } from "./ThermalNota";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import { rememberPage, useRestoreScroll, useSavedPage } from "../../hooks/usePageMemory";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Tab filter default — selaras POS History / mst_work_status.is_filter_tab */
const DEFAULT_WORK_FILTER_TABS = [
  "Antrean",
  "Pencucian",
  "Penyetrikaan",
  "Pengemasan",
  "Siap Diambil",
  "Sedang Diantar",
  "Selesai",
];

/** Tanggal + jam, mis. "30 Okt 2026, 14.05". Kosong → "—". */
function fmtDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Tgl nota dilunasi: settledAt (pelunasan DP/Outstanding), atau paidAt bila nota langsung Lunas. */
function settledDate(row) {
  return row.settledAt || (row.paymentStatus === "Lunas" ? row.paidAt : null);
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function PaymentBadge({ status, method, onClick }) {
  const ps = status || "Outstanding";
  if (ps === "Lunas") {
    return (
      <span
        title={method ? `Lunas (${method})` : "Lunas"}
        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700"
      >
        <HiOutlineCheckCircle className="h-3 w-3" />
        Lunas
      </span>
    );
  }
  if (ps === "DP") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
      >
        DP
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 hover:bg-rose-100"
    >
      <HiOutlineExclamationTriangle className="h-3 w-3" />
      Outstanding
    </button>
  );
}

function WorkBadge({ pct }) {
  const p = Number(pct) || 0;
  const tone =
    p >= 100
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : p >= 70
        ? "bg-sky-50 text-sky-700 border-sky-200"
        : p >= 40
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={cn("inline-flex min-w-[3rem] justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold", tone)}>
      {Math.round(p)}%
    </span>
  );
}

/** Penanda nota outlet event (Event B2B), berisi nama event. */
function EventBadge({ row }) {
  if (!row.isEvent) return null;
  return (
    <span className="mt-1 inline-flex rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">
      {row.outletName || "Event"}
    </span>
  );
}

function TransactionMobileCard({ row, printingId, onOpen, onPay, onPrint, onDelete }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="p-3.5 sm:p-4 space-y-3 cursor-pointer hover:bg-[#5f1340]/[0.03] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-[#5f1340] font-mono text-sm truncate">{row.orderNo}</p>
          {row.barcode && row.barcode !== row.orderNo ? (
            <p className="text-[10px] text-slate-400 font-mono truncate">{row.barcode}</p>
          ) : null}
          {row.isDelivery ? (
            <span className="mt-1 inline-flex rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
              Delivery
            </span>
          ) : null}
          <EventBadge row={row} />
        </div>
        <WorkBadge pct={row.workStatus} />
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Tgl Nota Dibuat</span>
          <span className="text-slate-700 text-right">{fmtDateTime(row.orderDate) || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Tgl Nota Dilunasi</span>
          <span className="text-slate-700 text-right">{fmtDateTime(settledDate(row)) || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Pelanggan</span>
          <span className="font-semibold text-slate-800 truncate text-right">{row.customerName || "—"}</span>
        </div>
        {row.customerAddress ? (
          <div className="flex items-start justify-between gap-2">
            <span className="text-slate-400 shrink-0">Alamat</span>
            <span className="text-slate-600 text-right line-clamp-2 break-words" title={row.customerAddress}>{row.customerAddress}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">WhatsApp</span>
          {row.customerPhone ? (
            <a
              href={`https://wa.me/${String(row.customerPhone).replace(/\D/g, "").replace(/^0/, "62")}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono text-emerald-600 hover:underline truncate"
            >
              {row.customerPhone}
            </a>
          ) : (
            <span className="text-slate-500">—</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Tagihan</span>
          <span className="font-bold text-slate-800">{fmtIDR(row.grandTotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Bayar</span>
          <PaymentBadge status={row.paymentStatus} method={row.paymentMethod} onClick={(e) => onPay(row, e)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => onPrint(row, e)}
          disabled={printingId === row.id}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-[#5f1340] hover:text-white disabled:opacity-50"
        >
          Cetak
        </button>
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

/**
 * eventOnly: dipakai menu Event B2B — hanya nota outlet event, dropdown outlet = daftar event,
 * dan tombol kembali di detail nota mengarah ke `detailFrom`.
 */
export default function HistoryTransaction({
  outlets = [],
  workStatuses = [],
  onChanged,
  eventOnly = false,
  title = "Riwayat Transaksi",
  allOutletsLabel = "Semua Outlet",
  detailFrom = null,
}) {
  const navigate = useNavigate();
  const memoryKey = eventOnly ? "history-event" : "history";
  const saved = useSavedPage(memoryKey);
  const cutoff = useCutoffPeriod(saved.cutoff);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(saved.search ?? "");
  const [outletId, setOutletId] = useState(saved.outletId ?? "");
  const [paymentStatus, setPaymentStatus] = useState(saved.paymentStatus ?? "Semua");
  const [workTab, setWorkTab] = useState(saved.workTab ?? "Semua");
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteFile, setDeleteFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);

  const [payMethod, setPayMethod] = useState("Tunai");
  const [payMethods, setPayMethods] = useState([]);
  const [toast, setToast] = useState(null);
  const [thermalReceipt, setThermalReceipt] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const [page, setPage] = useState(saved.page ?? 1);
  const [pageSize, setPageSize] = useState(saved.pageSize ?? 50);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({});
  const reqIdRef = useRef(0);

  // Filter berubah → kembali ke halaman 1 (bukan saat mount / pemulihan dari halaman detail)
  const filterKey = JSON.stringify([eventOnly, search, outletId, cutoff.dateFrom, cutoff.dateTo, paymentStatus, workTab, pageSize]);
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setPage(1);
  }, [filterKey]);

  const openDetail = (id) => {
    rememberPage(memoryKey, { search, outletId, paymentStatus, workTab, page, pageSize, cutoff: cutoff.snapshot() });
    navigate(`/my-waschen/transactions/${id}`, detailFrom ? { state: { from: detailFrom } } : undefined);
  };
  useRestoreScroll(saved.scroll, !loading, rows.length);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    const reqId = ++reqIdRef.current;
    try {
      const qs = new URLSearchParams({ listType: "active", page: String(page), pageSize: String(pageSize) });
      if (workTab !== "Semua") qs.set("workTab", workTab);
      if (eventOnly) qs.set("eventOnly", "1");
      if (search.trim()) qs.set("search", search.trim());
      if (outletId) qs.set("outletId", outletId);
      if (cutoff.dateFrom) qs.set("dateFrom", cutoff.dateFrom);
      if (cutoff.dateTo) qs.set("dateTo", cutoff.dateTo);
      if (paymentStatus && paymentStatus !== "Semua") qs.set("paymentStatus", paymentStatus);
      const res = await api(`/waschen/transactions?${qs}`);
      if (reqId !== reqIdRef.current) return; // respons usang (filter/halaman sudah berganti)
      setRows(res.data || []);
      setTotal(Number(res.meta?.total) || (res.data || []).length);
      setTabCounts(res.meta?.tabCounts || {});
    } catch (err) {
      if (silent || reqId !== reqIdRef.current) return;
      setError(err.message || "Gagal memuat transaksi");
      setRows([]);
      setTotal(0);
    } finally {
      if (!silent && reqId === reqIdRef.current) setLoading(false);
    }
  }, [eventOnly, search, outletId, cutoff.dateFrom, cutoff.dateTo, paymentStatus, workTab, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  useEffect(() => {
    api("/waschen/payment-methods")
      .then((res) => setPayMethods((res.data || []).filter((m) => Number(m.is_active) !== 0)))
      .catch(() => {});
  }, []);

  const tabs = useMemo(() => {
    const fromMaster = (workStatuses || [])
      .map((s) => String(s.name || s.label || "").trim())
      .filter(Boolean);
    // Pastikan urutan & isi sama POS; kalau master kosong pakai default
    const labels = fromMaster.length ? fromMaster : DEFAULT_WORK_FILTER_TABS;
    // Dedup jaga-jaga
    const seen = new Set();
    const unique = [];
    for (const name of labels) {
      if (seen.has(name)) continue;
      seen.add(name);
      unique.push(name);
    }
    return ["Semua", ...unique];
  }, [workStatuses]);

  // Filter tab & halaman sudah diterapkan server; `rows` adalah satu halaman.
  const filtered = rows;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageNumbers = (() => {
    const nums = [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
    const out = [];
    nums.forEach((n, i) => {
      if (i > 0 && n - nums[i - 1] > 1) out.push(`gap-${n}`);
      out.push(n);
    });
    return out;
  })();

  const tabCount = (key) => Number(tabCounts[key]) || 0;

  const submitDelete = async () => {
    if (!deleteModal) return;
    if (!deleteReason.trim()) {
      showToast("error", "Alasan pengajuan hapus wajib diisi");
      return;
    }
    if (!deleteFile) {
      showToast("error", "Lampiran foto/dokumen wajib disertakan");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("reason", deleteReason.trim());
      body.append("attachment", deleteFile);
      await apiUpload(`/waschen/transactions/${deleteModal.id}/request-delete`, {
        method: "PATCH",
        body,
      });
      showToast("success", `Pengajuan hapus ${deleteModal.orderNo} dikirim`);
      setDeleteModal(null);
      setDeleteReason("");
      setDeleteFile(null);
      await load();
      onChanged?.();
    } catch (err) {
      showToast("error", err.message || "Gagal mengajukan hapus");
    } finally {
      setSubmitting(false);
    }
  };

  const openPay = (row, e) => {
    e?.stopPropagation();
    if (row.paymentStatus === "Lunas") return;
    setPaymentModal(row);

    setPayMethod(row.paymentMethod && row.paymentMethod !== "-" ? row.paymentMethod : "Tunai");
  };

  const openThermalPrint = async (row, e) => {
    e?.stopPropagation();
    setPrintingId(row.id);
    try {
      const res = await api(`/waschen/transactions/${row.id}`);
      setThermalReceipt(mapTxnToThermalReceipt(res.data));
    } catch (err) {
      showToast("error", err.message || "Gagal memuat struk nota");
    } finally {
      setPrintingId(null);
    }
  };

  const submitPay = async () => {
    if (!paymentModal) return;
    // Nominal pelunasan dikunci = sisa tagihan (Phase 13)
    const amount = Math.max(0, (paymentModal.grandTotal || 0) - (paymentModal.paidAmount || 0));
    if (amount <= 0) {
      showToast("error", "Nota ini sudah lunas");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/waschen/transactions/${paymentModal.id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({
          additionalAmount: amount,
          paymentMethod: payMethod,
          cashierEmployeeId: (() => {
            try {
              const u = JSON.parse(localStorage.getItem("user") || "null");
              return Number(u?.employee?.employee_id) || null;
            } catch {
              return null;
            }
          })(),
        }),
      });
      showToast("success", `Pembayaran ${paymentModal.orderNo} diperbarui`);
      setPaymentModal(null);
      await load();
      onChanged?.();
    } catch (err) {
      showToast("error", err.message || "Gagal update pembayaran");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-w-0 w-full">
      {toast && (
        <div className={cn("px-3 sm:px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="p-3 sm:p-5 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">{title}</h2>
            <span className="shrink-0 rounded-full bg-[#5f1340]/10 px-2 py-0.5 text-[10px] font-bold text-[#5f1340]">{total} Order</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto] gap-2">
          <div className="relative sm:col-span-2 xl:col-span-1 min-w-0">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari struk, pelanggan..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]"
            />
          </div>
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#5f1340]">
            <option value="">{allOutletsLabel}</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.full_name || o.name}</option>
            ))}
          </select>
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#5f1340]">
            <option value="Semua">Semua Bayar</option>
            <option value="Lunas">Lunas</option>
            <option value="DP">DP</option>
            <option value="Outstanding">Outstanding</option>
            <option value="Sisa Tagihan">Sisa Tagihan</option>
          </select>
          <button type="button" onClick={load} className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <HiOutlineArrowPath className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        <CutoffPeriodFilter cutoff={cutoff} variant="compact" />
      </div>

      <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 -mx-0 overflow-x-auto scrollbar-thin">
        <div className="flex flex-nowrap gap-2 min-w-0 w-max sm:w-auto sm:flex-wrap">
          {tabs.map((key) => {
            const active = workTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setWorkTab(key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 border transition",
                  active ? "bg-[#5f1340] text-white border-[#5f1340]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5f1340]/40",
                )}
              >
                {key}
                <span className={cn("rounded-full px-1.5 text-[9px] font-bold", active ? "bg-white/20" : "bg-slate-100")}>{tabCount(key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">No. Nota</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Tgl Nota Dibuat</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Tgl Nota Dilunasi</th>
              <th className="px-4 py-3 font-semibold">Pelanggan</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold">Tagihan</th>
              <th className="px-4 py-3 font-semibold text-center">Bayar</th>
              <th className="px-4 py-3 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-slate-400">Tidak ada transaksi sesuai filter</td></tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openDetail(row.id)}
                  className="hover:bg-[#5f1340]/[0.03] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#5f1340] font-mono">{row.orderNo}</p>
                    {row.barcode && row.barcode !== row.orderNo ? (
                      <p className="text-[10px] text-slate-400 font-mono">{row.barcode}</p>
                    ) : null}
                    {row.isDelivery ? (
                      <span className="mt-1 inline-flex rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                        Delivery
                      </span>
                    ) : null}
                    <EventBadge row={row} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDateTime(row.orderDate) || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDateTime(settledDate(row)) || "—"}</td>
                  <td className="px-4 py-3 min-w-[10rem] max-w-[16rem]">
                    <p className="font-semibold text-slate-800 break-words">{row.customerName || "—"}</p>
                    {row.customerAddress ? (
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-500 line-clamp-2 break-words" title={row.customerAddress}>
                        {row.customerAddress}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.customerPhone ? (
                      <a
                        href={`https://wa.me/${String(row.customerPhone).replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-emerald-600 hover:underline"
                      >
                        {row.customerPhone}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center"><WorkBadge pct={row.workStatus} /></td>
                  <td className="px-4 py-3 font-bold text-slate-800">{fmtIDR(row.grandTotal)}</td>
                  <td className="px-4 py-3 text-center">
                    <PaymentBadge status={row.paymentStatus} method={row.paymentMethod} onClick={(e) => openPay(row, e)} />
                  </td>
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => openThermalPrint(row, e)}
                        disabled={printingId === row.id}
                        className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-[#5f1340] hover:text-white disabled:opacity-50"
                        title="Cetak struk thermal"
                      >
                        <HiOutlinePrinter className={cn("h-4 w-4", printingId === row.id && "animate-pulse")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDeleteModal(row); setDeleteReason(""); setDeleteFile(null); }}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-600 hover:text-white"
                        title="Ajukan hapus"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-slate-100">
        {loading ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm px-4">Tidak ada transaksi sesuai filter</div>
        ) : (
          filtered.map((row) => (
            <TransactionMobileCard
              key={row.id}
              row={row}
              printingId={printingId}
              onOpen={() => openDetail(row.id)}
              onPay={openPay}
              onPrint={openThermalPrint}
              onDelete={(r) => { setDeleteModal(r); setDeleteReason(""); setDeleteFile(null); }}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-100 px-3 sm:px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2 text-[10px] text-slate-400 font-semibold">
        <span>
          Menampilkan {total === 0 ? 0 : pageStart + 1}–{pageStart + filtered.length} dari {total} transaksi
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <label className="flex items-center gap-1.5 mr-2">
            <span>Baris/halaman</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-600"
            >
              {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="rounded-lg bg-[#5f1340]/10 px-2.5 py-1 font-bold text-[#5f1340] hover:bg-[#5f1340]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ‹ Sebelumnya
          </button>
          {pageNumbers.map((n) =>
            typeof n === "string" ? (
              <span key={n} className="px-1">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={cn(
                  "min-w-[28px] rounded-lg px-2 py-1 font-bold",
                  n === currentPage ? "bg-[#5f1340] text-white" : "bg-[#5f1340]/10 text-[#5f1340] hover:bg-[#5f1340]/20",
                )}
              >
                {n}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="rounded-lg bg-[#5f1340]/10 px-2.5 py-1 font-bold text-[#5f1340] hover:bg-[#5f1340]/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Berikutnya ›
          </button>
        </div>
      </div>

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Request Hapus {deleteModal.orderNo}</p>
                <p className="text-[10px] text-slate-500">Menunggu approval di SuperApp</p>
              </div>
              <button type="button" onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-slate-700"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Pelanggan</span><span className="font-bold">{deleteModal.customerName}</span></div>
                <div className="mt-1 flex justify-between"><span className="text-slate-500">Tagihan</span><span className="font-bold text-[#5f1340]">{fmtIDR(deleteModal.grandTotal)}</span></div>
              </div>
              <textarea
                rows={3}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Alasan pengajuan hapus..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-rose-500"
              />
              <div>
                <p className="mb-1.5 text-[11px] font-semibold text-slate-600">
                  Lampiran foto / dokumen PDF <span className="text-rose-600">*</span>
                </p>
                {deleteFile ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <HiOutlinePaperClip className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{deleteFile.name}</span>
                    </span>
                    <button type="button" onClick={() => setDeleteFile(null)} className="shrink-0 text-[11px] font-semibold text-rose-600">Hapus</button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-3 py-4 text-center hover:border-rose-300">
                    <HiOutlinePaperClip className="mb-1 h-5 w-5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-500">Pilih foto (JPG/PNG/WEBP) atau PDF, maks 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        e.target.value = "";
                        if (f && f.size > 5 * 1024 * 1024) {
                          showToast("error", "Ukuran lampiran maksimal 5 MB");
                          return;
                        }
                        setDeleteFile(f);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button type="button" onClick={() => setDeleteModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={submitting || !deleteReason.trim() || !deleteFile} onClick={submitDelete} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {submitting ? "Mengirim..." : "Kirim Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Update Pembayaran — {paymentModal.orderNo}</p>
                <p className="text-[10px] text-slate-500">{paymentModal.customerName}</p>
              </div>
              <button type="button" onClick={() => setPaymentModal(null)} className="text-slate-400"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center">
                  <p className="text-[10px] text-slate-400">Tagihan</p>
                  <p className="font-bold text-[#5f1340]">{fmtIDR(paymentModal.grandTotal)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-center">
                  <p className="text-[10px] text-emerald-600">Dibayar</p>
                  <p className="font-bold text-emerald-800">{fmtIDR(paymentModal.paidAmount)}</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-center">
                  <p className="text-[10px] text-rose-600">Sisa</p>
                  <p className="font-bold text-rose-800">{fmtIDR(Math.max(0, paymentModal.grandTotal - paymentModal.paidAmount))}</p>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Metode</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]">
                  {payMethods.length === 0 ? <option value="Tunai">Tunai</option> : payMethods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nominal Pelunasan</label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold text-slate-800">
                  {fmtIDR(Math.max(0, paymentModal.grandTotal - paymentModal.paidAmount))}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Terkunci sesuai sisa tagihan. Kelebihan bayar diajukan frontliner lewat aksi Refund di POS.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button type="button" onClick={() => setPaymentModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={submitting} onClick={submitPay} className="rounded-xl bg-[#5f1340] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ThermalNota
        createdOrderReceipt={thermalReceipt}
        onClose={() => setThermalReceipt(null)}
        outletId={thermalReceipt?.outletId}
      />
    </div>
  );
}
