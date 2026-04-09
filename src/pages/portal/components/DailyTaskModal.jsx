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

export default function DailyTaskModal({ mode = "create", task = null, onClose, onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [title, setTitle]             = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [departmentId, setDepartmentId] = useState(task?.department_id || "");
  const [isPublic, setIsPublic]       = useState(task?.is_public !== 0); // default: public

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
    const loadDepts = async () => {
      try {
        const d = await api("/daily-tasks/departments");
        setDepartments(d.departments || []);
      } catch {
        setDepartments([]);
      }
    };
    loadDepts();
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
      formData.append("department_id", departmentId || "");
      formData.append("is_public", isPublic ? "1" : "0");

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
              {/* Departemen */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Departemen <span className="text-slate-400">(opsional)</span>
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="">— Pilih Departemen —</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibilitas (Private / Public) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Visibilitas
                </label>
                <div className="space-y-2">
                  {/* Public */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      isPublic
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">🌐 Public</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Notulensi ini dapat dilihat oleh semua karyawan.
                        Cocok untuk agenda tim, pengumuman, atau laporan bersama.
                      </p>
                    </div>
                  </label>

                  {/* Private */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      !isPublic
                        ? "border-violet-400 bg-violet-50"
                        : "border-slate-200 hover:border-violet-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">🔒 Private</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Hanya Anda yang dapat melihat notulensi ini.
                        Cocok untuk catatan pribadi atau draft yang belum selesai.
                      </p>
                    </div>
                  </label>
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