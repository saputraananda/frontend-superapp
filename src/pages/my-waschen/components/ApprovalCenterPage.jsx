import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock } from "react-icons/hi2";

export default function ApprovalCenterPage() {
  const [approvals, setApprovals] = useState({ transactions: [], expenses: [], deposits: [] });
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  async function loadApprovals() {
    try {
      setLoading(true);
      const res = await api("/api/approvals");
      setApprovals(res.data || { transactions: [], expenses: [], deposits: [] });
    } catch (err) {
      console.error("Error loading approvals:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleResolveTx = async (id, status, rejectReason = "") => {
    try {
      setResolvingId(id);
      await api(`/api/approvals/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ status, reject_reason: rejectReason })
      });
      loadApprovals();
    } catch (err) {
      console.error("Error resolving transaction approval:", err);
      alert("Gagal memproses persetujuan: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveDeposit = async (id, status, reason = "") => {
    try {
      setResolvingId(id);
      const path = status === "approved" 
        ? `/api/cash-deposits/${id}/approve` 
        : `/api/cash-deposits/${id}/reject`;
      await api(path, {
        method: "POST",
        body: status === "rejected" ? JSON.stringify({ reason }) : undefined
      });
      loadApprovals();
    } catch (err) {
      console.error("Error resolving cash deposit:", err);
      alert("Gagal memproses setoran: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveExpense = async (id, status, reason = "") => {
    try {
      setResolvingId(id);
      const path = status === "approved" 
        ? `/api/finance/expenses/${id}/approve` 
        : `/api/finance/expenses/${id}/reject`;
      await api(path, {
        method: "POST",
        body: status === "rejected" ? JSON.stringify({ reason }) : undefined
      });
      loadApprovals();
    } catch (err) {
      console.error("Error resolving expense:", err);
      alert("Gagal memproses pengeluaran: " + err.message);
    } finally {
      setResolvingId(null);
    }
  };

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

  const hasPending = 
    approvals.transactions.length > 0 || 
    approvals.expenses.length > 0 || 
    approvals.deposits.length > 0;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Centralized Approval Center</h1>
        <p className="text-sm text-slate-500">Pusat persetujuan pembatalan nota, setoran kas, dan pengeluaran operasional outlet</p>
      </div>

      {!hasPending ? (
        <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm max-w-lg mx-auto mt-12">
          <HiOutlineCheckCircle className="h-16 w-16 mx-auto text-emerald-500 stroke-1" />
          <h3 className="mt-4 font-bold text-slate-800 text-lg">Semua Beres!</h3>
          <p className="mt-1 text-sm">Tidak ada permintaan persetujuan tertunda saat ini.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Transaction approvals table */}
          {approvals.transactions.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineClock className="h-5 w-5 text-violet-500" />
                Persetujuan Pembatalan / Hapus Nota ({approvals.transactions.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-4 font-semibold">Outlet</th>
                      <th className="p-4 font-semibold">No. Nota</th>
                      <th className="p-4 font-semibold">Diajukan Oleh</th>
                      <th className="p-4 font-semibold">Tipe Approval</th>
                      <th className="p-4 font-semibold">Alasan</th>
                      <th className="p-4 font-semibold text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvals.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{t.outlet_name}</td>
                        <td className="p-4 font-semibold text-violet-600">{t.transaction_no}</td>
                        <td className="p-4">{t.requester_name}</td>
                        <td className="p-4 uppercase text-xs font-bold text-slate-500">{t.type}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{t.reason}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => handleResolveTx(t.id, "approved")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                          >
                            Setujui
                          </button>
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => {
                              const reason = prompt("Masukkan alasan penolakan:");
                              if (reason !== null) handleResolveTx(t.id, "rejected", reason);
                            }}
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
            </div>
          )}

          {/* Expense approvals table */}
          {approvals.expenses.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineClock className="h-5 w-5 text-amber-500" />
                Persetujuan Pengeluaran Kas Operasional ({approvals.expenses.length})
              </h2>
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
                    {approvals.expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{e.outlet_name}</td>
                        <td className="p-4 font-semibold">{e.requester_name}</td>
                        <td className="p-4 uppercase text-xs font-bold text-violet-600">{e.category}</td>
                        <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(e.amount)}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{e.description}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => handleResolveExpense(e.id, "approved")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                          >
                            Setujui
                          </button>
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => {
                              const reason = prompt("Masukkan alasan penolakan:");
                              if (reason !== null) handleResolveExpense(e.id, "rejected", reason);
                            }}
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
            </div>
          )}

          {/* Deposit approvals table */}
          {approvals.deposits.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <HiOutlineClock className="h-5 w-5 text-emerald-500" />
                Persetujuan Setoran Kas Outlet ({approvals.deposits.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-4 font-semibold">Outlet</th>
                      <th className="p-4 font-semibold">Kasir</th>
                      <th className="p-4 font-semibold">Tanggal Setor</th>
                      <th className="p-4 font-semibold text-right">Jumlah Setor</th>
                      <th className="p-4 font-semibold text-right">Penjualan Tunai</th>
                      <th className="p-4 font-semibold">Catatan</th>
                      <th className="p-4 font-semibold text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvals.deposits.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-800">{d.outlet_name}</td>
                        <td className="p-4 font-semibold">{d.cashier_name}</td>
                        <td className="p-4 text-xs text-slate-500">{new Date(d.deposit_date).toLocaleDateString("id-ID")}</td>
                        <td className="p-4 text-right font-bold text-emerald-600">{formatRupiah(d.deposit_amount)}</td>
                        <td className="p-4 text-right font-medium text-slate-800">{formatRupiah(d.cash_sales_total)}</td>
                        <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{d.notes || "-"}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => handleResolveDeposit(d.id, "approved")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                          >
                            Setujui
                          </button>
                          <button
                            disabled={resolvingId !== null}
                            onClick={() => {
                              const reason = prompt("Masukkan alasan penolakan:");
                              if (reason !== null) handleResolveDeposit(d.id, "rejected", reason);
                            }}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
