import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineChartBarSquare, HiOutlineArrowPath } from "react-icons/hi2";

export default function AdminTargetDetailPage() {
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  async function loadProgress() {
    try {
      setLoading(true);
      const query = new URLSearchParams(filter).toString();
      const res = await api(`/api/targets/daily-progress?${query}`);
      setProgress(res.data || []);
    } catch (err) {
      console.error("Error loading progress:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgress();
  }, [filter]);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getMonthName = (m) => {
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return months[m - 1] || m;
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Target Detail & Progress</h1>
          <p className="text-sm text-slate-500">Pantau pencapaian omset outlet terhadap target bulan ini secara real-time</p>
        </div>
        <button
          onClick={() => loadProgress()}
          className="border border-slate-200 hover:bg-slate-50 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlineArrowPath className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 max-w-md">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase">Tahun</label>
          <input
            type="number"
            value={filter.year}
            onChange={(e) => setFilter({ ...filter, year: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-violet-500"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-slate-400 font-semibold uppercase">Bulan</label>
          <select
            value={filter.month}
            onChange={(e) => setFilter({ ...filter, month: e.target.value })}
            className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-sm focus:outline-violet-500"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : progress.length === 0 ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm">
          <HiOutlineChartBarSquare className="h-12 w-12 mx-auto stroke-1" />
          <p className="mt-2 text-sm font-medium">Tidak ada data progress target bulanan untuk periode ini</p>
        </div>
      ) : (
        <div className="space-y-6">
          {progress.map((row) => (
            <div key={row.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{row.outlet_name}</h3>
                  <p className="text-xs text-slate-400">Periode: {getMonthName(row.period_month)} {row.period_year}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-violet-600">{row.percentage}%</span>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Tercapai</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.min(row.percentage, 100)}%` }}
                />
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Target Omset</p>
                  <p className="font-bold text-slate-700">{formatRupiah(row.target_amount)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Omset Berjalan</p>
                  <p className="font-bold text-violet-600">{formatRupiah(row.actual_revenue)}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Transaksi</p>
                  <p className="font-bold text-slate-700">{row.total_transactions} Nota</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
