import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCurrencyDollar, HiOutlineCheckCircle } from "react-icons/hi2";

export default function SetorApprovalPage() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/finance/deposits");
      setDeposits(res.data || []);
    } catch (err) {
      console.error("Error loading deposits:", err);
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
        <h1 className="text-2xl font-bold text-slate-800">Setoran Kas Outlet</h1>
        <p className="text-sm text-slate-500">Daftar rekonsiliasi setoran dana kasir ke kas pusat/bank</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat setoran...</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCurrencyDollar className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada setoran tercatat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Kasir</th>
                  <th className="p-4 font-semibold">Tanggal Transaksi</th>
                  <th className="p-4 font-semibold text-right">Uang Disetor</th>
                  <th className="p-4 font-semibold text-right">Penjualan Tunai</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Ditinjau Oleh</th>
                  <th className="p-4 font-semibold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-semibold">{row.cashier_name}</td>
                    <td className="p-4 text-xs text-slate-500">{new Date(row.deposit_date).toLocaleDateString("id-ID")}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{formatRupiah(row.deposit_amount)}</td>
                    <td className="p-4 text-right font-medium text-slate-800">{formatRupiah(row.cash_sales_total)}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "approved" ? "bg-emerald-50 text-emerald-700" : row.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400">{row.approved_by_name || "-"}</td>
                    <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{row.notes || "-"}</td>
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
