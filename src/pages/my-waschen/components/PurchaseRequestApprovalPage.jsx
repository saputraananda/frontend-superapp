import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineShoppingCart, HiOutlineCheckCircle, HiOutlineXCircle } from "react-icons/hi2";

export default function PurchaseRequestApprovalPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  async function loadRequests() {
    try {
      setLoading(true);
      const res = await api("/api/purchase-requests");
      // Filter out fulfilled/rejected/cancelled if we want to focus on pending/approved for action
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error loading purchase requests:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      setActionId(id);
      let body = { status };
      
      if (status === "approved") {
        const approvedQty = prompt("Masukkan jumlah qty disetujui:");
        if (approvedQty === null) return;
        body.approved_qty = parseFloat(approvedQty) || 0;
        
        const note = prompt("Catatan admin (opsional):");
        body.admin_note = note || "";
      } else if (status === "rejected") {
        const reason = prompt("Masukkan alasan penolakan:");
        if (reason === null) return;
        body.reject_reason = reason;
      } else if (status === "fulfilled") {
        const amount = prompt("Masukkan total nominal pembelian riil (Rp):");
        if (amount === null) return;
        body.fulfilled_amount = parseFloat(amount) || 0;
        
        const photo = prompt("Link / URL foto nota bukti pembelian (opsional):");
        body.receipt_photo_url = photo || "";
      }

      await api(`/api/purchase-requests/${id}/status`, {
        method: "PUT",
        body: JSON.stringify(body)
      });
      loadRequests();
    } catch (err) {
      console.error("Error updating purchase request status:", err);
      alert("Gagal memperbarui status: " + err.message);
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
        <h1 className="text-2xl font-bold text-slate-800">Purchase Request Approvals</h1>
        <p className="text-sm text-slate-500">Persetujuan, persetujuan nominal, dan verifikasi pembelian barang operasional outlet</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat permintaan pembelian...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineShoppingCart className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada permintaan pembelian ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Diajukan Oleh</th>
                  <th className="p-4 font-semibold">Nama Barang</th>
                  <th className="p-4 font-semibold">Qty Diminta</th>
                  <th className="p-4 font-semibold">Qty Disetujui</th>
                  <th className="p-4 font-semibold text-right">Est. Harga</th>
                  <th className="p-4 font-semibold text-right">Riil Harga</th>
                  <th className="p-4 font-semibold">Urgency</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4">{row.requester_name}</td>
                    <td className="p-4 font-bold text-slate-700">{row.inventory_name || row.item_name}</td>
                    <td className="p-4">{row.qty} {row.unit}</td>
                    <td className="p-4 font-bold text-slate-800">{row.approved_qty ? `${row.approved_qty} ${row.unit}` : "-"}</td>
                    <td className="p-4 text-right font-medium">{formatRupiah(row.estimated_price)}</td>
                    <td className="p-4 text-right font-bold text-emerald-600">{row.fulfilled_amount ? formatRupiah(row.fulfilled_amount) : "-"}</td>
                    <td className="p-4 capitalize">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.urgency === "critical" ? "bg-red-50 text-red-700" : row.urgency === "urgent" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                        {row.urgency}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "fulfilled" ? "bg-emerald-50 text-emerald-700" : row.status === "pending" ? "bg-amber-50 text-amber-700" : row.status === "approved" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      {row.status === "pending" && (
                        <>
                          <button
                            disabled={actionId !== null}
                            onClick={() => handleStatusChange(row.id, "approved")}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                          >
                            Setujui
                          </button>
                          <button
                            disabled={actionId !== null}
                            onClick={() => handleStatusChange(row.id, "rejected")}
                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      {row.status === "approved" && (
                        <button
                          disabled={actionId !== null}
                          onClick={() => handleStatusChange(row.id, "fulfilled")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                        >
                          Tandai Fulfilled
                        </button>
                      )}
                      {row.status === "fulfilled" && (
                        <span className="text-xs text-slate-400 italic">Selesai</span>
                      )}
                      {row.status === "rejected" && (
                        <span className="text-xs text-red-400 italic">Ditolak</span>
                      )}
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
