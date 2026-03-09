import { useState, useEffect, useRef, useCallback } from "react";
import { api, apiUpload } from "../../../lib/api";
import RichTextEditor from "../../../components/RichTextEditor";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const RECUR_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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
  const [title, setTitle]               = useState(task?.title || "");
  const [description, setDescription]   = useState(task?.description || "");
  const [departmentId, setDepartmentId] = useState(task?.department_id || "");
  const [linkUrl, setLinkUrl]           = useState(task?.link_url || "");
  const [isRecurring, setIsRecurring]   = useState(task?.is_recurring ? true : false);
  const [recurType, setRecurType]       = useState(task?.recur_type || "weekly");
  const [recurDay, setRecurDay]         = useState(task?.recur_day ?? 6);

  // Evidence state
  const [existingEvidences, setExistingEvidences] = useState(task?.evidences || []);
  const [deletedEvidenceIds, setDeletedEvidenceIds] = useState([]);
  const [newFiles, setNewFiles]         = useState([]); // File objects
  const [newFilePreviews, setNewFilePreviews] = useState([]); // { name, size, type, url }

  const fileInputRef = useRef(null);

  // Confirm delete modal
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

  // Handle new file pick
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

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title wajib diisi."); return; }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title",        title.trim());
      formData.append("description",  description || "");
      formData.append("department_id",departmentId || "");
      formData.append("link_url",     linkUrl.trim() || "");
      formData.append("is_recurring", isRecurring ? "1" : "0");
      if (isRecurring) {
        formData.append("recur_type", recurType);
        if (recurType === "weekly") formData.append("recur_day", String(recurDay));
      }
      if (deletedEvidenceIds.length > 0) {
        formData.append("deleted_evidence_ids", JSON.stringify(deletedEvidenceIds));
      }
      newFiles.forEach((f) => formData.append("evidences", f));

      let result;
      if (mode === "create") {
        // ← Pakai apiUpload bukan api (FormData tidak boleh set Content-Type)
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

  // Delete task
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
              {mode === "create" ? "Tambah Report" : "Edit Report"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Report harian, rutin, atau dadakan yang perlu dicatat
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
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Judul Task <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Meeting Mingguan Tim Ops"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Description - Rich Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Deskripsi / Notulensi
                </label>
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Tulis deskripsi, notulensi meeting, atau catatan penting..."
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Link (opsional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Evidence / Lampiran
                </label>

                {/* Drop zone */}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFilePick}
                />

                {/* Existing evidences (edit mode) */}
                {existingEvidences.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-slate-500 font-medium">File saat ini:</p>
                    {existingEvidences.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                        {ev.file_type?.startsWith("image/") ? (
                          <img
                            src={`${BASE_URL}/assets/${ev.file_path}`}
                            alt={ev.file_name}
                            className="h-8 w-8 object-cover rounded"
                          />
                        ) : (
                          <span className="text-lg">{fileIcon(ev.file_type)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{ev.file_name}</p>
                          <p className="text-[10px] text-slate-400">{formatBytes(ev.file_size)}</p>
                        </div>
                        <a
                          href={`${BASE_URL}/assets/${ev.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 text-[10px]"
                        >
                          Lihat
                        </a>
                        <button
                          type="button"
                          onClick={() => removeExistingEvidence(ev.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New file previews */}
                {newFilePreviews.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] text-slate-500 font-medium">File baru:</p>
                    {newFilePreviews.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                        {f.url ? (
                          <img src={f.url} alt={f.name} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <span className="text-lg">{fileIcon(f.type)}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{formatBytes(f.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewFile(idx)}
                          className="text-red-400 hover:text-red-600 p-1 rounded"
                        >
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
              {/* Department */}
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

              {/* Recurring */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jenis Task
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecurring(false)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition
                      ${!isRecurring
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                  >
                    Sekali / Dadakan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(true)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition
                      ${isRecurring
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                      }`}
                  >
                    🔁 Berulang
                  </button>
                </div>

                {isRecurring && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-blue-700 mb-1">Frekuensi</label>
                      <select
                        value={recurType}
                        onChange={(e) => setRecurType(e.target.value)}
                        className="w-full px-2.5 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="daily">Setiap Hari</option>
                        <option value="weekly">Setiap Minggu</option>
                        <option value="monthly">Setiap Bulan</option>
                      </select>
                    </div>

                    {recurType === "weekly" && (
                      <div>
                        <label className="block text-[10px] font-semibold text-blue-700 mb-1">Hari</label>
                        <div className="grid grid-cols-4 gap-1">
                          {RECUR_DAYS.map((day, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setRecurDay(idx)}
                              className={`py-1.5 rounded text-[10px] font-medium border transition
                                ${recurDay === idx
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"
                                }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {/* Panduan */}
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[10px] font-semibold text-amber-700 mb-1">💡 Tips</p>
                <ul className="text-[10px] text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Isi deskripsi dengan detail untuk notulensi meeting</li>
                  <li>Lampirkan foto, PDF, atau dokumen pendukung</li>
                  <li>Tandai sebagai Berulang jika agenda rutin</li>
                  <li>Tempel link spreadsheet atau dokumen Google</li>
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
                  Hapus Task
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
                {mode === "create" ? "Simpan Task" : "Update Task"}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirm Dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4 text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">Hapus Task?</h3>
              <p className="text-xs text-slate-500 mb-4">
                Task <strong>"{task?.title}"</strong> akan dihapus secara permanen.
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