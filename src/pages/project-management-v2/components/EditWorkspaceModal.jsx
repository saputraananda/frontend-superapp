import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import { HiOutlineXMark, HiOutlinePencilSquare } from "react-icons/hi2";

export default function EditWorkspaceModal({ open, onClose, onSuccess, workspace }) {
  const [form, setForm] = useState({ title: "", desc: "", company_ids: [] });
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    if (open && workspace) {
      let initialCompanyIds = [];
      let initialIsPublic = true;
      if (workspace.company_id) {
        initialCompanyIds = String(workspace.company_id).split(",").map(Number).filter(Boolean);
        initialIsPublic = initialCompanyIds.length === 0;
      }

      setForm({
        title: workspace.title || "",
        desc: workspace.desc || "",
        company_ids: initialCompanyIds,
      });
      setIsPublic(initialIsPublic);
      setError("");

      // Fetch active companies
      const loadCompanies = async () => {
        try {
          const data = await api("/api/pm2/companies");
          setCompanies(data?.data || []);
        } catch (err) {
          console.error("Gagal memuat daftar perusahaan:", err);
        }
      };
      loadCompanies();
    }
  }, [open, workspace]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Nama workspace wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(`/api/pm2/workspaces/${workspace.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title,
          desc: form.desc,
          company_ids: isPublic ? null : form.company_ids,
        }),
      });
      window.dispatchEvent(new Event("pm2_workspaces_updated"));
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Gagal mengedit workspace");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !workspace) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <HiOutlinePencilSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800">Edit Workspace</h2>
            <p className="text-[11px] text-slate-400">Perbarui nama atau deskripsi workspace</p>
          </div>
          <button
            type="button"
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

          <div>
            <label className="block mb-1.5 text-xs font-bold text-slate-700">
              Visibilitas Perusahaan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5 max-h-36 overflow-y-auto">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => {
                    setIsPublic(e.target.checked);
                    if (e.target.checked) {
                      setForm((f) => ({ ...f, company_ids: [] }));
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">Semua Perusahaan (Publik)</span>
              </label>

              {!isPublic && (
                <div className="border-t border-slate-200/60 pt-2.5 grid grid-cols-1 gap-2">
                  {companies.map((c) => {
                    const isChecked = form.company_ids.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setForm((f) => ({ ...f, company_ids: [...f.company_ids, c.id] }));
                            } else {
                              setForm((f) => ({ ...f, company_ids: f.company_ids.filter((id) => id !== c.id) }));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="text-xs text-slate-600">{c.company_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition active:scale-95 shadow-md shadow-indigo-600/20"
            >
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
