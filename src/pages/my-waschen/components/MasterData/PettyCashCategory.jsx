import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineWallet,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineChevronUp,
  HiOutlineChevronDown,
  HiOutlineArrowsUpDown,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === col;
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100", active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500", className)} onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5 text-[#5f1340]" /> : <HiOutlineChevronDown className="h-3.5 w-3.5 text-[#5f1340]" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}</div>
    </th>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", Number(isActive) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", Number(isActive) === 1 ? "bg-emerald-500" : "bg-slate-400")} />
      {Number(isActive) === 1 ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function FlowBadge({ flowType }) {
  const styles = {
    Masuk: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Keluar: "bg-rose-50 text-rose-700 border-rose-200",
    Both: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", styles[flowType] || styles.Keluar)}>{flowType}</span>;
}

const EMPTY_FORM = { id: null, code: "", name: "", label: "", flow_type: "Keluar", is_active: 1 };

export default function PettyCashCategory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterFlow, setFilterFlow] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => { setToast({ message, type }); setTimeout(() => setToast(null), 3500); };

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      if (filterFlow) query.set("flowType", filterFlow);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/petty-cash-categories?${query.toString()}`);
      setData(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, filterActive, filterFlow, sortBy, sortDir]);

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.label.trim()) { setFormError("Kode, Nama, dan Label wajib diisi"); return; }
    setSubmitting(true); setFormError("");
    try {
      if (formData.id) {
        await api(`/waschen/petty-cash-categories/${formData.id}`, { method: "PUT", body: JSON.stringify(formData) });
        showToast("Kategori petty cash berhasil diperbarui");
      } else {
        await api("/waschen/petty-cash-categories", { method: "POST", body: JSON.stringify(formData) });
        showToast("Kategori petty cash berhasil ditambahkan");
      }
      setModalOpen(false); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/petty-cash-categories/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Kategori petty cash berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stats = useMemo(() => ({ total: data.length, active: data.filter((d) => Number(d.is_active) === 1).length, keluar: data.filter((d) => d.flow_type === "Keluar").length }), [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>{toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}<span>{toast.message}</span></div>}

      {/* Hero Header */}
      <PageHero>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Kategori Petty Cash</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola kategori pengeluaran kas kecil outlet
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Kategori
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ l: "Total Kategori", v: stats.total }, { l: "Aktif", v: stats.active, c: "text-emerald-600" }, { l: "Tipe Keluar", v: stats.keluar }].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p><p className={cn("text-2xl font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
          </div>
          <select value={filterFlow} onChange={(e) => setFilterFlow(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Alur</option><option value="Masuk">Masuk</option><option value="Keluar">Keluar</option><option value="Both">Keduanya</option></select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="label" label="Label" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="flow_type" label="Alur" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 4 }).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">Tidak ada data kategori petty cash</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.code}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{item.label}</td>
                  <td className="px-4 py-3.5"><FlowBadge flowType={item.flow_type} /></td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => { setFormData({ ...item }); setFormError(""); setModalOpen(true); }} className="rounded-lg border border-slate-200 p-1.5 hover:border-amber-300 hover:bg-amber-50"><HiOutlinePencilSquare className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg border border-slate-200 p-1.5 hover:border-rose-300 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm text-slate-800">{formData.id ? "Edit Kategori" : "Tambah Kategori"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex gap-2"><HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />{formError}</div>}
              <div><label className="block font-semibold mb-1">Kode *</label><input type="text" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className="w-full rounded-xl border px-3 py-2 font-mono uppercase focus:border-[#5f1340] outline-none" required /></div>
              <div><label className="block font-semibold mb-1">Nama *</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border px-3 py-2 focus:border-[#5f1340] outline-none" required /></div>
              <div><label className="block font-semibold mb-1">Label Tampilan *</label><input type="text" value={formData.label} onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))} className="w-full rounded-xl border px-3 py-2 focus:border-[#5f1340] outline-none" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold mb-1">Alur Kas</label><select value={formData.flow_type} onChange={(e) => setFormData((p) => ({ ...p, flow_type: e.target.value }))} className="w-full rounded-xl border px-3 py-2 focus:border-[#5f1340] outline-none"><option value="Keluar">Keluar</option><option value="Masuk">Masuk</option><option value="Both">Keduanya</option></select></div>
                <div><label className="block font-semibold mb-1">Status</label><select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className="w-full rounded-xl border px-3 py-2 focus:border-[#5f1340] outline-none"><option value={1}>Aktif</option><option value={0}>Nonaktif</option></select></div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 font-semibold text-white disabled:opacity-50">{submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}Simpan</button>
              </div>
            </form>
          </div>
        </div>, document.body)}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 space-y-4 border">
            <h3 className="font-bold text-sm">Hapus {deleteTarget.name}?</h3>
            <p className="text-xs text-slate-600">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{deleting ? "Hapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
