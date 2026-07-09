import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineChartBarSquare, HiOutlinePlus } from "react-icons/hi2";

export default function AdminTargetPage() {
  const [targets, setTargets] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ outlet_id: "", period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1, target_amount: "", notes: "" });

  async function loadData() {
    try {
      setLoading(true);
      const targetRes = await api("/api/targets");
      const outletRes = await api("/api/master/outlets");
      setTargets(targetRes.data || []);
      setOutlets(outletRes.data || []);
    } catch (err) {
      console.error("Error loading targets:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api("/api/targets", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowForm(false);
      setForm({ outlet_id: "", period_year: new Date().getFullYear(), period_month: new Date().getMonth() + 1, target_amount: "", notes: "" });
      loadData();
    } catch (err) {
      console.error("Error saving target:", err);
      alert("Gagal menyimpan target: " + err.message);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-800">Target Management</h1>
          <p className="text-sm text-slate-500">Kelola target omset bulanan untuk masing-masing outlet laundry</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Target
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">Tambah/Perbarui Target Omset</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Outlet</label>
              <select
                value={form.outlet_id}
                onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              >
                <option value="">Pilih Outlet</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tahun</label>
              <input
                type="number"
                value={form.period_year}
                onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Bulan</label>
              <select
                value={form.period_month}
                onChange={(e) => setForm({ ...form, period_month: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Target Omset (Rp)</label>
              <input
                type="number"
                value={form.target_amount}
                onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: 50000000"
                required
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Catatan</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                rows="2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Simpan Target
            </button>
          </div>
        </form>
      )}

      {/* Target list table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat target...</p>
          </div>
        ) : targets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineChartBarSquare className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada target omset dikonfigurasi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Periode</th>
                  <th className="p-4 font-semibold text-right">Target Omset</th>
                  <th className="p-4 font-semibold">Catatan</th>
                  <th className="p-4 font-semibold">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targets.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-medium">{getMonthName(row.period_month)} {row.period_year}</td>
                    <td className="p-4 text-right font-bold text-violet-600">{formatRupiah(row.target_amount)}</td>
                    <td className="p-4 text-slate-500 text-xs">{row.notes || "-"}</td>
                    <td className="p-4 text-slate-400 text-xs">{row.creator_name}</td>
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
