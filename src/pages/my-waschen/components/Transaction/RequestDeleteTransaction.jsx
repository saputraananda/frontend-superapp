import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineTrash,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlineChevronRight,
  HiOutlineBuildingStorefront,
  HiOutlineUser,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import {
  AttachmentButton,
  DecisionInfo,
  DeleteDecisionModal,
  DeleteStatusBadge,
  PayStatusBadge,
  cn,
  deleteState,
  fmtDateTime,
  fmtIDR,
  parseDeleteReason,
} from "./deleteRequestShared";

/** "ANANDA PRATHAMA SAPUTRA" → "Ananda Prathama Saputra" */
const formatPersonName = (n) => String(n || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "pending", label: "Menunggu" },
  { id: "approved", label: "Disetujui" },
  { id: "rejected", label: "Ditolak" },
];

function SummaryCard({ icon: Icon, label, value, note, tone, active, onClick }) {
  const tones = {
    rose: "text-rose-600 bg-rose-50",
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
        <span className="hidden truncate text-[10px] text-slate-500 sm:block">{note}</span>
      </span>
    </button>
  );
}

function ActionButtons({ row, onDecide, block = false }) {
  if (deleteState(row) !== "pending") return null;
  return (
    <div className={cn("flex gap-1.5", block ? "w-full" : "justify-center")} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onDecide({ row, mode: "reject" })}
        className={cn("rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50", block && "flex-1 py-2")}
      >
        Tolak
      </button>
      <button
        type="button"
        onClick={() => onDecide({ row, mode: "approve" })}
        className={cn("rounded-xl bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700", block && "flex-1 py-2")}
      >
        Setujui
      </button>
    </div>
  );
}

function PaymentCell({ row }) {
  const paid = Number(row.paidAmount) || 0;
  return (
    <div className="space-y-1">
      <p className="font-bold text-slate-800">{fmtIDR(row.grandTotal)}</p>
      <div className="flex flex-wrap items-center gap-1">
        <PayStatusBadge status={row.paymentStatus} />
        {row.refundPendingCount > 0 && (
          <span className="whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">Refund diajukan</span>
        )}
      </div>
      {paid > 0 && row.paymentStatus !== "Lunas" && <p className="text-[10px] text-slate-500">dibayar {fmtIDR(paid)}</p>}
    </div>
  );
}

export default function RequestDeleteTransaction({ onChanged }) {
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
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const qs = new URLSearchParams({ listType: "delete" });
        if (!allPeriods && cutoff.dateFrom) qs.set("dateFrom", cutoff.dateFrom);
        if (!allPeriods && cutoff.dateTo) qs.set("dateTo", cutoff.dateTo);
        const res = await api(`/waschen/transactions?${qs}`);
        setRows(res.data || []);
      } catch (err) {
        if (silent) return;
        showToast("error", err.message || "Gagal memuat pengajuan hapus");
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
    const c = { all: rows.length, pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => {
      c[deleteState(r)] += 1;
    });
    return c;
  }, [rows]);

  // Menunggu selalu di atas, lalu pengajuan terbaru
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .map((r) => ({ ...r, _parsed: parseDeleteReason(r.deleteReason), _state: deleteState(r) }))
      .filter((r) => {
        if (filter !== "all" && r._state !== filter) return false;
        if (!q) return true;
        return [r.orderNo, r.customerName, r.customerPhone, r.branch, r.outletName, r._parsed.reason]
          .some((v) => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const pa = a._state === "pending" ? 0 : 1;
        const pb = b._state === "pending" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(b.deleteRequestedAt || 0) - new Date(a.deleteRequestedAt || 0);
      });
  }, [rows, search, filter]);

  const openDetail = (row) => navigate(`/my-waschen/transactions/${row.id}`, { state: { from: "/my-waschen/transactions?tab=delete" } });

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
        <SummaryCard icon={HiOutlineTrash} tone="rose" label="Total Pengajuan" value={counts.all} note="Pengajuan hapus nota" active={filter === "all"} onClick={() => setFilter("all")} />
        <SummaryCard icon={HiOutlineClock} tone="amber" label="Menunggu" value={counts.pending} note="Perlu keputusan" active={filter === "pending"} onClick={() => setFilter("pending")} />
        <SummaryCard icon={HiOutlineCheckCircle} tone="emerald" label="Disetujui" value={counts.approved} note="Nota dibatalkan" active={filter === "approved"} onClick={() => setFilter("approved")} />
        <SummaryCard icon={HiOutlineXCircle} tone="slate" label="Ditolak" value={counts.rejected} note="Nota kembali aktif" active={filter === "rejected"} onClick={() => setFilter("rejected")} />
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
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-bold transition",
                      filter === f.id ? "bg-[#5f1340] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                    )}
                  >
                    {f.label} <span className={filter === f.id ? "text-white/70" : "text-slate-400"}>{counts[f.id]}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => load()} title="Muat ulang" className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
                <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>
          <CutoffPeriodFilter cutoff={cutoff} variant="compact" allowAll showAll={allPeriods} onShowAllChange={setAllPeriods} allLabel="Semua Periode" />
          <p className="text-[10px] text-slate-400">Periode berdasarkan tanggal pengajuan hapus. Klik baris untuk melihat rincian nota.</p>
        </div>

        {loading ? (
          <p className="py-14 text-center text-xs text-slate-400">Memuat...</p>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <HiOutlineExclamationTriangle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold">Tidak ada pengajuan hapus nota</p>
            <p className="mt-1 text-[11px]">Coba ubah filter status, periode, atau kata pencarian</p>
          </div>
        ) : (
          <>
            {/* Mobile: kartu */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((r) => (
                <div key={r.id} role="button" tabIndex={0} onClick={() => openDetail(r)} className="space-y-3 p-3 active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={cn("truncate font-mono text-xs font-bold", r._state === "approved" ? "text-slate-400 line-through" : "text-[#5f1340]")}>{r.orderNo}</p>
                      <p className="text-[10px] text-slate-400">Diajukan {fmtDateTime(r.deleteRequestedAt)}</p>
                    </div>
                    <DeleteStatusBadge row={r} />
                  </div>
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{r.customerName || "—"}</p>
                      <p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                        <HiOutlineBuildingStorefront className="h-3 w-3 shrink-0" />
                        {r.branch || r.outletName || "—"}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[10px] text-slate-500">
                        <HiOutlineUser className="h-3 w-3 shrink-0" />
                        Diajukan oleh {r.deleteRequestedByName ? formatPersonName(r.deleteRequestedByName) : "—"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <PaymentCell row={r} />
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl bg-rose-50/50 p-2.5">
                    <AttachmentButton url={r.deleteAttachmentUrl} compact />
                    <p className="min-w-0 flex-1 whitespace-pre-line break-words text-xs text-slate-700">{r._parsed.reason || "—"}</p>
                  </div>
                  {r._parsed.decision && <DecisionInfo decision={r._parsed.decision} />}
                  <ActionButtons row={r} onDecide={setDecision} block />
                </div>
              ))}
            </div>

            {/* Desktop: tabel */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nota & Pengajuan</th>
                    <th className="px-4 py-3 font-semibold">Pelanggan & Outlet</th>
                    <th className="px-4 py-3 font-semibold">Alasan & Lampiran</th>
                    <th className="px-4 py-3 font-semibold">Tagihan & Status Bayar</th>
                    <th className="px-4 py-3 font-semibold">Status Pengajuan</th>
                    <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.id} onClick={() => openDetail(r)} className="cursor-pointer align-top transition hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <p className={cn("font-mono font-bold", r._state === "approved" ? "text-slate-400 line-through" : "text-[#5f1340]")}>{r.orderNo}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Diajukan {fmtDateTime(r.deleteRequestedAt)}</p>
                        <p className="text-[10px] text-slate-400">Nota {fmtDateTime(r.orderDate)}</p>
                      </td>
                      <td className="min-w-[11rem] max-w-[15rem] px-4 py-3.5">
                        <p className="break-words font-semibold text-slate-800">{r.customerName || "—"}</p>
                        {r.customerPhone && <p className="text-[10px] text-slate-500">{r.customerPhone}</p>}
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                          <HiOutlineBuildingStorefront className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.branch || r.outletName || "—"}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                          <HiOutlineUser className="h-3 w-3 shrink-0" />
                          <span className="truncate">Diajukan oleh <span className="font-semibold text-slate-700">{r.deleteRequestedByName ? formatPersonName(r.deleteRequestedByName) : "—"}</span></span>
                        </p>
                      </td>
                      <td className="min-w-[14rem] max-w-[20rem] px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <AttachmentButton url={r.deleteAttachmentUrl} compact />
                          <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line break-words text-slate-700" title={r._parsed.reason}>
                            {r._parsed.reason || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <PaymentCell row={r} />
                      </td>
                      <td className="min-w-[9rem] max-w-[14rem] px-4 py-3.5">
                        <DeleteStatusBadge row={r} />
                        <DecisionInfo decision={r._parsed.decision} className="mt-1.5" />
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {r._state === "pending" ? (
                          <ActionButtons row={r} onDecide={setDecision} />
                        ) : (
                          <HiOutlineChevronRight className="mx-auto h-4 w-4 text-slate-300" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <DeleteDecisionModal target={decision} onClose={() => setDecision(null)} onDone={onDecided} />
    </div>
  );
}
