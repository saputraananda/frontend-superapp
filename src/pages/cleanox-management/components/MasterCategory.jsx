import { useEffect, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineTag,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MasterCategory() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null); // null means create, object means edit
  const [formName, setFormName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Confirm State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api("/master-categories");
      setCategories(res.categories || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data kategori");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Master Kategori Cleanox | Alora Group Indonesia";
    fetchCategories();
  }, []);

  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setFormName("");
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedCategory(item);
    setFormName(item.name);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError("Nama kategori wajib diisi!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setSubmitting(true);
      if (selectedCategory) {
        // Edit Mode
        await api(`/master-categories/${selectedCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim() }),
        });
        setSuccess("Kategori berhasil diperbarui");
      } else {
        // Create Mode
        await api("/master-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim() }),
        });
        setSuccess("Kategori berhasil dibuat");
      }
      setTimeout(() => setSuccess(""), 3000);
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      setError(err.message || "Gagal menyimpan data");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/master-categories/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Kategori berhasil dihapus");
      setTimeout(() => setSuccess(""), 3000);
      fetchCategories();
    } catch (err) {
      setError(err.message || "Gagal menghapus data");
      setTimeout(() => setError(""), 3000);
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
      {success && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-indigo-300/10 blur-3xl" />

          <div className="relative p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
                  <HiOutlineTag className="h-7 w-7 text-[#97bd3f]" />
                  Master Kategori Cleanox
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
                  Kelola kategori operasional pencucian, jemur, dan setrika untuk unit Cleanox.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Actions Bar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
                <HiOutlineMagnifyingGlass className="h-4 w-4 text-[#1b3459]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Pencarian Kategori</p>
                <p className="text-xs text-slate-500">Cari berdasarkan nama kategori</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#97bd3f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#86aa34] transition active:scale-[0.97]"
            >
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Tambah Kategori
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Masukkan nama kategori..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
              />
            </div>
          </div>
        </section>

        {/* Categories Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-800">Daftar Kategori ({filteredCategories.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-rose-500">
                <HiOutlineExclamationTriangle className="h-8 w-8" />
                <p>{error}</p>
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                <p>Belum ada data kategori.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">No</th>
                    <th className="px-6 py-3 text-left">Nama Kategori</th>
                    <th className="px-6 py-3 text-left">Tanggal Dibuat</th>
                    <th className="px-6 py-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCategories.map((item, idx) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition"
                            title="Edit"
                          >
                            <HiOutlinePencilSquare className="h-4.5 w-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(item);
                              setConfirmOpen(true);
                            }}
                            className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-600 transition"
                            title="Hapus"
                          >
                            <HiOutlineTrash className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Save Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-black text-slate-800">
                {selectedCategory ? "Edit Kategori" : "Tambah Kategori"}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold text-slate-600">
              {/* Nama Kategori */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Kategori</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Dry Clean, Kiloan, dll."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#97bd3f] py-2.5 text-xs font-bold text-white hover:bg-[#86aa34] transition disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${deleteTarget?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </main>
  );
}
