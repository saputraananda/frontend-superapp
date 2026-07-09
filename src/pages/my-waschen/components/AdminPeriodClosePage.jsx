import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCalendarDays, HiOutlinePlus } from "react-icons/hi2";

export default function AdminPeriodClosePage() {
  const [periods, setPeriods] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ outlet_id: "", period_label: "", period_start: "", period_end: "", notes: "" });

  async function loadData() {
    try {
      setLoading(true);
      const periodRes = await api("/api/periods");
      const outletRes = await api("/api/master/outlets");
      setPeriods(periodRes.data || []);
      setOutlets(outletRes.data || []);
    } catch (err) {
      console.error("Error loading period close data:", err);
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
      await api("/api/periods/close", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setShowForm(false);
      setForm({ outlet_id: "", period_label: "", period_start: "", period_end: "", notes: "" });
      loadData();
    } catch (err) {
      console.error("Error closing period:", err);
      alert("Gagal melakukan penutupan buku: " + err.message);
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Period Close (Tutup Buku)</h1>
          <p className="text-sm text-slate-500">Proses penutupan pembukuan berkala dan rekapitulasi data penjualan outlet</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tutup Buku Baru
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">Proses Tutup Buku Baru</h3>
          
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

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Label Periode</label>
              <input
                type="text"
                value={form.period_label}
                onChange={(e) => setForm({ ...form, period_label: e.target.value })}
                placeholder="Contoh: Periode Juli 2026 A"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tanggal Mulai</label>
              <input
                type="date"
                value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tanggal Selesai</label>
              <input
                type="date"
                value={form.period_end}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
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
              Proses Tutup Buku
            </button>
          </div>
        </form>
      )}

      {/* Period list table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat data tutup buku...</p>
          </div>
        ) : periods.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCalendarDays className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada periode tutup buku dilakukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Label</th>
                  <th className="p-4 font-semibold">Rentang Tanggal</th>
                  <th className="p-4 font-semibold text-right">Total Omset</th>
                  <th className="p-4 font-semibold text-right">Total Pelunasan</th>
                  <th className="p-4 font-semibold">Transaksi</th>
                  <th className="p-4 font-semibold">Selesai</th>
                  <th className="p-4 font-semibold text-right">Target</th>
                  <th className="p-4 font-semibold">Tutup Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-semibold text-violet-600">{row.period_label}</td>
                    <td className="p-4 text-xs text-slate-500">
                      {new Date(row.period_start).toLocaleDateString("id-ID")} s/d {new Date(row.period_end).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.total_omset)}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{formatRupiah(row.total_pelunasan)}</td>
                    <td className="p-4 font-medium">{row.total_transaksi} Nota</td>
                    <td className="p-4 font-medium text-blue-600">{row.total_selesai} Nota</td>
                    <td className="p-4 text-right font-bold text-slate-400">{formatRupiah(row.target_amount)}</td>
                    <td className="p-4 text-slate-400 text-xs">{row.closed_by_name}</td>
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
