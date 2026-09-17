import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
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
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-slate-100", active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500", className)} onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">{label}{active ? (sortDir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />) : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}</div>
    </th>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", Number(isActive) === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-500")}>
      {Number(isActive) === 1 ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function FlagBadge({ active, label, activeClass }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", Number(active) === 1 ? activeClass : "border-slate-200 bg-slate-50 text-slate-400")}>
      {Number(active) === 1 ? label : "—"}
    </span>
  );
}

const EMPTY_FORM = {
  id: null,
  code: "",
  name: "",
  label: "",
  description: "",
  percentage: 10,
  is_filter_tab: 1,
  is_active: 1,
};

export default function StatusWork() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterTab, setFilterTab] = useState("");
  const [sortBy, setSortBy] = useState("percentage");
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
      if (filterTab) query.set("isFilterTab", filterTab);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/work-statuses?${query.toString()}`);
      setData(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, filterActive, filterTab, sortBy, sortDir]);

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.label.trim()) { setFormError("Kode, Nama, dan Label wajib diisi"); return; }
    const pct = Number(formData.percentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) { setFormError("Persentase harus antara 0–100"); return; }
    setSubmitting(true); setFormError("");
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        label: formData.label.trim(),
        description: formData.description.trim(),
        percentage: pct,
        is_filter_tab: Number(formData.is_filter_tab),
        is_active: Number(formData.is_active),
      };
      if (formData.id) {
        await api(`/waschen/work-statuses/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Status pekerjaan berhasil diperbarui");
      } else {
        await api("/waschen/work-statuses", { method: "POST", body: JSON.stringify(payload) });
        showToast("Status pekerjaan berhasil ditambahkan");
      }
      setModalOpen(false); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/work-statuses/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Status pekerjaan berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active) === 1).length,
    filterTabs: data.filter((d) => Number(d.is_filter_tab) === 1).length,
  }), [data]);

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHero>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Status Pekerjaan</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Atur alur status order dari antrean sampai selesai
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Status
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { l: "Total Status", v: stats.total },
          { l: "Aktif", v: stats.active, c: "text-emerald-600" },
          { l: "Tab Filter", v: stats.filterTabs, c: "text-blue-600" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p>
            <p className={cn("text-2xl font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama status..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
          </div>
          <select value={filterTab} onChange={(e) => setFilterTab(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Tab</option><option value="1">Tampil di Tab</option><option value="0">Sembunyikan Tab</option></select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="percentage" label="%" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="label" label="Label" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center">Tab Filter</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>
              )) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Tidak ada data status pekerjaan</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="inline-flex min-w-[2.5rem] justify-center rounded-md border border-[#5f1340]/20 bg-[#5f1340]/5 px-2 py-0.5 font-mono font-bold text-[#5f1340]">
                      {item.percentage ?? 0}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.code}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3.5 text-slate-600">{item.label}</td>
                  <td className="px-4 py-3.5 text-center"><FlagBadge active={item.is_filter_tab} label="Tab" activeClass="border-blue-200 bg-blue-50 text-blue-700" /></td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            id: item.id,
                            code: item.code || "",
                            name: item.name || "",
                            label: item.label || "",
                            description: item.description || "",
                            percentage: Number(item.percentage) || 10,
                            is_filter_tab: Number(item.is_filter_tab),
                            is_active: Number(item.is_active),
                          });
                          setFormError("");
                          setModalOpen(true);
                        }}
                        className="rounded-lg border p-1.5 hover:border-amber-300 hover:bg-amber-50"
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg border p-1.5 hover:border-rose-300 hover:bg-rose-50"><HiOutlineTrash className="h-4 w-4" /></button>
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
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b px-5 py-4 bg-slate-50/95 backdrop-blur">
              <h3 className="font-bold text-sm">{formData.id ? "Edit Status Pekerjaan" : "Tambah Status Pekerjaan"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex gap-2"><HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />{formError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold mb-1">Kode *</label><input type="text" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className={cn(inputCls, "font-mono uppercase")} required /></div>
                <div>
                  <label className="block font-semibold mb-1">Persentase (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData((p) => ({ ...p, percentage: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div><label className="block font-semibold mb-1">Nama Internal *</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="Misal: Pencucian" className={inputCls} required /></div>
              <div><label className="block font-semibold mb-1">Label Tampilan POS *</label><input type="text" value={formData.label} onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))} placeholder="Misal: Sedang Dicuci" className={inputCls} required /></div>
              <div><label className="block font-semibold mb-1">Deskripsi</label><textarea rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className={inputCls} /></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pengaturan POS</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={Number(formData.is_filter_tab) === 1} onChange={(e) => setFormData((p) => ({ ...p, is_filter_tab: e.target.checked ? 1 : 0 }))} className="rounded text-[#5f1340]" />
                  <span className="font-semibold text-slate-700">Tampilkan sebagai tab filter di board produksi</span>
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1">Status Aktif</label>
                <select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className={inputCls}>
                  <option value={1}>Aktif</option>
                  <option value={0}>Nonaktif</option>
                </select>
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
            <h3 className="font-bold text-sm">Hapus status {deleteTarget.name}?</h3>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">{deleting ? "Hapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
