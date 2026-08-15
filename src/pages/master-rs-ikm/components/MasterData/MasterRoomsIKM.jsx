import { useCallback, useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineMagnifyingGlass, HiOutlineXMark,
  HiOutlineExclamationTriangle, HiOutlineCheckCircle,
  HiOutlineBuildingOffice2
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

const EMPTY = { room_name: "" };

export default function MasterRoomsIKM() {
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
    try { 
      const res = await api("/ikm/master-rooms/rooms");
      setData(res || []); 
    }
    catch { showToast("error", "Gagal memuat data"); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAdd = () => { setEdit(null); setForm(EMPTY); setModal(true); };
  const openEdit = (r) => { setEdit(r); setForm({ room_name: r.room_name }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.room_name?.trim()) { showToast("error", "Nama ruangan wajib diisi"); return; }
    setSaving(true);
    try {
      if (edit) { 
        await api(`/ikm/master-rooms/rooms/${edit.id}`, { method: "PUT", body: JSON.stringify(form) }); 
        showToast("success", "Ruangan diperbarui"); 
      }
      else { 
        await api("/ikm/master-rooms/rooms", { method: "POST", body: JSON.stringify(form) }); 
        showToast("success", "Ruangan ditambahkan"); 
      }
      setModal(false); setEdit(null); fetchData();
    } catch (err) { showToast("error", err?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!del) return;
    try { 
      await api(`/ikm/master-rooms/rooms/${del.id}`, { method: "DELETE" }); 
      showToast("success", "Ruangan dihapus"); 
      setDel(null); 
      fetchData(); 
    }
    catch (err) { showToast("error", err?.message || "Gagal menghapus"); }
  };

  const filtered = data.filter(r =>
    (r.room_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 pb-14">
      <Toast toast={toast} />

      {del && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" onClick={() => setDel(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4"><HiOutlineTrash className="h-6 w-6" /></div>
            <h3 className="text-base font-bold text-slate-800">Hapus Ruangan IKM</h3>
            <p className="mt-1 text-sm text-slate-500 mb-5">Hapus ruangan <span className="font-semibold">{del.room_name}</span>?</p>
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
            <HiOutlineBuildingOffice2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Master Ruangan IKM</h1>
            <p className="text-xs text-slate-400 mt-0.5">{data.length} ruangan terdaftar</p>
          </div>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition active:scale-95 self-start sm:self-auto">
          <HiOutlinePlus className="h-4 w-4" /> Tambah Ruangan
        </button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari ruangan..." className={cn(inputCls, "pl-10")} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">Tidak ada ruangan ditemukan</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">No</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Ruangan</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 text-slate-400">{idx + 1}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{r.room_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(r)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-100 bg-violet-50 text-violet-600 hover:bg-violet-100 transition"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                      <button onClick={() => setDel(r)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" onClick={() => setModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <form onSubmit={handleSave} className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-800">{edit ? "Edit Ruangan" : "Tambah Ruangan"}</h3>
              <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Ruangan</label>
                <input type="text" className={inputCls} placeholder="Nama ruangan (cth: Gudang Bersih IKM)" value={form.room_name} onChange={e => setForm({ room_name: e.target.value })} required />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
