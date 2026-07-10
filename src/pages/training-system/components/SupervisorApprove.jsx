import { useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCheck, HiOutlineXMark, HiOutlineClock } from "react-icons/hi2";

export default function SupervisorApprove({ trainingId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      await api(`/training/${trainingId}/supervisor-approve`, {
        method: "POST"
      });
      if (onSuccess) onSuccess("Pengajuan berhasil disetujui supervisor!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menyetujui pengajuan");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan penolakan wajib diisi");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api(`/training/${trainingId}/supervisor-reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() })
      });
      if (onSuccess) onSuccess("Pengajuan telah ditolak oleh supervisor!");
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal menolak pengajuan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {!showRejectForm ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Apakah Anda yakin ingin memproses persetujuan pengajuan training ini?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowRejectForm(true)}
              className="rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 px-4 py-2.5 text-xs font-semibold transition"
              disabled={loading}
            >
              Tolak Pengajuan
            </button>
            <button
              onClick={handleApprove}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/10 transition flex items-center gap-1.5"
              disabled={loading}
            >
              {loading ? (
                <HiOutlineClock className="h-4 w-4 animate-spin" />
              ) : (
                <HiOutlineCheck className="h-4 w-4" />
              )}
              Setujui
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleReject} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">
              Alasan Penolakan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis alasan mengapa pengajuan training ditolak..."
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
                setReason("");
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
              Tolak Permanen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
