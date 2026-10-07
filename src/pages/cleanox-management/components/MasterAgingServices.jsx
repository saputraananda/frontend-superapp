import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineTag,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineInformationCircle,
  HiOutlineCheckBadge,
  HiOutlineShieldCheck,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import ConfirmDialog from "../../../components/ConfirmDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dateStr).slice(0, 10);
  }
}

export default function MasterAgingServices() {
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    total_active: 0,
    total_periodic: 0,
    total_cross_selling: 0,
    avg_aging_days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | periodic | cross_selling
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | inactive

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); // null = create, obj = edit
  const [formName, setFormName] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formDays, setFormDays] = useState(90);
  const [formIsCrossSelling, setFormIsCrossSelling] = useState(false);
  const [formKeywords, setFormKeywords] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Confirm Delete State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Toast / Alert State
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => {
      setErrorMessage(null);
    }, 4000);
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search: search.trim(),
        type: typeFilter,
        status: statusFilter,
      });

      const res = await api(`/cleanox/master-aging-services?${queryParams.toString()}`);
      if (res.success) {
        setServices(res.data || []);
        if (res.stats) {
          setStats({
            total: Number(res.stats.total || 0),
            total_active: Number(res.stats.total_active || 0),
            total_periodic: Number(res.stats.total_periodic || 0),
            total_cross_selling: Number(res.stats.total_cross_selling || 0),
            avg_aging_days: Number(res.stats.avg_aging_days || 0),
          });
        }
      }
    } catch (err) {
      console.error("Gagal memuat master layanan aging:", err);
      showError(err.message || "Gagal memuat data layanan aging");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Master Layanan Age Cleanox | SuperApp";
    fetchServices();
  }, [typeFilter, statusFilter]);

  // Kunci scroll body & dukung tombol Escape saat modal terbuka
  useEffect(() => {
    if (!modalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modalOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchServices();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormName("");
    setFormKey("");
    setFormDays(90);
    setFormIsCrossSelling(false);
    setFormKeywords("");
    setFormDescription("");
    setFormIsActive(true);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormName(item.category_name || "");
    setFormKey(item.category_key || "");
    setFormDays(item.aging_days != null ? item.aging_days : 90);
    setFormIsCrossSelling(Boolean(item.is_cross_selling));
    setFormKeywords(item.keywords || "");
    setFormDescription(item.description || "");
    setFormIsActive(Boolean(item.is_active));
    setModalOpen(true);
  };

  // Auto-generate key when creating
  const handleNameChange = (val) => {
    setFormName(val);
    if (!selectedItem) {
      const generated = val
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .trim();
      setFormKey(generated);
    }
  };

  // Save (Create or Edit)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      showError("Nama layanan wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        category_name: formName.trim(),
        category_key: formKey.trim() || formName.trim().toUpperCase(),
        aging_days: formIsCrossSelling ? null : Number(formDays) || 30,
        is_cross_selling: formIsCrossSelling ? 1 : 0,
        keywords: formKeywords.trim(),
        description: formDescription.trim(),
        is_active: formIsActive ? 1 : 0,
      };

      if (selectedItem) {
        // Edit Mode
        const res = await api(`/cleanox/master-aging-services/${selectedItem.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (res.success) {
          showToast(`Layanan "${formName}" berhasil diperbarui!`);
        }
      } else {
        // Create Mode
        const res = await api("/cleanox/master-aging-services", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.success) {
          showToast(`Layanan "${formName}" berhasil ditambahkan!`);
        }
      }

      setModalOpen(false);
      fetchServices();
    } catch (err) {
      console.error("Gagal menyimpan layanan aging:", err);
      showError(err.message || "Gagal menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Action
  const handleOpenDelete = (item) => {
    setDeleteTarget(item);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api(`/cleanox/master-aging-services/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.success) {
        showToast(`Layanan "${deleteTarget.category_name}" berhasil dihapus.`);
      }
      setConfirmOpen(false);
      setDeleteTarget(null);
      fetchServices();
    } catch (err) {
      console.error("Gagal menghapus layanan aging:", err);
      showError(err.message || "Gagal menghapus layanan");
    }
  };

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/50 relative">
      {/* ── Toast Alerts ── */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-md px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl border border-slate-700/50 animate-bounce">
          <HiOutlineCheckBadge className="h-6 w-6 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-rose-900/95 backdrop-blur-md px-5 py-3.5 text-xs sm:text-sm font-semibold text-white shadow-2xl border border-rose-700/50">
          <HiOutlineXMark className="h-6 w-6 text-rose-300 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b3459] to-[#0f2139] text-white shadow-lg shadow-[#1b3459]/25 ring-1 ring-white/20">
              <HiOutlineClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Master Layanan Age
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Atur standar hari siklus aging dan tipe layanan untuk reminder berkala Cleanox
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchServices}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b3459] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#1b3459]/25 hover:bg-[#152a48] transition"
          >
            <HiOutlinePlus className="h-4 w-4" />
            <span>Tambah Layanan Age</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Card 1: Total Layanan */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Layanan
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <HiOutlineSquares2X2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {stats.total}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              {stats.total_active} aktif dari {stats.total}
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-300" />
        </div>

        {/* Card 2: Layanan Berkala */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Layanan Berkala
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HiOutlineClock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {stats.total_periodic}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              Rata-rata ~{stats.avg_aging_days} hari siklus
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500" />
        </div>

        {/* Card 3: Layanan Cross-Selling */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
              Cross-Selling
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <HiOutlineSparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {stats.total_cross_selling}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">Add-on (Tanpa batas hari)</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500" />
        </div>

        {/* Card 4: Layanan Nonaktif */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Status Aktif
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <HiOutlineShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {stats.total_active}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              {stats.total - stats.total_active} non-aktif
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-6 relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama layanan, key kode, kata kunci..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTimeout(() => fetchServices(), 50);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            >
              <option value="all">Semua Tipe Layanan</option>
              <option value="periodic">Layanan Berkala (Aging)</option>
              <option value="cross_selling">Khusus Cross-Selling</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
            >
              <option value="all">Semua Status</option>
              <option value="active">Hanya Aktif</option>
              <option value="inactive">Hanya Non-Aktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <HiOutlineArrowPath className="h-8 w-8 animate-spin text-[#1b3459]" />
            <p className="mt-3 text-sm font-medium text-slate-600">Memuat konfigurasi layanan aging...</p>
          </div>
        ) : !services.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <HiOutlineInformationCircle className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Tidak ada layanan aging yang cocok</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 pl-4 pr-2 sm:pl-6 text-center w-12">No</th>
                  <th className="py-3.5 px-3">Layanan & Key</th>
                  <th className="py-3.5 px-3 text-center">Standar Aging</th>
                  <th className="py-3.5 px-3">Kata Kunci Pencocokan (Keywords)</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Diperbarui</th>
                  <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {services.map((item, idx) => {
                  const isCross = Boolean(item.is_cross_selling);
                  const isActive = Boolean(item.is_active);
                  const keywordList = item.keywords
                    ? item.keywords.split(",").map((k) => k.trim()).filter(Boolean)
                    : [];

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/80 group",
                        !isActive && "opacity-60 bg-slate-50/30"
                      )}
                    >
                      {/* No */}
                      <td className="py-3.5 pl-4 pr-2 sm:pl-6 text-center font-medium text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Layanan & Key */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs",
                              isCross
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {isCross ? <HiOutlineSparkles className="h-5 w-5" /> : <HiOutlineClock className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-[#1b3459] transition">
                              {item.category_name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                {item.category_key}
                              </span>
                              {item.description && (
                                <span className="text-[11px] text-slate-500 max-w-[220px] truncate" title={item.description}>
                                  • {item.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Standar Aging (Hari) */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isCross ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200">
                            <HiOutlineSparkles className="h-3.5 w-3.5" />
                            Cross-Selling
                          </span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold border shadow-xs",
                                item.aging_days <= 30
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : item.aging_days <= 90
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              )}
                            >
                              <HiOutlineClock className="h-3.5 w-3.5" />
                              {item.aging_days} Hari
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">siklus pengerjaan</span>
                          </div>
                        )}
                      </td>

                      {/* Keywords */}
                      <td className="py-3.5 px-3 max-w-[260px]">
                        <div className="flex flex-wrap gap-1">
                          {keywordList.length > 0 ? (
                            keywordList.map((kw, i) => (
                              <span
                                key={i}
                                className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 border border-slate-200"
                              >
                                {kw}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sesuai nama layanan</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Diperbarui */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-500 font-mono">
                        {formatDateIndo(item.updated_at || item.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit konfigurasi aging"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition"
                          >
                            <HiOutlinePencilSquare className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            title="Hapus konfigurasi"
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Create / Edit ── */}
      {modalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setModalOpen(false)}
          />

          <div
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-[fadeIn_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <HiOutlineClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">
                    {selectedItem ? "Edit Layanan Aging" : "Tambah Layanan Aging Baru"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Konfigurasi batasan hari siklus reminder atau cross-selling
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Nama Layanan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Layanan / Kategori <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Contoh: Fast Clean Kasur, Sepatu, Tas..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
                  />
                </div>

                {/* Key Kode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kode Unik / Key Kategori <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value.toUpperCase())}
                    placeholder="Contoh: FAST CLEAN KASUR, SEPATU..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Digunakan sistem untuk mencocokkan riwayat dan reminder.
                  </p>
                </div>

                {/* Tipe Layanan Segmented */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tipe Layanan:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsCrossSelling(false)}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border text-left transition",
                        !formIsCrossSelling
                          ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                        <HiOutlineClock className="h-4 w-4 text-blue-600" />
                        Layanan Berkala
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Memiliki batas hari siklus reminder
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIsCrossSelling(true)}
                      className={cn(
                        "flex flex-col items-start p-3 rounded-xl border text-left transition",
                        formIsCrossSelling
                          ? "border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                        <HiOutlineSparkles className="h-4 w-4 text-purple-600" />
                        Cross-Selling (Add-on)
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Tanpa batas hari (seperti Koper)
                      </span>
                    </button>
                  </div>
                </div>

                {/* Batas Hari Siklus (jika bukan cross-selling) */}
                {!formIsCrossSelling && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Batas Siklus Aging (Hari) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        required={!formIsCrossSelling}
                        value={formDays}
                        onChange={(e) => setFormDays(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        Hari
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Pelanggan akan masuk status "Reminder" jika sudah lewat dari jumlah hari ini sejak pengerjaan selesai.
                    </p>
                  </div>
                )}

                {/* Kata Kunci Pencocokan (Keywords) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Kunci Pencocokan Nota/Item (Pisahkan dengan koma):
                  </label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value.toUpperCase())}
                    placeholder="Contoh: KASUR, MATRAS, SPRINGBED, MATTRESS"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition uppercase"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kata kunci yang dicocokkan otomatis dengan nama transaksi di POS dan Smartlink.
                  </p>
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deskripsi / Keterangan:
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Catatan tambahan mengenai jenis pengerjaan..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 focus:border-[#1b3459] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b3459]/10 transition"
                  />
                </div>

                {/* Status Aktif */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="formIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1b3459] focus:ring-[#1b3459]"
                  />
                  <label htmlFor="formIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Aktifkan konfigurasi layanan ini dalam kalkulasi aging
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 bg-slate-50/75">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1b3459] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-[#1b3459]/25 hover:bg-[#152a48] disabled:opacity-50 transition"
                >
                  {submitting ? (
                    <>
                      <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{selectedItem ? "Simpan Perubahan" : "Tambah Layanan"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Layanan Aging?"
        message={`Apakah Anda yakin ingin menghapus konfigurasi aging untuk "${deleteTarget?.category_name}"?`}
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
      />
    </div>
  );
}
