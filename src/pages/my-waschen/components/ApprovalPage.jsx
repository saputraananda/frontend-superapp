import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCheckCircle, HiOutlineClock } from "react-icons/hi2";

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      // We can fetch from audit log or approvals endpoint. Let's fetch approvals list
      // Since our main approvals endpoint returns split categories, let's merge them into a single list for audit view.
      const res = await api("/api/approvals");
      const merged = [
        ...(res.data?.transactions || []).map(t => ({ ...t, approval_type: "Transaksi", date: t.requested_at })),
        ...(res.data?.expenses || []).map(e => ({ ...e, approval_type: "Pengeluaran", date: e.created_at, transaction_no: e.category, reason: e.description })),
        ...(res.data?.deposits || []).map(d => ({ ...d, approval_type: "Setoran Kas", date: d.created_at, transaction_no: `Setor ${d.deposit_date}`, reason: d.notes }))
      ];
      // Sort by date desc
      merged.sort((a, b) => new Date(b.date) - new Date(a.date));
      setApprovals(merged);
    } catch (err) {
      console.error("Error loading approval history:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Approval List & History</h1>
        <p className="text-sm text-slate-500">Log riwayat peninjauan persetujuan transaksi dan keuangan outlet</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat riwayat persetujuan...</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCheckCircle className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada riwayat persetujuan tercatat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Tipe</th>
                  <th className="p-4 font-semibold">Referensi</th>
                  <th className="p-4 font-semibold">Diajukan Oleh</th>
                  <th className="p-4 font-semibold">Alasan/Catatan</th>
                  <th className="p-4 font-semibold">Tanggal Pengajuan</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800 uppercase text-xs">{row.approval_type}</td>
                    <td className="p-4 font-semibold text-violet-600">{row.transaction_no}</td>
                    <td className="p-4">{row.requester_name || row.cashier_name}</td>
                    <td className="p-4 text-xs text-slate-500 max-w-sm truncate">{row.reason}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(row.date).toLocaleString("id-ID")}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "approved" || row.status === "auto_approved" ? "bg-emerald-50 text-emerald-700" : row.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
