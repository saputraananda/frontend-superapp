import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineClock, HiOutlineClipboardDocumentList } from "react-icons/hi2";

export default function AdminSubSessionPage() {
  const [subSessions, setSubSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/shifts/sub-sessions");
      setSubSessions(res.data || []);
    } catch (err) {
      console.error("Error loading sub sessions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Frontliner Sub-Sessions</h1>
        <p className="text-sm text-slate-500">Log akuntabilitas sesi kasir individu per frontliner di outlet</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat sub-session...</p>
          </div>
        ) : subSessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineClipboardDocumentList className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada data sub-session tercatat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Frontliner</th>
                  <th className="p-4 font-semibold">Shift</th>
                  <th className="p-4 font-semibold">Dibuka Pada</th>
                  <th className="p-4 font-semibold">Ditutup Pada</th>
                  <th className="p-4 font-semibold text-right">Saldo Awal</th>
                  <th className="p-4 font-semibold text-right">Saldo Akhir</th>
                  <th className="p-4 font-semibold text-right">Diharapkan</th>
                  <th className="p-4 font-semibold text-right">Selisih</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subSessions.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-semibold">{row.cashier_name}</td>
                    <td className="p-4 uppercase text-xs font-semibold text-violet-600">{row.shift}</td>
                    <td className="p-4 text-xs text-slate-500">{new Date(row.opened_at).toLocaleString("id-ID")}</td>
                    <td className="p-4 text-xs text-slate-500">{row.closed_at ? new Date(row.closed_at).toLocaleString("id-ID") : "-"}</td>
                    <td className="p-4 text-right font-medium">{formatRupiah(row.beginning_cash)}</td>
                    <td className="p-4 text-right font-medium">{formatRupiah(row.ending_cash)}</td>
                    <td className="p-4 text-right font-medium text-slate-400">{formatRupiah(row.expected_cash)}</td>
                    <td className="p-4 text-right font-bold text-red-500">{formatRupiah(row.variance)}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
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
