import { useState, useEffect, useRef, useCallback } from "react";
import { api, apiUpload } from "../../../lib/api";
import RichTextEditor from "../../../components/RichTextEditor";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const fileIcon = (type = "") => {
  if (type.startsWith("image/")) return "🖼️";
  if (type === "application/pdf") return "📄";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  if (type.includes("word")) return "📝";
  return "📎";
};

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Multi-Select Picker ─────────────────────────────────────────────────────
function MultiSelectPicker({ options, selectedIds, onToggle, idKey, nameKey, badgeClass, emptyLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) =>
    String(o[nameKey]).toLowerCase().includes(search.toLowerCase())
  );
  const selectedItems = options.filter((o) => selectedIds.includes(o[idKey]));

  return (
    <div ref={wrapRef} className="relative">
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selectedItems.map((item) => (
            <span
              key={item[idKey]}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${badgeClass}`}
            >
              {item[nameKey]}
              <button
                type="button"
                onClick={() => onToggle(item[idKey])}
                className="opacity-60 hover:opacity-100 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-500 hover:border-blue-400 transition bg-white"
      >
        <span>{selectedIds.length === 0 ? emptyLabel : `${selectedIds.length} dipilih`}</span>
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari..."
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-3">Tidak ada hasil</p>
            ) : (
              filtered.map((opt) => (
                <label
                  key={opt[idKey]}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(opt[idKey])}
                    onChange={() => onToggle(opt[idKey])}
                    className="accent-blue-600 flex-shrink-0"
                  />
                  <span className="text-xs text-slate-700 truncate">{opt[nameKey]}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DailyTaskModal({ mode = "create", task = null, onClose, onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies]     = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle]             = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  // Visibility mode: "public" | "private" | "target"
  const initVisibility = () => {
    if (!task) return "public";
    const hasTargets =
      (Array.isArray(task.target_company_ids)    && task.target_company_ids.length > 0) ||
      (Array.isArray(task.target_department_ids) && task.target_department_ids.length > 0) ||
      (Array.isArray(task.target_employee_ids)   && task.target_employee_ids.length > 0);
    if (hasTargets) return "target";
    return task.is_public !== 0 ? "public" : "private";
  };
  const [visibilityMode, setVisibilityMode] = useState(initVisibility);

  // Target audience state
  const initIds = (arr) => (Array.isArray(arr) ? arr.map(Number) : []);
  const [targetCompanyIds, setTargetCompanyIds]   = useState(() => initIds(task?.target_company_ids));
  const [targetDeptIds, setTargetDeptIds]         = useState(() => initIds(task?.target_department_ids));
  const [targetEmployeeIds, setTargetEmployeeIds] = useState(() => initIds(task?.target_employee_ids));

  const toggleId = (setter) => (id) =>
    setter((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  // Multiple links state
  const initLinks = () =>
    task?.links?.length > 0
      ? task.links.map((l) => ({ url: l.url, label: l.label || "" }))
      : [{ url: "", label: "" }];
  const [links, setLinks] = useState(initLinks);

  // Evidence state
  const [existingEvidences, setExistingEvidences] = useState(task?.evidences || []);
  const [deletedEvidenceIds, setDeletedEvidenceIds] = useState([]);
  const [newFiles, setNewFiles]           = useState([]);
  const [newFilePreviews, setNewFilePreviews] = useState([]);

  const fileInputRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, c, e] = await Promise.all([
          api("/daily-tasks/departments"),
          api("/daily-tasks/companies"),
          api("/daily-tasks/employees"),
        ]);
        setDepartments(d.departments || []);
        setCompanies(c.companies || []);
        setEmployees(e.employees || []);
      } catch {
        // non-fatal
      }
    };
    load();
  }, []);

  // ─── Links helpers ───────────────────────────────────────────────────────
  const addLink = () => setLinks((prev) => [...prev, { url: "", label: "" }]);

  const removeLink = (idx) => setLinks((prev) => prev.filter((_, i) => i !== idx));

  const updateLink = (idx, field, value) =>
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  // ─── File helpers ─────────────────────────────────────────────────────────
  const handleFilePick = useCallback((e) => {
    const picked = Array.from(e.target.files || []);
    if (picked.length === 0) return;
    const previews = picked.map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setNewFiles((prev) => [...prev, ...picked]);
    setNewFilePreviews((prev) => [...prev, ...previews]);
    e.target.value = "";
  }, []);

  const removeNewFile = useCallback((idx) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewFilePreviews((prev) => {
      const copy = [...prev];
      if (copy[idx]?.url) URL.revokeObjectURL(copy[idx].url);
      copy.splice(idx, 1);
      return copy;
    });
  }, []);

  const removeExistingEvidence = useCallback((evId) => {
    setDeletedEvidenceIds((prev) => [...prev, evId]);
    setExistingEvidences((prev) => prev.filter((e) => e.id !== evId));
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Judul wajib diisi."); return; }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description || "");
      formData.append("is_public", visibilityMode === "private" ? "0" : "1");

      // Target audience — hanya dikirim jika mode "target"
      const isTarget = visibilityMode === "target";
      formData.append("target_company_ids",    JSON.stringify(isTarget ? targetCompanyIds : []));
      formData.append("target_department_ids", JSON.stringify(isTarget ? targetDeptIds : []));
      formData.append("target_employee_ids",   JSON.stringify(isTarget ? targetEmployeeIds : []));

      const validLinks = links.filter((l) => l.url.trim());
      formData.append("links", JSON.stringify(validLinks));

      if (deletedEvidenceIds.length > 0) {
        formData.append("deleted_evidence_ids", JSON.stringify(deletedEvidenceIds));
      }
      newFiles.forEach((f) => formData.append("evidences", f));

      let result;
      if (mode === "create") {
        result = await apiUpload("/daily-tasks", { method: "POST", body: formData });
      } else {
        result = await apiUpload(`/daily-tasks/${task.id}`, { method: "PUT", body: formData });
      }

      onSaved(result.task, mode);
      onClose();
    } catch (err) {
      setError(err?.message || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setLoading(true);
    try {
      await api(`/daily-tasks/${task.id}`, { method: "DELETE" });
      onSaved(task, "delete");
      onClose();
    } catch (err) {
      setError(err?.message || "Gagal menghapus task.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {mode === "create" ? "Tambah Notulensi" : "Edit Notulensi"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Catat hasil rapat, laporan harian, atau agenda penting
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

            {/* ─── Kolom Kiri ─── */}
            <div className="space-y-5 min-w-0">
              {/* Judul */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Notulensi Rapat Mingguan Tim Ops"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Deskripsi / Notulensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notulensi / Catatan
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Tulis notulensi rapat, poin-poin penting, atau catatan harian..."
                />
              </div>

              {/* Multiple Links */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Link <span className="text-slate-400">(opsional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 transition"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Link
                  </button>
                </div>
                <div className="space-y-2">
                  {links.map((link, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateLink(idx, "url", e.target.value)}
                          placeholder="https://docs.google.com/..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateLink(idx, "label", e.target.value)}
                          placeholder="Label (opsional, misal: Notulensi Google Docs)"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50"
                        />
                      </div>
                      {links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="mt-1.5 text-red-400 hover:text-red-600 p-1 rounded flex-shrink-0 transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Evidence / Lampiran
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition group"
                >
                  <div className="text-2xl mb-1">📎</div>
                  <p className="text-xs text-slate-500 group-hover:text-blue-600">
                    Klik untuk upload file (gambar, PDF, dokumen, dll)
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Maks. 20 MB per file, bisa lebih dari 1</p>
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilePick} />

                {existingEvidences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-slate-500 font-medium">File saat ini:</p>
                    {existingEvidences.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        {ev.file_type?.startsWith("image/") ? (
                          <img src={`${BASE_URL}/assets/${ev.file_path}`} alt={ev.file_name} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <span className="text-lg">{fileIcon(ev.file_type)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{ev.file_name}</p>
                          <p className="text-[10px] text-slate-400">{formatBytes(ev.file_size)}</p>
                        </div>
                        <a href={`${BASE_URL}/assets/${ev.file_path}`} target="_blank" rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-[10px]">
                          Lihat
                        </a>
                        <button type="button" onClick={() => removeExistingEvidence(ev.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newFilePreviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-slate-500 font-medium">File baru:</p>
                    {newFilePreviews.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                        {f.url ? (
                          <img src={f.url} alt={f.name} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <span className="text-lg">{fileIcon(f.type)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{formatBytes(f.size)}</p>
                        </div>
                        <button type="button" onClick={() => removeNewFile(idx)}
                          className="text-red-400 hover:text-red-600 p-1 rounded">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Kolom Kanan ─── */}
            <div className="space-y-5">
              {/* Visibilitas */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Visibilitas
                </label>
                <div className="space-y-2">
                  {/* Public */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${visibilityMode === "public" ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}>
                    <input type="radio" name="visibility" checked={visibilityMode === "public"} onChange={() => setVisibilityMode("public")} className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">🌐 Public</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Dapat dilihat oleh semua karyawan. Cocok untuk agenda tim, pengumuman, atau laporan bersama.
                      </p>
                    </div>
                  </label>

                  {/* Private */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${visibilityMode === "private" ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-red-300"}`}>
                    <input type="radio" name="visibility" checked={visibilityMode === "private"} onChange={() => setVisibilityMode("private")} className="mt-0.5 accent-red-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">🔒 Private</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Hanya Anda yang dapat melihat. Cocok untuk catatan pribadi atau draft yang belum selesai.
                      </p>
                    </div>
                  </label>

                  {/* Target Audience */}
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${visibilityMode === "target" ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-amber-300"}`}>
                    <input type="radio" name="visibility" checked={visibilityMode === "target"} onChange={() => setVisibilityMode("target")} className="mt-0.5 accent-amber-600" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">🎯 Target Audience</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Hanya orang-orang tertentu yang dapat melihat. Pilih perusahaan, departemen, atau karyawan.
                      </p>
                    </div>
                  </label>

                  {/* Pickers — tampil hanya saat mode "target" */}
                  {visibilityMode === "target" && (
                    <div className="ml-1 pl-3 border-l-2 border-amber-200 space-y-3 pt-1">
                      {/* Perusahaan */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">🏢 Perusahaan</label>
                        <MultiSelectPicker
                          options={companies}
                          selectedIds={targetCompanyIds}
                          onToggle={toggleId(setTargetCompanyIds)}
                          idKey="company_id"
                          nameKey="company_name"
                          badgeClass="bg-blue-100 text-blue-700"
                          emptyLabel="— Semua Perusahaan —"
                        />
                      </div>
                      {/* Departemen */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">🏬 Departemen</label>
                        <MultiSelectPicker
                          options={departments}
                          selectedIds={targetDeptIds}
                          onToggle={toggleId(setTargetDeptIds)}
                          idKey="department_id"
                          nameKey="department_name"
                          badgeClass="bg-violet-100 text-violet-700"
                          emptyLabel="— Semua Departemen —"
                        />
                      </div>
                      {/* Karyawan */}
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">👤 Karyawan</label>
                        <MultiSelectPicker
                          options={employees}
                          selectedIds={targetEmployeeIds}
                          onToggle={toggleId(setTargetEmployeeIds)}
                          idKey="employee_id"
                          nameKey="full_name"
                          badgeClass="bg-amber-100 text-amber-700"
                          emptyLabel="— Semua Karyawan —"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Maks. 100 karyawan ditampilkan</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Info creator - read only jika edit */}
              {mode === "edit" && task?.creator_name && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-semibold mb-1">Dibuat Oleh</p>
                  <p className="text-xs text-slate-700 font-medium">{task.creator_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(task.created_at).toLocaleString("id-ID", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {/* Tips */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[10px] font-semibold text-amber-700 mb-1">💡 Tips</p>
                <ul className="text-[10px] text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Isi deskripsi dengan detail untuk notulensi rapat</li>
                  <li>Lampirkan foto, PDF, atau dokumen pendukung</li>
                  <li>Tempel beberapa link dokumen sekaligus</li>
                  <li>Pilih Private jika catatan bersifat personal</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
            <div>
              {mode === "edit" && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                >
                  Hapus
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-60 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {mode === "create" ? "Simpan" : "Update"}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirm Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Hapus Notulensi?</h3>
              <p className="text-xs text-slate-500 mb-4">
                <strong>"{task?.title}"</strong> akan dihapus secara permanen.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}