import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineArrowTrendingUp, HiOutlineCalendarDays } from "react-icons/hi2";

export default function ForecastPage() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await api("/api/admin-dashboard/charts");
        const list = res.data?.monthly_trends || [];
        setTrends(list);

        if (list.length >= 2) {
          // Calculate growth rate between last two months
          const last = parseFloat(list[list.length - 1].revenue) || 0;
          const prev = parseFloat(list[list.length - 2].revenue) || 0;
          
          if (prev > 0) {
            const growth = ((last - prev) / prev) * 100;
            setGrowthRate(growth);
            setForecast(last * (1 + growth / 100));
          } else {
            setForecast(last);
          }
        } else if (list.length === 1) {
          setForecast(parseFloat(list[0].revenue) || 0);
        }
      } catch (err) {
        console.error("Error loading forecast data:", err);
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

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Revenue Forecast</h1>
        <p className="text-sm text-slate-500">Prediksi omset pendapatan bulan depan berdasarkan tren penjualan historis</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : trends.length < 2 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm max-w-md mx-auto">
          <HiOutlineArrowTrendingUp className="h-12 w-12 mx-auto stroke-1" />
          <p className="mt-2 text-sm">Dibutuhkan minimal data transaksi dari 2 bulan yang lalu untuk menghitung prediksi pendapatan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Forecast Box */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-500 p-6 rounded-2xl shadow-md text-white md:col-span-2 flex flex-col justify-between hover:shadow-lg transition">
            <div className="space-y-2">
              <span className="bg-white/20 text-xs font-semibold px-2.5 py-1 rounded-full uppercase">Bulan Depan</span>
              <h2 className="text-lg font-semibold">Prediksi Omset Pendapatan</h2>
              <p className="text-3xl font-black">{formatRupiah(forecast)}</p>
            </div>
            <div className="border-t border-white/20 pt-4 mt-6 flex justify-between text-xs text-violet-100">
              <span>Laju Pertumbuhan:</span>
              <span className={`font-bold ${growthRate >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}% dari bulan lalu
              </span>
            </div>
          </div>

          {/* Historical reference */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <HiOutlineCalendarDays className="h-5 w-5 text-violet-500" />
              Omset Bulan Terakhir
            </h3>
            <div className="space-y-3">
              {trends.slice(-3).map((item) => (
                <div key={item.month} className="flex justify-between p-3 bg-slate-50 rounded-xl text-sm">
                  <span className="font-semibold text-slate-600">{item.month}</span>
                  <span className="font-bold text-slate-800">{formatRupiah(item.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
