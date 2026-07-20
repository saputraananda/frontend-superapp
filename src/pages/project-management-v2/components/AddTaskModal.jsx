import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api, BASE_URL } from "../../../lib/api";
import RichTextEditor from "../../../components/RichTextEditor";
import {
  HiOutlineXMark,
  HiOutlinePlus,
  HiOutlineLink,
  HiOutlinePaperClip,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineMinus,
  HiOutlineDocumentArrowUp,
  HiOutlineXCircle,
  HiOutlineBriefcase,
} from "react-icons/hi2";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function cn(...c) { return c.filter(Boolean).join(" "); }

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", icon: HiOutlineExclamationTriangle, cls: "border-rose-400 bg-rose-50/50 text-rose-600", activeCls: "bg-rose-500 text-white border-rose-500 shadow-rose-200" },
  { value: "medium",   label: "Medium",   icon: HiOutlineMinus,                cls: "border-amber-400 bg-amber-50/50 text-amber-600", activeCls: "bg-amber-500 text-white border-amber-500 shadow-amber-200" },
  { value: "low",      label: "Low",      icon: HiOutlineCheckCircle,          cls: "border-emerald-400 bg-emerald-50/50 text-emerald-600", activeCls: "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200" },
];

// Capitalize each word helper
const capitalizeEachWord = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// ─── Searchable Employee Select ───────────────────────────────────────────────
function EmployeeSelect({ label, placeholder, value, onChange, employees, disabled, required, icon: Icon = HiOutlineUser }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? employees.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()))
    : employees;

  const selected = employees.find(e => String(e.id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5 text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <button type="button" onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          "w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition",
          disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-70" : "border-slate-200 bg-slate-50 hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
          open && "border-indigo-400 bg-white ring-2 ring-indigo-100"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
        <span className={cn("flex-1 truncate", selected ? "text-slate-800" : "text-slate-400 text-xs")}>
          {selected ? capitalizeEachWord(selected.full_name) : placeholder}
        </span>
        {selected && !disabled && (
          <span onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-slate-400 hover:text-rose-500 transition">
            <HiOutlineXMark className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada karyawan ditemukan</p>
            ) : (
              filtered.map(emp => (
                <button key={emp.id} type="button"
                  onClick={() => { onChange(emp.id); setOpen(false); setQuery(""); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 transition text-xs",
                    String(value) === String(emp.id) && "bg-indigo-50 text-indigo-700"
                  )}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{capitalizeEachWord(emp.full_name)}</p>
                    {emp.department_name && <p className="text-slate-400 text-[10px]">{emp.department_name}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Searchable Position Select ───────────────────────────────────────────────
function PositionSelect({ label, placeholder, value, onChange, positions, disabled, required, icon: Icon = HiOutlineBriefcase }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? positions.filter(p => p.position_name.toLowerCase().includes(query.toLowerCase()))
    : positions;

  const selected = positions.find(p => String(p.position_id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5 text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <button type="button" onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          "w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition",
          disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-70" : "border-slate-200 bg-slate-50 hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
          open && "border-indigo-400 bg-white ring-2 ring-indigo-100"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
        <span className={cn("flex-1 truncate", selected ? "text-slate-800" : "text-slate-400 text-xs")}>
          {selected ? selected.position_name : placeholder}
        </span>
        {selected && !disabled && (
          <span onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-slate-400 hover:text-rose-500 transition">
            <HiOutlineXMark className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari position..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada position ditemukan</p>
            ) : (
              filtered.map(pos => (
                <button key={pos.position_id} type="button"
                  onClick={() => { onChange(pos.position_id); setOpen(false); setQuery(""); }}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 transition text-xs",
                    String(value) === String(pos.position_id) && "bg-indigo-50 text-indigo-700"
                  )}>
                  <div>
                    <p className="font-semibold text-slate-800">{pos.position_name}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi Employee Select ────────────────────────────────────────────────────
function MultiEmployeeSelect({ label, placeholder, values = [], onChange, employees, icon: Icon = HiOutlineUserGroup }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? employees.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()))
    : employees;

  const selectedEmps = employees.filter(e => values.includes(String(e.id)));

  const toggle = (id) => {
    const sid = String(id);
    onChange(values.includes(sid) ? values.filter(v => v !== sid) : [...values, sid]);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1.5 text-xs font-bold text-slate-700">{label} <span className="text-slate-400 font-normal">(opsional)</span></label>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition min-h-[42px]",
          "border-slate-200 bg-slate-50 hover:border-indigo-300",
          open && "border-indigo-400 bg-white ring-2 ring-indigo-100"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        {selectedEmps.length === 0 ? (
          <span className="text-slate-400 text-xs">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedEmps.map(emp => (
              <span key={emp.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                {capitalizeEachWord(emp.full_name.split(" ")[0])}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(emp.id); }} className="hover:text-rose-500 transition">
                  <HiOutlineXMark className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada karyawan</p>
            ) : (
              filtered.map(emp => {
                const checked = values.includes(String(emp.id));
                return (
                  <button key={emp.id} type="button" onClick={() => toggle(emp.id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-indigo-50 transition text-xs",
                      checked && "bg-indigo-50"
                    )}>
                    <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] transition",
                      checked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                    )}>
                      {checked && "✓"}
                    </div>
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                      {emp.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{capitalizeEachWord(emp.full_name)}</p>
                      {emp.department_name && <p className="text-slate-400 text-[10px]">{emp.department_name}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
export default function AddTaskModal({ open, onClose, onSuccess, subWorkspaceId }) {
  const [form, setForm] = useState({
    title: "",
    startdate: "",
    enddate: "",
    pic_employee_id: "",
    position_id: "",
    priority: "",
    attachment_type: "none", // 'none' | 'link' | 'file'
    link: "",
    link_title: "",
  });
  const [desc, setDesc] = useState(""); // Rich text editor value
  const [coPics, setCoPics] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [me, setMe] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm({ title: "", startdate: "", enddate: "", pic_employee_id: "", position_id: "", priority: "", attachment_type: "none", link: "", link_title: "" });
    setDesc("");
    setCoPics([]);
    setReviewers([]);
    setFile(null);
    setError("");

    // Fetch employees, positions & me
    Promise.all([
      api("/api/pm2/employees").then(d => setEmployees(d?.data || [])).catch(() => {}),
      api("/positions").then(d => setPositions(d?.positions || [])).catch(() => {}),
      api("/api/pm2/me").then(d => setMe(d)).catch(() => {}),
    ]);
  }, [open]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Judul task wajib diisi"); return; }
    if (!form.pic_employee_id) { setError("PIC wajib dipilih"); return; }
    if (!form.priority) { setError("Prioritas wajib dipilih"); return; }

    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        desc: desc === "<p></p>" ? "" : desc,
        startdate: form.startdate || null,
        enddate: form.enddate || null,
        pic_employee_id: form.pic_employee_id,
        position_id: form.position_id || null,
        priority: form.priority,
        link: form.attachment_type === "link" ? form.link : null,
        link_title: form.attachment_type === "link" ? form.link_title : null,
        co_pics: coPics,
        reviewers,
      };

      const result = await api(`/api/pm2/sub-workspaces/${subWorkspaceId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Upload file if any
      if (form.attachment_type === "file" && file && result?.id) {
        const fd = new FormData();
        fd.append("file", file);
        await fetch(`${BASE_URL}/api/pm2/tasks/${result.id}/evidence`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal membuat task");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiOutlinePlus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800">Tambah Task Baru</h2>
            <p className="text-[11px] text-slate-400">Lengkapi detail task dan tetapkan penanggung jawab</p>
          </div>
          <button onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          {/* Judul */}
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Judul Task <span className="text-rose-500">*</span>
            </label>
            <input type="text" autoFocus value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Masukkan judul task yang jelas dan spesifik..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-300 font-medium" />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">Deskripsi</label>
            <RichTextEditor
              value={desc}
              onChange={setDesc}
              placeholder="Jelaskan detail task, konteks, atau instruksi..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">Prioritas <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const active = form.priority === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => set("priority", opt.value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition shadow-sm",
                      active ? `${opt.activeCls} shadow-md` : `${opt.cls} hover:opacity-85`
                    )}>
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1.5 text-xs font-bold text-slate-700 flex items-center gap-1">
                <HiOutlineCalendarDays className="h-3.5 w-3.5" /> Tanggal Mulai
              </label>
              <input type="date" value={form.startdate} onChange={e => set("startdate", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-bold text-slate-700 flex items-center gap-1">
                <HiOutlineCalendarDays className="h-3.5 w-3.5" /> Tanggal Selesai
              </label>
              <input type="date" value={form.enddate} onChange={e => set("enddate", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
            </div>
          </div>

          {/* Owner */}
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Owner <span className="text-slate-400 font-normal text-[10px]">(otomatis dari akun Anda)</span>
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold shrink-0">
                {me?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <span className="text-sm font-semibold text-slate-700">{me?.full_name ? capitalizeEachWord(me.full_name) : "Memuat..."}</span>
              <span className="ml-auto text-[10px] text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">Owner</span>
            </div>
          </div>

          {/* Position */}
          <PositionSelect
            label="Position"
            placeholder="Pilih Position..."
            value={form.position_id}
            onChange={v => set("position_id", v)}
            positions={positions}
          />

          {/* PIC & Co-PIC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <EmployeeSelect
              label="PIC (Penanggung Jawab)"
              placeholder="Pilih PIC..."
              value={form.pic_employee_id}
              onChange={v => set("pic_employee_id", v)}
              employees={employees}
              required
              icon={HiOutlineUser}
            />
            <MultiEmployeeSelect
              label="Co-PIC"
              placeholder="Pilih Co-PIC..."
              values={coPics}
              onChange={setCoPics}
              employees={employees}
              icon={HiOutlineUserGroup}
            />
          </div>

          {/* Reviewer */}
          <MultiEmployeeSelect
            label="Reviewer (Pengawas / CC)"
            placeholder="Pilih reviewer..."
            values={reviewers}
            onChange={setReviewers}
            employees={employees}
            icon={HiOutlineUserGroup}
          />

          {/* Lampiran / Link */}
          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">Lampiran</label>

            {/* Toggle buttons */}
            <div className="flex gap-2 mb-3">
              {[
                { val: "none",  label: "Tidak Ada" },
                { val: "link",  label: "Link URL", icon: HiOutlineLink },
                { val: "file",  label: "Upload File", icon: HiOutlineDocumentArrowUp },
              ].map(opt => {
                const Icon = opt.icon;
                const active = form.attachment_type === opt.val;
                return (
                  <button key={opt.val} type="button"
                    onClick={() => set("attachment_type", opt.val)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition",
                      active
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                    )}>
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Link fields */}
            {form.attachment_type === "link" && (
              <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <label className="block mb-1 text-[11px] font-bold text-slate-600">Judul Link</label>
                  <input type="text" value={form.link_title} onChange={e => set("link_title", e.target.value)}
                    placeholder="Contoh: Dokumen Referensi, Dashboard Analytics..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition" />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-bold text-slate-600">URL Link *</label>
                  <div className="flex items-center gap-2">
                    <HiOutlineLink className="h-4 w-4 text-slate-400 shrink-0" />
                    <input type="url" value={form.link} onChange={e => set("link", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition" />
                  </div>
                </div>
              </div>
            )}

            {/* File upload */}
            {form.attachment_type === "file" && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shrink-0">
                      <HiOutlinePaperClip className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={() => { setFile(null); fileInputRef.current.value = ""; }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition">
                      <HiOutlineXCircle className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-4 text-slate-400 hover:text-indigo-500 transition">
                    <HiOutlineDocumentArrowUp className="h-8 w-8" />
                    <span className="text-xs font-semibold">Klik untuk memilih file</span>
                    <span className="text-[10px]">Semua tipe file, maks. 20 MB</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50/50 shrink-0">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60 shadow-sm shadow-indigo-600/20">
            {loading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
              : <HiOutlinePlus className="h-4 w-4" />
            }
            {loading ? "Menyimpan..." : "Buat Task"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
