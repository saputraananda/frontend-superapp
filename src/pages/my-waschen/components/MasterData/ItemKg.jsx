import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";

const EMPTY_FORM = { id: null, name: "", sort_order: 0, is_active: 1 };
const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#5f1340]";

export default function ItemKg() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      const res = await api(`/waschen/item-kg?${query.toString()}`);
      setData(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useLiveRefresh(() => loadData(true));
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterActive]);

  const openForm = (item) => {
    setFormData(item ? { id: item.id, name: item.name, sort_order: item.sort_order, is_active: item.is_active } : EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return setFormError("Nama item wajib diisi");
    setSubmitting(true);
    setFormError("");
    try {
      await api(formData.id ? `/waschen/item-kg/${formData.id}` : "/waschen/item-kg", {
        method: formData.id ? "PUT" : "POST",
        body: JSON.stringify(formData),
      });
      showToast(formData.id ? "Item berhasil diperbarui" : "Item berhasil ditambahkan");
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api(`/waschen/item-kg/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Item berhasil dihapus");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"}`}>
          {toast.message}
        </div>
      )}

      <PageHero>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Item Kiloan</h1>
          <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
            Jenis pakaian untuk rincian QC kiloan oleh Tim Cuci
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95 cursor-pointer"
        >
          <HiOutlinePlus className="h-4 w-4" />
          <span>Tambah Item</span>
        </button>
      </PageHero>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 sm:p-5 bg-slate-50/50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari item"
              className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 py-2.5 text-sm outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            aria-label="Filter status"
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#5f1340] text-slate-700"
          >
            <option value="">Semua Status</option>
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm sm:text-[15px] border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs sm:text-[13px]">
              <tr>
                <th className="px-3 sm:px-5 py-3.5 font-bold uppercase tracking-wider w-14 sm:w-20 text-center">Urutan</th>
                <th className="px-3 sm:px-5 py-3.5 font-bold uppercase tracking-wider">Nama Item</th>
                <th className="px-3 sm:px-5 py-3.5 font-bold uppercase tracking-wider text-center">Status</th>
                <th className="px-3 sm:px-5 py-3.5 font-bold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-14 text-center text-slate-400">Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-14 text-center text-slate-400">Tidak ada data item kiloan</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 sm:px-5 py-4 text-center text-slate-500 font-semibold tabular-nums">{item.sort_order}</td>
                    <td className="px-3 sm:px-5 py-4 font-semibold text-slate-900">{item.name}</td>
                    <td className="px-3 sm:px-5 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs sm:text-[13px] font-semibold ${Number(item.is_active) === 1 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {Number(item.is_active) === 1 ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 sm:gap-2">
                        <button type="button" onClick={() => openForm(item)} title="Edit Item" aria-label={`Edit ${item.name}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                          <HiOutlinePencilSquare className="h-[18px] w-[18px]" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(item)} title="Hapus Item" aria-label={`Hapus ${item.name}`}
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition">
                          <HiOutlineTrash className="h-[18px] w-[18px]" />
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

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">{formData.id ? "Edit Item Kiloan" : "Tambah Item Kiloan"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Item *</label>
                <input type="text" maxLength={100} required placeholder="Misal: Kaos, Kemeja Panjang"
                  value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urutan Tampil</label>
                  <p className="text-xs text-slate-500 mb-1">Menentukan urutan item di QC Tim Cuci (kecil tampil duluan).</p>
                  <input type="number" min={0} max={9999}
                    value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className={inputCls}>
                    <option value={1}>Aktif</option>
                    <option value={0}>Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-50">
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Hapus Item Kiloan?</h3>
            <p className="text-sm text-slate-600">
              Hapus <strong>{deleteTarget.name}</strong>? Item yang sudah dipakai di QC tidak bisa dihapus, nonaktifkan saja.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50">
                {deleting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                <span>{deleting ? "Hapus..." : "Ya, Hapus"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
