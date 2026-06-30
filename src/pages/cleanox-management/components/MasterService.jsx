import { useEffect, useState } from "react";
import {
  HiOutlineSparkles,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineClock,
  HiOutlineScale,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { formatRupiah, unformatRupiahNumber } from "../../../utils/rupiah";
import ConfirmDialog from "../../../components/ConfirmDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MasterService() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [satuans, setSatuans] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Confirm State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null); // null means create, object means edit

  // Form State
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState(""); // digits string (tanpa separator)
  const [formSatuanId, setFormSatuanId] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formDurationValue, setFormDurationValue] = useState("1");
  const [formDurationUnit, setFormDurationUnit] = useState("hari");
  const [formStatus, setFormStatus] = useState("Aktif");
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError("");
      const [servicesRes, categoriesRes, satuansRes] = await Promise.all([
        api("/master-services"),
        api("/master-services/categories"),
        api("/master-services/satuan"),
      ]);
      setServices(servicesRes.services || []);
      setCategories(categoriesRes.categories || []);
      setSatuans(satuansRes.satuans || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data master layanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Master Layanan Cleanox | Alora Group Indonesia";
    fetchInitialData();
  }, []);

  const handleOpenCreate = () => {
    setSelectedService(null);
    setFormName("");
    setFormPrice("");
    setFormSatuanId(satuans.length > 0 ? satuans[0].satuan_id : "");
    setFormCategoryId(categories.length > 0 ? categories[0].id : "");
    setFormDurationValue("1");
    setFormDurationUnit("hari");
    setFormStatus("Aktif");
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedService(item);
    setFormName(item.name);
    setFormPrice(item.price != null ? String(Math.round(Number(item.price))) : "");
    setFormSatuanId(item.satuan_id);
    setFormCategoryId(item.category_id);
    setFormDurationValue(String(item.duration_value));
    setFormDurationUnit(item.duration_unit);
    setFormStatus(item.status);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName || formPrice === "" || !formSatuanId || !formCategoryId || !formDurationValue || !formDurationUnit) {
      setError("Semua data wajib diisi!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const selectedSatuan = satuans.find(s => Number(s.satuan_id) === Number(formSatuanId));
    if (!selectedSatuan) {
      setError("Satuan tidak valid!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const payload = {
      name: formName,
      price: Number(formPrice) || 0,
      satuan_id: Number(formSatuanId),
      satuan_name: selectedSatuan.satuan_name,
      category_id: Number(formCategoryId),
      duration_value: Number(formDurationValue),
      duration_unit: formDurationUnit,
      status: formStatus,
    };

    try {
      setSubmitting(true);
      if (selectedService) {
        // Edit Mode
        await api(`/master-services/${selectedService.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Layanan berhasil diperbarui");
      } else {
        // Create Mode
        await api("/master-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Layanan berhasil dibuat");
      }
      setTimeout(() => setSuccess(""), 3000);
      setModalOpen(false);
      fetchInitialData();
    } catch (err) {
      setError(err.message || "Gagal menyimpan data");
      setTimeout(() => setError(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/master-services/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Layanan berhasil dihapus");
      setTimeout(() => setSuccess(""), 3000);
      fetchInitialData();
    } catch (err) {
      setError(err.message || "Gagal menghapus data");
      setTimeout(() => setError(""), 3000);
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.category_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-10">
      {success && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-600" />
          {error}
        </div>
      )}
      <div className="mx-auto max-w-screen-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#1b3459] via-[#12233c] to-[#0f1f37] shadow-sm">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-indigo-300/10 blur-3xl" />

          <div className="relative p-5 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
                  <HiOutlineSparkles className="h-7 w-7 text-[#97bd3f]" />
                  Master Layanan Cleanox
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
                  Daftar jenis layanan, durasi pengerjaan, dan tarif dasar operasional untuk unit Cleanox.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Actions Bar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#97bd3f]/10 text-[#1b3459]">
                <HiOutlineMagnifyingGlass className="h-4 w-4 text-[#1b3459]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Pencarian Layanan</p>
                <p className="text-xs text-slate-500">Cari berdasarkan nama layanan atau kategori</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#97bd3f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#86aa34] transition active:scale-[0.97]"
            >
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Tambah Layanan
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Masukkan nama layanan atau kategori..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
              />
            </div>
          </div>
        </section>

        {/* Services Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Daftar Layanan Cleanox ({filteredServices.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-rose-500">
                <HiOutlineExclamationTriangle className="h-8 w-8" />
                <p>{error}</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                <p>Belum ada data layanan.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">No</th>
                    <th className="px-6 py-3 text-left">Nama Layanan</th>
                    <th className="px-6 py-3 text-left">Kategori</th>
                    <th className="px-6 py-3 text-left">Satuan</th>
                    <th className="px-6 py-3 text-left">Durasi</th>
                    <th className="px-6 py-3 text-left">Harga</th>
                    <th className="px-6 py-3 text-left w-24">Status</th>
                    <th className="px-6 py-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredServices.map((item, idx) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {item.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                          {item.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold uppercase">
                          <HiOutlineScale className="h-3.5 w-3.5 text-slate-400" />
                          {item.satuan_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                        <HiOutlineClock className="h-3.5 w-3.5 text-slate-400" />
                        {item.duration_value} {item.duration_unit}
                      </td>
                      <td className="px-6 py-4 font-bold font-mono text-[#1b3459] text-sm">
                        {formatRupiah(item.price)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border",
                          item.status === "Aktif"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-600"
                        )}>
                          <HiOutlineCheckCircle className="h-3 w-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg p-1.5 hover:bg-blue-50 text-blue-600 transition"
                            title="Edit"
                          >
                            <HiOutlinePencilSquare className="h-4.5 w-4.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(item);
                              setConfirmOpen(true);
                            }}
                            className="rounded-lg p-1.5 hover:bg-rose-50 text-rose-600 transition"
                            title="Hapus"
                          >
                            <HiOutlineTrash className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* Save Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-xl sm:max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-black text-slate-800">
                {selectedService ? "Edit Layanan Cleanox" : "Tambah Layanan Cleanox"}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold text-slate-600">
              {/* Nama Layanan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Layanan</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Reguler Kiloan - Cuci Lipat"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                />
              </div>

              {/* Harga */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Harga (Rupiah)</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formPrice ? formatRupiah(formPrice) : ""}
                    onChange={(e) => {
                      const digits = unformatRupiahNumber(e.target.value);
                      setFormPrice(digits);
                    }}
                    placeholder="Contoh: 15000"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                  />
                </div>
              </div>

              {/* Satuan */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Satuan</label>
                <select
                  value={formSatuanId}
                  onChange={(e) => setFormSatuanId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                >
                  <option value="" disabled>Pilih Satuan</option>
                  {satuans.map((s) => (
                    <option key={s.satuan_id} value={s.satuan_id}>{s.satuan_name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Kategori */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori</label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                >
                  <option value="" disabled>Pilih Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Durasi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Durasi Pengerjaan</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    value={formDurationValue}
                    onChange={(e) => setFormDurationValue(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                  />
                  <select
                    value={formDurationUnit}
                    onChange={(e) => setFormDurationUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                  >
                    <option value="jam">Jam</option>
                    <option value="hari">Hari</option>
                    <option value="minggu">Minggu</option>
                    <option value="bulan">Bulan</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              {selectedService && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#97bd3f] py-2.5 text-xs font-bold text-white hover:bg-[#86aa34] transition disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Layanan"
        message={`Apakah Anda yakin ingin menghapus layanan "${deleteTarget?.name}"?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </main>
  );
}
