import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineCreditCard,
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
  HiOutlineSparkles,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
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

function TierBadge({ tier }) {
  const colors = { Gold: "bg-amber-50 text-amber-700 border-amber-200", Diamond: "bg-cyan-50 text-cyan-700 border-cyan-200" };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border", colors[tier] || colors.Gold)}>
      <HiOutlineSparkles className="h-3 w-3" />{tier}
    </span>
  );
}

const EMPTY_FORM = {
  id: null,
  code: "",
  name: "",
  tier: "Gold",
  top_up_amount: 0,
  validity_days: 180,
  description: "",
  is_active: 1,
};

export default function MembershipPackage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [sortBy, setSortBy] = useState("top_up_amount");
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
      if (filterTier) query.set("tier", filterTier);
      if (filterActive) query.set("isActive", filterActive);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/membership-packages?${query.toString()}`);
      setData(res.data || []);
    } catch (err) { showToast(err.message, "error"); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search, filterTier, filterActive, sortBy, sortDir]);

  const handleSort = (col) => { if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.top_up_amount) {
      setFormError("Kode, Nama Paket, dan Nominal Top Up wajib diisi");
      return;
    }
    setSubmitting(true); setFormError("");
    try {
      const payload = { ...formData, top_up_amount: Number(formData.top_up_amount), validity_days: Number(formData.validity_days) || 180 };
      if (formData.id) {
        await api(`/waschen/membership-packages/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Paket membership berhasil diperbarui");
      } else {
        await api("/waschen/membership-packages", { method: "POST", body: JSON.stringify(payload) });
        showToast("Paket membership berhasil ditambahkan");
      }
      setModalOpen(false); loadData();
    } catch (err) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/membership-packages/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Paket membership berhasil dihapus"); setDeleteTarget(null); loadData();
    } catch (err) { showToast(err.message, "error"); } finally { setDeleting(false); }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active) === 1).length,
    gold: data.filter((d) => d.tier === "Gold").length,
    diamond: data.filter((d) => d.tier === "Diamond").length,
  }), [data]);

  const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}><span>{toast.message}</span></div>}

      {/* Hero Header */}
      <PageHero>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Paket Membership</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola paket deposit member Gold dan Diamond
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Tambah Paket
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[{ l: "Total Paket", v: stats.total }, { l: "Aktif", v: stats.active, c: "text-emerald-600" }, { l: "Gold", v: stats.gold, c: "text-amber-600" }, { l: "Diamond", v: stats.diamond, c: "text-cyan-600" }].map((s) => (
          <div key={s.l} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.l}</p><p className={cn("text-2xl font-bold mt-0.5", s.c || "text-slate-800")}>{s.v}</p></div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama paket..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
          </div>
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Tier</option><option value="Gold">Gold</option><option value="Diamond">Diamond</option></select>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"><option value="">Semua Status</option><option value="1">Aktif</option><option value="0">Nonaktif</option></select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">No</th>
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama Paket" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="tier" label="Tier" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="top_up_amount" label="Nominal Top Up" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="validity_days" label="Masa Berlaku" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? Array.from({ length: 3 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-4"><div className="h-3.5 bg-slate-200 rounded animate-pulse" /></td></tr>) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Tidak ada data paket membership</td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3.5 text-center text-slate-400">{idx + 1}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#5f1340]">{item.code}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                  <td className="px-4 py-3.5"><TierBadge tier={item.tier} /></td>
                  <td className="px-4 py-3.5 font-bold text-emerald-700">{formatRupiah(item.top_up_amount)}</td>
                  <td className="px-4 py-3.5 text-slate-600">{item.validity_days} hari ({Math.round(item.validity_days / 30)} bln)</td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button type="button" onClick={() => { setFormData({ ...item, top_up_amount: Number(item.top_up_amount), validity_days: Number(item.validity_days) }); setFormError(""); setModalOpen(true); }} className="rounded-lg border p-1.5 hover:border-amber-300 hover:bg-amber-50"><HiOutlinePencilSquare className="h-4 w-4" /></button>
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
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden">
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">{formData.id ? "Edit Paket" : "Tambah Paket Membership"}</h3>
              <button type="button" onClick={() => setModalOpen(false)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{formError}</div>}
              <div><label className="block font-semibold mb-1">Kode Paket *</label><input type="text" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="MEMBER_GOLD" className={cn(inputCls, "font-mono uppercase")} required /></div>
              <div><label className="block font-semibold mb-1">Nama Paket *</label><input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className={inputCls} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block font-semibold mb-1">Tier Paket *</label><select value={formData.tier} onChange={(e) => setFormData((p) => ({ ...p, tier: e.target.value }))} className={inputCls}><option value="Gold">Gold</option><option value="Diamond">Diamond</option></select></div>
                <div><label className="block font-semibold mb-1">Masa Berlaku (Hari)</label><input type="number" min="1" value={formData.validity_days} onChange={(e) => setFormData((p) => ({ ...p, validity_days: e.target.value }))} className={inputCls} /></div>
              </div>
              <div><label className="block font-semibold mb-1">Nominal Top Up (Rp) *</label><input type="number" min="0" value={formData.top_up_amount} onChange={(e) => setFormData((p) => ({ ...p, top_up_amount: e.target.value }))} className={inputCls} required /></div>
              <div><label className="block font-semibold mb-1">Deskripsi</label><textarea rows={2} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className={inputCls} /></div>
              <div><label className="block font-semibold mb-1">Status</label><select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))} className={inputCls}><option value={1}>Aktif</option><option value={0}>Nonaktif</option></select></div>
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
            <h3 className="font-bold text-sm">Hapus paket {deleteTarget.name}?</h3>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">{deleting ? "Hapus..." : "Ya, Hapus"}</button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
