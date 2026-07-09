import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineExclamationTriangle, HiOutlineCheckCircle } from "react-icons/hi2";

export default function ErrorDashboardPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/errors");
      setErrors(res.data || []);
    } catch (err) {
      console.error("Error loading error logs:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (id) => {
    try {
      setActionId(id);
      const notes = prompt("Masukkan catatan penyelesaian error:");
      if (notes === null) return;

      await api(`/api/errors/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ notes })
      });
      loadData();
    } catch (err) {
      console.error("Error resolving log:", err);
      alert("Gagal memperbarui log error: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Error Tracking Dashboard</h1>
        <p className="text-sm text-slate-500">Log penelusuran runtime error, exception handler, dan bug tracing aplikasi POS</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat data log error...</p>
          </div>
        ) : errors.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCheckCircle className="h-12 w-12 mx-auto text-emerald-500 stroke-1" />
            <p className="mt-2 text-sm font-semibold">Bagus! Tidak ada error terekam saat ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Tipe Error</th>
                  <th className="p-4 font-semibold">Pesan</th>
                  <th className="p-4 font-semibold">Endpoint</th>
                  <th className="p-4 font-semibold">Severity</th>
                  <th className="p-4 font-semibold">Tanggal Kejadian</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {errors.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800 text-xs">{row.error_type}</td>
                    <td className="p-4 text-xs font-mono max-w-xs truncate text-red-600" title={row.error_message}>{row.error_message}</td>
                    <td className="p-4 text-xs text-slate-500">{row.method ? `[${row.method}]` : ""} {row.endpoint}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.severity === "critical" ? "bg-red-50 text-red-700" : row.severity === "high" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                        {row.severity}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">{new Date(row.occurred_at).toLocaleString("id-ID")}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "resolved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {row.status !== "resolved" ? (
                        <button
                          disabled={actionId !== null}
                          onClick={() => handleResolve(row.id)}
                          className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Resolved</span>
                      )}
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
