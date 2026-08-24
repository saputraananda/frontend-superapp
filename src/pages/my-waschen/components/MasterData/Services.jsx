import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineShoppingBag,
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
  HiOutlineClock,
  HiOutlineStar,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatRupiah(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
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

function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {[16, 24, 40, 24, 20, 28, 20, 24, 24].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3.5 rounded bg-slate-200" style={{ width: `${w * 3}px` }} />
        </td>
      ))}
    </tr>
  );
}

const EMPTY_FORM = {
  id: null,
  category_id: "",
  unit_id: "",
  code: "",
  name: "",
  unit: "Kg",
  price: 0,
  regular_duration_days: 2.0,
  min_order_qty: 1,
  description: "",
  is_cleanox: 0,
  is_featured: 0,
  is_active: 1,
};

export default function Services() {
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [sortBy, setSortBy] = useState("s.name");
  const [sortDir, setSortDir] = useState("asc");

  // Modal Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Modal Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadCategories = async () => {
    try {
      const res = await api("/waschen/category-services?isActive=1");
      setCategories(res.data || []);
    } catch (err) {
      console.error("loadCategories error:", err);
    }
  };

  const loadUnits = async () => {
    try {
      const res = await api("/waschen/units?isActive=1");
      setUnits(res.data || []);
    } catch (err) {
      console.error("loadUnits error:", err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (filterCategoryId) query.set("categoryId", filterCategoryId);
      if (filterActive) query.set("isActive", filterActive);
      if (sortBy) query.set("sortBy", sortBy);
      if (sortDir) query.set("sortDir", sortDir);

      const res = await api(`/waschen/services?${query.toString()}`);
      setData(res.data || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadUnits();
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCategoryId, filterActive, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const handleOpenAdd = () => {
    setFormData(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setFormData({
      id: item.id,
      category_id: item.category_id,
      unit_id: item.unit_id || "",
      code: item.code,
      name: item.name,
      unit: item.unit || "Kg",
      price: item.price || 0,
      regular_duration_days: item.regular_duration_days || 2.0,
      min_order_qty: item.min_order_qty || 1,
      description: item.description || "",
      is_cleanox: item.is_cleanox || 0,
      is_featured: item.is_featured || 0,
      is_active: item.is_active,
    });
    setFormError("");
    setModalOpen(true);
  };

  // Kode otomatis WS-KG-### (Kiloan) / WS-SAT-### (Satuan) saat pilih kategori (mode tambah)
  const handleCategoryChange = async (catId) => {
    setFormData((p) => ({ ...p, category_id: catId }));
    if (formData.id || !catId) return;
    try {
      const res = await api(`/waschen/services/next-code?categoryId=${catId}`);
      const nextCode = res.data?.code || "";
      setFormData((p) => ({ ...p, category_id: catId, code: nextCode }));
    } catch (err) {
      console.error("next-code error:", err);
    }
  };

  const handleUnitChange = (uId) => {
    const selected = units.find((u) => Number(u.id) === Number(uId));
    setFormData((p) => ({
      ...p,
      unit_id: uId,
      unit: selected ? selected.symbol || selected.code : p.unit,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id) {
      setFormError("Kategori Layanan wajib dipilih");
      return;
    }
    if (!formData.code.trim() || !formData.name.trim()) {
      setFormError("Kode dan Nama Layanan wajib diisi");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      if (formData.id) {
        await api(`/waschen/services/${formData.id}`, {
          method: "PUT",
          body: JSON.stringify(formData),
        });
        showToast("Layanan berhasil diperbarui");
      } else {
        await api("/waschen/services", {
          method: "POST",
          body: JSON.stringify(formData),
        });
        showToast("Layanan berhasil ditambahkan");
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
      await api(`/waschen/services/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Layanan berhasil dihapus");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((d) => Number(d.is_active) === 1).length;
    const featured = data.filter((d) => Number(d.is_featured) === 1).length;
    return { total, active, featured };
  }, [data]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-xl animate-fade-in",
            toast.type === "error" ? "bg-rose-600" : "bg-emerald-600",
          )}
        >
          {toast.type === "error" ? (
            <HiOutlineExclamationTriangle className="h-4 w-4" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4" />
          )}
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
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Katalog Layanan Laundry</h1>
              <p className="mt-3 text-sm leading-6 text-white/75 sm:text-base">
                Kelola item layanan, unit satuan, durasi pengerjaan reguler, dan tarif dasar POS Waschen
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md shadow-black/10 transition hover:bg-pink-50 active:scale-95 cursor-pointer"
            >
              <HiOutlinePlus className="h-4 w-4" />
              <span>Tambah Layanan</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Katalog Layanan</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{stats.total}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <HiOutlineShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Layanan Unggulan</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{stats.featured}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <HiOutlineStar className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status Aktif</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <HiOutlineCheckCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter & Table Area */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="border-b border-slate-100 p-4 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode, nama layanan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-[#5f1340] focus:ring-1 focus:ring-[#5f1340]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340] text-slate-600"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[#5f1340] text-slate-600"
            >
              <option value="">Semua Status</option>
              <option value="1">Aktif</option>
              <option value="0">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider w-12 text-center">No</th>
                <SortTh col="code" label="Kode" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="name" label="Nama Layanan" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="category_id" label="Kategori" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Satuan</th>
                <SortTh col="price" label="Tarif Dasar" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <SortTh col="regular_duration_days" label="Durasi Reguler" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Min. Order</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Tidak ada data katalog layanan
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-medium tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-bold font-mono text-[#5f1340] whitespace-nowrap">{item.code}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                        {Number(item.is_cleanox) === 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
                            <HiOutlineSparkles className="h-3 w-3" />
                            Cleanox
                          </span>
                        )}
                        {Number(item.is_featured) === 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            <HiOutlineStar className="h-3 w-3 fill-amber-400 text-amber-500" />
                            Featured
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap font-medium">
                      {item.category_name || "-"}
                    </td>
                    <td className="px-4 py-3.5 font-bold whitespace-nowrap">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                        {item.unit_symbol || item.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#5f1340] whitespace-nowrap">
                      {formatRupiah(item.price)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <HiOutlineClock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.regular_duration_days || 2} Hari</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium tabular-nums">
                      {item.min_order_qty} {item.unit_symbol || item.unit}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <StatusBadge isActive={item.is_active} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 transition"
                          title="Edit Layanan"
                        >
                          <HiOutlinePencilSquare className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 transition"
                          title="Hapus Layanan"
                        >
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

      {/* Modal Add / Edit */}
      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-sm">
                {formData.id ? "Edit Katalog Layanan" : "Tambah Katalog Layanan"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center gap-2">
                  <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori Layanan *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Layanan *</label>
                  <input
                    type="text"
                    placeholder="Misal: K-01, S-01"
                    value={formData.code}
                    onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340] font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  placeholder="Misal: Cuci + Setrika (Wash & Iron)"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Master Satuan (Unit)</label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value="">Pilih Satuan Master</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol}) - {u.category_type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teks Satuan Custom</label>
                  <input
                    type="text"
                    placeholder="Kg, Pcs, Pasang"
                    value={formData.unit}
                    onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tarif Dasar (Rp) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10000"
                    value={formData.price}
                    onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Durasi Reguler (Hari)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="2.0"
                    value={formData.regular_duration_days}
                    onChange={(e) => setFormData((p) => ({ ...p, regular_duration_days: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min. Order Qty</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={formData.min_order_qty}
                    onChange={(e) => setFormData((p) => ({ ...p, min_order_qty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Layanan</label>
                <textarea
                  rows={3}
                  placeholder="Keterangan cakupan pengerjaan layanan..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tim Pengerjaan</label>
                  <select
                    value={formData.is_cleanox}
                    onChange={(e) => setFormData((p) => ({ ...p, is_cleanox: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value={0}>Normal</option>
                    <option value={1}>Tim Cleanox</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Featured / Unggulan</label>
                  <select
                    value={formData.is_featured}
                    onChange={(e) => setFormData((p) => ({ ...p, is_featured: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value={0}>Tidak</option>
                    <option value={1}>Ya (Featured)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]"
                  >
                    <option value={1}>Aktif</option>
                    <option value={0}>Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#5f1340] to-[#4a0d31] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#5f1340]/20 hover:opacity-95 disabled:opacity-50"
                >
                  {submitting && <HiOutlineArrowPath className="h-3.5 w-3.5 animate-spin" />}
                  <span>{submitting ? "Menyimpan..." : "Simpan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Delete Confirmation */}
      {deleteTarget && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <HiOutlineExclamationTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Hapus Layanan Laundry?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus layanan <strong>{deleteTarget.name}</strong> ({deleteTarget.code})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-rose-700 disabled:opacity-50"
              >
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
