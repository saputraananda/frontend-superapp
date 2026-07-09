import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineDocumentText } from "react-icons/hi2";

export default function GeneralReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ start_date: "", end_date: "" });

  async function loadReport() {
    try {
      setLoading(true);
      const query = new URLSearchParams(filter).toString();
      const res = await api(`/api/reports/transactions?${query}`);
      setData(res.data || []);
    } catch (err) {
      console.error("Error loading general transactions report:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [filter]);

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
        <h1 className="text-2xl font-bold text-slate-800">General Reports</h1>
        <p className="text-sm text-slate-500">Log mutasi nota penjualan laundry terintegrasi secara keseluruhan</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <input
            type="date"
            value={filter.start_date}
            onChange={(e) => setFilter({ ...filter, start_date: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
          />
          <input
            type="date"
            value={filter.end_date}
            onChange={(e) => setFilter({ ...filter, end_date: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
          />
        </div>
        <button
          onClick={() => loadReport()}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
        >
          Terapkan Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat laporan...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineDocumentText className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada transaksi ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">No. Nota</th>
                  <th className="p-4 font-semibold">Pelanggan</th>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Pembayaran</th>
                  <th className="p-4 font-semibold text-right">Total (Rp)</th>
                  <th className="p-4 font-semibold">Tanggal Dibuat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.transaction_no}</td>
                    <td className="p-4 font-semibold">{row.customer_name || "Guest"}</td>
                    <td className="p-4 font-medium text-slate-500">{row.outlet_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.payment_status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-violet-600">{formatRupiah(row.total)}</td>
                    <td className="p-4 text-xs text-slate-400">{new Date(row.created_at).toLocaleString("id-ID")}</td>
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
