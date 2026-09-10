import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineTableCells,
  HiOutlineEye,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import HrisOutletRoleFilter from "../HrisOutletRoleFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import useHrisOutletRoleFilters from "../../hooks/useHrisOutletRoleFilters";
import {
  PAGE_WRAP,
  SUMMARY_GRID,
  FILTER_SECTION,
  TABLE_SECTION,
  cn,
  fmtDateShort,
  leaveStatusBadge,
  capitalizeStatus,
  useSort,
  fmtEmployeeName,
  fmtDateTime,
} from "../../utils/hrisUtils";
import {
  SortTh,
  FilterScroll,
  FilterPill,
  MobileSkeleton,
} from "./hrisShared";

/**
 * MEMORY: Halaman Lembur Alsa — style sama Perizinan/Kasbon.
 * Pantau + ACC/reject + detail pengerjaan (nota, item, KG/PCS, flag KPI).
 */

const STATUS_FILTERS = [
  { key: "Semua", label: "Semua" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

const FLAG_LABEL = {
  overtime: { label: "Lembur", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  overtime_pending: { label: "Pending ACC", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  outside_hours: { label: "Luar jam", cls: "border-slate-200 bg-slate-50 text-slate-600" },
  normal: { label: "Normal", cls: "border-slate-100 bg-white text-slate-500" },
};

const fmtTime = (t) => (t ? String(t).slice(0, 5) : "—");

function OvertimeMobileCard({ row, submitting, onApprove, onReject, onDetail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fmtEmployeeName(row.employee_name)}</p>
          {row.employee_code && <p className="text-[10px] text-slate-400">{row.employee_code}</p>}
        </div>
        <span className={cn("shrink-0 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", leaveStatusBadge(row.status))}>
          {capitalizeStatus(row.status)}
        </span>
      </div>
      <p className="text-[11px] text-slate-600">
        {fmtDateShort(row.overtime_date)} · {fmtTime(row.start_time)}–{fmtTime(row.end_time)}
      </p>
      <p className="text-[11px] text-slate-500 line-clamp-2">{row.reason}</p>
      <div className="flex gap-1.5 pt-1">
        <button type="button" onClick={() => onDetail(row)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
          Detail
        </button>
        {row.status === "pengajuan" && (
          <>
            <button type="button" disabled={submitting} onClick={() => onApprove(row.id)} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
              Setujui
            </button>
            <button type="button" disabled={submitting} onClick={() => onReject(row)} className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white disabled:opacity-50">
              Tolak
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Overtime() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "created_at", dir: "desc" });

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pengajuan: 0, disetujui: 0, ditolak: 0, dibatalkan: 0 });
  const [statusFilter, setStatusFilter] = useState("pengajuan");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [approveRow, setApproveRow] = useState(null);
  const [approveNote, setApproveNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      if (statusFilter !== "Semua") q.set("status", statusFilter);
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/overtime?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { total: 0, pengajuan: 0, disetujui: 0, ditolak: 0, dibatalkan: 0 });
    } catch (err) {
      showToast("error", err.message || "Gagal memuat lembur");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, search, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => applySort(rows, {
      employee_name: (r) => r.employee_name,
      overtime_date: (r) => r.overtime_date,
      start_time: (r) => r.start_time,
      status: (r) => r.status,
      created_at: (r) => r.created_at,
    }),
    [rows, applySort],
  );

  const openDetail = async (row) => {
    setDetailLoading(true);
    try {
      const res = await api(`/waschen/hris/overtime/${row.id}`);
      setDetail(res.data || null);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  };

  const doApprove = async () => {
    if (!approveRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/overtime/${approveRow.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ approval_note: approveNote }),
      });
      showToast("success", "Lembur disetujui");
      setApproveRow(null);
      setApproveNote("");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const doReject = async () => {
    if (!rejectRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/overtime/${rejectRow.id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejection_note: rejectNote }),
      });
      showToast("success", "Lembur ditolak");
      setRejectRow(null);
      setRejectNote("");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Lembur</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Pantau pengajuan lembur, ACC/tolak, dan detail pengerjaan item/nota di jam lembur
          </p>
        </div>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className={SUMMARY_GRID.replace("lg:grid-cols-5", "lg:grid-cols-5")}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700"><HiOutlineClock className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-wider">Menunggu</p></div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-800">{summary.pengajuan}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Disetujui</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-800">{summary.disetujui}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Ditolak</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-800">{summary.ditolak}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dibatalkan</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-700">{summary.dibatalkan || 0}</p>
        </div>
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
          </div>
        </div>

        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} />
          <HrisOutletRoleFilter
            outlets={hrisFilters.outlets}
            outletId={hrisFilters.outletId}
            onOutletChange={hrisFilters.setOutletId}
            role={hrisFilters.role}
            onRoleChange={hrisFilters.setRole}
          />
          <div className="relative w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan, alasan..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <FilterScroll className="flex-1">
              {STATUS_FILTERS.map((f) => (
                <FilterPill key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>{f.label}</FilterPill>
              ))}
            </FilterScroll>
            <button type="button" onClick={load} className="shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      <section className={TABLE_SECTION}>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[#5f1340]">
              <HiOutlineTableCells className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Daftar Pengajuan Lembur</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Multi-slot per hari · ACC leader/admin · detail pengerjaan KPI.</p>
            </div>
          </div>
          {!loading && (
            <span className="shrink-0 text-xs font-semibold text-slate-500">{sorted.length} record</span>
          )}
        </div>

        {loading ? (
          <MobileSkeleton count={4} />
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <HiOutlineClipboardDocumentList className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Belum ada pengajuan lembur</p>
          </div>
        ) : (
          <>
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {sorted.map((r) => (
                <OvertimeMobileCard
                  key={r.id}
                  row={r}
                  submitting={submitting}
                  onApprove={(id) => setApproveRow(sorted.find((x) => x.id === id) || r)}
                  onReject={setRejectRow}
                  onDetail={openDetail}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                    <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                    <SortTh col="overtime_date" label="Tanggal" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold">Jam</th>
                    <th className="px-4 py-3 font-semibold">Alasan</th>
                    <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} className="text-center" />
                    <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{fmtEmployeeName(r.employee_name)}</p>
                        {r.employee_code && <p className="text-[10px] text-slate-400">{r.employee_code}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{fmtDateShort(r.overtime_date)}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-semibold">{fmtTime(r.start_time)}–{fmtTime(r.end_time)}</td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", leaveStatusBadge(r.status))}>{capitalizeStatus(r.status)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-1">
                          <button type="button" title="Detail pengerjaan" onClick={() => openDetail(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                            <HiOutlineEye className="h-4 w-4" />
                          </button>
                          {r.status === "pengajuan" ? (
                            <>
                              <button type="button" disabled={submitting} title="Setujui" onClick={() => { setApproveRow(r); setApproveNote(""); }} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                                <HiOutlineCheckCircle className="h-4 w-4" />
                              </button>
                              <button type="button" disabled={submitting} title="Tolak" onClick={() => setRejectRow(r)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                                <HiOutlineXMark className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Detail pengerjaan */}
      {(detail || detailLoading) && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => !detailLoading && setDetail(null)}>
          <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-sm">Detail Pengerjaan Lembur</h3>
              <button type="button" onClick={() => setDetail(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 overflow-y-auto text-xs space-y-4">
              {detailLoading || !detail ? (
                <p className="text-slate-400 py-8 text-center">Memuat...</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Karyawan</p>
                      <p className="font-semibold text-slate-800">{fmtEmployeeName(detail.overtime.employee_name)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Tanggal</p>
                      <p className="font-semibold text-slate-800">{fmtDateShort(detail.overtime.overtime_date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Jam</p>
                      <p className="font-semibold text-slate-800">{fmtTime(detail.overtime.start_time)}–{fmtTime(detail.overtime.end_time)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Status</p>
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", leaveStatusBadge(detail.overtime.status))}>
                        {capitalizeStatus(detail.overtime.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600"><span className="font-semibold">Alasan:</span> {detail.overtime.reason}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl border bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400 font-bold">Item</p><p className="text-lg font-bold text-slate-800">{detail.totals.items}</p></div>
                    <div className="rounded-xl border bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400 font-bold">PCS</p><p className="text-lg font-bold text-slate-800">{detail.totals.pcs}</p></div>
                    <div className="rounded-xl border bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400 font-bold">KG</p><p className="text-lg font-bold text-slate-800">{detail.totals.kg}</p></div>
                    <div className="rounded-xl border bg-emerald-50 p-2.5"><p className="text-[10px] text-emerald-600 font-bold">Flag Lembur</p><p className="text-lg font-bold text-emerald-800">{detail.totals.overtime}</p></div>
                  </div>

                  {detail.work_items.length === 0 ? (
                    <p className="text-center text-slate-400 py-6">Belum ada item dikerjakan di slot lembur ini.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full min-w-[720px] text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Nota</th>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Stage</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">PCS</th>
                            <th className="px-3 py-2">Selesai</th>
                            <th className="px-3 py-2">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {detail.work_items.map((w) => {
                            const fl = FLAG_LABEL[w.work_time_flag] || FLAG_LABEL.normal;
                            return (
                              <tr key={w.progress_id}>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-slate-800">{w.order_no || w.barcode || `#${w.transaction_id}`}</p>
                                  <p className="text-[10px] text-slate-400">{w.customer_name}</p>
                                </td>
                                <td className="px-3 py-2 text-slate-700">{w.service_name}</td>
                                <td className="px-3 py-2 capitalize text-slate-600">{w.stage}</td>
                                <td className="px-3 py-2">{w.qty_display} {w.qty_unit}</td>
                                <td className="px-3 py-2">{w.pcs_worked || "—"}</td>
                                <td className="px-3 py-2 text-slate-500">{fmtDateTime(w.completed_at)}</td>
                                <td className="px-3 py-2">
                                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", fl.cls)}>{fl.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {approveRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setApproveRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Setujui Lembur</h3>
              <button type="button" onClick={() => setApproveRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong className="text-slate-800">{fmtEmployeeName(approveRow.employee_name)}</strong></p>
              <p className="text-slate-500">{fmtDateShort(approveRow.overtime_date)} · {fmtTime(approveRow.start_time)}–{fmtTime(approveRow.end_time)}</p>
              <textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={3} placeholder="Catatan (opsional)..." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setApproveRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={doApprove} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Setujui</button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {rejectRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Tolak Lembur</h3>
              <button type="button" onClick={() => setRejectRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong className="text-slate-800">{fmtEmployeeName(rejectRow.employee_name)}</strong></p>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Alasan penolakan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRejectRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={doReject} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Tolak</button>
              </div>
            </div>
          </div>
        </div>,
        document.body)}
    </div>
  );
}
