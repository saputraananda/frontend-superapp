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
  leaveDurationLabel,
  leaveTypeLabel,
  leaveTypeBadge,
  useSort,
  fmtEmployeeName,
} from "../../utils/hrisUtils";
import {
  SortTh,
  PhotoThumb,
  PhotoViewerModal,
  FilterScroll,
  FilterPill,
  MobileSkeleton,
  LeaveMobileCard,
} from "./hrisShared";

const STATUS_FILTERS = [
  { key: "Semua", label: "Semua" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
];

const TYPE_FILTERS = [
  { key: "Semua", label: "Semua Tipe" },
  { key: "izin", label: "Izin" },
  { key: "sakit", label: "Sakit" },
  { key: "cuti", label: "Cuti" },
];

export default function Perizinan() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "created_at", dir: "desc" });

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pengajuan: 0, disetujui: 0, ditolak: 0 });
  const [statusFilter, setStatusFilter] = useState("pengajuan");
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [photoView, setPhotoView] = useState(null);

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
      if (typeFilter !== "Semua") q.set("leaveType", typeFilter);
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/leaves?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { total: 0, pengajuan: 0, disetujui: 0, ditolak: 0 });
    } catch (err) {
      showToast("error", err.message || "Gagal memuat perizinan");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, typeFilter, search, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => applySort(rows, {
      employee_name: (r) => r.employee_name,
      leave_type: (r) => r.leave_type,
      start_date: (r) => r.start_date,
      end_date: (r) => r.end_date,
      status: (r) => r.status,
      created_at: (r) => r.created_at,
    }),
    [rows, applySort],
  );

  const approve = async (id) => {
    setSubmitting(true);
    try {
      await api(`/waschen/hris/leaves/${id}/approve`, { method: "PATCH" });
      showToast("success", "Perizinan disetujui");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!rejectRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/leaves/${rejectRow.leave_id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejection_note: rejectNote }),
      });
      showToast("success", "Perizinan ditolak");
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
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Perizinan</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Review pengajuan izin, sakit, dan cuti karyawan Waschen Mobile
          </p>
        </div>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className={SUMMARY_GRID.replace("lg:grid-cols-5", "lg:grid-cols-4")}>
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
              {TYPE_FILTERS.map((f) => (
                <FilterPill key={f.key} active={typeFilter === f.key} onClick={() => setTypeFilter(f.key)} className={typeFilter === f.key ? "bg-slate-800 text-white border-slate-800" : ""}>{f.label}</FilterPill>
              ))}
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
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Daftar Pengajuan Perizinan</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Izin, sakit, cuti, dan lampiran surat dokter.</p>
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
            <p className="text-sm font-semibold">Belum ada pengajuan perizinan</p>
          </div>
        ) : (
          <>
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {sorted.map((r) => (
                <LeaveMobileCard
                  key={r.leave_id}
                  row={r}
                  submitting={submitting}
                  onApprove={approve}
                  onReject={setRejectRow}
                  onViewPhoto={setPhotoView}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                <SortTh col="leave_type" label="Tipe" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Durasi</th>
                <SortTh col="start_date" label="Mulai" sort={sort} onSort={toggleSort} />
                <SortTh col="end_date" label="Selesai" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-3 font-semibold">Alasan</th>
                <th className="px-4 py-3 font-semibold text-center">Lampiran</th>
                <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} className="text-center" />
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r, idx) => (
                <tr key={r.leave_id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{fmtEmployeeName(r.employee_name)}</p>
                    {r.employee_code && <p className="text-[10px] text-slate-400">{r.employee_code}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", leaveTypeBadge(r.leave_type))}>{leaveTypeLabel(r.leave_type)}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{leaveDurationLabel(r.duration_type)}</td>
                  <td className="px-4 py-3.5 text-slate-600">{fmtDateShort(r.start_date)}</td>
                  <td className="px-4 py-3.5 text-slate-600">{fmtDateShort(r.end_date)}</td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={r.reason}>{r.reason}</td>
                  <td className="px-4 py-3.5 text-center">
                    <PhotoThumb url={r.doctor_note_url} label="Surat dokter" onView={setPhotoView} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", leaveStatusBadge(r.status))}>{capitalizeStatus(r.status)}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {r.status === "pengajuan" ? (
                      <div className="flex justify-center gap-1">
                        <button type="button" disabled={submitting} title="Setujui" onClick={() => approve(r.leave_id)} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><HiOutlineCheckCircle className="h-4 w-4" /></button>
                        <button type="button" disabled={submitting} title="Tolak" onClick={() => setRejectRow(r)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><HiOutlineXMark className="h-4 w-4" /></button>
                      </div>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>
          </>
        )}
      </section>

      <PhotoViewerModal open={Boolean(photoView)} url={photoView?.url} label={photoView?.label} onClose={() => setPhotoView(null)} />

      {rejectRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Tolak Perizinan</h3>
              <button type="button" onClick={() => setRejectRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong className="text-slate-800">{fmtEmployeeName(rejectRow.employee_name)}</strong></p>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Alasan penolakan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRejectRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={reject} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Tolak</button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
