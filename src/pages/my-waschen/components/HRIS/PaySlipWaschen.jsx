import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineChevronRight,
  HiOutlineDocumentText,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineTableCells,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../../lib/api";
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
  fmtEmployeeName,
  useSort,
} from "../../utils/hrisUtils";
import {
  MONTH_OPTIONS,
  currentCutoffPeriod,
  cutoffMonthsBetween,
  cutoffRange,
} from "../../utils/cutoffPeriod";
import { SortTh, FilterScroll, FilterPill, MobileSkeleton } from "./hrisShared";

/**
 * HRIS › Slip Gaji — sama dengan tab "Slip Gaji" di detail karyawan (/my-waschen/employees/:id),
 * tapi dari satu halaman: daftar karyawan + status upload per bulan, klik → modal riwayat & upload.
 * File disimpan di server Waschen Mobile (payslip_private), data di tr_payslip_waschen.
 */

const STATUS_FILTERS = [
  { key: "semua", label: "Semua" },
  { key: "sudah", label: "Sudah upload" },
  { key: "belum", label: "Belum upload" },
];

/** Bulan slip = bulan cutoff (periode 26 bln lalu – 25 bln ini), format "YYYY-MM" */
const ym = (year, month) => `${year}-${String(month).padStart(2, "0")}`;
const currentSlipMonth = () => {
  const c = currentCutoffPeriod();
  return ym(c.year, c.month);
};

function fmtMonth(value) {
  if (!value || !String(value).includes("-")) return value || "—";
  const [y, m] = String(value).split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

/** "26 Okt 2026 – 25 Nov 2026" untuk bulan slip "2026-11" */
function fmtCutoffRange(value) {
  if (!value || !String(value).includes("-")) return "";
  const [y, m] = String(value).split("-").map(Number);
  const { dateFrom, dateTo } = cutoffRange(y, m);
  return `${fmtDateShort(dateFrom)} – ${fmtDateShort(dateTo)}`;
}

/** Tahun dari DB + tahun cutoff berjalan (dan tambahan), urut naik */
const mergeYears = (...lists) => [...new Set(lists.flat().map(Number).filter((y) => y > 0))].sort((a, b) => a - b);

const fmtDateTime = (v) => (v
  ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
  : "—");

const payslipBase = (employeeId) => `/waschen/employees/${employeeId}/payslips`;

/* ───────────────────────── preview file ───────────────────────── */

function DocPreviewModal({ url, fileName, label, onClose }) {
  const isPdf = fileName?.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="truncate text-sm font-semibold text-slate-800" title={fileName}>{fileName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a href={url} download={fileName}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
              <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> Unduh
            </a>
            <button type="button" onClick={onClose} aria-label="Tutup"
              className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200">
              <HiOutlineXMark className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-50">
          {isPdf ? (
            <iframe src={url} title={label} className="h-full min-h-[65vh] w-full" style={{ border: "none" }} />
          ) : (
            <img src={url} alt={label} className="max-h-[75vh] max-w-full object-contain p-4" />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────── modal riwayat & upload ───────────────────────── */

function PayslipModal({ employee, defaultMonth, years, onClose, onChanged }) {
  const initial = (defaultMonth || currentSlipMonth()).split("-").map(Number);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState("");
  const [uploadYear, setUploadYear] = useState(initial[0]);
  const [uploadMonthNo, setUploadMonthNo] = useState(initial[1]);
  const uploadMonth = ym(uploadYear, uploadMonthNo);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);
  const base = payslipBase(employee.employee_id);

  const flash = (type, text) => {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), type === "error" ? 5000 : 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(base);
      setSlips(res.data || []);
    } catch (err) {
      flash("error", err.message || "Gagal memuat slip gaji");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !preview && !deleteTarget) onClose(); };
    document.addEventListener("keydown", onKey);
    const els = [document.body, document.getElementById("mw-content")].filter(Boolean);
    const saved = els.map((el) => el.style.overflow);
    els.forEach((el) => { el.style.overflow = "hidden"; });
    return () => {
      document.removeEventListener("keydown", onKey);
      els.forEach((el, i) => { el.style.overflow = saved[i]; });
    };
  }, [onClose, preview, deleteTarget]);

  const existsForUploadMonth = slips.some((s) => s.payslip_month === uploadMonth);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("payslip_month", uploadMonth);
      const res = await apiUpload(base, { method: "POST", body: fd });
      flash("success", res.message || "Slip gaji berhasil diupload");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
      onChanged();
    } catch (err) {
      flash("error", err.message || "Gagal mengupload slip gaji");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`${base}/${deleteTarget.id}`, { method: "DELETE" });
      flash("success", "Slip gaji berhasil dihapus");
      setDeleteTarget(null);
      await load();
      onChanged();
    } catch (err) {
      flash("error", err.message || "Gagal menghapus slip gaji");
    } finally {
      setDeleting(false);
    }
  };

  const filterOptions = useMemo(
    () => [...new Set(slips.map((s) => s.payslip_month))].sort((a, b) => b.localeCompare(a)),
    [slips],
  );
  const shown = filterMonth ? slips.filter((s) => s.payslip_month === filterMonth) : slips;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#5f1340]/[0.03] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f1340]">Slip Gaji</p>
            <h3 className="truncate text-base font-bold text-slate-800">{fmtEmployeeName(employee.full_name)}</h3>
            <p className="text-[11px] text-slate-500">
              {[employee.employee_code, employee.waschen_role, employee.outlet_name !== "-" && employee.outlet_name].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {msg && (
            <div className={cn("flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold",
              msg.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
              {msg.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
              {msg.text}
            </div>
          )}

          {/* Upload */}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Upload Slip Gaji Baru</h4>
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[0.7fr_1fr_1.4fr_auto]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-600">Tahun *</span>
                <select value={uploadYear} onChange={(e) => setUploadYear(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340]/40">
                  {mergeYears(years, [uploadYear]).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-600">Bulan (Cutoff) *</span>
                <select value={uploadMonthNo} onChange={(e) => setUploadMonthNo(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340]/40">
                  {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-600">File (PDF / JPG / PNG / WEBP, maks 10 MB) *</span>
                <input ref={fileRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 file:mr-2 file:rounded-md file:border-0 file:bg-[#5f1340]/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[#5f1340] hover:file:bg-[#5f1340]/20" />
              </label>
              <button type="button" onClick={upload} disabled={!file || uploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5f1340] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#4d0f34] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                {uploading ? <HiOutlineArrowPath className="h-4 w-4 animate-spin" /> : <HiOutlineDocumentText className="h-4 w-4" />}
                {uploading ? "Mengupload..." : "Upload"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Slip <b>{fmtMonth(uploadMonth)}</b> · periode cutoff {fmtCutoffRange(uploadMonth)}
            </p>
            {existsForUploadMonth && (
              <p className="mt-1 text-[11px] font-semibold text-amber-700">
                Slip {fmtMonth(uploadMonth)} sudah ada. Upload baru akan menggantikan file lama.
              </p>
            )}
          </section>

          {/* Riwayat */}
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Riwayat Slip Gaji</h4>
                <p className="text-[11px] text-slate-400">Menampilkan {shown.length} dari {slips.length} slip</p>
              </div>
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340]/40 sm:w-56">
                <option value="">Semua bulan</option>
                {filterOptions.map((m) => <option key={m} value={m}>{fmtMonth(m)}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : shown.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-slate-400">
                <HiOutlineDocumentText className="h-9 w-9 opacity-50" />
                <p className="text-sm font-semibold text-slate-500">Belum ada slip gaji diupload</p>
                <p className="text-xs">Pilih bulan dan file, lalu klik Upload.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Bulan</th>
                      <th className="px-4 py-2.5">Nama File</th>
                      <th className="px-4 py-2.5">Diupload</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {shown.map((s) => {
                      const viewUrl = `${BASE_URL}${base}/${s.id}/view`;
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="whitespace-nowrap px-4 py-3">
                            <p className="font-semibold text-slate-800">{fmtMonth(s.payslip_month)}</p>
                            <p className="text-[10px] text-slate-400">{fmtCutoffRange(s.payslip_month)}</p>
                          </td>
                          <td className="max-w-[16rem] truncate px-4 py-3" title={s.file_name}>{s.file_name}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDateTime(s.updated_at || s.created_at)}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="inline-flex gap-1.5">
                              <button type="button"
                                onClick={() => setPreview({ url: viewUrl, fileName: s.file_name, label: `Slip Gaji · ${fmtMonth(s.payslip_month)}` })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50">
                                Buka
                              </button>
                              <a href={viewUrl} download={s.file_name} target="_blank" rel="noopener noreferrer"
                                className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700 hover:bg-blue-100">
                                Unduh
                              </a>
                              <button type="button" onClick={() => setDeleteTarget(s)}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-semibold text-rose-700 hover:bg-rose-100">
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <HiOutlineTrash className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Hapus Slip Gaji?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Slip gaji <b>{fmtMonth(deleteTarget.payslip_month)}</b> untuk <b>{fmtEmployeeName(employee.full_name)}</b> akan dihapus permanen.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={deleting} onClick={remove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {deleting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />} Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && <DocPreviewModal {...preview} onClose={() => setPreview(null)} />}
    </div>,
    document.body,
  );
}

/* ───────────────────────── halaman ───────────────────────── */

export default function PaySlipWaschen() {
  const cutoff = useCutoffPeriod();
  const { dateFrom, dateTo, selectedYear } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters({ multiple: true });
  const { appendFilters } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "full_name", dir: "asc" });

  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState(new Map());
  const [dbYears, setDbYears] = useState([]);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const loadEmployees = useCallback(async () => {
    const q = new URLSearchParams();
    appendFilters(q);
    const res = await api(`/waschen/employees?${q}`);
    setEmployees(res.data || []);
  }, [appendFilters]);

  // Bulan slip = bulan cutoff yang tercakup periode filter (cutoff penuh = 1 bulan)
  const months = useMemo(() => cutoffMonthsBetween(dateFrom, dateTo), [dateFrom, dateTo]);
  const monthsKey = months.join(",");

  // Opsi tahun dari DB (tahun yang punya slip) + tahun cutoff berjalan & yang sedang dipilih
  const yearOptions = useMemo(
    () => mergeYears(dbYears, [currentCutoffPeriod().year, selectedYear]),
    [dbYears, selectedYear],
  );

  const loadSummary = useCallback(async () => {
    const res = await api(`/waschen/employees/payslips/summary?months=${encodeURIComponent(monthsKey)}`);
    setSummary(new Map((res.data || []).map((r) => [Number(r.employee_id), r])));
    setDbYears(Array.isArray(res.meta?.years) ? res.meta.years : []);
  }, [monthsKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadEmployees(), loadSummary()]);
      setError("");
    } catch (err) {
      setError(err.message || "Gagal memuat data slip gaji");
    } finally {
      setLoading(false);
    }
  }, [loadEmployees, loadSummary]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .map((e) => {
        const s = summary.get(Number(e.employee_id));
        return {
          ...e,
          slip_total: s?.total || 0,
          slip_last_month: s?.last_month || null,
          slip_last_at: s?.last_uploaded_at || null,
          slip_in_period: s?.in_period || 0,
          // Lengkap bila semua bulan cutoff di periode sudah ada slipnya
          slip_has_month: months.length > 0 && (s?.in_period || 0) >= months.length,
        };
      })
      .filter((e) => !q || `${e.full_name} ${e.employee_code}`.toLowerCase().includes(q));
  }, [employees, summary, search, months.length]);

  const stats = useMemo(() => {
    const sudah = rows.filter((r) => r.slip_has_month).length;
    return { total: rows.length, sudah, belum: rows.length - sudah };
  }, [rows]);

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) => statusFilter === "semua"
      || (statusFilter === "sudah" ? r.slip_has_month : !r.slip_has_month));
    return applySort(filtered, {
      full_name: (r) => fmtEmployeeName(r.full_name),
      waschen_role: (r) => r.waschen_role || "",
      outlet_name: (r) => r.outlet_name || "",
      slip_has_month: (r) => (r.slip_has_month ? 1 : 0),
      slip_total: (r) => r.slip_total,
      slip_last_at: (r) => r.slip_last_at || "",
    });
  }, [rows, statusFilter, applySort]);

  const monthLabel = months.length === 1
    ? fmtMonth(months[0])
    : months.length
      ? `${fmtMonth(months[0])} – ${fmtMonth(months[months.length - 1])}`
      : "—";
  // Bulan default upload di modal: bulan cutoff terakhir di periode
  const defaultUploadMonth = months[months.length - 1] || currentSlipMonth();

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Slip Gaji</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Upload dan kelola slip gaji karyawan Waschen. Slip tampil di Waschen Mobile masing-masing karyawan.
          </p>
        </div>
      </PageHero>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
          <HiOutlineExclamationTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className={SUMMARY_GRID.replace("lg:grid-cols-5", "lg:grid-cols-3")}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Karyawan</p>
          <p className="mt-1 text-xl font-bold text-slate-800 sm:text-2xl">{stats.total}</p>
        </div>
        <button type="button" onClick={() => setStatusFilter("sudah")}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sudah upload · {monthLabel}</p>
          <p className="mt-1 text-xl font-bold text-emerald-800 sm:text-2xl">{stats.sudah}</p>
        </button>
        <button type="button" onClick={() => setStatusFilter("belum")}
          className="col-span-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 sm:col-span-1 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Belum upload · {monthLabel}</p>
          <p className="mt-1 text-xl font-bold text-rose-800 sm:text-2xl">{stats.belum}</p>
        </button>
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">Filter Periode & Data</h2>
            <p className="text-[11px] text-slate-500 sm:text-xs">
              Bulan slip mengikuti cutoff 26–25. Custom tanggal dihitung per bulan cutoff yang tercakup.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} years={yearOptions} periodBadgePrefix="Periode cutoff" />
          {cutoff.isCustomDate && months.length > 1 && (
            <p className="text-[11px] font-semibold text-slate-500">
              Mencakup {months.length} bulan slip: {months.map(fmtMonth).join(", ")}. “Sudah upload” = slip lengkap untuk semua bulan tersebut.
            </p>
          )}
          <HrisOutletRoleFilter
            multiple
            outlets={hrisFilters.outlets}
            outletIds={hrisFilters.outletIds}
            onOutletIdsChange={hrisFilters.setOutletIds}
            roles={hrisFilters.roles}
            onRolesChange={hrisFilters.setRoles}
          />
          <div className="relative w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau kode karyawan..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FilterScroll className="flex-1">
              {STATUS_FILTERS.map((f) => (
                <FilterPill key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>{f.label}</FilterPill>
              ))}
            </FilterScroll>
            <button type="button" onClick={load} title="Muat ulang"
              className="shrink-0 self-end rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 sm:self-auto">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      <section className={TABLE_SECTION}>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[#5f1340]">
              <HiOutlineTableCells className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 sm:text-base">Daftar Karyawan</h2>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">Klik karyawan untuk melihat riwayat & upload slip gaji.</p>
            </div>
          </div>
          {!loading && <span className="text-xs font-semibold text-slate-500">{sorted.length} karyawan</span>}
        </div>

        {loading ? (
          <MobileSkeleton count={5} />
        ) : sorted.length === 0 ? (
          <div className="px-4 py-16 text-center text-slate-400">
            <HiOutlineUserGroup className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Tidak ada karyawan untuk filter ini</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-2 p-3 md:hidden">
              {sorted.map((r) => (
                <button key={r.employee_id} type="button" onClick={() => setSelected(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{fmtEmployeeName(r.full_name)}</p>
                    <p className="text-[10px] text-slate-400">{[r.employee_code, r.waschen_role, r.outlet_name !== "-" && r.outlet_name].filter(Boolean).join(" · ")}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <SlipBadge has={r.slip_has_month} />
                      <span className="text-[10px] text-slate-500">{r.slip_total} slip</span>
                    </div>
                  </div>
                  <HiOutlineChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-12 px-4 py-3 text-center font-semibold">No</th>
                    <SortTh col="full_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                    <SortTh col="waschen_role" label="Posisi" sort={sort} onSort={toggleSort} />
                    <SortTh col="outlet_name" label="Outlet" sort={sort} onSort={toggleSort} />
                    <SortTh col="slip_has_month" label={`Slip ${monthLabel}`} sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="slip_total" label="Total Slip" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="slip_last_at" label="Terakhir Upload" sort={sort} onSort={toggleSort} />
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r, i) => (
                    <tr key={r.employee_id} tabIndex={0} onClick={() => setSelected(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") setSelected(r); }}
                      className="group cursor-pointer transition hover:bg-[#5f1340]/[0.03] focus:bg-[#5f1340]/[0.04] focus:outline-none">
                      <td className="px-4 py-3 text-center text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 group-hover:text-[#5f1340]">{fmtEmployeeName(r.full_name)}</p>
                        <p className="font-mono text-[10px] text-slate-400">{r.employee_code || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.waschen_role || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.outlet_name && r.outlet_name !== "-" ? r.outlet_name : "—"}</td>
                      <td className="px-4 py-3 text-center"><SlipBadge has={r.slip_has_month} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("font-bold tabular-nums", r.slip_total ? "text-slate-800" : "text-slate-300")}>{r.slip_total}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.slip_last_at ? (
                          <>
                            <p className="font-semibold text-slate-700">{fmtMonth(r.slip_last_month)}</p>
                            <p className="text-[10px] text-slate-400">{fmtDateTime(r.slip_last_at)}</p>
                          </>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-2 py-3"><HiOutlineChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#5f1340]" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {selected && (
        <PayslipModal
          employee={selected}
          defaultMonth={defaultUploadMonth}
          years={yearOptions}
          onClose={() => setSelected(null)}
          onChanged={() => loadSummary().catch(() => {})}
        />
      )}
    </div>
  );
}

function SlipBadge({ has }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold",
      has ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
      {has ? "Sudah upload" : "Belum upload"}
    </span>
  );
}
