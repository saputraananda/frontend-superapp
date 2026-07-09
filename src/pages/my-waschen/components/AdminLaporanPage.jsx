import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineDocumentText, HiOutlineArrowDownTray } from "react-icons/hi2";

export default function AdminLaporanPage() {
  const [activeTab, setActiveTab] = useState("transactions");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ start_date: "", end_date: "" });

  async function loadReport() {
    try {
      setLoading(true);
      let path = `/api/reports/transactions`;
      if (activeTab === "payments") path = `/api/reports/payments`;
      if (activeTab === "logistics") path = `/api/reports/logistics`;

      const query = new URLSearchParams(filter).toString();
      const res = await api(`${path}?${query}`);
      setData(res.data || []);
    } catch (err) {
      console.error("Error loading report:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [activeTab, filter]);

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
        <h1 className="text-2xl font-bold text-slate-800">Laporan & Reporting</h1>
        <p className="text-sm text-slate-500">Log mutasi transaksi, pembayaran, dan logistik</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("transactions"); setData([]); }}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "transactions" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Laporan Transaksi
        </button>
        <button
          onClick={() => { setActiveTab("payments"); setData([]); }}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "payments" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Laporan Pembayaran
        </button>
        <button
          onClick={() => { setActiveTab("logistics"); setData([]); }}
          className={`pb-3 font-semibold text-sm transition-all ${activeTab === "logistics" ? "border-b-2 border-violet-500 text-violet-600" : "text-slate-500"}`}
        >
          Laporan Logistik
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4">
          <input
            type="date"
            value={filter.start_date}
            onChange={(e) => setFilter({ ...filter, start_date: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
          />
          <input
            type="date"
            value={filter.end_date}
            onChange={(e) => setFilter({ ...filter, end_date: e.target.value })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
          />
        </div>
        <button
          onClick={() => loadReport()}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          Refres Laporan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat laporan...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineDocumentText className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada data ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "transactions" && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">No. Nota</th>
                    <th className="p-4 font-semibold">Pelanggan</th>
                    <th className="p-4 font-semibold">Kasir</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Pembayaran</th>
                    <th className="p-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{row.transaction_no}</td>
                      <td className="p-4 font-medium">{row.customer_name || "Guest"}</td>
                      <td className="p-4">{row.cashier_name}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.payment_status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {row.payment_status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "payments" && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">No. Nota</th>
                    <th className="p-4 font-semibold">Metode</th>
                    <th className="p-4 font-semibold">Perekam</th>
                    <th className="p-4 font-semibold">Tanggal</th>
                    <th className="p-4 font-semibold text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold">{row.id}</td>
                      <td className="p-4 font-bold text-slate-800">{row.transaction_no}</td>
                      <td className="p-4 uppercase font-semibold text-violet-600">{row.method}</td>
                      <td className="p-4">{row.recorder_name}</td>
                      <td className="p-4 text-slate-400">{new Date(row.recorded_at).toLocaleDateString("id-ID")}</td>
                      <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "logistics" && (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 font-semibold">ID</th>
                    <th className="p-4 font-semibold">No. Nota</th>
                    <th className="p-4 font-semibold">Tipe</th>
                    <th className="p-4 font-semibold">Kurir</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Ongkir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-semibold">{row.id}</td>
                      <td className="p-4 font-bold text-slate-800">{row.transaction_no}</td>
                      <td className="p-4 capitalize font-semibold">{row.type}</td>
                      <td className="p-4">{row.courier_name || "Unassigned"}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.delivery_fee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
