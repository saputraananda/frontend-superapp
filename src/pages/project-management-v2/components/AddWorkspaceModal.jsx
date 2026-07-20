import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import { HiOutlineXMark, HiOutlineFolderPlus } from "react-icons/hi2";

export default function AddWorkspaceModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: "", desc: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ title: "", desc: "" });
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Nama workspace wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api("/api/pm2/workspaces", {
        method: "POST",
        body: JSON.stringify({ title: form.title, desc: form.desc }),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal membuat workspace");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-black/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiOutlineFolderPlus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800">Buat Workspace Baru</h2>
            <p className="text-[11px] text-slate-400">Buat Workspace / Unit Bisnis  &amp;</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-medium text-rose-600">
              {error}
            </div>
          )}

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Nama Workspace <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Contoh: Alora Group Indonesia"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition placeholder:text-slate-300"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Deskripsi <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              placeholder="Jelaskan tujuan workspace ini..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition resize-none placeholder:text-slate-300"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {loading ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
              ) : (
                <HiOutlineFolderPlus className="h-3.5 w-3.5" />
              )}
              {loading ? "Menyimpan..." : "Buat Workspace"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
