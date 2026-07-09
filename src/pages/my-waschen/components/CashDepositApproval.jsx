import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCurrencyDollar, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";

export default function CashDepositApproval() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/finance/deposits");
      // Filter only pending deposits for this approval page
      const pending = (res.data || []).filter(d => d.status === "pending");
      setDeposits(pending);
    } catch (err) {
      console.error("Error loading pending deposits:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (id, status) => {
    try {
      setActionId(id);
      const path = status === "approved" 
        ? `/api/cash-deposits/${id}/approve` 
        : `/api/cash-deposits/${id}/reject`;
      
      let body = undefined;
      if (status === "rejected") {
        const reason = prompt("Masukkan alasan penolakan:");
        if (reason === null) return;
        body = JSON.stringify({ reason });
      }

      await api(path, {
        method: "POST",
        body
      });
      loadData();
    } catch (err) {
      console.error("Error resolving deposit:", err);
      alert("Gagal memproses setoran: " + err.message);
    } finally {
      setActionId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Cash Deposit Approvals</h1>
        <p className="text-sm text-slate-500">Persetujuan setoran uang fisik kasir harian ke rekening pusat</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat setoran pending...</p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCheckCircle className="h-12 w-12 mx-auto text-emerald-500 stroke-1" />
            <p className="mt-2 text-sm font-semibold">Semua setoran kasir sudah diselesaikan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Kasir</th>
                  <th className="p-4 font-semibold">Tanggal Sesi</th>
                  <th className="p-4 font-semibold text-right">Uang Disetor</th>
                  <th className="p-4 font-semibold text-right">Penjualan Tunai</th>
                  <th className="p-4 font-semibold">Catatan</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
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
                    <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{row.notes || "-"}</td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        disabled={actionId !== null}
                        onClick={() => handleResolve(row.id, "approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                      >
                        Setujui
                      </button>
                      <button
                        disabled={actionId !== null}
                        onClick={() => handleResolve(row.id, "rejected")}
                        className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                      >
                        Tolak
                      </button>
                    </td>
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
