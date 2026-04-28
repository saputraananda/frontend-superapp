import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineFunnel, HiOutlinePaperClip, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineChevronDown,
  HiOutlineExclamationTriangle, HiOutlineClipboardDocumentList,
  HiOutlineArrowDownTray, HiOutlineUserMinus, HiOutlineClock,
  HiOutlineCheckCircle, HiOutlinePhoto,
  HiOutlineArrowsUpDown, HiOutlineChevronUp,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { api } from "../../../lib/api";

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

function generatePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const EMPTY_FORM = {
  report_date: todayISO(), area_id: "", pic_name: "", role: "Leader",
  present_count: 0, production_start_time: "07:00", is_late: false,
  area_cleanliness: "Bersih", constraint_notes: "",
};

const ROLE_META = {
  Leader: { cls: "bg-blue-50 text-blue-700 border-blue-200" },
  Deputi: { cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

const CLEANLINESS_META = {
  Bersih: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Kotor:  { cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const ABSENCE_META = {
  Sakit: { cls: "bg-amber-50 border-amber-200 text-amber-700" },
  Alfa:  { cls: "bg-rose-50 border-rose-200 text-rose-700" },
  Izin:  { cls: "bg-blue-50 border-blue-200 text-blue-700" },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
        toast.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {toast.type === "error"
        ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
        : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── SortTh ───────────────────────────────────────────────────────────────────
function SortTh({ col, label, sort, onSort, className = "" }) {
  const active = sort.col === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
        active ? "text-blue-600 bg-blue-50/60" : "text-slate-500",
        className,
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
        ) : (
          <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 10 }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-28" : i <= 3 ? "w-20" : "w-14")} />
        </td>
      ))}
    </tr>
  );
}

// ─── Photo Thumbnail + Viewer ─────────────────────────────────────────────────
function PhotoThumb({ url, label = "Foto" }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-xs text-slate-300">-</span>;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Lihat foto"
        className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-400 hover:shadow-md transition"
      >
        {isImage ? (
          <img src={url} alt={label} className="h-full w-full object-cover group-hover:opacity-80 transition" />
        ) : (
          <HiOutlinePaperClip className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition" />
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
              aria-label="Tutup foto"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            {isImage ? (
              <img src={url} alt={label} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm">
                <HiOutlinePhoto className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-4">{label}</p>
                <a href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                  <HiOutlineArrowDownTray className="h-4 w-4" /> Buka Dokumen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Employee picker row ──────────────────────────────────────────────────────
function EmployeeRow({ value, employees, onChange, onRemove, children }) {
  return (
    <div className="flex items-center gap-2">
      <select
        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        value={value.employee_id || ""} onChange={(e) => onChange({ ...value, employee_id: e.target.value })}>
        <option value="">-- Pilih Karyawan --</option>
        {employees.map((e) => (
          <option key={e.employee_id} value={e.employee_id}>{e.full_name}</option>
        ))}
      </select>
      {children}
      <button type="button" onClick={onRemove}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition flex-shrink-0">
        <HiOutlineXMark className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Detail Expand Panel ──────────────────────────────────────────────────────
function DetailPanel({ record }) {
  const [open, setOpen] = useState(false);
  const hasAbsent = record.absent_employees?.length > 0;
  const hasLate   = record.late_employees?.length > 0;
  if (!hasAbsent && !hasLate && !record.constraint_notes && !record.briefing_doc_url) {
    return <span className="text-xs text-slate-300">-</span>;
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
        Detail <HiOutlineChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 space-y-2.5 text-xs rounded-xl border border-slate-100 bg-slate-50 p-3">
          {hasAbsent && (
            <div>
              <p className="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <HiOutlineUserMinus className="h-3.5 w-3.5 text-rose-500" /> Tidak Hadir
              </p>
              <div className="space-y-1">
                {record.absent_employees.map((a, i) => {
                  const meta = ABSENCE_META[a.absence_reason] ?? ABSENCE_META.Izin;
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-slate-700">
                      <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider", meta.cls)}>
                        {a.absence_reason}
                      </span>
                      {a.full_name || `Karyawan #${a.employee_id}`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {hasLate && (
            <div>
              <p className="font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <HiOutlineClock className="h-3.5 w-3.5 text-amber-500" /> Terlambat
              </p>
              <div className="space-y-1">
                {record.late_employees.map((l, i) => (
                  <div key={i} className="text-slate-700">
                    {l.full_name || `Karyawan #${l.employee_id}`}
                    <span className="ml-1 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                      {l.late_time?.slice(0,5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {record.constraint_notes && (
            <div>
              <p className="font-semibold text-slate-600 mb-1">Kendala</p>
              <p className="text-slate-700 whitespace-pre-wrap">{record.constraint_notes}</p>
            </div>
          )}
          {record.briefing_doc_url && (
            <div>
              <p className="font-semibold text-slate-600 mb-1">Dokumen Briefing</p>
              <PhotoThumb url={record.briefing_doc_url} label="Dokumen Briefing" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, areas, employees }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [absentList, setAbsentList] = useState([]);
  const [lateList, setLateList]     = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

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
    setError("");
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const body = { ...form, absent_employees: absentList, late_employees: lateList };
      if (editData) {
        await api(`/ikm/leader-daily-report/${editData.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/ikm/leader-daily-report", { method: "POST", body: JSON.stringify(body) });
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

  const labelClass = "block text-xs font-semibold text-slate-500 mb-1";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {editData ? "Edit Leader Daily Report" : "Tambah Leader Daily Report"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tanggal Laporan <span className="text-rose-500">*</span></label>
              <input type="date" required className={inputClass}
                value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} disabled={saving} />
            </div>
            <div>
              <label className={labelClass}>Area <span className="text-rose-500">*</span></label>
              <select required className={inputClass}
                value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} disabled={saving}>
                <option value="">-- Pilih Area --</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nama PIC <span className="text-rose-500">*</span></label>
              <input required className={inputClass} value={form.pic_name}
                onChange={(e) => setForm({ ...form, pic_name: e.target.value })}
                placeholder="Nama Leader / Deputi" disabled={saving} />
            </div>
            <div>
              <label className={labelClass}>Role <span className="text-rose-500">*</span></label>
              <select className={inputClass} value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={saving}>
                <option>Leader</option>
                <option>Deputi</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Jumlah Hadir</label>
              <input type="number" min="0" className={inputClass} value={form.present_count}
                onChange={(e) => setForm({ ...form, present_count: e.target.value })} disabled={saving} />
            </div>
            <div>
              <label className={labelClass}>Jam Mulai Produksi <span className="text-rose-500">*</span></label>
              <input type="time" required className={inputClass} value={form.production_start_time}
                onChange={(e) => setForm({ ...form, production_start_time: e.target.value })} disabled={saving} />
            </div>
            <div>
              <label className={labelClass}>Kebersihan Area <span className="text-rose-500">*</span></label>
              <select className={inputClass} value={form.area_cleanliness}
                onChange={(e) => setForm({ ...form, area_cleanliness: e.target.value })} disabled={saving}>
                <option>Bersih</option>
                <option>Kotor</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 w-full cursor-pointer hover:bg-slate-100 transition">
                <input type="checkbox" className="h-4 w-4 rounded accent-blue-600"
                  checked={form.is_late} onChange={(e) => setForm({ ...form, is_late: e.target.checked })} disabled={saving} />
                <span className="text-sm font-semibold text-slate-700">Produksi Terlambat</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Catatan Kendala</label>
              <textarea rows={2} className={cn(inputClass, "resize-none")} value={form.constraint_notes}
                onChange={(e) => setForm({ ...form, constraint_notes: e.target.value })}
                placeholder="Kendala operasional hari ini..." disabled={saving} />
            </div>
          </div>

          {/* Absent employees */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HiOutlineUserMinus className="h-4 w-4 text-rose-500" /> Karyawan Tidak Hadir
              </p>
              <button type="button" disabled={saving}
                onClick={() => setAbsentList((l) => [...l, { employee_id: "", absence_reason: "Izin" }])}
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
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
                <HiOutlineClock className="h-4 w-4 text-amber-500" /> Karyawan Terlambat
              </p>
              <button type="button" disabled={saving}
                onClick={() => setLateList((l) => [...l, { employee_id: "", late_time: "07:00" }])}
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
                  <input type="time"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={l.late_time}
                    onChange={(e) => setLateList((ll) => ll.map((x, j) => j === i ? { ...x, late_time: e.target.value } : x))} />
                </EmployeeRow>
              ))}
            </div>
          </div>

          {editData?.briefing_doc_url && (
            <div>
              <label className={labelClass}>Dokumen Briefing</label>
              <PhotoThumb url={editData.briefing_doc_url} label="Dokumen Briefing" />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
              {saving && <HiOutlineClock className="h-4 w-4 animate-spin" />}
              {editData ? "Simpan Perubahan" : "Tambah Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <HiOutlineTrash className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Hapus Laporan?</h3>
        <p className="mt-1 text-sm text-slate-500 mb-5">
          Laporan harian <span className="font-semibold text-slate-700">{target?.pic_name}</span> tanggal{" "}
          <span className="font-semibold text-slate-700">{fmtDate(target?.report_date)}</span> beserta data absen dan keterlambatan akan dihapus.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2">
            {loading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeaderDailyReport() {
  const [records, setRecords] = useState([]);
  const [areas, setAreas] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: firstDayOfMonth(), endDate: todayISO(), area_id: "",
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState({ col: "report_date", dir: "desc" });
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async (pg = pagination.page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(pagination.limit) });
      if (filters.startDate) qs.set("startDate", filters.startDate);
      if (filters.endDate)   qs.set("endDate", filters.endDate);
      if (filters.area_id)   qs.set("area_id", filters.area_id);
      if (search) qs.set("search", search);

      const res = await api(`/ikm/leader-daily-report?${qs}`);
      setRecords(res.data || []);
      setPagination((p) => ({ ...p, page: pg, total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 }));
      if (res.areas?.length) setAreas(res.areas);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, search]);

  useEffect(() => {
    Promise.all([
      api("/ikm/leader-daily-report/meta"),
      api("/ikm/leader-daily-report/employee-options"),
    ]).then(([meta, empRes]) => {
      if (meta.areas?.length) setAreas(meta.areas);
      if (empRes.data?.length) setEmployees(empRes.data);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchData(1); }, [filters, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/leader-daily-report/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Laporan berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (col) =>
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

  const handlePage = (p) => fetchData(Math.max(1, Math.min(p, pagination.totalPages)));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const sortedRecords = useMemo(() => {
    if (!sort.col) return records;
    return [...records].sort((a, b) => {
      let va = a[sort.col] ?? "";
      let vb = b[sort.col] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, sort]);

  const pages = generatePages(pagination.page, pagination.totalPages);
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Toast toast={toast} />

      <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Page Header */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-violet-900 to-indigo-700 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <HiOutlineClipboardDocumentList className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Leader Daily Report</h1>
                  <p className="text-sm text-white/70">Laporan harian operasional dari Leader &amp; Deputi</p>
                </div>
              </div>
              <button
                onClick={() => { setEditData(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Laporan
              </button>
            </div>
          </section>

          {/* Filters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
              Filter
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Dari Tanggal", field: "startDate", type: "date" },
                { label: "Sampai Tanggal", field: "endDate", type: "date" },
              ].map(({ label, field, type }) => (
                <label key={field} className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
                  <input type={type}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    value={filters[field]} onChange={(e) => setFilters({ ...filters, [field]: e.target.value })} />
                </label>
              ))}
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Area</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filters.area_id} onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}>
                  <option value="">Semua Area</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 max-w-xs">
                <div className="relative flex-1">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari nama PIC..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <button type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cari
                </button>
              </form>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Per halaman:</span>
                <select value={pagination.limit}
                  onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400">
                  {[25, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineClipboardDocumentList className="h-5 w-5 text-violet-500" />
                <h2 className="text-base font-bold text-slate-800">Daftar Leader Daily Report</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                {pagination.total.toLocaleString("id-ID")} data
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">No</th>
                    <SortTh col="report_date" label="Tanggal" sort={sort} onSort={handleSort} />
                    <SortTh col="pic_name" label="PIC" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Role</th>
                    <SortTh col="area_name" label="Area" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Hadir</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Mulai</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Terlambat</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Kebersihan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Detail</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={11} />)
                    : sortedRecords.length === 0
                    ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-400">
                          Tidak ada data laporan
                        </td>
                      </tr>
                    )
                    : sortedRecords.map((r, idx) => {
                        const roleMeta = ROLE_META[r.role] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                        const cleanMeta = CLEANLINESS_META[r.area_cleanliness] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                        return (
                          <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 text-xs font-medium text-slate-400 tabular-nums">
                              {(pagination.page - 1) * pagination.limit + idx + 1}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(r.report_date)}</td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{r.pic_name}</td>
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", roleMeta.cls)}>
                                {r.role}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600">{r.area_name || "-"}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700 tabular-nums">
                                {r.present_count ?? "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-mono font-semibold text-slate-600">
                                {r.production_start_time?.slice(0,5) || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {r.is_late ? (
                                <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                                  Terlambat
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                                  Tepat
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", cleanMeta.cls)}>
                                {r.area_cleanliness}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <DetailPanel record={r} />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button onClick={() => { setEditData(r); setFormOpen(true); }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition">
                                  <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit
                                </button>
                                <button onClick={() => setDeleteTarget(r)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 transition">
                                  <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-2 animate-pulse">
                      <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                      <div className="h-3 bg-slate-200 rounded-md w-3/4" />
                      <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                    </div>
                  ))
                : sortedRecords.length === 0
                ? <div className="p-8 text-center text-sm text-slate-400">Tidak ada data</div>
                : sortedRecords.map((r) => {
                    const roleMeta = ROLE_META[r.role] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                    const cleanMeta = CLEANLINESS_META[r.area_cleanliness] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                    return (
                      <div key={r.id} className="p-4 space-y-2.5 rounded-xl border border-transparent mx-2 my-1 hover:border-blue-100 hover:bg-slate-50 transition cursor-pointer">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{r.pic_name}</p>
                            <p className="text-xs text-slate-500">{fmtDate(r.report_date)} · {r.area_name || "-"}</p>
                          </div>
                          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shrink-0", roleMeta.cls)}>
                            {r.role}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cleanMeta.cls)}>
                            {r.area_cleanliness}
                          </span>
                          {r.is_late ? (
                            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Terlambat</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Tepat</span>
                          )}
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                            Hadir: {r.present_count ?? "-"}
                          </span>
                        </div>
                        <DetailPanel record={r} />
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => { setEditData(r); setFormOpen(true); }}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition">
                            <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => setDeleteTarget(r)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition">
                            <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {from}–{to} dari {pagination.total.toLocaleString("id-ID")} data
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronLeft className="h-4 w-4" />
                  </button>
                  {pages.map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button key={p} onClick={() => handlePage(p)}
                        className={cn(
                          "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          p === pagination.page
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          showToast(editData ? "Laporan diperbarui" : "Laporan ditambahkan");
          fetchData(pagination.page);
        }}
        editData={editData}
        areas={areas}
        employees={employees}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
        loading={deleting}
      />
    </>
  );
}