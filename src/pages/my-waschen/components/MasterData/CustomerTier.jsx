import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineSparkles,
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

function formatRupiah(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
}

function formatSpendingRange(min, max) {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${formatRupiah(min)} – ${formatRupiah(max)}`;
  if (min != null) return `≥ ${formatRupiah(min)}`;
  return `≤ ${formatRupiah(max)}`;
}

function formatOrderRange(min, max) {
  if (min == null && max == null) return "—";
  if (min != null && max != null) return `${min} – ${max} order`;
  if (min != null) return `≥ ${min} order`;
  return `≤ ${max} order`;
}

function SortTh({ col, label, sortBy, sortDir, onSort, className = "" }) {
  const active = sortBy === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
        active ? "text-[#5f1340] bg-[#5f1340]/10" : "text-slate-500",
        className,
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <HiOutlineChevronUp className="h-3.5 w-3.5 text-[#5f1340]" />
          ) : (
            <HiOutlineChevronDown className="h-3.5 w-3.5 text-[#5f1340]" />
          )
        ) : (
          <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}

function StatusBadge({ isActive }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none",
        Number(isActive) === 1
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", Number(isActive) === 1 ? "bg-emerald-500" : "bg-slate-400")} />
      {Number(isActive) === 1 ? "Aktif" : "Nonaktif"}
    </span>
  );
}

const EMPTY_FORM = {
  id: null,
  code: "",
  name: "",
  label: "",
  min_monthly_spending: "",
  max_monthly_spending: "",
  min_total_orders: "",
  max_total_orders: "",
  sort_order: 0,
  is_active: 1,
};

function toFormItem(item) {
  return {
    ...item,
    min_monthly_spending: item.min_monthly_spending ?? "",
    max_monthly_spending: item.max_monthly_spending ?? "",
    min_total_orders: item.min_total_orders ?? "",
    max_total_orders: item.max_total_orders ?? "",
  };
}

export default function CustomerTier() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");
  const [sortDir, setSortDir] = useState("asc");
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

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterActive) query.set("isActive", filterActive);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);
      const res = await api(`/waschen/customer-tiers?${query.toString()}`);
      setData(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterActive, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim() || !formData.label.trim()) {
      setFormError("Kode, Nama, dan Label wajib diisi");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        ...formData,
        min_monthly_spending: formData.min_monthly_spending === "" ? null : Number(formData.min_monthly_spending),
        max_monthly_spending: formData.max_monthly_spending === "" ? null : Number(formData.max_monthly_spending),
        min_total_orders: formData.min_total_orders === "" ? null : Number(formData.min_total_orders),
        max_total_orders: formData.max_total_orders === "" ? null : Number(formData.max_total_orders),
        sort_order: Number(formData.sort_order),
        is_active: Number(formData.is_active),
      };
      if (formData.id) {
        await api(`/waschen/customer-tiers/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Tier pelanggan berhasil diperbarui");
      } else {
        await api("/waschen/customer-tiers", { method: "POST", body: JSON.stringify(payload) });
        showToast("Tier pelanggan berhasil ditambahkan");
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/waschen/customer-tiers/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Tier pelanggan berhasil dihapus");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    active: data.filter((d) => Number(d.is_active) === 1).length,
    withSpending: data.filter((d) => d.min_monthly_spending != null || d.max_monthly_spending != null).length,
  }), [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className={cn("fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl", toast.type === "error" ? "bg-rose-600" : "bg-emerald-600")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <PageHero>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Tier Pelanggan</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola tingkatan pelanggan berdasarkan belanja
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" /><span>Tambah Tier</span>
            </button>
          
        
      </PageHero>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Tier", value: stats.total, icon: HiOutlineSparkles, color: "purple" },
          { label: "Aktif", value: stats.active, icon: HiOutlineCheckCircle, color: "emerald" },
          { label: "Aturan Spending", value: stats.withSpending, icon: HiOutlineExclamationTriangle, color: "amber" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", s.color === "emerald" ? "text-emerald-600" : "text-slate-800")}>{s.value}</p>
            </div>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", s.color === "emerald" ? "bg-emerald-50 text-emerald-600" : s.color === "amber" ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600")}>
              <s.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input type="text" placeholder="Cari kode, nama, label..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]" />
          </div>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340] text-slate-600">
            <option value="">Semua Status</option>
            <option value="1">Aktif</option>
            <option value="0">Nonaktif</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-12 text-center">No</th>
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="label" label="Label Tampilan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="min_monthly_spending" label="Spending Bulanan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Total Order</th>
                <SortTh col="sort_order" label="Urutan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={9} className="px-4 py-4"><div className="h-3.5 rounded bg-slate-200 w-full" /></td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">Tidak ada data tier pelanggan</td></tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold font-mono text-[#5f1340]">{item.code}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate" title={item.label}>{item.label}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-emerald-700">
                      {formatSpendingRange(item.min_monthly_spending, item.max_monthly_spending)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {formatOrderRange(item.min_total_orders, item.max_total_orders)}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-slate-500">{item.sort_order}</td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => { setFormData(toFormItem(item)); setFormError(""); setModalOpen(true); }}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition">
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(item)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition">
                          <HiOutlineTrash className="h-4 w-4" />
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
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm">{formData.id ? "Edit Tier Pelanggan" : "Tambah Tier Pelanggan"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode *</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340] font-mono uppercase" required />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" required />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Label Tampilan *</label>
                <input type="text" value={formData.label} onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Contoh: VIP — spending bulanan ≥ Rp 1 juta" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" required />
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-2">Aturan Spending Bulanan (Rp)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Minimum</label>
                    <input type="number" min="0" value={formData.min_monthly_spending} onChange={(e) => setFormData((p) => ({ ...p, min_monthly_spending: e.target.value }))}
                      placeholder="Kosongkan jika tidak ada" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Maksimum</label>
                    <input type="number" min="0" value={formData.max_monthly_spending} onChange={(e) => setFormData((p) => ({ ...p, max_monthly_spending: e.target.value }))}
                      placeholder="Kosongkan jika tidak ada" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
                  </div>
                </div>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-2">Aturan Total Order</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Minimum</label>
                    <input type="number" min="0" value={formData.min_total_orders} onChange={(e) => setFormData((p) => ({ ...p, min_total_orders: e.target.value }))}
                      placeholder="Kosongkan jika tidak ada" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Maksimum</label>
                    <input type="number" min="0" value={formData.max_total_orders} onChange={(e) => setFormData((p) => ({ ...p, max_total_orders: e.target.value }))}
                      placeholder="Kosongkan jika tidak ada" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urutan</label>
                  <input type="number" min="0" value={formData.sort_order} onChange={(e) => setFormData((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select value={formData.is_active} onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]">
                    <option value={1}>Aktif</option><option value={0}>Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50">
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>, document.body)}

      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50"><HiOutlineExclamationTriangle className="h-6 w-6" /></div>
              <h3 className="font-bold text-slate-800 text-sm">Hapus Tier Pelanggan?</h3>
            </div>
            <p className="text-xs text-slate-600">Hapus <strong>{deleteTarget.name}</strong> ({deleteTarget.code})? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {deleting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}<span>{deleting ? "Hapus..." : "Ya, Hapus"}</span>
              </button>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
