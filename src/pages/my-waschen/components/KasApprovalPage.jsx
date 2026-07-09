import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineBanknotes, HiOutlineCheckCircle } from "react-icons/hi2";

export default function KasApprovalPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/approvals");
      setExpenses(res.data?.expenses || []);
    } catch (err) {
      console.error("Error loading pending expenses:", err);
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
        ? `/api/finance/expenses/${id}/approve` 
        : `/api/finance/expenses/${id}/reject`;
      
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
      console.error("Error resolving expense:", err);
      alert("Gagal memproses pengeluaran: " + err.message);
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
        <h1 className="text-2xl font-bold text-slate-800">Kas Approval</h1>
        <p className="text-sm text-slate-500">Persetujuan pencairan uang kas kecil operasional outlet oleh kasir</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat pengeluaran pending...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineCheckCircle className="h-12 w-12 mx-auto text-emerald-500 stroke-1" />
            <p className="mt-2 text-sm font-semibold">Semua pengajuan kas kecil sudah diproses</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Diajukan Oleh</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold text-right">Jumlah</th>
                  <th className="p-4 font-semibold">Deskripsi</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-semibold">{row.requester_name}</td>
                    <td className="p-4 uppercase text-xs font-bold text-violet-600">{row.category}</td>
                    <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.amount)}</td>
                    <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{row.description}</td>
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
