import React, { useState, useEffect, useCallback } from "react";
import {
  HiOutlineSun,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCheck,
  HiOutlineCalendar,
  HiOutlineInformationCircle,
  HiOutlinePencilAlt,
  HiOutlineRefresh,
} from "react-icons/hi";
import { api } from "../../../lib/api";

export default function HariLiburAlora() {
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [cutoffs, setCutoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingMonth, setSavingMonth] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal edit state
  const [modalItem, setModalItem] = useState(null);
  const [editDays, setEditDays] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [modalSaving, setModalSaving] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCutoffs = useCallback(async (year) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/alora/holidays/cutoff?year=${year}`);
      if (res?.success) {
        setCutoffs(res.cutoffs || []);
      } else {
        setError(res?.message || "Gagal memuat data hari libur cut-off");
      }
    } catch (err) {
      console.error("[HariLibur] fetchCutoffs:", err);
      setError(err?.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCutoffs(selectedYear);
  }, [selectedYear, fetchCutoffs]);

  const handleOpenEdit = (item) => {
    setModalItem(item);
    setEditDays(item.additional_holiday_days || 0);
    setEditNotes(item.notes || "");
  };

  const handleCloseModal = () => {
    setModalItem(null);
    setEditDays(0);
    setEditNotes("");
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalItem) return;
    setModalSaving(true);
    try {
      const res = await api("/alora/holidays/cutoff", {
        method: "POST",
        body: JSON.stringify({
          cutoff_month: modalItem.cutoff_month,
          cutoff_year: modalItem.cutoff_year,
          additional_holiday_days: Number(editDays) || 0,
          notes: editNotes,
        }),
      });

      if (res?.success) {
        showToast(res.message || "Berhasil disimpan", "success");
        handleCloseModal();
        fetchCutoffs(selectedYear);
      } else {
        showToast(res?.message || "Gagal menyimpan data", "error");
      }
    } catch (err) {
      console.error("[HariLibur] handleSaveModal:", err);
      showToast(err?.message || "Gagal menyimpan data", "error");
    } finally {
      setModalSaving(false);
    }
  };

  // Quick inline save from table input
  const handleInlineSave = async (item, newDays, newNotes) => {
    setSavingMonth(item.cutoff_month);
    try {
      const res = await api("/alora/holidays/cutoff", {
        method: "POST",
        body: JSON.stringify({
          cutoff_month: item.cutoff_month,
          cutoff_year: item.cutoff_year,
          additional_holiday_days: Math.max(0, parseInt(newDays, 10) || 0),
          notes: newNotes !== undefined ? newNotes : item.notes,
        }),
      });

      if (res?.success) {
        showToast(`Libur cut-off ${item.month_name} diperbarui`, "success");
        fetchCutoffs(selectedYear);
      } else {
        showToast(res?.message || "Gagal memperbarui", "error");
      }
    } catch (err) {
      console.error("[HariLibur] handleInlineSave:", err);
      showToast(err?.message || "Gagal menyimpan", "error");
    } finally {
      setSavingMonth(null);
    }
  };

  // Calculate annual stats
  const totalDaysYear = cutoffs.reduce((acc, c) => acc + (c.total_days || 0), 0);
  const totalSundaysYear = cutoffs.reduce((acc, c) => acc + (c.sunday_days || 0), 0);
  const totalAdditionalHolidays = cutoffs.reduce((acc, c) => acc + (c.additional_holiday_days || 0), 0);
  const totalWorkDaysYear = cutoffs.reduce((acc, c) => acc + (c.work_days || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          {toast.type === "error" ? (
            <HiOutlineInformationCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          ) : (
            <HiOutlineCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            <HiOutlineCalendar className="w-4 h-4" />
            <span>Master Karyawan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Hari Libur per Cut-Off
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola jumlah hari libur tambahan per periode cut-off (26 bulan lalu s/d 25 bulan berjalan).
            Hari Minggu otomatis dihitung sebagai hari libur default.
          </p>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y - 1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Tahun Sebelumnya"
          >
            <HiOutlineChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-1 font-bold text-slate-800 text-base">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={() => setSelectedYear((y) => y + 1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            title="Tahun Selanjutnya"
          >
            <HiOutlineChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => fetchCutoffs(selectedYear)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition ml-1"
            title="Muat Ulang"
          >
            <HiOutlineRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Annual Summary Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Hari {selectedYear}
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {totalDaysYear}{" "}
            <span className="text-xs font-medium text-slate-500">hari</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">12 periode cut-off</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Hari Minggu (Default)
          </span>
          <div className="text-2xl font-black text-slate-700 mt-1">
            {totalSundaysYear}{" "}
            <span className="text-xs font-medium text-slate-500">hari</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Libur rutin mingguan</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/90 bg-blue-50/30 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Libur Tambahan
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {totalAdditionalHolidays}{" "}
            <span className="text-xs font-medium text-blue-500">hari</span>
          </div>
          <p className="text-[11px] text-blue-500/80 mt-1">Nasional & cuti bersama</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/30 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Hari Kerja Efektif
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {totalWorkDaysYear}{" "}
            <span className="text-xs font-medium text-emerald-600">hari</span>
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1">Total hari kerja bersih</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-blue-800 text-xs sm:text-sm">
        <HiOutlineInformationCircle className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900">
            Formula Perhitungan Hari Kerja per Cut-Off:
          </p>
          <p className="text-blue-700 mt-0.5">
            <strong>Hari Kerja</strong> = <strong>Total Hari</strong> - (<strong>Hari Minggu</strong> + <strong>Libur Tambahan</strong>).
            Anda cukup mengisi kolom <strong>Libur Tambahan</strong> di bawah, sistem Alora Mobile akan otomatis menghitung hari kerja karyawan.
          </p>
        </div>
      </div>

      {/* Cutoff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HiOutlineSun className="w-5 h-5 text-amber-500" />
            <span>Daftar 12 Periode Cut-Off Tahun {selectedYear}</span>
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Format: 26 bulan lalu s/d 25 bulan ini
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineRefresh className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-sm">Memuat data periode cut-off...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Periode Cut-Off</th>
                  <th className="py-3.5 px-4 text-center">Total Hari</th>
                  <th className="py-3.5 px-4 text-center">Minggu (Default)</th>
                  <th className="py-3.5 px-5 text-center">Libur Tambahan</th>
                  <th className="py-3.5 px-4 text-center">Total Libur</th>
                  <th className="py-3.5 px-4 text-center">Hari Kerja</th>
                  <th className="py-3.5 px-5">Keterangan / Hari Libur</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {cutoffs.map((item) => {
                  const isCurrentMonth =
                    item.cutoff_year === new Date().getFullYear() &&
                    item.cutoff_month === new Date().getMonth() + 1;

                  return (
                    <tr
                      key={item.cutoff_month}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentMonth ? "bg-blue-50/20 font-medium" : ""
                      }`}
                    >
                      {/* Periode Name & Range */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">
                            {item.month_name} {item.cutoff_year}
                          </span>
                          {isCurrentMonth && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full">
                              Bulan Ini
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {item.period_range_label}
                        </span>
                      </td>

                      {/* Total Days */}
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                        {item.total_days}
                      </td>

                      {/* Sundays */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg">
                          {item.sunday_days} hari
                        </span>
                      </td>

                      {/* Additional Holidays (Editable) */}
                      <td className="py-3.5 px-5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={item.total_days}
                            defaultValue={item.additional_holiday_days || 0}
                            key={`${item.cutoff_month}-${item.additional_holiday_days}`}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val !== item.additional_holiday_days) {
                                handleInlineSave(item, val);
                              }
                            }}
                            className="w-16 text-center font-bold text-blue-600 bg-white border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                          />
                          <span className="text-xs text-slate-400">hari</span>
                        </div>
                      </td>

                      {/* Total Holidays (Sundays + Additional) */}
                      <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                        {item.total_holidays} hari
                      </td>

                      {/* Work Days */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-3 py-1 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                          {item.work_days} hari
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-5 max-w-xs">
                        <span className="text-xs text-slate-500 line-clamp-1">
                          {item.notes || <em className="text-slate-300">- Belum ada catatan -</em>}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                        >
                          <HiOutlinePencilAlt className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Edit Libur Cut-Off {modalItem.month_name} {modalItem.cutoff_year}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode: {modalItem.period_range_label} ({modalItem.total_days} hari)
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Minggu default */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Hari Minggu (Default Libur)</span>
                <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  {modalItem.sunday_days} hari
                </span>
              </div>

              {/* Input Libur Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Jumlah Hari Libur Tambahan <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max={modalItem.total_days}
                    value={editDays}
                    onChange={(e) => setEditDays(e.target.value)}
                    required
                    className="w-full text-base font-bold text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="0"
                  />
                  <span className="text-sm font-semibold text-slate-500 whitespace-nowrap">
                    hari
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan jumlah hari libur nasional / cuti bersama selain hari Minggu.
                </p>
              </div>

              {/* Preview Hasil */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Estimasi Hari Kerja:</span>
                <span className="text-sm font-black text-emerald-700">
                  {Math.max(
                    0,
                    modalItem.total_days - modalItem.sunday_days - (Number(editDays) || 0)
                  )}{" "}
                  hari
                </span>
              </div>

              {/* Input Keterangan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Contoh: Maulid Nabi & Cuti Bersama"
                  className="w-full text-sm text-slate-800 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {modalSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
