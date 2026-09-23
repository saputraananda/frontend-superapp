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
  HiOutlineInformationCircle,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineChevronRight,
  HiOutlineTableCells,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../../lib/api";
import PageHero from "../PageHero";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import useHrisOutletRoleFilters from "../../hooks/useHrisOutletRoleFilters";
import useLiveRefresh from "../../hooks/useLiveRefresh";
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
  WASCHEN_ROLE_OPTIONS,
} from "../../utils/hrisUtils";
import {
  SortTh,
  PhotoThumb,
  PhotoViewerModal,
  KasbonTypeBadge,
  MobileSkeleton,
  KasbonMobileCard,
} from "./hrisShared";

const STATUS_FILTERS = [
  { key: "Semua", label: "Semua Status" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "proses", label: "Proses" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
];

const fieldCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#5f1340]/40 focus:ring-2 focus:ring-[#5f1340]/10";
const selectBase = "w-full rounded-xl border px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2";

const TYPE_COLOR = {
  Semua: "border-slate-200 bg-white text-slate-700 focus:border-slate-300 focus:ring-slate-100",
  kasbon: "border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-400 focus:ring-amber-100",
  pinjaman: "border-violet-300 bg-violet-50 text-violet-900 focus:border-violet-400 focus:ring-violet-100",
};

const STATUS_COLOR = {
  Semua: "border-slate-200 bg-white text-slate-700 focus:border-slate-300 focus:ring-slate-100",
  pengajuan: "border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-400 focus:ring-amber-100",
  proses: "border-sky-300 bg-sky-50 text-sky-900 focus:border-sky-400 focus:ring-sky-100",
  disetujui: "border-emerald-300 bg-emerald-50 text-emerald-900 focus:border-emerald-400 focus:ring-emerald-100",
  ditolak: "border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-400 focus:ring-rose-100",
};
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const actionBtn = "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50";

function formatDigits(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

function sharePct(part, total) {
  const base = Number(total) || 0;
  if (base <= 0) return null;
  return Math.round(((Number(part) || 0) / base) * 100);
}

// Total terpakai = kasbon + pinjaman. Fallback ke field lama biar aman saat API belum ter-deploy.
function rowTerpakai(row) {
  if (row?.terpakai != null) return Number(row.terpakai) || 0;
  return (Number(row?.kasbon) || 0) + (Number(row?.pinjaman) || 0);
}

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
  const [allPeriods, setAllPeriods] = useState(false);
  const [dbYears, setDbYears] = useState([]);
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
  const [approveRow, setApproveRow] = useState(null);
  const [approveMethod, setApproveMethod] = useState("potong_gaji");
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [limitInfo, setLimitInfo] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payFile, setPayFile] = useState(null);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [tab, setTab] = useState("pengajuan");
  const [monitorRows, setMonitorRows] = useState([]);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorDetail, setMonitorDetail] = useState(null);
  const [opening, setOpening] = useState({
    employee_id: "",
    type: "kasbon",
    amount: "",
    tenor_count: "2",
    current_installment_no: "1",
    payment_method: "potong_gaji",
    purpose: "Saldo awal",
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (silent = false) => {
    if (!allPeriods && (!startDate || !endDate)) return;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams();
      if (allPeriods) q.set("all", "1");
      else {
        q.set("startDate", startDate);
        q.set("endDate", endDate);
      }
      appendFilters(q);
      if (statusFilter !== "Semua") q.set("status", statusFilter);
      if (typeFilter !== "Semua") q.set("type", typeFilter);
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/kasbon?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { total: 0, pengajuan: 0, proses: 0, disetujui: 0, ditolak: 0 });
      const years = Array.isArray(res.years) ? res.years.map(Number).filter((y) => y > 0) : [];
      setDbYears(years);
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat kasbon");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [allPeriods, startDate, endDate, statusFilter, typeFilter, search, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const loadMonitor = useCallback(async (silent = false) => {
    if (!silent) setMonitorLoading(true);
    try {
      const q = new URLSearchParams();
      appendFilters(q);
      const res = await api(`/waschen/hris/kasbon/monitor?${q}`);
      setMonitorRows(res.data || []);
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat pantauan kasbon");
      setMonitorRows([]);
    } finally {
      if (!silent) setMonitorLoading(false);
    }
  }, [appendFilters]);

  useEffect(() => {
    if (tab === "pantau") loadMonitor();
  }, [tab, loadMonitor]);

  useLiveRefresh(() => {
    if (tab === "pantau") loadMonitor(true);
    else load(true);
  });

  useEffect(() => {
    api("/waschen/employees").then((r) => setEmployees(r.data || [])).catch(() => setEmployees([]));
  }, []);

  const visibleMonitor = useMemo(() => {
    const q = monitorSearch.trim().toLowerCase();
    if (!q) return monitorRows;
    return monitorRows.filter((row) =>
      String(row.employee_name || "").toLowerCase().includes(q)
      || String(row.employee_code || "").toLowerCase().includes(q),
    );
  }, [monitorRows, monitorSearch]);

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

  const openMonitor = async (employeeId) => {
    setMonitorDetail({ loading: true, employee_id: employeeId });
    try {
      const res = await api(`/waschen/hris/kasbon/monitor/${employeeId}`);
      setMonitorDetail(res.data);
    } catch (err) {
      setMonitorDetail(null);
      showToast("error", err.message || "Gagal memuat riwayat");
    }
  };

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

  const loadEmployeeLimit = async (employeeId, excludeId) => {
    setLimitInfo(null);
    try {
      const res = await api(`/waschen/hris/kasbon/monitor/${employeeId}?exclude=${excludeId}`);
      setLimitInfo({ limit: res.data?.limit || 0, sisa: res.data?.sisa || 0 });
    } catch {
      setLimitInfo(null);
    }
  };

  const openApprove = (id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setApproveMethod("potong_gaji");
    setApproveAmount(String(Math.round(Number(row.amount_requested) || 0)));
    setApproveNote("");
    setApproveRow(row);
    loadEmployeeLimit(row.employee_id, row.id);
  };

  const openReject = (row) => {
    setRejectNote("");
    setRejectRow(row);
    loadEmployeeLimit(row.employee_id, row.id);
  };

  const submitApprove = async () => {
    if (!approveRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/kasbon/${approveRow.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          payment_method: approveMethod,
          amount_approved: Number(approveAmount),
          approved_note: approveNote.trim(),
        }),
      });
      showToast("success", "Kasbon disetujui");
      setApproveRow(null);
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openPay = (kasbon, payment) => {
    setPayTarget({ kasbonId: kasbon.id, type: kasbon.type, payment });
    setPayAmount(String(Math.round(Number(payment.amount) || 0)));
    setPayFile(null);
  };

  const submitPay = async () => {
    if (!payTarget) return;
    if (!payFile) {
      showToast("error", "Lampirkan bukti pembayaran");
      return;
    }
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("amount", String(Number(payAmount) || 0));
      body.append("proof", payFile);
      const res = await apiUpload(`/waschen/hris/kasbon/${payTarget.kasbonId}/payments/${payTarget.payment.id}/paid`, {
        method: "PATCH",
        body,
      });
      showToast("success", res.message || "Pembayaran dicatat");
      const kasbonId = payTarget.kasbonId;
      setPayTarget(null);
      openDetail(kasbonId);
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitOpening = async () => {
    setSubmitting(true);
    try {
      await api("/waschen/hris/kasbon/opening", {
        method: "POST",
        body: JSON.stringify({
          ...opening,
          employee_id: Number(opening.employee_id),
          amount: Number(opening.amount),
          tenor_count: Number(opening.tenor_count),
          current_installment_no: Number(opening.current_installment_no),
        }),
      });
      showToast("success", "Saldo awal tersimpan");
      setOpeningOpen(false);
      load();
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

      <div className="flex flex-wrap gap-2">
        {[
          { key: "pengajuan", label: "Pengajuan" },
          { key: "pantau", label: "Pantau Saldo Karyawan" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition",
              tab === item.key
                ? "bg-[#5f1340] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {tab === "pengajuan" && <>
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
          <nav className="flex flex-wrap items-center gap-1.5" aria-label="Jejak filter">
            <select
              value={allPeriods ? "all" : cutoff.selectedYear}
              onChange={(e) => {
                if (e.target.value === "all") {
                  setAllPeriods(true);
                  if (cutoff.isCustomDate) cutoff.toggleCustom();
                  return;
                }
                setAllPeriods(false);
                cutoff.handleYearChange(e.target.value);
              }}
              className="cursor-pointer rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 outline-none"
            >
              <option value="all">Semua Periode</option>
              {(dbYears.length ? dbYears : [cutoff.selectedYear]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {!allPeriods && (cutoff.isCustomDate ? (
              <>
                <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <input type="date" value={cutoff.dateFrom || ""} onChange={(e) => cutoff.handleCustomStartChange(e.target.value)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 outline-none" />
                <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <input type="date" value={cutoff.dateTo || ""} min={cutoff.dateFrom || undefined} onChange={(e) => cutoff.setDateTo(e.target.value)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 outline-none" />
              </>
            ) : (
              <>
                <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <select value={cutoff.selectedMonth} onChange={(e) => cutoff.setSelectedMonth(Number(e.target.value))} className="cursor-pointer rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 outline-none">
                  {cutoff.monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="rounded-full bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                  {fmtDateShort(cutoff.dateFrom)} – {fmtDateShort(cutoff.dateTo)}
                </span>
              </>
            ))}
            {!allPeriods && (
              <button type="button" onClick={cutoff.toggleCustom} className="rounded-full px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50">
                {cutoff.isCustomDate ? "Cutoff" : "Custom"}
              </button>
            )}
            <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <select value={hrisFilters.outletId} onChange={(e) => hrisFilters.setOutletId(e.target.value)} className="max-w-[200px] cursor-pointer truncate rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 outline-none">
              <option value="">Semua Outlet</option>
              {hrisFilters.outlets.map((o) => (
                <option key={o.id} value={String(o.id)}>{o.outlet_code ? `${o.outlet_code} — ` : ""}{o.name}</option>
              ))}
            </select>
            <HiOutlineChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <select value={hrisFilters.role} onChange={(e) => hrisFilters.setRole(e.target.value)} className="cursor-pointer rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 outline-none">
              <option value="">Semua Posisi</option>
              {WASCHEN_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </nav>
          <div className="relative w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan, keperluan..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className={cn(labelCls, typeFilter === "kasbon" ? "text-amber-800" : typeFilter === "pinjaman" ? "text-violet-800" : "text-slate-500")}>Tipe</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={cn(selectBase, TYPE_COLOR[typeFilter] || TYPE_COLOR.Semua)}>
                {TYPE_FILTERS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 flex-1">
              <span className={cn(
                labelCls,
                statusFilter === "pengajuan" ? "text-amber-800"
                  : statusFilter === "proses" ? "text-sky-800"
                    : statusFilter === "disetujui" ? "text-emerald-800"
                      : statusFilter === "ditolak" ? "text-rose-800"
                        : "text-slate-500",
              )}>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={cn(selectBase, STATUS_COLOR[statusFilter] || STATUS_COLOR.Semua)}>
                {STATUS_FILTERS.map((f) => (
                  <option key={f.key} value={f.key}>{f.label}</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={load} className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center self-end rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50" aria-label="Muat ulang">
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
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button type="button" onClick={() => setOpeningOpen(true)} className="inline-flex items-center rounded-xl bg-[#5f1340] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#4d0f34] transition">Saldo Awal</button>
            {!loading && <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{sorted.length} data</span>}
          </div>
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
            <div className="xl:hidden p-3 sm:p-4 space-y-3">
              {sorted.map((r) => (
                <KasbonMobileCard
                  key={r.id}
                  row={r}
                  submitting={submitting}
                  cicilanPct={cicilanPct}
                  onDetail={openDetail}
                  onApprove={openApprove}
                  onReject={openReject}
                  onViewPhoto={setPhotoView}
                />
              ))}
            </div>

            <div className="hidden xl:block overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <SortTh col="submission_date" label="Tanggal" sort={sort} onSort={toggleSort} align="center" />
                <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                <SortTh col="type" label="Tipe" sort={sort} onSort={toggleSort} align="center" />
                <SortTh col="amount_requested" label="Jumlah Diajukan" sort={sort} onSort={toggleSort} align="center" />
                <SortTh col="amount_approved" label="Disetujui" sort={sort} onSort={toggleSort} align="center" />
                <th className="px-4 py-3 text-center font-semibold">Cicilan</th>
                <SortTh col="status" label="Status" sort={sort} onSort={toggleSort} align="center" />
                <th className="px-4 py-3 text-center font-semibold">Bukti</th>
                <th className="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((r) => {
                const pct = cicilanPct(r);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3.5 text-center text-sm text-slate-600 whitespace-nowrap">{fmtDateShort(r.submission_date)}</td>
                    <td className="px-4 py-3.5 text-left text-sm font-semibold text-slate-800 whitespace-nowrap">{fmtEmployeeName(r.employee_name)}</td>
                    <td className="px-4 py-3.5 text-center"><KasbonTypeBadge type={r.type} /></td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-slate-800 whitespace-nowrap">{fmtIDR(r.amount_requested)}</td>
                    <td className="px-4 py-3.5 text-center text-sm font-semibold text-emerald-700 whitespace-nowrap">
                      {r.amount_approved != null ? fmtIDR(r.amount_approved) : <span className="font-normal text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center min-w-[140px]">
                      {pct != null ? (
                        <div className="mx-auto max-w-[160px]">
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{pct}% · sisa {fmtIDR(r.remaining)}</p>
                        </div>
                      ) : <span className="text-sm text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", kasbonStatusBadge(r.status))}>{capitalizeStatus(r.status)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <PhotoThumb url={r.proof_url} label="Bukti kasbon" onView={setPhotoView} />
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex flex-nowrap items-center justify-center gap-1.5">
                        <button type="button" onClick={() => openDetail(r.id)} className={`${actionBtn} border-blue-100 bg-blue-50/60 text-blue-700 hover:bg-blue-100`}>
                          <HiOutlineInformationCircle className="h-3.5 w-3.5" /> Detail
                        </button>
                        {(r.status === "pengajuan" || r.status === "proses") && (
                          <>
                            <button type="button" disabled={submitting} onClick={() => openApprove(r.id)} className={`${actionBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
                              <HiOutlineCheckCircle className="h-3.5 w-3.5" /> Setujui
                            </button>
                            <button type="button" disabled={submitting} onClick={() => openReject(r)} className={`${actionBtn} border-rose-200 bg-white text-rose-600 hover:bg-rose-50`}>
                              <HiOutlineXMark className="h-3.5 w-3.5" /> Tolak
                            </button>
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
      </>}

      {tab === "pantau" && (
        <section className={TABLE_SECTION}>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Pantau Saldo Karyawan</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Limit, besaran pinjaman dan kasbon yang masih tertahan, serta saldo sisa. Klik baris untuk melihat riwayat.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={monitorSearch} onChange={(e) => setMonitorSearch(e.target.value)} placeholder="Cari karyawan..." className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400" />
              </div>
              <select value={hrisFilters.outletId} onChange={(e) => hrisFilters.setOutletId(e.target.value)} className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800 outline-none">
                <option value="">Semua Outlet</option>
                {hrisFilters.outlets.map((o) => (
                  <option key={o.id} value={String(o.id)}>{o.outlet_code ? `${o.outlet_code} — ` : ""}{o.name}</option>
                ))}
              </select>
              <select value={hrisFilters.role} onChange={(e) => hrisFilters.setRole(e.target.value)} className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800 outline-none">
                <option value="">Semua Posisi</option>
                {WASCHEN_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {monitorLoading ? (
            <MobileSkeleton count={4} />
          ) : visibleMonitor.length === 0 ? (
            <div className="py-16 text-center text-slate-400 px-4">
              <p className="text-sm font-semibold">Tidak ada karyawan</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 xl:hidden">
                {visibleMonitor.map((row, index) => {
                  const pinjamanPct = sharePct(rowTerpakai(row), row.limit);
                  return (
                  <button key={row.employee_id} type="button" onClick={() => openMonitor(row.employee_id)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-[#5f1340]/30">
                    <p className="text-sm font-bold text-slate-800"><span className="mr-2 text-slate-400">{index + 1}.</span>{fmtEmployeeName(row.employee_name)}</p>
                    {row.employee_code && <p className="mt-0.5 text-xs text-slate-400">{row.employee_code}</p>}
                    <div className="mt-3 grid grid-cols-5 gap-2 text-center">
                      <div><p className="text-[10px] font-semibold uppercase text-slate-400">Limit</p><p className="mt-1 text-xs font-bold text-slate-800">{fmtIDR(row.limit)}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase text-slate-400">Pinjaman</p><p className="mt-1 text-xs font-bold text-[#5f1340]">{fmtIDR(row.pinjaman)}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase text-slate-400">Kasbon</p><p className="mt-1 text-xs font-bold text-sky-700">{fmtIDR(row.kasbon)}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase text-slate-400">%</p><p className="mt-1 text-xs font-bold text-slate-700">{pinjamanPct == null ? "—" : `${pinjamanPct}%`}</p></div>
                      <div><p className="text-[10px] font-semibold uppercase text-slate-400">Sisa</p><p className="mt-1 text-xs font-bold text-emerald-700">{fmtIDR(row.sisa)}</p></div>
                    </div>
                  </button>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="w-14 px-4 py-3 text-center">No</th>
                      <th className="px-4 py-3 text-left">Karyawan</th>
                      <th className="px-4 py-3 text-center">Limit</th>
                      <th className="px-4 py-3 text-center">Pinjaman</th>
                      <th className="px-4 py-3 text-center">Kasbon</th>
                      <th className="px-4 py-3 text-center">%</th>
                      <th className="px-4 py-3 text-center">Saldo Sisa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMonitor.map((row, index) => {
                      const pinjamanPct = sharePct(rowTerpakai(row), row.limit);
                      return (
                      <tr key={row.employee_id} onClick={() => openMonitor(row.employee_id)} className="cursor-pointer border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3.5 text-center text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3.5 text-left whitespace-nowrap">
                          <p className="font-semibold text-slate-800">{fmtEmployeeName(row.employee_name)}</p>
                          {row.employee_code && <p className="text-xs text-slate-400">{row.employee_code}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{fmtIDR(row.limit)}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-[#5f1340]">{fmtIDR(row.pinjaman)}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-sky-700">{fmtIDR(row.kasbon)}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-slate-700">{pinjamanPct == null ? "—" : `${pinjamanPct}%`}</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-emerald-700">{fmtIDR(row.sisa)}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {monitorDetail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setMonitorDetail(null)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{monitorDetail.loading ? "Memuat riwayat..." : fmtEmployeeName(monitorDetail.employee_name)}</h3>
                {!monitorDetail.loading && <p className="mt-0.5 text-xs text-slate-400">Riwayat kasbon dan pinjaman</p>}
              </div>
              <button type="button" onClick={() => setMonitorDetail(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            {monitorDetail.loading ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">Memuat...</div>
            ) : (
              <div className="overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-5 gap-3 rounded-xl bg-slate-50 p-3 text-center">
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Limit</p><p className="mt-1 text-sm font-bold text-slate-800">{fmtIDR(monitorDetail.limit)}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Pinjaman</p><p className="mt-1 text-sm font-bold text-[#5f1340]">{fmtIDR(monitorDetail.pinjaman)}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Kasbon</p><p className="mt-1 text-sm font-bold text-sky-700">{fmtIDR(monitorDetail.kasbon)}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">%</p><p className="mt-1 text-sm font-bold text-slate-700">{sharePct(rowTerpakai(monitorDetail), monitorDetail.limit) == null ? "—" : `${sharePct(rowTerpakai(monitorDetail), monitorDetail.limit)}%`}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Saldo Sisa</p><p className="mt-1 text-sm font-bold text-emerald-700">{fmtIDR(monitorDetail.sisa)}</p></div>
                </div>
                {!monitorDetail.has_salary && (
                  <p className="mt-3 text-xs text-amber-700">Take Home Pay belum diisi. Limit kasbon belum bisa dihitung.</p>
                )}
                <div className="mt-4 space-y-3">
                  {(monitorDetail.history || []).length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">Belum pernah mengajukan kasbon atau pinjaman.</p>
                  ) : monitorDetail.history.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <KasbonTypeBadge type={item.type} />
                            <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", kasbonStatusBadge(item.status))}>{capitalizeStatus(item.status)}</span>
                            {item.is_opening_balance && <span className="text-xs font-semibold text-slate-400">Saldo awal</span>}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-slate-800">{fmtDateShort(item.submission_date)}</p>
                          {item.purpose && <p className="mt-1 text-xs text-slate-500">{item.purpose}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#5f1340]">{fmtIDR(item.amount_approved ?? item.amount_requested)}</p>
                          {item.tenor_count > 1 && <p className="mt-0.5 text-xs text-slate-400">{item.tenor_count} termin</p>}
                          {item.payment_method && <p className="mt-0.5 text-xs text-slate-400">{item.payment_method === "langsung" ? "Bayar langsung" : "Potong gaji"}</p>}
                        </div>
                      </div>
                      {item.approved_note && <p className="mt-2 text-xs text-emerald-700">{item.approved_note}</p>}
                      {item.rejection_note && <p className="mt-2 text-xs text-rose-600">{item.rejection_note}</p>}
                      {item.payments.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                          {item.payments.map((pay) => (
                            <div key={pay.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-slate-500">{item.type === "kasbon" ? "Pembayaran" : `Termin ${pay.installment_no || "—"}`} · {fmtDateShort(pay.due_date)}</span>
                              <span className="font-semibold text-slate-700">{fmtIDR(pay.amount)}</span>
                              <span className="flex items-center gap-2">
                                {pay.proof_url && (
                                  <button type="button" onClick={() => setPhotoView({ url: pay.proof_url, label: "Bukti pembayaran" })} className="font-semibold text-blue-700">Bukti</button>
                                )}
                                <span className={pay.status === "terbayar" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{pay.status === "terbayar" ? "Lunas" : "Belum"}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>, document.body)}

      <PhotoViewerModal open={Boolean(photoView)} url={photoView?.url} label={photoView?.label} onClose={() => setPhotoView(null)} />

      {detail && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{fmtEmployeeName(detail.employee_name)}</h3>
                <p className="mt-0.5 text-xs capitalize text-slate-400">{detail.type} · {fmtDateShort(detail.submission_date)}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold text-slate-500">Diajukan</p><p className="mt-0.5 text-base font-bold text-[#5f1340]">{fmtIDR(detail.amount_requested)}</p></div>
                <div><p className="text-xs font-semibold text-slate-500">Disetujui</p><p className="mt-0.5 text-base font-bold text-emerald-700">{detail.amount_approved != null ? fmtIDR(detail.amount_approved) : "—"}</p></div>
              </div>
              <div><p className="text-xs font-semibold text-slate-500">Keperluan</p><p className="mt-1 text-sm text-slate-700">{detail.purpose}</p></div>
              {detail.approved_note && <div><p className="text-xs font-semibold text-slate-500">Alasan persetujuan</p><p className="mt-1 text-sm text-slate-700">{detail.approved_note}</p></div>}
              {detail.rejection_note && <div><p className="text-xs font-semibold text-slate-500">Alasan penolakan</p><p className="mt-1 text-sm text-rose-700">{detail.rejection_note}</p></div>}
              {detail.notes && <div><p className="text-xs font-semibold text-slate-500">Catatan</p><p className="mt-1 text-sm text-slate-600">{detail.notes}</p></div>}
              {detail.proof_url && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Bukti</p>
                  <PhotoThumb url={detail.proof_url} label="Bukti pengajuan" onView={setPhotoView} />
                </div>
              )}
              {detail.payments?.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-semibold text-slate-500">Jadwal pembayaran</p>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{detail.type === "kasbon" ? "Pembayaran" : `Termin ${p.installment_no || "—"}`}</p>
                          <p className="text-xs text-slate-400">{fmtDateShort(p.due_date || p.payment_date)}</p>
                          {p.proof_url && (
                            <button type="button" onClick={() => setPhotoView({ url: p.proof_url, label: "Bukti pembayaran" })} className="mt-1 text-xs font-semibold text-blue-700">Lihat bukti</button>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-800">{fmtIDR(p.amount)}</p>
                          {p.status === "terbayar" ? (
                            <span className="text-xs font-semibold text-emerald-600">Lunas</span>
                          ) : (
                            <button type="button" disabled={submitting} onClick={() => openPay(detail, p)} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Tandai lunas</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>, document.body)}

      {approveRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setApproveRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Setujui {approveRow.type === "pinjaman" ? "Pinjaman" : "Kasbon"}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{fmtEmployeeName(approveRow.employee_name)} · {fmtIDR(approveRow.amount_requested)}{approveRow.type === "pinjaman" ? ` · ${approveRow.tenor_count || 1} termin` : ""}</p>
              </div>
              <button type="button" onClick={() => setApproveRow(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {limitInfo && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Limit</p><p className="mt-1 text-sm font-bold text-slate-800">{fmtIDR(limitInfo.limit)}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Saldo Sisa</p><p className="mt-1 text-sm font-bold text-emerald-700">{fmtIDR(limitInfo.sisa)}</p></div>
                  <p className="col-span-2 text-[11px] text-slate-400">Saldo sisa belum menghitung pengajuan ini.</p>
                </div>
              )}
              <div>
                <label className={labelCls}>Nominal disetujui</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" value={formatDigits(approveAmount)} onChange={(e) => setApproveAmount(e.target.value.replace(/\D/g, ""))} className={`${fieldCls} pl-9`} placeholder="500.000" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Cara bayar</label>
                <select value={approveMethod} onChange={(e) => setApproveMethod(e.target.value)} className={fieldCls}>
                  <option value="potong_gaji">Potong gaji</option>
                  <option value="langsung">Bayar langsung</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Alasan persetujuan <span className="font-normal text-slate-400">(opsional)</span></label>
                <textarea value={approveNote} onChange={(e) => setApproveNote(e.target.value)} rows={2} placeholder="Alasan, kalau ada" className={`${fieldCls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setApproveRow(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={submitting} onClick={submitApprove} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Setujui</button>
            </div>
          </div>
        </div>, document.body)}

      {openingOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setOpeningOpen(false)}>
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Saldo Awal</h3>
              <button type="button" onClick={() => setOpeningOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-slate-500">Isi sisa pokok yang masih berjalan. Termin sebelum jatuh tempo sekarang dicatat sudah lunas.</p>
              <div>
                <label className={labelCls}>Karyawan</label>
                <select value={opening.employee_id} onChange={(e) => setOpening((p) => ({ ...p, employee_id: e.target.value }))} className={fieldCls}>
                  <option value="">— Pilih —</option>
                  {employees.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>{fmtEmployeeName(emp.full_name)}{emp.employee_code ? ` · ${emp.employee_code}` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Jenis</label>
                <select value={opening.type} onChange={(e) => setOpening((p) => ({ ...p, type: e.target.value }))} className={fieldCls}>
                  <option value="kasbon">Kasbon</option>
                  <option value="pinjaman">Pinjaman</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Sisa pokok</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" value={formatDigits(opening.amount)} onChange={(e) => setOpening((p) => ({ ...p, amount: e.target.value.replace(/\D/g, "") }))} className={`${fieldCls} pl-9`} placeholder="500.000" />
                </div>
              </div>
              {opening.type === "pinjaman" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Jumlah termin</label>
                    <input type="number" min="1" max="36" value={opening.tenor_count} onChange={(e) => setOpening((p) => ({ ...p, tenor_count: e.target.value }))} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Termin jatuh tempo sekarang</label>
                    <input type="number" min="1" value={opening.current_installment_no} onChange={(e) => setOpening((p) => ({ ...p, current_installment_no: e.target.value }))} className={fieldCls} />
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>Cara bayar</label>
                <select value={opening.payment_method} onChange={(e) => setOpening((p) => ({ ...p, payment_method: e.target.value }))} className={fieldCls}>
                  <option value="potong_gaji">Potong gaji</option>
                  <option value="langsung">Bayar langsung</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setOpeningOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={submitting} onClick={submitOpening} className="rounded-xl bg-[#5f1340] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4d0f34] disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>, document.body)}

      {rejectRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Tolak pengajuan</h3>
                <p className="mt-0.5 text-xs text-slate-400">{fmtEmployeeName(rejectRow.employee_name)} · {fmtIDR(rejectRow.amount_requested)}</p>
              </div>
              <button type="button" onClick={() => setRejectRow(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {limitInfo && (
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Limit</p><p className="mt-1 text-sm font-bold text-slate-800">{fmtIDR(limitInfo.limit)}</p></div>
                  <div><p className="text-[11px] font-semibold uppercase text-slate-400">Saldo Sisa</p><p className="mt-1 text-sm font-bold text-emerald-700">{fmtIDR(limitInfo.sisa)}</p></div>
                  <p className="col-span-2 text-[11px] text-slate-400">Saldo sisa belum menghitung pengajuan ini.</p>
                </div>
              )}
              <div>
                <label className={labelCls}>Alasan penolakan</label>
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Alasan penolakan..." className={`${fieldCls} resize-none`} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setRejectRow(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={submitting} onClick={() => act(rejectRow.id, "reject", { rejection_note: rejectNote })} className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Tolak</button>
            </div>
          </div>
        </div>, document.body)}

      {payTarget && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setPayTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">{payTarget.type === "kasbon" ? "Catat pembayaran" : `Termin ${payTarget.payment.installment_no || "—"}`}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{fmtDateShort(payTarget.payment.due_date || payTarget.payment.payment_date)} · Jadwal {fmtIDR(payTarget.payment.amount)}</p>
              </div>
              <button type="button" onClick={() => setPayTarget(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className={labelCls}>Nominal dibayar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
                  <input type="text" inputMode="numeric" value={formatDigits(payAmount)} onChange={(e) => setPayAmount(e.target.value.replace(/\D/g, ""))} className={`${fieldCls} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Bukti pembayaran</label>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setPayFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700" />
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WEBP, atau PDF. Maksimal 6MB.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setPayTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={submitting} onClick={submitPay} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
