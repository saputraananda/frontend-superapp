import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlineChevronRight,
  HiOutlineBuildingStorefront,
  HiOutlineBanknotes,
  HiOutlineXMark,
  HiOutlineArrowRight,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import { AttachmentButton, PayStatusBadge, cn, fmtDateTime, fmtIDR } from "./deleteRequestShared";

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "Pending", label: "Menunggu" },
  { id: "Approved", label: "Disetujui" },
  { id: "Rejected", label: "Ditolak" },
];

const STATUS_META = {
  Pending: { label: "Menunggu", Icon: HiOutlineClock, cls: "border-amber-200 bg-amber-50 text-amber-700" },
  Approved: { label: "Disetujui", Icon: HiOutlineCheckCircle, cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  Rejected: { label: "Ditolak", Icon: HiOutlineXCircle, cls: "border-slate-300 bg-slate-100 text-slate-600" },
};

const isMember = (m) => /saldo/i.test(String(m || ""));

/** Status bayar nota setelah pembayaran ini dihapus (pratinjau, sama dengan hitungan backend). */
function statusAfterVoid(row) {
  const paid = Math.max(0, row.paidAmount - row.amount);
  if (paid <= 0) return { paid, status: "Outstanding" };
  if (paid + 0.009 < row.grandTotal) return { paid, status: "DP" };
  return { paid, status: "Lunas" };
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.Pending;
  const Icon = m.Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold", m.cls)}>
      <Icon className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, tone, active, onClick }) {
  const tones = {
    sky: "text-sky-700 bg-sky-50",
    amber: "text-amber-700 bg-amber-50",
    emerald: "text-emerald-700 bg-emerald-50",
    slate: "text-slate-600 bg-slate-100",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-white p-3 sm:p-4 text-left shadow-sm transition",
        active ? "border-[#5f1340] ring-2 ring-[#5f1340]/15" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="block text-xl font-bold text-slate-800">{value}</span>
      </span>
    </button>
  );
}

function PaymentInfo({ row }) {
  return (
    <div className="space-y-0.5">
      <p className="font-bold text-slate-800">{fmtIDR(row.amount)}</p>
      <p className="text-[10px] text-slate-500">
        {row.logType} · {row.paymentMethod || "—"}
      </p>
      <p className="text-[10px] text-slate-400">dibayar {fmtDateTime(row.paidAt)}</p>
    </div>
  );
}

function DecisionInfo({ row }) {
  if (row.status === "Pending") return null;
  return (
    <div className="mt-1.5 text-[10px] leading-snug text-slate-500">
      {row.reviewedByName && (
        <p>
          oleh <span className="font-semibold text-slate-700">{row.reviewedByName}</span>
        </p>
      )}
      <p className="text-slate-400">{fmtDateTime(row.reviewedAt)}</p>
      {row.reviewNotes && <p className="mt-0.5 italic text-slate-600">&ldquo;{row.reviewNotes}&rdquo;</p>}
      {row.depositRestored && <p className="mt-0.5 font-semibold text-sky-700">Saldo member dikembalikan</p>}
    </div>
  );
}

function VoidDecisionModal({ target, onClose, onDone }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return undefined;
    setNotes("");
    setError("");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [target]);

  if (!target) return null;
  const { row, mode } = target;
  const approve = mode === "approve";
  const after = statusAfterVoid(row);

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api(`/waschen/transactions/payment-voids/${row.id}/${approve ? "approve" : "reject"}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: notes.trim() }),
      });
      onDone?.(res.message || (approve ? "Pelunasan dihapus" : "Pengajuan ditolak"));
    } catch (err) {
      setError(err.message || "Gagal menyimpan keputusan");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={saving ? undefined : onClose}>
      <div className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className={cn("flex items-start justify-between gap-3 px-5 py-4 text-white", approve ? "bg-gradient-to-r from-sky-700 to-[#5f1340]" : "bg-gradient-to-r from-slate-700 to-slate-900")}>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Request Hapus Pelunasan</p>
            <h3 className="mt-0.5 text-base font-bold">{approve ? "Setujui hapus pelunasan?" : "Tolak pengajuan?"}</h3>
            <p className="mt-0.5 font-mono text-xs text-white/80">{row.orderNo}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-full bg-white/10 p-1.5 hover:bg-white/20">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pelanggan</p>
              <p className="truncate font-semibold text-slate-800">{row.customerName || "—"}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Outlet</p>
              <p className="truncate font-semibold text-slate-800">{row.branch || "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pembayaran yang dihapus</p>
              <p className="font-bold text-slate-800">
                {fmtIDR(row.amount)} <span className="font-semibold text-slate-500">· {row.logType} · {row.paymentMethod || "—"}</span>
              </p>
              <p className="text-[10px] text-slate-500">dibayar {fmtDateTime(row.paidAt)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Alasan kasir</p>
              <p className="whitespace-pre-line text-slate-700">{row.reason || "—"}</p>
            </div>
          </div>

          {approve ? (
            <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-[11px] text-sky-900">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>Status bayar:</span>
                <PayStatusBadge status={row.paymentStatus} />
                <HiOutlineArrowRight className="h-3 w-3" />
                <PayStatusBadge status={after.status} />
                {after.paid > 0 && <span>(sisa dibayar {fmtIDR(after.paid)})</span>}
              </div>
              <p>
                Revenue berkurang {fmtIDR(row.amount)} di tanggal bayar aslinya ({fmtDateTime(row.paidAt)}). Nota tidak dihapus.
                {isMember(row.paymentMethod) && <b> Saldo member pelanggan dikembalikan {fmtIDR(row.amount)}.</b>}
              </p>
            </div>
          ) : (
            <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
              <HiOutlineExclamationTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Pembayaran tetap tercatat dan status bayar nota tidak berubah.</p>
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">
              {approve ? "Alasan / catatan persetujuan" : "Alasan penolakan"} <span className="font-normal text-slate-400">(opsional)</span>
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]/30"
            />
            <span className="mt-0.5 block text-right text-[10px] text-slate-400">{notes.length}/300</span>
          </label>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cn("flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60", approve ? "bg-sky-700 hover:bg-sky-800" : "bg-slate-800 hover:bg-slate-900")}
          >
            {saving ? "Menyimpan..." : approve ? "Setujui Hapus Pelunasan" : "Tolak Pengajuan"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ActionButtons({ row, onDecide, block = false }) {
  if (row.status !== "Pending") return null;
  return (
    <div className={cn("flex gap-1.5", block ? "w-full" : "justify-center")} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onDecide({ row, mode: "reject" })} className={cn("rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50", block && "flex-1 py-2")}>
        Tolak
      </button>
      <button type="button" onClick={() => onDecide({ row, mode: "approve" })} className={cn("rounded-xl bg-sky-700 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-sky-800", block && "flex-1 py-2")}>
        Setujui
      </button>
    </div>
  );
}

export default function RequestVoidPayment({ onChanged }) {
  const navigate = useNavigate();
  const cutoff = useCutoffPeriod();
  const [allPeriods, setAllPeriods] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [decision, setDecision] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3600);
  };

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (!allPeriods && cutoff.dateFrom) qs.set("dateFrom", cutoff.dateFrom);
        if (!allPeriods && cutoff.dateTo) qs.set("dateTo", cutoff.dateTo);
        const res = await api(`/waschen/transactions/payment-voids?${qs}`);
        setRows(res.data || []);
      } catch (err) {
        if (silent) return;
        showToast("error", err.message || "Gagal memuat pengajuan hapus pelunasan");
        setRows([]);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [allPeriods, cutoff.dateFrom, cutoff.dateTo]
  );

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const counts = useMemo(() => {
    const c = { all: rows.length, Pending: 0, Approved: 0, Rejected: 0 };
    rows.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (!q) return true;
        return [r.orderNo, r.customerName, r.customerPhone, r.branch, r.reason, r.paymentMethod].some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const pa = a.status === "Pending" ? 0 : 1;
        const pb = b.status === "Pending" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(b.requestedAt || 0) - new Date(a.requestedAt || 0);
      });
  }, [rows, search, filter]);

  const openDetail = (row) => navigate(`/my-waschen/transactions/${row.transactionId}`, { state: { from: "/my-waschen/transactions?tab=void" } });

  const onDecided = async (message) => {
    setDecision(null);
    showToast("success", message);
    await load(true);
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={HiOutlineBanknotes} tone="sky" label="Total Pengajuan" value={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
        <SummaryCard icon={HiOutlineClock} tone="amber" label="Menunggu" value={counts.Pending} active={filter === "Pending"} onClick={() => setFilter("Pending")} />
        <SummaryCard icon={HiOutlineCheckCircle} tone="emerald" label="Disetujui" value={counts.Approved} active={filter === "Approved"} onClick={() => setFilter("Approved")} />
        <SummaryCard icon={HiOutlineXCircle} tone="slate" label="Ditolak" value={counts.Rejected} active={filter === "Rejected"} onClick={() => setFilter("Rejected")} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-100 p-3 sm:p-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari no. nota, pelanggan, outlet, alasan..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 scrollbar-thin lg:flex-none">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn("shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition", filter === f.id ? "bg-[#5f1340] text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                  >
                    {f.label} <span className={filter === f.id ? "text-white/70" : "text-slate-400"}>{counts[f.id] || 0}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => load()} title="Muat ulang" className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
                <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>
          <CutoffPeriodFilter cutoff={cutoff} variant="compact" allowAll showAll={allPeriods} onShowAllChange={setAllPeriods} allLabel="Semua Periode" />
          <p className="text-[10px] text-slate-400">Periode berdasarkan tanggal pengajuan. Nota tidak dihapus — hanya pembayaran terakhirnya yang dibatalkan. Klik baris untuk melihat rincian nota.</p>
        </div>

        {loading ? (
          <p className="py-14 text-center text-xs text-slate-400">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <HiOutlineExclamationTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold">Tidak ada pengajuan hapus pelunasan</p>
            <p className="mt-1 text-[11px]">Coba ubah filter status, periode, atau kata pencarian</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((r) => (
                <div key={r.id} role="button" tabIndex={0} onClick={() => openDetail(r)} className="space-y-3 p-3 active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-bold text-[#5f1340]">{r.orderNo}</p>
                      <p className="text-[10px] text-slate-400">Diajukan {fmtDateTime(r.requestedAt)}{r.requestedByName ? ` · ${r.requestedByName}` : ""}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{r.customerName || "—"}</p>
                      <p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                        <HiOutlineBuildingStorefront className="h-3 w-3 shrink-0" />
                        {r.branch || "—"}
                      </p>
                      <div className="mt-1">
                        <PayStatusBadge status={r.paymentStatus} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <PaymentInfo row={r} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl bg-sky-50/60 p-2.5">
                    <AttachmentButton url={r.attachmentUrl} compact />
                    <p className="min-w-0 flex-1 whitespace-pre-line break-words text-xs text-slate-700">{r.reason || "—"}</p>
                  </div>
                  <DecisionInfo row={r} />
                  <ActionButtons row={r} onDecide={setDecision} block />
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nota & Pengajuan</th>
                    <th className="px-4 py-3 font-semibold">Pelanggan & Outlet</th>
                    <th className="px-4 py-3 font-semibold">Pembayaran Dihapus</th>
                    <th className="px-4 py-3 font-semibold">Alasan & Lampiran</th>
                    <th className="px-4 py-3 font-semibold">Status Bayar Nota</th>
                    <th className="px-4 py-3 font-semibold">Status Pengajuan</th>
                    <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => openDetail(r)} className="cursor-pointer align-top transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className="font-mono font-bold text-[#5f1340]">{r.orderNo}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Diajukan {fmtDateTime(r.requestedAt)}</p>
                        {r.requestedByName && <p className="text-[10px] text-slate-400">oleh {r.requestedByName}</p>}
                      </td>
                      <td className="min-w-[11rem] max-w-[15rem] px-4 py-3.5">
                        <p className="break-words font-semibold text-slate-800">{r.customerName || "—"}</p>
                        {r.customerPhone && <p className="text-[10px] text-slate-500">{r.customerPhone}</p>}
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                          <HiOutlineBuildingStorefront className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.branch || "—"}</span>
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <PaymentInfo row={r} />
                      </td>
                      <td className="min-w-[13rem] max-w-[18rem] px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <AttachmentButton url={r.attachmentUrl} compact />
                          <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line break-words text-slate-700" title={r.reason}>
                            {r.reason || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <PayStatusBadge status={r.paymentStatus} />
                        <p className="mt-1 text-[10px] text-slate-500">
                          {fmtIDR(r.paidAmount)} / {fmtIDR(r.grandTotal)}
                        </p>
                      </td>
                      <td className="min-w-[9rem] max-w-[14rem] px-4 py-3.5">
                        <StatusBadge status={r.status} />
                        <DecisionInfo row={r} />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {r.status === "Pending" ? <ActionButtons row={r} onDecide={setDecision} /> : <HiOutlineChevronRight className="mx-auto h-4 w-4 text-slate-300" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <VoidDecisionModal target={decision} onClose={() => setDecision(null)} onDone={onDecided} />
    </div>
  );
}
