import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlinePrinter,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import ThermalNota, { mapTxnToThermalReceipt } from "./ThermalNota";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
}

function PaymentBadge({ status, method, onClick }) {
  const ps = status || "Outstanding";
  if (ps === "Lunas") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
        <HiOutlineCheckCircle className="h-3 w-3" />
        Lunas{method ? ` (${method})` : ""}
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
          {row.barcode && <p className="text-[10px] text-slate-400 font-mono truncate">{row.barcode}</p>}
        </div>
        <WorkBadge pct={row.workStatus} />
      </div>
      <div className="grid grid-cols-1 gap-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400 shrink-0">Pelanggan</span>
          <span className="font-semibold text-slate-800 truncate text-right">{row.customerName || "—"}</span>
        </div>
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

export default function HistoryTransaction({ outlets = [], workStatuses = [], onChanged }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [outletId, setOutletId] = useState("");
  const [date, setDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Semua");
  const [workTab, setWorkTab] = useState("Semua");
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Tunai");
  const [payMethods, setPayMethods] = useState([]);
  const [toast, setToast] = useState(null);
  const [thermalReceipt, setThermalReceipt] = useState(null);
  const [printingId, setPrintingId] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ listType: "active" });
      if (search.trim()) qs.set("search", search.trim());
      if (outletId) qs.set("outletId", outletId);
      if (date) qs.set("date", date);
      if (paymentStatus && paymentStatus !== "Semua") qs.set("paymentStatus", paymentStatus);
      const res = await api(`/waschen/transactions?${qs}`);
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || "Gagal memuat transaksi");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, outletId, date, paymentStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api("/waschen/payment-methods")
      .then((res) => setPayMethods((res.data || []).filter((m) => Number(m.is_active) !== 0)))
      .catch(() => {});
  }, []);

  const tabs = useMemo(() => {
    const labels = workStatuses.length
      ? workStatuses.map((s) => ({ key: s.name || s.label, min: Number(s.percentage) || 0, max: Number(s.percentage) || 0 }))
      : [
          { key: "Antrean", min: 0, max: 20 },
          { key: "Pencucian", min: 21, max: 40 },
          { key: "Penyetrikaan", min: 41, max: 60 },
          { key: "Pengemasan", min: 61, max: 80 },
          { key: "Siap Diambil", min: 81, max: 99 },
          { key: "Selesai", min: 100, max: 100 },
        ];
    return [{ key: "Semua", min: null, max: null }, ...labels];
  }, [workStatuses]);

  const filtered = useMemo(() => {
    if (workTab === "Semua") return rows;
    const tab = tabs.find((t) => t.key === workTab);
    if (!tab || tab.min == null) return rows;
    // If work statuses have exact percentage, match near that band using neighbors
    const sorted = [...workStatuses].sort((a, b) => Number(a.percentage) - Number(b.percentage));
    const idx = sorted.findIndex((s) => (s.name || s.label) === workTab);
    if (idx >= 0) {
      const min = Number(sorted[idx].percentage) || 0;
      const max = idx < sorted.length - 1 ? Number(sorted[idx + 1].percentage) - 0.01 : 999;
      return rows.filter((r) => {
        const w = Number(r.workStatus) || 0;
        return w >= min && w <= max;
      });
    }
    return rows.filter((r) => {
      const w = Number(r.workStatus) || 0;
      return w >= tab.min && w <= tab.max;
    });
  }, [rows, workTab, tabs, workStatuses]);

  const tabCount = (key) => {
    if (key === "Semua") return rows.length;
    const sorted = [...workStatuses].sort((a, b) => Number(a.percentage) - Number(b.percentage));
    const idx = sorted.findIndex((s) => (s.name || s.label) === key);
    if (idx >= 0) {
      const min = Number(sorted[idx].percentage) || 0;
      const max = idx < sorted.length - 1 ? Number(sorted[idx + 1].percentage) - 0.01 : 999;
      return rows.filter((r) => {
        const w = Number(r.workStatus) || 0;
        return w >= min && w <= max;
      }).length;
    }
    const tab = tabs.find((t) => t.key === key);
    if (!tab || tab.min == null) return 0;
    return rows.filter((r) => {
      const w = Number(r.workStatus) || 0;
      return w >= tab.min && w <= tab.max;
    }).length;
  };

  const submitDelete = async () => {
    if (!deleteModal) return;
    if (!deleteReason.trim()) {
      showToast("error", "Alasan pengajuan hapus wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/waschen/transactions/${deleteModal.id}/request-delete`, {
        method: "PATCH",
        body: JSON.stringify({ reason: deleteReason.trim() }),
      });
      showToast("success", `Pengajuan hapus ${deleteModal.orderNo} dikirim`);
      setDeleteModal(null);
      setDeleteReason("");
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
    setPayAmount(String(Math.max(0, (row.grandTotal || 0) - (row.paidAmount || 0))));
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
    const amount = Number(String(payAmount).replace(/[^\d.]/g, "")) || 0;
    if (amount <= 0) {
      showToast("error", "Nominal bayar wajib diisi");
      return;
    }
    setSubmitting(true);
    try {
      const remaining = Math.max(0, (paymentModal.grandTotal || 0) - (paymentModal.paidAmount || 0));
      await api(`/waschen/transactions/${paymentModal.id}/payment`, {
        method: "PATCH",
        body: JSON.stringify({
          additionalAmount: amount,
          paymentMethod: payMethod,
          overpaymentAction: amount > remaining ? "refund" : "change",
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
            <h2 className="text-sm sm:text-base font-bold text-slate-800 truncate">Riwayat Transaksi</h2>
            <span className="shrink-0 rounded-full bg-[#5f1340]/10 px-2 py-0.5 text-[10px] font-bold text-[#5f1340]">{filtered.length} Order</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_auto_auto_auto_auto] gap-2">
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
            <option value="">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.full_name || o.name}</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#5f1340]" />
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
      </div>

      <div className="px-3 sm:px-5 py-2.5 border-b border-slate-100 -mx-0 overflow-x-auto scrollbar-thin">
        <div className="flex flex-nowrap gap-2 min-w-0 w-max sm:w-auto sm:flex-wrap">
          {tabs.map((t) => {
            const active = workTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setWorkTab(t.key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 border transition",
                  active ? "bg-[#5f1340] text-white border-[#5f1340]" : "bg-white text-slate-600 border-slate-200 hover:border-[#5f1340]/40",
                )}
              >
                {t.key}
                <span className={cn("rounded-full px-1.5 text-[9px] font-bold", active ? "bg-white/20" : "bg-slate-100")}>{tabCount(t.key)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>
      )}

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">No. Struk</th>
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
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-slate-400">Tidak ada transaksi sesuai filter</td></tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/my-waschen/transactions/${row.id}`)}
                  className="hover:bg-[#5f1340]/[0.03] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#5f1340] font-mono">{row.orderNo}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{row.barcode}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.customerName || "—"}</td>
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
                        onClick={() => { setDeleteModal(row); setDeleteReason(""); }}
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
              onOpen={() => navigate(`/my-waschen/transactions/${row.id}`)}
              onPay={openPay}
              onPrint={openThermalPrint}
              onDelete={(r) => { setDeleteModal(r); setDeleteReason(""); }}
            />
          ))
        )}
      </div>

      <div className="border-t border-slate-100 px-3 sm:px-4 py-3 text-[10px] text-slate-400 font-semibold">
        Menampilkan {filtered.length} dari {rows.length} transaksi
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
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button type="button" onClick={() => setDeleteModal(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={submitting} onClick={submitDelete} className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
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
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Nominal Bayar</label>
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value.replace(/[^\d]/g, ""))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none focus:border-[#5f1340]"
                />
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
