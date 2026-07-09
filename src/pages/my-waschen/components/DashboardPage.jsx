import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import {
  HiOutlineCurrencyDollar,
  HiOutlineShoppingCart,
  HiOutlineBuildingStorefront,
  HiOutlineUsers,
  HiOutlineArrowTrendingUp,
  HiOutlineBanknotes
} from "react-icons/hi2";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const statsRes = await api("/api/dashboard/stats");
        const chartsRes = await api("/api/admin-dashboard/charts");
        setStats(statsRes.data);
        setCharts(chartsRes.data);
        setError(null);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Gagal memuat dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Intelligence</h1>
          <p className="text-sm text-slate-500">Analisis kinerja bisnis laundry Alora Group</p>
        </div>
        <div className="text-sm text-slate-400">
          Last update: {new Date().toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
            <HiOutlineCurrencyDollar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Omset</p>
            <p className="text-lg font-bold text-slate-800">{formatRupiah(stats?.total_revenue)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <HiOutlineShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Total Transaksi</p>
            <p className="text-lg font-bold text-slate-800">{stats?.total_transactions || 0} Nota</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <HiOutlineBuildingStorefront className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Outlet Aktif</p>
            <p className="text-lg font-bold text-slate-800">{stats?.active_outlets || 0} Outlet</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <HiOutlineUsers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Staff Aktif</p>
            <p className="text-lg font-bold text-slate-800">{stats?.active_users || 0} Pengguna</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly trends table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HiOutlineArrowTrendingUp className="h-5 w-5 text-violet-500" />
            Tren Pendapatan Bulanan
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-3 font-semibold rounded-l-xl">Bulan</th>
                  <th className="p-3 font-semibold">Transaksi</th>
                  <th className="p-3 font-semibold rounded-r-xl text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charts?.monthly_trends?.map((item) => (
                  <tr key={item.month} className="hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">{item.month}</td>
                    <td className="p-3">{item.transactions} Nota</td>
                    <td className="p-3 text-right font-bold text-violet-600">{formatRupiah(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HiOutlineBanknotes className="h-5 w-5 text-emerald-500" />
            Metode Pembayaran
          </h2>
          <div className="space-y-3">
            {charts?.payment_methods?.map((item) => (
              <div key={item.method} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-semibold text-slate-700 capitalize">{item.method}</span>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatRupiah(item.total_amount)}</p>
                  <p className="text-xs text-slate-400">{item.total_count} transaksi</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Outlet comparison */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <HiOutlineBuildingStorefront className="h-5 w-5 text-blue-500" />
          Kinerja Omset Per Outlet
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {charts?.outlet_comparison?.map((outlet) => (
            <div key={outlet.outlet_name} className="p-4 rounded-xl border border-slate-100 hover:border-violet-200 transition space-y-2">
              <p className="font-bold text-slate-700">{outlet.outlet_name}</p>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Omset:</span>
                <span className="font-bold text-violet-600">{formatRupiah(outlet.revenue)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Total Nota:</span>
                <span className="font-semibold text-slate-700">{outlet.transactions}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
