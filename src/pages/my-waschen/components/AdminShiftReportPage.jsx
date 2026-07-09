import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineClock, HiOutlineDocumentText } from "react-icons/hi2";

export default function AdminShiftReportPage() {
  const [sessions, setSessions] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("sessions");

  async function loadData() {
    try {
      setLoading(true);
      const sessionRes = await api("/api/shifts/sessions");
      const handoverRes = await api("/api/shifts/handovers");
      setSessions(sessionRes.data || []);
      setHandovers(handoverRes.data || []);
    } catch (err) {
      console.error("Error loading shift reports:", err);
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
        <h1 className="text-2xl font-bold text-slate-800">Admin Shift Reports</h1>
        <p className="text-sm text-slate-500">Log pembukaan kasir, penutupan shift kasir, dan berita acara serah terima (handover)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("sessions")}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "sessions" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Shift Sessions (Kasir)
        </button>
        <button
          onClick={() => setActiveTab("handovers")}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "handovers" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Berita Acara Handover
        </button>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {activeTab === "sessions" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Outlet</th>
                    <th className="p-4 font-semibold">Kasir</th>
                    <th className="p-4 font-semibold">Tanggal</th>
                    <th className="p-4 font-semibold">Shift</th>
                    <th className="p-4 font-semibold text-right">Kas Awal</th>
                    <th className="p-4 font-semibold text-right">Kas Akhir</th>
                    <th className="p-4 font-semibold text-right">Kas Sistem</th>
                    <th className="p-4 font-semibold text-right">Selisih</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{s.outlet_name}</td>
                      <td className="p-4 font-semibold">{s.cashier_name || s.shift_user_name}</td>
                      <td className="p-4 text-xs text-slate-500">{new Date(s.session_date).toLocaleDateString("id-ID")}</td>
                      <td className="p-4 uppercase text-xs font-semibold text-violet-600">{s.shift}</td>
                      <td className="p-4 text-right font-medium">{formatRupiah(s.opening_cash)}</td>
                      <td className="p-4 text-right font-medium">{formatRupiah(s.closing_cash)}</td>
                      <td className="p-4 text-right font-medium text-slate-400">{formatRupiah(s.system_cash)}</td>
                      <td className="p-4 text-right font-bold text-red-500">{formatRupiah(s.cash_diff)}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.status === "closed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "handovers" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Tanggal</th>
                    <th className="p-4 font-semibold">Kasir Keluar</th>
                    <th className="p-4 font-semibold">Kasir Masuk</th>
                    <th className="p-4 font-semibold text-right">Uang Handover</th>
                    <th className="p-4 font-semibold text-right">Uang Diterima</th>
                    <th className="p-4 font-semibold text-right">Selisih</th>
                    <th className="p-4 font-semibold">Status Acknowledge</th>
                    <th className="p-4 font-semibold">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="p-4 text-xs text-slate-500">{new Date(h.created_at).toLocaleString("id-ID")}</td>
                      <td className="p-4 font-semibold text-slate-800">{h.outgoing_cashier_name}</td>
                      <td className="p-4 font-semibold text-slate-800">{h.incoming_cashier_name}</td>
                      <td className="p-4 text-right font-medium">{formatRupiah(h.outgoing_ending_cash)}</td>
                      <td className="p-4 text-right font-medium">{formatRupiah(h.incoming_beginning_cash)}</td>
                      <td className="p-4 text-right font-bold text-red-500">{formatRupiah(h.variance_at_handover)}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${h.acknowledged ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {h.acknowledged ? "Sudah Diakui" : "Tertunda"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">{h.handover_notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
