import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineBanknotes,
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

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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
  requires_member_balance: 0,
  sort_order: 0,
  is_active: 1,
};

export default function PaymentMethod() {
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
      const res = await api(`/waschen/payment-methods?${query.toString()}`);
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
      const payload = { ...formData, requires_member_balance: Number(formData.requires_member_balance) };
      if (formData.id) {
        await api(`/waschen/payment-methods/${formData.id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Metode pembayaran berhasil diperbarui");
      } else {
        await api("/waschen/payment-methods", { method: "POST", body: JSON.stringify(payload) });
        showToast("Metode pembayaran berhasil ditambahkan");
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
      await api(`/waschen/payment-methods/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Metode pembayaran berhasil dihapus");
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
    memberBalance: data.filter((d) => Number(d.requires_member_balance) === 1).length,
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
      <section className="relative overflow-hidden rounded-3xl border border-[#e0e0e0] bg-gradient-to-br from-[#3d0728] via-[#5f1340] to-[#4a0d31] shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-[#5f1340]/20 blur-3xl" />

        <div className="relative p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Metode Pembayaran</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Master opsi pembayaran di POS Waschen
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setFormData(EMPTY_FORM); setFormError(""); setModalOpen(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95"
            >
              <HiOutlinePlus className="h-4 w-4" /><span>Tambah Metode</span>
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Metode", value: stats.total, icon: HiOutlineBanknotes, color: "purple" },
          { label: "Aktif", value: stats.active, icon: HiOutlineCheckCircle, color: "emerald" },
          { label: "Butuh Saldo Member", value: stats.memberBalance, icon: HiOutlineExclamationTriangle, color: "amber" },
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
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Saldo Member</th>
                <SortTh col="sort_order" label="Urutan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={8} className="px-4 py-4"><div className="h-3.5 rounded bg-slate-200 w-full" /></td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Tidak ada data metode pembayaran</td></tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold font-mono text-[#5f1340]">{item.code}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{item.name}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.label}</td>
                    <td className="px-4 py-3.5 text-center">
                      {Number(item.requires_member_balance) === 1 ? (
                        <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">Ya</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono text-slate-500">{item.sort_order}</td>
                    <td className="px-4 py-3.5 text-center"><StatusBadge isActive={item.is_active} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => { setFormData({ ...item, requires_member_balance: Number(item.requires_member_balance) }); setFormError(""); setModalOpen(true); }}
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
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">{formData.id ? "Edit Metode Pembayaran" : "Tambah Metode Pembayaran"}</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                </div>
              )}
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Label Tampilan *</label>
                <input type="text" value={formData.label} onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="Teks yang muncul di POS" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]" required />
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={Number(formData.requires_member_balance) === 1}
                  onChange={(e) => setFormData((p) => ({ ...p, requires_member_balance: e.target.checked ? 1 : 0 }))}
                  className="rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]" />
                <span className="font-semibold text-slate-700">Membutuhkan saldo deposit member</span>
              </label>
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
              <h3 className="font-bold text-slate-800 text-sm">Hapus Metode Pembayaran?</h3>
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
