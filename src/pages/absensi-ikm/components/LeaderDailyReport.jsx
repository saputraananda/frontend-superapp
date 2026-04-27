import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineFunnel, HiOutlinePaperClip, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown,
  HiOutlineExclamationTriangle, HiOutlineClipboardDocumentList,
  HiOutlineArrowDownTray, HiOutlineUserMinus, HiOutlineClock,
  HiOutlineCheckCircle, HiOutlineNoSymbol,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../lib/api";

function cn(...c) { return c.filter(Boolean).join(" "); }

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const p = JSON.parse(raw);
    const u = p?.user ?? p;
    return { name: u?.employee?.full_name || u?.name || "" };
  } catch { return {}; }
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

const EMPTY_FORM = {
  report_date: todayISO(), area_id: "", pic_name: "", role: "Leader",
  present_count: 0, production_start_time: "07:00", is_late: false,
  area_cleanliness: "Bersih", constraint_notes: "",
};

function Toast({ toasts }) {
  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg pointer-events-auto",
          t.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {t.type === "success" ? "✓" : "✕"} {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Employee picker row ─────────────────────────────────────────────────────
function EmployeeRow({ value, employees, onChange, onRemove, children }) {
  return (
    <div className="flex items-center gap-2">
      <select className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
        value={value.employee_id || ""} onChange={(e) => onChange({ ...value, employee_id: e.target.value })}>
        <option value="">-- Pilih Karyawan --</option>
        {employees.map((e) => (
          <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>
        ))}
      </select>
      {children}
      <button type="button" onClick={onRemove}
        className="p-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition flex-shrink-0">
        <HiOutlineXMark className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Detail Expand Panel ─────────────────────────────────────────────────────
function DetailPanel({ record }) {
  const [open, setOpen] = useState(false);
  const hasAbsent = record.absent_employees?.length > 0;
  const hasLate   = record.late_employees?.length > 0;
  if (!hasAbsent && !hasLate && !record.constraint_notes && !record.briefing_doc_url) return (
    <span className="text-xs text-slate-300">-</span>
  );

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold">
        Detail <HiOutlineChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs">
          {hasAbsent && (
            <div>
              <p className="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <HiOutlineUserMinus className="h-3.5 w-3.5 text-red-500" /> Tidak Hadir
              </p>
              {record.absent_employees.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 text-slate-700">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                    a.absence_reason === "Sakit" ? "bg-amber-50 border-amber-200 text-amber-700" :
                    a.absence_reason === "Alfa"  ? "bg-red-50 border-red-200 text-red-700" :
                    "bg-blue-50 border-blue-200 text-blue-700"
                  )}>{a.absence_reason}</span>
                  {a.full_name || `Karyawan #${a.employee_id}`}
                </div>
              ))}
            </div>
          )}
          {hasLate && (
            <div>
              <p className="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <HiOutlineClock className="h-3.5 w-3.5 text-orange-500" /> Terlambat
              </p>
              {record.late_employees.map((l, i) => (
                <div key={i} className="text-slate-700">
                  {l.full_name || `Karyawan #${l.employee_id}`}
                  <span className="ml-1 text-slate-400">({l.late_time?.slice(0,5)})</span>
                </div>
              ))}
            </div>
          )}
          {record.constraint_notes && (
            <div>
              <p className="font-semibold text-slate-600 mb-1">Kendala</p>
              <p className="text-slate-700 whitespace-pre-wrap">{record.constraint_notes}</p>
            </div>
          )}
          {record.briefing_doc_url && (
            <a href={record.briefing_doc_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline">
              <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> Dokumen Briefing
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Form Modal ──────────────────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, areas, employees }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [absentList, setAbsentList] = useState([]);
  const [lateList, setLateList]     = useState([]);
  const [file, setFile]     = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const fileRef = useRef();

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        report_date: editData.report_date?.slice(0, 10) || todayISO(),
        area_id: String(editData.area_id || ""),
        pic_name: editData.pic_name || "",
        role: editData.role || "Leader",
        present_count: editData.present_count ?? 0,
        production_start_time: editData.production_start_time?.slice(0, 5) || "07:00",
        is_late: Boolean(editData.is_late),
        area_cleanliness: editData.area_cleanliness || "Bersih",
        constraint_notes: editData.constraint_notes || "",
      });
      setAbsentList(editData.absent_employees?.map((a) => ({
        employee_id: String(a.employee_id), absence_reason: a.absence_reason || "Izin",
      })) || []);
      setLateList(editData.late_employees?.map((l) => ({
        employee_id: String(l.employee_id), late_time: l.late_time?.slice(0, 5) || "07:00",
      })) || []);
    } else {
      const user = getCurrentUser();
      setForm({ ...EMPTY_FORM, pic_name: user.name || "" });
      setAbsentList([]);
      setLateList([]);
    }
    setFile(null);
    setError("");
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append("absent_employees", JSON.stringify(absentList));
      fd.append("late_employees",   JSON.stringify(lateList));
      if (file) fd.append("briefing_doc", file);

      if (editData) {
        await apiUpload(`/ikm/leader-daily-report/${editData.id}`, { method: "PUT", body: fd });
      } else {
        await apiUpload("/ikm/leader-daily-report", { method: "POST", body: fd });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">
            {editData ? "Edit Leader Daily Report" : "Tambah Leader Daily Report"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Laporan *</label>
              <input type="date" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Area *</label>
              <select required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
                <option value="">-- Pilih Area --</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama PIC *</label>
              <input required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.pic_name} onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
                placeholder="Nama Leader / Deputi" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option>Leader</option>
                <option>Deputi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jumlah Hadir</label>
              <input type="number" min="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.present_count} onChange={(e) => setForm({ ...form, present_count: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Jam Mulai Produksi *</label>
              <input type="time" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.production_start_time} onChange={(e) => setForm({ ...form, production_start_time: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Kebersihan Area *</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={form.area_cleanliness} onChange={(e) => setForm({ ...form, area_cleanliness: e.target.value })}>
                <option>Bersih</option>
                <option>Kotor</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded text-orange-500"
                  checked={form.is_late} onChange={(e) => setForm({ ...form, is_late: e.target.checked })} />
                <span className="text-sm font-semibold text-slate-700">Produksi Terlambat</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Kendala</label>
              <textarea rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                value={form.constraint_notes} onChange={(e) => setForm({ ...form, constraint_notes: e.target.value })}
                placeholder="Kendala operasional hari ini..." />
            </div>
          </div>

          {/* Absent employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HiOutlineUserMinus className="h-4 w-4 text-red-500" /> Karyawan Tidak Hadir
              </p>
              <button type="button" onClick={() => setAbsentList((l) => [...l, { employee_id: "", absence_reason: "Izin" }])}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                <HiOutlinePlus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
            {absentList.length === 0 && (
              <p className="text-xs text-slate-400 italic">Belum ada karyawan tidak hadir</p>
            )}
            <div className="space-y-2">
              {absentList.map((a, i) => (
                <EmployeeRow key={i} value={a} employees={employees}
                  onChange={(v) => setAbsentList((l) => l.map((x, j) => j === i ? v : x))}
                  onRemove={() => setAbsentList((l) => l.filter((_, j) => j !== i))}>
                  <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={a.absence_reason}
                    onChange={(e) => setAbsentList((l) => l.map((x, j) => j === i ? { ...x, absence_reason: e.target.value } : x))}>
                    {["Izin", "Sakit", "Alfa"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </EmployeeRow>
              ))}
            </div>
          </div>

          {/* Late employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HiOutlineClock className="h-4 w-4 text-orange-500" /> Karyawan Terlambat
              </p>
              <button type="button" onClick={() => setLateList((l) => [...l, { employee_id: "", late_time: "07:00" }])}
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                <HiOutlinePlus className="h-3.5 w-3.5" /> Tambah
              </button>
            </div>
            {lateList.length === 0 && (
              <p className="text-xs text-slate-400 italic">Belum ada karyawan terlambat</p>
            )}
            <div className="space-y-2">
              {lateList.map((l, i) => (
                <EmployeeRow key={i} value={l} employees={employees}
                  onChange={(v) => setLateList((ll) => ll.map((x, j) => j === i ? v : x))}
                  onRemove={() => setLateList((ll) => ll.filter((_, j) => j !== i))}>
                  <input type="time" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    value={l.late_time}
                    onChange={(e) => setLateList((ll) => ll.map((x, j) => j === i ? { ...x, late_time: e.target.value } : x))} />
                </EmployeeRow>
              ))}
            </div>
          </div>

          {/* Briefing doc upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dokumen Briefing (Foto/PDF)</label>
            <div onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
              <HiOutlinePaperClip className="h-5 w-5 text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">{file ? file.name : "Klik untuk upload foto atau PDF (maks 10MB)"}</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files[0] || null)} />
            {editData?.briefing_doc_url && !file && (
              <a href={editData.briefing_doc_url} target="_blank" rel="noreferrer"
                className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> Lihat dokumen saat ini
              </a>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition">
              {saving ? "Menyimpan..." : editData ? "Simpan Perubahan" : "Tambah Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <HiOutlineExclamationTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Laporan?</h3>
        <p className="text-sm text-slate-500 mb-5">
          Laporan harian <strong>{target?.pic_name}</strong> tanggal{" "}
          <strong>{fmtDate(target?.report_date)}</strong> beserta data absen dan keterlambatan akan dihapus.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition">
            {loading ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function LeaderDailyReport() {
  const [records, setRecords] = useState([]);
  const [areas, setAreas] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth(), endDate: todayISO(), area_id: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  const fetchData = useCallback(async (pg = pagination.page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(pagination.limit) });
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate)   qs.set("endDate", filters.endDate);
      if (filters.area_id)   qs.set("area_id", filters.area_id);

      const res = await api(`/ikm/leader-daily-report?${qs}`);
      setRecords(res.data || []);
      setPagination((p) => ({ ...p, page: pg, total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 }));
      if (res.areas?.length) setAreas(res.areas);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    // Load meta + employee options
    Promise.all([
      api("/ikm/leader-daily-report/meta"),
      api("/ikm/leader-daily-report/employee-options"),
    ]).then(([meta, empRes]) => {
      if (meta.areas?.length) setAreas(meta.areas);
      if (empRes.data?.length) setEmployees(empRes.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchData(1); }, [filters]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/leader-daily-report/${deleteTarget.id}`, { method: "DELETE" });
      addToast("Laporan berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <Toast toasts={toasts} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HiOutlineClipboardDocumentList className="h-6 w-6 text-blue-600" />
            Leader Daily Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Laporan harian operasional dari Leader & Deputi</p>
        </div>
        <button onClick={() => { setEditData(null); setFormOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm">
          <HiOutlinePlus className="h-4 w-4" /> Tambah Laporan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineFunnel className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Filter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Dari Tanggal</label>
            <input type="date" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
            <input type="date" className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Area</label>
            <select className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.area_id} onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}>
              <option value="">Semua Area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {loading ? "Memuat..." : `${pagination.total} laporan ditemukan`}
        </p>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-slate-500">Per halaman:</label>
          <select className="text-xs rounded-lg border border-slate-200 px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            value={pagination.limit}
            onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}>
            {[25, 50, 100].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Table — Desktop */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">PIC</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Area</th>
                <th className="px-4 py-3 text-center">Hadir</th>
                <th className="px-4 py-3 text-center">Mulai</th>
                <th className="px-4 py-3 text-center">Terlambat</th>
                <th className="px-4 py-3 text-center">Kebersihan</th>
                <th className="px-4 py-3 text-left">Detail</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">
                    Tidak ada data laporan harian
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDate(r.report_date)}</td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-800">{r.pic_name}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                        r.role === "Leader"
                          ? "bg-purple-50 border-purple-200 text-purple-700"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700"
                      )}>{r.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{r.area_name || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                        {r.present_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600 whitespace-nowrap">
                      {r.production_start_time?.slice(0, 5) || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {r.is_late
                        ? <HiOutlineNoSymbol className="h-4 w-4 text-orange-500 mx-auto" />
                        : <HiOutlineCheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                        r.area_cleanliness === "Bersih"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-red-50 border-red-200 text-red-700"
                      )}>{r.area_cleanliness}</span>
                    </td>
                    <td className="px-4 py-3">
                      <DetailPanel record={r} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => { setEditData(r); setFormOpen(true); }}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition">
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition">
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
      </div>

      {/* Cards — Mobile */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))
        ) : records.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            Tidak ada data
          </div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">{r.pic_name}</p>
                  <p className="text-[10px] text-slate-500">{fmtDate(r.report_date)} · {r.area_name}</p>
                </div>
                <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-semibold",
                  r.role === "Leader" ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}>{r.role}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-600">
                <span>👥 Hadir: {r.present_count}</span>
                <span>⏰ {r.production_start_time?.slice(0,5)}</span>
                <span className={r.is_late ? "text-orange-600" : "text-emerald-600"}>
                  {r.is_late ? "⚠ Terlambat" : "✓ Tepat Waktu"}
                </span>
                <span className={r.area_cleanliness === "Bersih" ? "text-emerald-600" : "text-red-600"}>
                  {r.area_cleanliness === "Bersih" ? "✓ Bersih" : "✗ Kotor"}
                </span>
              </div>
              <DetailPanel record={r} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setEditData(r); setFormOpen(true); }}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-1">
                  <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={() => setDeleteTarget(r)}
                  className="flex-1 rounded-lg border border-red-200 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition flex items-center justify-center gap-1">
                  <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Halaman {pagination.page} dari {pagination.totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchData(pagination.page - 1)} disabled={pagination.page <= 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <HiOutlineChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => fetchData(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
              <HiOutlineChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <FormModal open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={() => { addToast(editData ? "Laporan diperbarui" : "Laporan ditambahkan"); fetchData(pagination.page); }}
        editData={editData} areas={areas} employees={employees} />

      <DeleteModal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete} target={deleteTarget} loading={deleting} />
    </div>
  );
}
