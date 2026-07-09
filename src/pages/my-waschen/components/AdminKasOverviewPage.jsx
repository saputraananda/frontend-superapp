import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineBanknotes, HiOutlineCurrencyDollar } from "react-icons/hi2";

export default function AdminKasOverviewPage() {
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const expenseRes = await api("/api/finance/expenses");
      setExpenses(expenseRes.data || []);
      
      // Let's call /api/outlets to show outlet cash balances if we want to display it
      const outletsRes = await api("/api/outlets/admin/all");
      setBalances(outletsRes.data || []);
    } catch (err) {
      console.error("Error loading kas overview:", err);
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
        <h1 className="text-2xl font-bold text-slate-800">Admin Kas Overview</h1>
        <p className="text-sm text-slate-500">Monitor saldo kas operasional outlet dan rekapitulasi pengeluaran kas kecil</p>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Expenses lists */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <HiOutlineCurrencyDollar className="h-5 w-5 text-violet-500" />
              Daftar Pengeluaran Kas Kecil
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Outlet</th>
                    <th className="p-4 font-semibold">Kategori</th>
                    <th className="p-4 font-semibold">Jumlah (Rp)</th>
                    <th className="p-4 font-semibold">Deskripsi</th>
                    <th className="p-4 font-semibold">Kasir (PIC)</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{e.outlet_name}</td>
                      <td className="p-4 uppercase text-xs font-semibold text-violet-600">{e.category}</td>
                      <td className="p-4 font-bold text-slate-800">{formatRupiah(e.amount)}</td>
                      <td className="p-4 text-xs max-w-xs truncate">{e.description}</td>
                      <td className="p-4">{e.requester_name || e.pic_name}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.status === "approved" || e.status === "auto_approved" ? "bg-emerald-50 text-emerald-700" : e.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
