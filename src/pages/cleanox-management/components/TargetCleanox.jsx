import { useEffect, useState } from "react";
import {
  HiOutlineChartBar,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineExclamationTriangle,
  HiOutlineBuildingOffice,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { formatRupiah, formatRupiahNumber, unformatRupiahNumber } from "../../../utils/rupiah";
import ConfirmDialog from "../../../components/ConfirmDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function TargetCleanox() {
  const [targets, setTargets] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null); // null = create, object = edit
  const [formOutlet, setFormOutlet] = useState("");
  const [formTahun, setFormTahun] = useState(new Date().getFullYear());
  const [formBulan, setFormBulan] = useState(new Date().getMonth() + 1);
  const [formNominal, setFormNominal] = useState(""); // unformatted number string
  const [submitting, setSubmitting] = useState(false);

  // Confirm State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [targetRes, outletRes] = await Promise.all([
        api("/target-cleanox"),
        api("/outlets"),
      ]);
      setTargets(targetRes.targets || []);
      setOutlets(outletRes.outlets || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data target Cleanox");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Target Cleanox | Alora Group Indonesia";
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setSelectedTarget(null);
    setFormOutlet("");
    setFormTahun(new Date().getFullYear());
    setFormBulan(new Date().getMonth() + 1);
    setFormNominal("");
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedTarget(item);
    setFormOutlet(item.outlet || "");
    setFormTahun(item.tahun);
    setFormBulan(item.bulan);
    setFormNominal(item.nominal != null ? String(item.nominal) : "");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTahun || !formBulan) {
      setError("Tahun dan bulan wajib diisi!");
      setTimeout(() => setError(""), 3000);
      return;
    }
    if (formNominal === "") {
      setError("Nominal target wajib diisi!");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        outlet: formOutlet && formOutlet.trim() ? formOutlet.trim() : null,
        tahun: Number(formTahun),
        bulan: Number(formBulan),
        nominal: Number(unformatRupiahNumber(formNominal)),
      };

      if (selectedTarget) {
        // Edit Mode
        await api(`/target-cleanox/${selectedTarget.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Target Cleanox berhasil diperbarui");
      } else {
        // Create Mode
        await api("/target-cleanox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSuccess("Target Cleanox berhasil dibuat");
      }
      setTimeout(() => setSuccess(""), 3000);
      setModalOpen(false);
      fetchData();
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
      await api(`/target-cleanox/${deleteTarget.id}`, { method: "DELETE" });
      setSuccess("Target Cleanox berhasil dihapus");
      setTimeout(() => setSuccess(""), 3000);
      fetchData();
    } catch (err) {
      setError(err.message || "Gagal menghapus data");
      setTimeout(() => setError(""), 3000);
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const filteredTargets = targets.filter((t) => {
    const term = search.toLowerCase();
    const outletName = t.outlet || "Cleanox";
    const outletMatch = outletName.toLowerCase().includes(term);
    const yearMatch = String(t.tahun).includes(term);
    const monthMatch = MONTH_NAMES[t.bulan - 1]?.toLowerCase().includes(term);
    return outletMatch || yearMatch || monthMatch;
  });

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
                  <HiOutlineChartBar className="h-7 w-7 text-[#97bd3f]" />
                  Target Cleanox
                </h1>
                <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
                  Kelola target omzet bulanan Cleanox.
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
                <p className="text-sm font-bold text-slate-800">Pencarian Target</p>
                <p className="text-xs text-slate-500">Cari berdasarkan nama outlet, tahun, atau bulan</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#97bd3f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#86aa34] transition active:scale-[0.97]"
            >
              <HiOutlinePlus className="h-3.5 w-3.5" />
              Tambah Target
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari outlet, tahun, bulan target..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:bg-white focus:ring-2 focus:ring-[#1b3459]/10"
              />
            </div>
          </div>
        </section>

        {/* Targets Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-800">Daftar Target ({filteredTargets.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-rose-500">
                <HiOutlineExclamationTriangle className="h-8 w-8" />
                <p>{error}</p>
              </div>
            ) : filteredTargets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14 text-sm text-slate-400">
                <p>Belum ada data target Cleanox.</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">No</th>
                    <th className="px-6 py-3 text-left">Outlet</th>
                    <th className="px-6 py-3 text-left">Periode</th>
                    <th className="px-6 py-3 text-left">Nominal Target</th>
                    <th className="px-6 py-3 text-left">Tanggal Dibuat</th>
                    <th className="px-6 py-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTargets.map((item, idx) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {item.outlet || "Cleanox"}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">
                        {MONTH_NAMES[item.bulan - 1]} {item.tahun}
                      </td>
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
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
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-black text-slate-800">
                {selectedTarget ? "Edit Target Cleanox" : "Tambah Target Cleanox"}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 text-xs font-semibold text-slate-600">
              {/* Outlet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Outlet</label>
                <div className="relative flex items-center">
                  <HiOutlineBuildingOffice className="absolute left-3 text-slate-400 h-4 w-4" />
                  <select
                    value={formOutlet || ""}
                    onChange={(e) => setFormOutlet(e.target.value)}
                    disabled={selectedTarget != null} // cannot change outlet in edit mode
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 disabled:bg-slate-100"
                  >
                    <option value="">Cleanox</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tahun & Bulan Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Tahun */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tahun</label>
                  <div className="relative flex items-center">
                    <HiOutlineCalendarDays className="absolute left-3 text-slate-400 h-4 w-4" />
                    <input
                      type="number"
                      min={2020}
                      max={2100}
                      required
                      value={formTahun}
                      onChange={(e) => setFormTahun(e.target.value)}
                      disabled={selectedTarget != null} // cannot change year in edit mode
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Bulan */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Bulan</label>
                  <select
                    value={formBulan}
                    onChange={(e) => setFormBulan(Number(e.target.value))}
                    disabled={selectedTarget != null} // cannot change month in edit mode
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10 disabled:bg-slate-100"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nominal Target */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nominal Target (Rp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-slate-400 select-none">Rp</span>
                  <input
                    type="text"
                    required
                    value={formatRupiahNumber(formNominal)}
                    onChange={(e) => setFormNominal(unformatRupiahNumber(e.target.value))}
                    placeholder="Contoh: 15.000.000"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#1b3459] focus:ring-2 focus:ring-[#1b3459]/10"
                  />
                </div>
              </div>

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
        title="Hapus Target Cleanox"
        message={`Apakah Anda yakin ingin menghapus target Cleanox untuk "${deleteTarget?.outlet}" periode ${deleteTarget ? MONTH_NAMES[deleteTarget.bulan - 1] : ""} ${deleteTarget?.tahun}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </main>
  );
}
