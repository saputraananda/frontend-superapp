import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineChartBarSquare } from "react-icons/hi2";

export default function ComparisonReportPage() {
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/admin-dashboard/charts");
      setComparison(res.data?.outlet_comparison || []);
    } catch (err) {
      console.error("Error loading outlet comparison:", err);
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

  const totalRevenue = comparison.reduce((sum, item) => sum + parseFloat(item.revenue || 0), 0);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Comparison Report</h1>
        <p className="text-sm text-slate-500">Perbandingan kontribusi omset penjualan dan total nota antar outlet secara real-time</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : comparison.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
          <HiOutlineChartBarSquare className="h-12 w-12 mx-auto stroke-1" />
          <p className="mt-2 text-sm">Tidak ada data transaksi pembanding ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Contribution summary */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800">Persentase Kontribusi Omset</h2>
            <div className="space-y-4">
              {comparison.map((item) => {
                const pct = totalRevenue > 0 ? (parseFloat(item.revenue || 0) / totalRevenue) * 100 : 0;
                return (
                  <div key={item.outlet_name} className="space-y-1.5">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-700">{item.outlet_name}</span>
                      <span className="text-slate-500">{formatRupiah(item.revenue)} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-600 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outlets table comparison */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">Detail Perbandingan Finansial</h2>
            </div>
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Nama Outlet</th>
                  <th className="p-4 font-semibold text-right">Total Transaksi</th>
                  <th className="p-4 font-semibold text-right">Rata-rata Nota (Average Basket Size)</th>
                  <th className="p-4 font-semibold text-right">Kontribusi Omset</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.map((row) => {
                  const avg = row.transactions > 0 ? row.revenue / row.transactions : 0;
                  return (
                    <tr key={row.outlet_name} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                      <td className="p-4 text-right font-medium">{row.transactions} Nota</td>
                      <td className="p-4 text-right font-semibold text-slate-700">{formatRupiah(avg)}</td>
                      <td className="p-4 text-right font-bold text-violet-600">{formatRupiah(row.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
