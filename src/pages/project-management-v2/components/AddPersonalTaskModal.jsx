import { useState, useEffect, useRef } from "react";
import { api, apiUpload } from "../../../lib/api";
import {
  HiOutlineXMark,
  HiOutlineCheck,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineBuildingOffice,
  HiOutlineCalendarDays,
  HiOutlineUserPlus,
  HiOutlineLink,
  HiOutlineDocument,
  HiOutlineListBullet
} from "react-icons/hi2";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/* ── EVIDENCE FILE INPUT COMPONENT ── */
function EvidenceFileInput({ value, fileName, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiUpload("/personal-tasklist/upload-evidence", { method: "POST", body: fd });
      onUploaded(res.evidence_value, res.file_name || file.name);
    } catch (err) {
      console.error("Upload evidence failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input ref={fileRef} type="file" className="hidden" onChange={handlePick} />
      {value ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2.5 py-1 border border-emerald-100 truncate max-w-[180px]">
            <HiOutlineDocument className="h-3.5 w-3.5 shrink-0" /> {fileName || "File Terunggah"}
          </span>
          <button onClick={() => fileRef.current?.click()} className="text-[10px] font-bold text-indigo-650 hover:underline shrink-0">
            Ganti
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition"
        >
          {uploading ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-650 border-t-transparent" />
          ) : (
            <><HiOutlineDocument className="h-3.5 w-3.5" /> Pilih file</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── MAIN MODAL COMPONENT ── */
export default function AddPersonalTaskModal({ editingList, onClose, onSaved }) {
  const [title, setTitle] = useState(editingList?.title || "");
  const [description, setDescription] = useState(editingList?.description || "");
  const [companyId, setCompanyId] = useState(editingList?.company_id || "");
  const [dueDate, setDueDate] = useState(editingList?.due_date ? editingList.due_date.slice(0, 10) : "");
  const [items, setItems] = useState(
    editingList?.items?.map((i) => ({ ...i })) || [{ content: "", is_checked: false, evidence_type: "none", evidence_value: "" }]
  );
  const [assignees, setAssignees] = useState(editingList?.assignees?.map((a) => a.employee_id) || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [modalCompanies, setModalCompanies] = useState([]);
  const [empQuery, setEmpQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [assigneeNames, setAssigneeNames] = useState(
    editingList?.assignees?.reduce((m, a) => ({ ...m, [a.employee_id]: a.full_name }), {}) || {}
  );
  const empWrapperRef = useRef(null);

  useEffect(() => {
    // Load companies
    api("/personal-tasklist/companies")
      .then((data) => setModalCompanies(data))
      .catch(() => {});

    // Load employees
    setEmpLoading(true);
    api("/personal-tasklist/employees?q=")
      .then((data) => setAllEmployees(data))
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (empWrapperRef.current && !empWrapperRef.current.contains(e.target)) {
        setEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredEmployees = allEmployees.filter((emp) => {
    if (!empQuery.trim()) return true;
    return emp.full_name.toLowerCase().includes(empQuery.toLowerCase());
  });

  const toggleAssignee = (emp) => {
    if (assignees.includes(emp.employee_id)) {
      setAssignees((prev) => prev.filter((a) => a !== emp.employee_id));
    } else {
      setAssignees((prev) => [...prev, emp.employee_id]);
      setAssigneeNames((prev) => ({ ...prev, [emp.employee_id]: emp.full_name }));
    }
  };

  const removeAssignee = (id) => setAssignees((prev) => prev.filter((a) => a !== id));
  const addItem = () => setItems((prev) => [...prev, { content: "", is_checked: false, evidence_type: "none", evidence_value: "" }]);
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx, key, val) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Nama checklist wajib diisi";
    if (items.filter((it) => it.content.trim()).length === 0) e.items = "Minimal 1 item tugas wajib diisi";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const cleanItems = items
        .filter((it) => it.content.trim())
        .map((it) => ({
          content: it.content.trim(),
          is_checked: it.is_checked ? 1 : 0,
          evidence_type: it.evidence_type || "none",
          evidence_value: it.evidence_value?.trim() || null,
        }));
      const body = { title: title.trim(), description: description.trim() || null, company_id: companyId || null, due_date: dueDate || null, items: cleanItems, assignees };
      if (editingList) {
        await api(`/personal-tasklist/${editingList.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/personal-tasklist", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
    } catch (err) {
      setErrors({ save: err.message });
    } finally {
      setSaving(false);
    }
  };

  const labelCls = "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-450";
  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Container */}
      <div className="relative z-10 w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all scale-100" style={{ maxHeight: "88vh" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-650 shadow-inner">
              <HiOutlineListBullet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-850">
                {editingList ? "Perbarui Checklist" : "Buat Checklist Baru"}
              </h2>
              <p className="text-[10px] text-slate-400">Atur deskripsi, delegasi, dan tenggat waktu tugas</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section 1: Detail Checklist */}
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/30 p-4">
            <div>
              <label className={labelCls}>
                <HiOutlineDocumentText className="h-4.5 w-4.5 text-indigo-500" /> Nama Checklist <span className="text-rose-500">*</span>
              </label>
              <input className={cn(inputCls, "mt-2")} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tulis judul checklist..." />
              {errors.title && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.title}</p>}
            </div>

            <div>
              <label className={labelCls}>Deskripsi Detail</label>
              <textarea className={cn(inputCls, "mt-2 resize-none")} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tulis keterangan atau catatan tambahan..." />
            </div>
          </div>

          {/* Section 2: Delegasi & Tenggat */}
          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/30 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  <HiOutlineBuildingOffice className="h-4.5 w-4.5 text-indigo-500" /> Unit Bisnis / Perusahaan
                </label>
                <select className={cn(inputCls, "mt-2")} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                  <option value="">-- Pilih Perusahaan --</option>
                  {modalCompanies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>
                  <HiOutlineCalendarDays className="h-4.5 w-4.5 text-indigo-500" /> Tanggal Tenggat
                </label>
                <input type="date" className={cn(inputCls, "mt-2")} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                <HiOutlineUserPlus className="h-4.5 w-4.5 text-indigo-500" /> Delegasikan ke Anggota Tim
              </label>
              <div className="relative mt-2" ref={empWrapperRef}>
                <input
                  className={inputCls}
                  value={empQuery}
                  onChange={(e) => setEmpQuery(e.target.value)}
                  onFocus={() => setEmpDropdownOpen(true)}
                  placeholder="Ketik nama untuk mencari anggota..."
                />
                {empDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-50">
                    {empLoading ? (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">Memuat data karyawan...</div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-slate-400 text-center">Anggota tidak ditemukan</div>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = assignees.includes(emp.employee_id);
                        return (
                          <button
                            key={emp.employee_id}
                            type="button"
                            onClick={() => toggleAssignee(emp)}
                            className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between ${isSelected ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}
                          >
                            <div className="min-w-0">
                              <span className={`font-bold block ${isSelected ? "text-indigo-600" : "text-slate-700"}`}>{emp.full_name}</span>
                              <span className="text-[9.5px] text-slate-400 font-medium">{emp.employee_code}</span>
                            </div>
                            {isSelected && <HiOutlineCheck className="h-4 w-4 text-emerald-500 stroke-[3.5]" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {assignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {assignees.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-bold rounded-full pl-3 pr-1.5 py-1 border border-indigo-100">
                      {assigneeNames[id] || `ID ${id}`}
                      <button type="button" onClick={() => removeAssignee(id)} className="p-0.5 rounded-full hover:bg-indigo-250 transition-colors">
                        <HiOutlineXMark className="h-3.5 w-3.5 stroke-[2]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Item Checklists */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Item Tugas / Checklist <span className="text-rose-500">*</span></label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-indigo-650 hover:text-indigo-850 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-indigo-100 transition-colors"
              >
                <HiOutlinePlus className="h-4.5 w-4.5 stroke-[2.5]" /> Tambah Item
              </button>
            </div>
            {errors.items && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.items}</p>}

            <div className="space-y-3 mt-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5 hover:border-slate-300/80 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateItem(idx, "is_checked", !item.is_checked)}
                      className={cn(
                        "shrink-0 h-5 w-5 rounded-md border flex items-center justify-center transition bg-white",
                        item.is_checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-400"
                      )}
                    >
                      {Boolean(item.is_checked) && <HiOutlineCheck className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>
                    <input
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-850 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={item.content}
                      onChange={(e) => updateItem(idx, "content", e.target.value)}
                      placeholder={`Tulis rincian tugas ${idx + 1}...`}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="shrink-0 p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <HiOutlineTrash className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pl-8">
                    <select
                      className="text-xs rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={item.evidence_type}
                      onChange={(e) => {
                        updateItem(idx, "evidence_type", e.target.value);
                        updateItem(idx, "evidence_value", "");
                        updateItem(idx, "_fileName", "");
                      }}
                    >
                      <option value="none">Tanpa Bukti</option>
                      <option value="link">Tautan Link</option>
                      <option value="file">Upload File Bukti</option>
                    </select>

                    {item.evidence_type === "link" && (
                      <input
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={item.evidence_value || ""}
                        onChange={(e) => updateItem(idx, "evidence_value", e.target.value)}
                        placeholder="https://..."
                      />
                    )}
                    {item.evidence_type === "file" && (
                      <EvidenceFileInput
                        value={item.evidence_value}
                        fileName={item._fileName}
                        onUploaded={(path, name) => { updateItem(idx, "evidence_value", path); updateItem(idx, "_fileName", name); }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errors.save && <p className="text-xs text-rose-500 font-semibold">{errors.save}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 shrink-0 bg-slate-50/20">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-md shadow-indigo-650/25"
          >
            {saving ? "Menyimpan..." : editingList ? "Simpan Perubahan" : "Buat Checklist"}
          </button>
        </div>
      </div>
    </div>
  );
}
