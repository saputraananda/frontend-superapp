import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineCalendarDays,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineTableCells,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineEye,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
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
  calcDuration,
  fmtDateTime,
  attendanceStatusBadge,
  groomingStatusBadge,
  groomingStatusLabel,
  fmtEmployeeName,
  useSort,
} from "../../utils/hrisUtils";
import {
  SortTh,
  PhotoThumb,
  PhotoViewerModal,
  FilterScroll,
  FilterPill,
  MobileSkeleton,
  AbsensiMobileCard,
} from "./hrisShared";

const CLEANLINESS_ROLE_ORDER = ["Frontliner", "Delivery Staff", "Washing Staff", "Ironing Staff", "Packing Staff"];
const STATUS_FILTERS = ["Semua", "Lengkap", "Belum check-out", "Belum check-in", "Foto belum lengkap"];
const EMPTY_FORM = { employee_id: "", outlet_id: "", work_date: "", check_in_time: "", check_out_time: "" };
const INPUT_CLS = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#5f1340]/40";
const LABEL_CLS = "block text-[10px] font-bold uppercase tracking-wider text-slate-400";
const PAGE_TABS = [
  { id: "riwayat", label: "Riwayat Absensi" },
  { id: "kebersihan", label: "Kebersihan" },
];

function toDateTimeLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToForm(row) {
  return {
    employee_id: String(row.employee_id || ""),
    outlet_id: String(row.outlet_id || ""),
    work_date: row.work_date || "",
    check_in_time: toDateTimeLocalInput(row.check_in_time),
    check_out_time: toDateTimeLocalInput(row.check_out_time),
  };
}

function AttendanceFormFields({ form, setForm, employees, outlets, isEdit = false }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className={LABEL_CLS}>Karyawan</span>
        {isEdit ? (
          <input value={fmtEmployeeName(employees.find((e) => String(e.employee_id) === form.employee_id)?.full_name, form.employee_id)} disabled className={cn(INPUT_CLS, "bg-slate-50 text-slate-500")} />
        ) : (
          <select required value={form.employee_id} onChange={(e) => {
            const emp = employees.find((x) => String(x.employee_id) === e.target.value);
            setForm((f) => ({
              ...f,
              employee_id: e.target.value,
              outlet_id: emp?.outlet_id ? String(emp.outlet_id) : f.outlet_id,
            }));
          }} className={INPUT_CLS}>
            <option value="">Pilih karyawan</option>
            {employees.map((e) => (
              <option key={e.employee_id} value={e.employee_id}>{fmtEmployeeName(e.full_name)}{e.employee_code ? ` · ${e.employee_code}` : ""}</option>
            ))}
          </select>
        )}
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Outlet</span>
        <select required value={form.outlet_id} onChange={(e) => setForm((f) => ({ ...f, outlet_id: e.target.value }))} className={INPUT_CLS}>
          <option value="">Pilih outlet</option>
          {outlets.map((o) => (
            <option key={o.id} value={String(o.id)}>{o.outlet_code ? `${o.outlet_code} — ` : ""}{o.name}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Tanggal Kerja</span>
        <input type="date" required value={form.work_date} onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))} className={INPUT_CLS} />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Jam Masuk</span>
        <input type="datetime-local" value={form.check_in_time} onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))} className={INPUT_CLS} />
      </label>
      <label className="block">
        <span className={LABEL_CLS}>Jam Keluar</span>
        <input type="datetime-local" value={form.check_out_time} onChange={(e) => setForm((f) => ({ ...f, check_out_time: e.target.value }))} className={INPUT_CLS} />
      </label>
    </div>
  );
}

export default function Absensi() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters, outlets } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "check_in_time", dir: "desc" });

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ totalRecords: 0, completeCount: 0, incompleteCount: 0, totalCheckIn: 0, totalLeave: 0 });
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [photoView, setPhotoView] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [pageTab, setPageTab] = useState("riwayat");
  const [detailRow, setDetailRow] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState("grooming");
  const [cleanlinessRows, setCleanlinessRows] = useState([]);
  const [cleanlinessLoading, setCleanlinessLoading] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (silent = false) => {
    if (!startDate || !endDate) return;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      if (onlyIncomplete) q.set("onlyIncomplete", "1");
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/attendance?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { totalRecords: 0, completeCount: 0, incompleteCount: 0, totalCheckIn: 0, totalLeave: 0 });
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat data absensi");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [startDate, endDate, onlyIncomplete, search, appendFilters]);

  const loadCleanliness = useCallback(async (silent = false) => {
    if (!startDate || !endDate) return;
    if (!silent) setCleanlinessLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      const res = await api(`/waschen/hris/attendance/cleanliness?${q}`);
      setCleanlinessRows(res.data || []);
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat foto kebersihan");
      setCleanlinessRows([]);
    } finally {
      if (!silent) setCleanlinessLoading(false);
    }
  }, [startDate, endDate, appendFilters]);

  useLiveRefresh(() => {
    if (pageTab === "kebersihan") loadCleanliness(true);
    else load(true);
  });

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (pageTab === "kebersihan") loadCleanliness();
  }, [pageTab, loadCleanliness]);
  useEffect(() => {
    api("/waschen/employees").then((r) => setEmployees(r.data || [])).catch(() => setEmployees([]));
  }, []);

  const openDetail = async (row) => {
    setDetailTab("grooming");
    setDetailRow({ ...row, grooming_photos: [], cleanliness_photos: [] });
    setDetailLoading(true);
    try {
      const res = await api(`/waschen/hris/attendance/${row.attendance_id}/detail`);
      setDetailRow(res.data || row);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat detail grooming");
    } finally {
      setDetailLoading(false);
    }
  };

  const outletById = useMemo(
    () => new Map(outlets.map((o) => [String(o.id), o])),
    [outlets],
  );

  // Tanpa filter outlet & posisi: kelompokkan foto per posisi.
  const cleanlinessGroups = useMemo(() => {
    if (hrisFilters.outletId || hrisFilters.role) return [{ role: null, photos: cleanlinessRows }];
    const map = new Map();
    cleanlinessRows.forEach((p) => {
      const k = p.role_code || "Lainnya";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    const rank = (r) => {
      const i = CLEANLINESS_ROLE_ORDER.indexOf(r);
      return i === -1 ? CLEANLINESS_ROLE_ORDER.length : i;
    };
    return [...map.keys()]
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
      .map((role) => ({ role, photos: map.get(role) }));
  }, [cleanlinessRows, hrisFilters.outletId, hrisFilters.role]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "Semua") list = list.filter((r) => r.status_label === statusFilter);
    return applySort(list, {
      work_date: (r) => r.work_date,
      employee_name: (r) => r.employee_name,
      check_in_time: (r) => r.check_in_time || "",
      check_out_time: (r) => r.check_out_time || "",
      status_label: (r) => r.status_label,
    });
  }, [rows, statusFilter, applySort]);

  const mapsLink = (lat, lng) => {
    if (lat == null || lng == null) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, work_date: startDate || "" });
    setFormError("");
    setShowCreate(true);
  };

  const openEdit = (row) => {
    setForm(rowToForm(row));
    setFormError("");
    setEditRow(row);
  };

  const validateForm = () => {
    if (!form.check_in_time && !form.check_out_time) {
      setFormError("Minimal isi jam masuk atau jam keluar");
      return false;
    }
    if (form.check_in_time && form.check_out_time && form.check_out_time <= form.check_in_time) {
      setFormError("Jam keluar harus lebih besar dari jam masuk");
      return false;
    }
    setFormError("");
    return true;
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      await api("/waschen/hris/attendance", {
        method: "POST",
        body: JSON.stringify({
          employee_id: Number(form.employee_id),
          outlet_id: Number(form.outlet_id),
          work_date: form.work_date,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
        }),
      });
      showToast("success", "Absensi berhasil ditambahkan");
      setShowCreate(false);
      load();
    } catch (err) {
      setFormError(err.message || "Gagal menambahkan absensi");
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editRow || !validateForm()) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/attendance/${editRow.attendance_id}`, {
        method: "PUT",
        body: JSON.stringify({
          outlet_id: Number(form.outlet_id),
          work_date: form.work_date,
          check_in_time: form.check_in_time || null,
          check_out_time: form.check_out_time || null,
        }),
      });
      showToast("success", "Absensi berhasil diperbarui");
      setEditRow(null);
      load();
    } catch (err) {
      setFormError(err.message || "Gagal memperbarui absensi");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/attendance/${deleteRow.attendance_id}`, { method: "DELETE" });
      showToast("success", "Absensi berhasil dihapus");
      setDeleteRow(null);
      load();
    } catch (err) {
      showToast("error", err.message || "Gagal menghapus absensi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Absensi Karyawan</h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-6 text-white/75">
            Rekap absensi karyawan waschen laundry.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Absensi
        </button>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm w-full sm:w-auto sm:inline-flex">
        {PAGE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPageTab(t.id)}
            className={cn(
              "flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition",
              pageTab === t.id ? "bg-[#5f1340] text-white" : "text-slate-500 hover:bg-slate-50",
            )}
          >
            {t.id === "kebersihan" ? <HiOutlineSparkles className="h-3.5 w-3.5" /> : <HiOutlineTableCells className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {pageTab === "kebersihan" ? (
        <section className={TABLE_SECTION}>
          <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Foto Kebersihan</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Perwakilan per outlet + posisi + hari · difoto oleh siapa.</p>
            </div>
            <button type="button" onClick={loadCleanliness} className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", cleanlinessLoading && "animate-spin")} />
            </button>
          </div>
          <div className="px-4 py-3 border-b border-slate-100">
            <CutoffPeriodFilter cutoff={cutoff} />
            <div className="mt-3">
              <HrisOutletRoleFilter
                outlets={hrisFilters.outlets}
                outletId={hrisFilters.outletId}
                onOutletChange={hrisFilters.setOutletId}
                role={hrisFilters.role}
                onRoleChange={hrisFilters.setRole}
              />
            </div>
          </div>
          {cleanlinessLoading ? (
            <MobileSkeleton count={4} />
          ) : cleanlinessRows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 px-4">
              <HiOutlineSparkles className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm font-semibold">Tidak ada foto kebersihan</p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 space-y-5">
              {cleanlinessGroups.map((g) => (
              <div key={g.role || "all"}>
                {g.role && (
                  <h3 className="mb-2 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-[#5f1340]/10 px-2.5 py-1 font-bold text-[#5f1340]">{g.role}</span>
                    <span className="font-medium text-slate-400">{g.photos.length} foto</span>
                  </h3>
                )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {g.photos.map((p) => (
                <button
                  key={p.cleanliness_photo_id}
                  type="button"
                  onClick={() => setPhotoView({ url: p.photo_url, label: `Kebersihan · ${p.uploaded_by_name || "—"}` })}
                  className="text-left rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-[#5f1340]/30 transition"
                >
                  <div className="aspect-square bg-slate-100">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="Kebersihan" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-slate-300 text-xs">No photo</div>
                    )}
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{p.uploaded_by_name || "—"}</p>
                    <p className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="rounded-full bg-[#5f1340]/10 px-2 py-0.5 text-[10px] font-bold text-[#5f1340]">{p.role_code || "—"}</span>
                      <span className="text-[10px] font-semibold text-slate-600">{outletById.get(String(p.outlet_id))?.name || "—"}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">{fmtDateShort(p.work_date)}</p>
                    <p className="text-[10px] text-slate-400">{fmtDateTime(p.taken_at)}</p>
                  </div>
                </button>
              ))}
            </div>
              </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
      <div className={SUMMARY_GRID}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Record</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{summary.totalRecords}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Lengkap</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-emerald-800">{summary.completeCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Belum Lengkap</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-800">{summary.incompleteCount}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Check-in</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-sky-800">{summary.totalCheckIn}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 sm:p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Perizinan Periode</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-800">{summary.totalLeave}</p>
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
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama karyawan..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 shrink-0">
              <input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} className="rounded" />
              Hanya belum lengkap
            </label>
            <FilterScroll className="flex-1">
              {STATUS_FILTERS.map((f) => (
                <FilterPill key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>{f}</FilterPill>
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
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Detail Riwayat Absensi</h2>
              <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">Tanggal masuk, jam absen, foto, grooming, dan status kelengkapan.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!loading && <span className="text-xs font-semibold text-slate-500">{filtered.length} record</span>}
            <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-xl border border-[#5f1340]/20 bg-[#5f1340]/5 px-3 py-1.5 text-xs font-semibold text-[#5f1340] hover:bg-[#5f1340]/10">
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Tambah
            </button>
          </div>
        </div>

        {loading ? (
          <MobileSkeleton count={4} />
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <HiOutlineCalendarDays className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Tidak ada data absensi</p>
          </div>
        ) : (
          <>
            <div className="md:hidden p-3 sm:p-4 space-y-3">
              {filtered.map((r) => (
                <AbsensiMobileCard
                  key={r.attendance_id}
                  row={r}
                  onViewPhoto={setPhotoView}
                  mapsLink={mapsLink}
                  onEdit={openEdit}
                  onDelete={setDeleteRow}
                  onViewDetail={openDetail}
                  submitting={submitting}
                />
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <SortTh col="work_date" label="Tanggal" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold">Outlet</th>
                    <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                    <SortTh col="check_in_time" label="Absen In" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold text-center">Foto In</th>
                    <SortTh col="check_out_time" label="Absen Out" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold text-center">Foto Out</th>
                    <th className="px-4 py-3 font-semibold">Durasi</th>
                    <th className="px-4 py-3 font-semibold text-center">Grooming</th>
                    <SortTh col="status_label" label="Status" sort={sort} onSort={toggleSort} className="text-center" />
                    <th className="px-4 py-3 font-semibold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => (
                    <tr key={r.attendance_id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">{fmtDateShort(r.work_date)}</td>
                      <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">{outletById.get(String(r.outlet_id))?.outlet_code || "—"}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{fmtEmployeeName(r.employee_name)}</p>
                        {r.employee_code && <p className="text-[10px] text-slate-400">{r.employee_code}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {fmtDateTime(r.check_in_time)}
                        {r.check_in_note && (
                          <p className="mt-0.5 max-w-[200px] truncate whitespace-normal text-[10px] font-medium text-slate-400" title={r.check_in_note}>
                            {r.check_in_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <PhotoThumb url={r.check_in_photo_url} label="Foto masuk" onView={setPhotoView} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {fmtDateTime(r.check_out_time)}
                        {r.check_out_note && (
                          <p className="mt-0.5 max-w-[200px] truncate whitespace-normal text-[10px] font-medium text-slate-400" title={r.check_out_note}>
                            {r.check_out_note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <PhotoThumb url={r.check_out_photo_url} label="Foto keluar" onView={setPhotoView} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{calcDuration(r.check_in_time, r.check_out_time) || "—"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => openDetail(r)}
                          className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold", groomingStatusBadge(r.grooming_status))}
                          title="Lihat detail grooming"
                        >
                          {groomingStatusLabel(r.grooming_status)}
                          <HiOutlineEye className="h-3 w-3 opacity-70" />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", attendanceStatusBadge(r.status_label))}>{r.status_label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-center gap-1">
                          <button type="button" title="Detail grooming" disabled={submitting} onClick={() => openDetail(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                            <HiOutlineEye className="h-4 w-4" />
                          </button>
                          <button type="button" title="Edit" disabled={submitting} onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                            <HiOutlinePencilSquare className="h-4 w-4" />
                          </button>
                          <button type="button" title="Hapus" disabled={submitting} onClick={() => setDeleteRow(r)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
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
        </>
      )}

      <PhotoViewerModal open={Boolean(photoView)} url={photoView?.url} label={photoView?.label} onClose={() => setPhotoView(null)} />

      {detailRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setDetailRow(null)}>
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 bg-white shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-800">Detail Grooming & Kebersihan</h3>
                <p className="text-[11px] text-slate-500 mt-1 truncate">
                  {fmtEmployeeName(detailRow.employee_name)} · {fmtDateShort(detailRow.work_date)}
                  {detailRow.role_code ? ` · ${detailRow.role_code}` : ""}
                  {detailRow.outlet_name ? ` · ${detailRow.outlet_name}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Tutup"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto text-xs space-y-4 flex-1 min-h-0">
              {detailLoading ? (
                <p className="text-slate-400 py-12 text-center">Memuat…</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Karyawan</p>
                      <p className="mt-0.5 font-semibold text-slate-800 leading-snug">{fmtEmployeeName(detailRow.employee_name)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Tanggal</p>
                      <p className="mt-0.5 font-semibold text-slate-800">{fmtDateShort(detailRow.work_date)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Posisi</p>
                      <p className="mt-0.5 font-semibold text-slate-800 capitalize">{detailRow.role_code || "—"}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Status Grooming</p>
                      <span className={cn("mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", groomingStatusBadge(detailRow.grooming_status))}>
                        {groomingStatusLabel(detailRow.grooming_status)}
                      </span>
                    </div>
                  </div>

                  {(detailRow.check_in_note || detailRow.check_out_note) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Catatan Masuk</p>
                        <p className="mt-0.5 text-slate-700 leading-snug whitespace-pre-wrap break-words">
                          {detailRow.check_in_note || "—"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Catatan Pulang</p>
                        <p className="mt-0.5 text-slate-700 leading-snug whitespace-pre-wrap break-words">
                          {detailRow.check_out_note || "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setDetailTab("grooming")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
                        detailTab === "grooming" ? "bg-[#5f1340] text-white shadow-sm" : "text-slate-500 hover:bg-white",
                      )}
                    >
                      Grooming
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        detailTab === "grooming" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600",
                      )}>
                        {(detailRow.grooming_photos || []).length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDetailTab("kebersihan")}
                      className={cn(
                        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition",
                        detailTab === "kebersihan" ? "bg-[#5f1340] text-white shadow-sm" : "text-slate-500 hover:bg-white",
                      )}
                    >
                      Kebersihan
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                        detailTab === "kebersihan" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600",
                      )}>
                        {(detailRow.cleanliness_photos || []).length}
                      </span>
                    </button>
                  </div>

                  {detailTab === "grooming" ? (
                    <section>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Foto Grooming</h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {(detailRow.grooming_photos || []).length} foto
                        </span>
                      </div>

                      {detailRow.grooming_status === "tidak_wajib" ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-500">
                          Grooming tidak wajib untuk posisi ini. Buka tab Kebersihan untuk melihat foto area.
                        </div>
                      ) : (detailRow.grooming_photos || []).length === 0 ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 space-y-1">
                          <p className="font-semibold text-rose-800">Tidak ada foto grooming</p>
                          {detailRow.grooming_incomplete_reason ? (
                            <p className="text-rose-700">Alasan: {detailRow.grooming_incomplete_reason}</p>
                          ) : (
                            <p className="text-rose-600/80">Belum ada alasan yang diisi.</p>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {detailRow.grooming_photos.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPhotoView({ url: p.url, label: p.step_label })}
                              className="text-left rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-[#5f1340]/40 hover:shadow transition"
                            >
                              <div className="aspect-[4/5] bg-slate-100">
                                {p.url ? (
                                  <img src={p.url} alt={p.step_label} className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-slate-300">No photo</div>
                                )}
                              </div>
                              <div className="p-2.5 space-y-0.5">
                                <p className="font-bold text-slate-800 leading-snug line-clamp-2">{p.step_label}</p>
                                <p className="text-[10px] text-slate-400">{fmtDateTime(p.taken_at)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {detailRow.grooming_incomplete_reason && (detailRow.grooming_photos || []).length > 0 && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                          Alasan: {detailRow.grooming_incomplete_reason}
                        </p>
                      )}
                    </section>
                  ) : (
                    <section>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Foto Kebersihan</h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {(detailRow.cleanliness_photos || []).length} foto · area posisi
                        </span>
                      </div>

                      {(detailRow.cleanliness_photos || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-slate-400">
                          Belum ada foto kebersihan untuk outlet + posisi hari ini.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {detailRow.cleanliness_photos.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPhotoView({ url: p.url, label: `Kebersihan · ${p.uploaded_by_name || "—"}` })}
                              className="text-left rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-[#5f1340]/40 hover:shadow transition"
                            >
                              <div className="aspect-[4/5] bg-slate-100">
                                {p.url ? (
                                  <img src={p.url} alt="Kebersihan" className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="h-full w-full grid place-items-center text-slate-300">No photo</div>
                                )}
                              </div>
                              <div className="p-2.5 space-y-0.5">
                                <p className="font-bold text-slate-800 leading-snug line-clamp-2">{p.uploaded_by_name || "—"}</p>
                                <p className="text-[10px] text-slate-400">{fmtDateTime(p.taken_at)}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showCreate && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <form onSubmit={submitCreate} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Tambah Absensi Manual</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Input absensi oleh admin</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</div>}
              <AttendanceFormFields form={form} setForm={setForm} employees={employees} outlets={outlets} />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-[#5f1340] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </form>
        </div>, document.body)}

      {editRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setEditRow(null)}>
          <form onSubmit={submitEdit} className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Edit Absensi</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{fmtEmployeeName(editRow.employee_name)} · {fmtDateShort(editRow.work_date)}</p>
              </div>
              <button type="button" onClick={() => setEditRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{formError}</div>}
              <AttendanceFormFields form={form} setForm={setForm} employees={employees} outlets={outlets} isEdit />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setEditRow(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="rounded-xl bg-[#5f1340] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{submitting ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </div>
          </form>
        </div>, document.body)}

      {deleteRow && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setDeleteRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-800">Hapus Absensi</h3>
              <button type="button" onClick={() => setDeleteRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Hapus absensi <strong className="text-slate-800">{fmtEmployeeName(deleteRow.employee_name)}</strong> pada {fmtDateShort(deleteRow.work_date)}?
              </p>
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">Record dan foto terkait akan dihapus permanen.</p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setDeleteRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={confirmDelete} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{submitting ? "Menghapus..." : "Hapus"}</button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
