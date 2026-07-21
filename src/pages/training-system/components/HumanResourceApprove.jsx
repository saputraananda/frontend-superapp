import { useState } from "react";
import { api, apiUpload } from "../../../lib/api";
import {
  HiOutlineCheck,
  HiOutlineXMark,
  HiOutlineCalendar,
  HiOutlineArrowUpTray,
  HiOutlineClock,
  HiOutlineDocumentText
} from "react-icons/hi2";

export default function HumanResourceApprove({ training, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(training.scheduled_date || "");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState(null);

  const trainingId = training.id;

  // HRD Action: Mulai Review
  const handleStartReview = async () => {
    setLoading(true);
    setError(null);
    try {
      await api(`/training/${trainingId}/hrd-approve`, {
        method: "POST"
      });
      if (onSuccess) onSuccess("Status berhasil diperbarui menjadi 'Dalam Proses Review'!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal memperbarui status review");
    } finally {
      setLoading(false);
    }
  };

  // HRD Action: Simpan Tanggal & Jadwalkan
  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!scheduledDate) {
      setError("Tanggal pelaksanaan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api(`/training/${trainingId}/hrd-schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduled_date: scheduledDate })
      });
      if (onSuccess) onSuccess("Training berhasil dijadwalkan!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menjadwalkan training");
    } finally {
      setLoading(false);
    }
  };

  // HRD Action: Selesaikan Training (Upload Evidence)
  const handleComplete = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError("Silakan unggah minimal 1 bukti pelaksanaan training (foto/dokumen)");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("evidence", file);
    }

    try {
      await apiUpload(`/training/${trainingId}/hrd-complete`, {
        method: "POST",
        body: formData
      });
      if (onSuccess) onSuccess("Training berhasil diselesaikan!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menyelesaikan training");
    } finally {
      setLoading(false);
    }
  };

  // HRD Action: Tolak Pengajuan
  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setError("Alasan penolakan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api(`/training/${trainingId}/hrd-reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      if (onSuccess) onSuccess("Pengajuan training ditolak oleh HRD.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menolak pengajuan");
    } finally {
      setLoading(false);
    }
  };

  // Render appropriate controls based on status
  const renderControls = () => {
    if (showRejectForm) {
      return (
        <form onSubmit={handleReject} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Alasan Penolakan HRD <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Jelaskan alasan detail mengapa pengajuan training ini ditolak oleh HRD..."
              rows={3}
              className="rounded-xl border border-slate-300 bg-white shadow-sm p-3 text-xs text-slate-800 outline-none focus:border-rose-500 transition resize-none w-full"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason("");
                setError(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <HiOutlineClock className="h-4 w-4 animate-spin" />
              ) : (
                <HiOutlineXMark className="h-4 w-4" />
              )}
              Tolak Pengajuan
            </button>
          </div>
        </form>
      );
    }

    switch (training.status) {
      case "Pending_HRD":
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Pengajuan ini siap untuk diproses oleh HRD. Klik **Mulai Review** untuk memindahkan status menjadi Dalam Proses Review.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectForm(true)}
                className="rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 px-4 py-2.5 text-xs font-semibold transition"
                disabled={loading}
              >
                Tolak Pengajuan
              </button>
              <button
                onClick={handleStartReview}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-amber-500/10 transition flex items-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <HiOutlineClock className="h-4 w-4 animate-spin" />
                ) : (
                  <HiOutlineCheck className="h-4 w-4" />
                )}
                Mulai Review
              </button>
            </div>
          </div>
        );

      case "Review":
        return (
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">
                Tanggal Pelaksanaan Training <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white shadow-sm pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                  required
                />
                <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 px-4 py-2.5 text-xs font-semibold transition"
                disabled={loading}
              >
                Tolak Pengajuan
              </button>
              <button
                type="submit"
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-amber-500/10 transition flex items-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <HiOutlineClock className="h-4 w-4 animate-spin" />
                ) : (
                  <HiOutlineCheck className="h-4 w-4" />
                )}
                Simpan & Jadwalkan
              </button>
            </div>
          </form>
        );

      case "Scheduled":
        return (
          <div className="space-y-6">
            {/* Form untuk mengubah Jadwal Pelaksanaan */}
            <form onSubmit={handleSchedule} className="space-y-3 pb-5 border-b border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">
                  Ubah Tanggal Pelaksanaan Terjadwal
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white shadow-sm pl-10 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:border-amber-500 transition w-full"
                      required
                    />
                    <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !scheduledDate || scheduledDate === training.scheduled_date}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-amber-500/10 transition shrink-0"
                  >
                    Ubah Jadwal
                  </button>
                </div>
              </div>
            </form>

            <form onSubmit={handleComplete} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  Unggah Bukti Acara / Dokumentasi Training (Foto/Dokumen, Bisa lebih dari 1) <span className="text-rose-500">*</span>
                </label>
                
                <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-amber-500 transition cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        const newFiles = Array.from(e.target.files);
                        setSelectedFiles(prev => {
                          const existingNames = prev.map(f => `${f.name}-${f.size}`);
                          const filteredNew = newFiles.filter(f => !existingNames.includes(`${f.name}-${f.size}`));
                          return [...prev, ...filteredNew];
                        });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <HiOutlineArrowUpTray className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-600 block">Pilih file untuk diunggah</span>
                  <span className="text-[10px] text-slate-400 block mt-1">Mendukung gambar & dokumen PDF, max 10MB per file</span>
                </div>

                {/* Uploaded Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">File terpilih:</span>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-100/60 rounded-lg p-2 text-xs border border-slate-200">
                        <div className="flex items-center gap-2 truncate">
                          <HiOutlineDocumentText className="h-4 w-4 text-slate-500 shrink-0" />
                          <span className="truncate font-semibold text-slate-700">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 transition shrink-0"
                        >
                          <HiOutlineXMark className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 px-4 py-2.5 text-xs font-semibold transition"
                  disabled={loading}
                >
                  Tolak Pengajuan
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/10 transition flex items-center gap-1.5"
                  disabled={loading}
                >
                  {loading ? (
                    <HiOutlineClock className="h-4 w-4 animate-spin" />
                  ) : (
                    <HiOutlineCheck className="h-4 w-4" />
                  )}
                  Selesaikan Training
                </button>
              </div>
            </form>
          </div>
        );

      default:
        return (
          <div className="text-center p-4 bg-slate-50 rounded-2xl text-xs text-slate-400">
            Persetujuan HRD tidak tersedia untuk status saat ini.
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {renderControls()}
    </div>
  );
}
