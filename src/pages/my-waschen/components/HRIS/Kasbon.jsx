import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineEye,
  HiOutlinePlay,
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
  fmtIDR,
  kasbonStatusBadge,
  capitalizeStatus,
  useSort,
  fmtEmployeeName,
} from "../../utils/hrisUtils";
import {
  SortTh,
  PhotoThumb,
  PhotoViewerModal,
  KasbonTypeBadge,
  FilterScroll,
  FilterPill,
  MobileSkeleton,
  KasbonMobileCard,
} from "./hrisShared";

const STATUS_FILTERS = [
  { key: "Semua", label: "Semua" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "proses", label: "Proses" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
];

const TYPE_FILTERS = [
  { key: "Semua", label: "Semua Tipe" },
  { key: "kasbon", label: "Kasbon" },
  { key: "pinjaman", label: "Pinjaman" },
];

export default function Kasbon() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "submission_date", dir: "desc" });

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pengajuan: 0, proses: 0, disetujui: 0, ditolak: 0 });
  const [statusFilter, setStatusFilter] = useState("pengajuan");
  const [typeFilter, setTypeFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
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
      if (typeFilter !== "Semua") q.set("type", typeFilter);
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/kasbon?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { total: 0, pengajuan: 0, proses: 0, disetujui: 0, ditolak: 0 });
    } catch (err) {
      showToast("error", err.message || "Gagal memuat kasbon");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, typeFilter, search, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const sorted = useMemo(
    () => applySort(rows, {
      submission_date: (r) => r.submission_date,
      employee_name: (r) => r.employee_name,
      type: (r) => r.type,
      amount_requested: (r) => Number(r.amount_requested) || 0,
      amount_approved: (r) => Number(r.amount_approved) || 0,
      status: (r) => r.status,
    }),
    [rows, applySort],
  );

  const openDetail = async (id) => {
    try {
      const res = await api(`/waschen/hris/kasbon/${id}`);
      setDetail(res.data);
    } catch (err) {
      showToast("error", err.message);
    }
  };

  const act = async (id, action, body = {}) => {
    setSubmitting(true);
    try {
      await api(`/waschen/hris/kasbon/${id}/${action}`, { method: "PATCH", body: JSON.stringify(body) });
      showToast("success", "Berhasil diperbarui");
      setRejectRow(null);
      setRejectNote("");
      load();
      if (detail?.id === id) openDetail(id);
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cicilanPct = (r) => {
    if (r.type !== "pinjaman" || r.status !== "disetujui") return null;
    const approved = Number(r.amount_approved ?? r.amount_requested) || 0;
    const paid = Number(r.total_paid) || 0;
    if (approved <= 0) return 0;
    return Math.min(100, Math.round((paid / approved) * 100));
  };

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Kasbon & Pinjaman</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Review pengajuan kasbon/pinjaman dari Waschen Mobile
          </p>
        </div>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className={SUMMARY_GRID}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700"><HiOutlineClock className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-wider">Pengajuan</p></div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-800">{summary.pengajuan}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Proses</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-sky-800">{summary.proses}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Disetujui</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-800">{summary.disetujui}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 sm:p-4 shadow-sm col-span-2 sm:col-span-1">
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan, keperluan..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
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
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Daftar Kasbon & Pinjaman</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Pengajuan, cicilan, bukti, dan status approval.</p>
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
            <HiOutlineBanknotes className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Belum ada pengajuan kasbon</p>
          </div>
        ) : (
          <>
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {sorted.map((r) => (
                <KasbonMobileCard
                  key={r.id}
                  row={r}
                  submitting={submitting}
                  cicilanPct={cicilanPct}
                  onDetail={openDetail}
                  onProcess={(id) => act(id, "process")}
                  onApprove={(id) => act(id, "approve")}
                  onReject={setRejectRow}
                  onViewPhoto={setPhotoView}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <SortTh col="submission_date" label="Tanggal" sort={sort} onSort={toggleSort} />
                <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                <SortTh col="type" label="Tipe" sort={sort} onSort={toggleSort} />
                <SortTh col="amount_requested" label="Jumlah Diajukan" sort={sort} onSort={toggleSort} className="text-right" />
                <SortTh col="amount_approved" label="Disetujui" sort={sort} onSort={toggleSort} className="text-right" />
                <th className="px-4 py-3 font-semibold">Cicilan</th>
                <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} className="text-center" />
                <th className="px-4 py-3 font-semibold text-center">Bukti</th>
                <th className="px-4 py-3 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => {
                const pct = cicilanPct(r);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 text-slate-600">{fmtDateShort(r.submission_date)}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{fmtEmployeeName(r.employee_name)}</td>
                    <td className="px-4 py-3.5"><KasbonTypeBadge type={r.type} /></td>
                    <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-800">{fmtIDR(r.amount_requested)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                      {r.amount_approved != null ? fmtIDR(r.amount_approved) : "—"}
                    </td>
                    <td className="px-4 py-3.5 min-w-[120px]">
                      {pct != null ? (
                        <div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{pct}% · sisa {fmtIDR(r.remaining)}</p>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", kasbonStatusBadge(r.status))}>{capitalizeStatus(r.status)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <PhotoThumb url={r.proof_url} label="Bukti kasbon" onView={setPhotoView} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-center gap-1">
                        <button type="button" title="Detail" onClick={() => openDetail(r.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><HiOutlineEye className="h-4 w-4" /></button>
                        {r.status === "pengajuan" && (
                          <button type="button" disabled={submitting} title="Proses" onClick={() => act(r.id, "process")} className="rounded-lg p-1.5 text-sky-600 hover:bg-sky-50"><HiOutlinePlay className="h-4 w-4" /></button>
                        )}
                        {(r.status === "pengajuan" || r.status === "proses") && (
                          <>
                            <button type="button" disabled={submitting} title="Setujui" onClick={() => act(r.id, "approve")} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"><HiOutlineCheckCircle className="h-4 w-4" /></button>
                            <button type="button" disabled={submitting} title="Tolak" onClick={() => setRejectRow(r)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><HiOutlineXMark className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </section>

      <PhotoViewerModal open={Boolean(photoView)} url={photoView?.url} label={photoView?.label} onClose={() => setPhotoView(null)} />

      {detail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">{fmtEmployeeName(detail.employee_name)}</h3>
                <p className="text-[10px] text-slate-400 capitalize mt-0.5">{detail.type} · {fmtDateShort(detail.submission_date)}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Diajukan</p><p className="font-bold text-[#5f1340]">{fmtIDR(detail.amount_requested)}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-slate-400">Disetujui</p><p className="font-bold text-emerald-700">{detail.amount_approved != null ? fmtIDR(detail.amount_approved) : "—"}</p></div>
              </div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Keperluan</p><p className="text-slate-700 mt-1">{detail.purpose}</p></div>
              {detail.notes && <div><p className="text-[10px] font-bold uppercase text-slate-400">Catatan</p><p className="text-slate-600 mt-1">{detail.notes}</p></div>}
              {detail.proof_url && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Bukti</p>
                  <PhotoThumb url={detail.proof_url} label="Bukti pengajuan" onView={setPhotoView} />
                </div>
              )}
              {detail.payments?.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Riwayat Pembayaran</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex justify-between px-3 py-2">
                        <span className="text-slate-600">{fmtDateShort(p.payment_date)}</span>
                        <span className="font-mono font-semibold">{fmtIDR(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>, document.body)}

      {rejectRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Tolak Kasbon</h3>
              <button type="button" onClick={() => setRejectRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong>{fmtEmployeeName(rejectRow.employee_name)}</strong> · {fmtIDR(rejectRow.amount_requested)}</p>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Alasan penolakan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRejectRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={() => act(rejectRow.id, "reject", { rejection_note: rejectNote })} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Tolak</button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
