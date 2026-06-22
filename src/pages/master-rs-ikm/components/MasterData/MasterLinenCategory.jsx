import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineMagnifyingGlass, HiOutlineXMark, HiOutlineClock,
  HiOutlineExclamationTriangle, HiOutlineCheckCircle,
  HiOutlineFolder,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }
const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:ring-2 focus:ring-red-500/30 focus:border-red-400 hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed";

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={cn("fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
      toast.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>
      {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.msg}
    </div>
  );
}

const EMPTY = { category_code: "", category_name: "", description: "", sort_order: 0 };

export default function MasterLinenCategory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [del, setDel] = useState(null);

  const showToast = useCallback((type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setData(await api("/ikm/master-data/categories") || []); }
    catch { showToast("error", "Gagal memuat data"); }
    finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEdit(null); setForm(EMPTY); setModal(true); };
  const openEdit = (r) => { setEdit(r); setForm({ category_code: r.category_code, category_name: r.category_name, description: r.description || "", sort_order: r.sort_order ?? 0 }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category_code || !form.category_name) { showToast("error", "Kode & nama wajib diisi"); return; }
    setSaving(true);
    try {
      if (edit) { await api(`/ikm/master-data/categories/${edit.id}`, { method: "PUT", body: JSON.stringify(form) }); showToast("success", "Kategori diperbarui"); }
      else { await api("/ikm/master-data/categories", { method: "POST", body: JSON.stringify(form) }); showToast("success", "Kategori ditambahkan"); }
      setModal(false); setEdit(null); fetchData();
    } catch (err) { showToast("error", err?.message || "Gagal"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!del) return;
    try { await api(`/ikm/master-data/categories/${del.id}`, { method: "DELETE" }); showToast("success", "Kategori dihapus"); setDel(null); fetchData(); }
    catch (err) { showToast("error", err?.message || "Gagal"); }
  };

  const filtered = data.filter(r =>
    (r.category_code + " " + r.category_name + " " + (r.description || "")).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 pb-14">
      <Toast toast={toast} />

      {del && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" onClick={() => setDel(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4"><HiOutlineTrash className="h-6 w-6" /></div>
            <h3 className="text-base font-bold text-slate-800">Hapus Kategori</h3>
            <p className="mt-1 text-sm text-slate-500 mb-5">Hapus kategori <span className="font-semibold">{del.category_name}</span>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDel(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-800 to-orange-500 shadow-sm">
            <HiOutlineFolder className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Master Kategori Linen</h1>
            <p className="text-xs text-slate-400 mt-0.5">{data.length} kategori terdaftar</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95">
          <HiOutlinePlus className="h-4 w-4" /> Tambah Kategori
        </button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari kategori..." className={cn(inputCls, "pl-10")} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-400"><HiOutlineClock className="h-5 w-5 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400"><HiOutlineFolder className="h-10 w-10" /><p className="text-sm">Belum ada kategori</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {["No", "Kode", "Nama Kategori", "Deskripsi", "Urutan", "Aksi"].map((h, i) => (
                    <th key={h} className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider", i === 5 ? "text-center" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-4 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-mono font-semibold">{r.category_code}</span></td>
                    <td className="px-4 py-4 font-semibold text-slate-800">{r.category_name}</td>
                    <td className="px-4 py-4 text-slate-500 text-xs max-w-[300px] truncate">{r.description || <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-4 text-slate-600">{r.sort_order}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(r)} className="flex items-center justify-center h-8 w-8 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                        <button onClick={() => setDel(r)} className="flex items-center justify-center h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"><HiOutlineTrash className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setModal(false); setEdit(null); }} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-bold text-slate-800">{edit ? "Edit Kategori" : "Tambah Kategori"}</h2>
              <button onClick={() => { setModal(false); setEdit(null); }} className="p-1.5 rounded-lg hover:bg-slate-100"><HiOutlineXMark className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Kode <span className="text-rose-500">*</span></label><input className={inputCls} placeholder="CAT01" value={form.category_code} onChange={e => setForm({ ...form, category_code: e.target.value.toUpperCase() })} required /></div>
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Nama <span className="text-rose-500">*</span></label><input className={inputCls} placeholder="Baju OK" value={form.category_name} onChange={e => setForm({ ...form, category_name: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-semibold text-slate-600 mb-1">Urutan</label><input className={inputCls} type="number" min="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div><label className="block text-xs font-semibold text-slate-600 mb-1">Deskripsi</label><textarea className={inputCls} rows={2} placeholder="Opsional" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setModal(false); setEdit(null); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white">{saving ? "Menyimpan..." : edit ? "Simpan" : "Tambah"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
