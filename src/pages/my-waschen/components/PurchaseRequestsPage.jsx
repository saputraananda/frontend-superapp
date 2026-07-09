import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineShoppingCart, HiOutlinePlus } from "react-icons/hi2";

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ outlet_id: "", inventory_id: "", item_name: "", brand: "", category: "", qty: "", unit: "pcs", estimated_price: "", urgency: "normal", reason: "" });

  async function loadData() {
    try {
      setLoading(true);
      const prRes = await api("/api/purchase-requests");
      const outletRes = await api("/api/master/outlets");
      const invRes = await api("/api/inventory/items");
      setRequests(prRes.data || []);
      setOutlets(outletRes.data || []);
      setInventoryItems(invRes.data || []);
    } catch (err) {
      console.error("Error loading purchase requests:", err);
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
      // If inventory item is selected, snapshot its details
      let payload = { ...form };
      if (form.inventory_id) {
        const item = inventoryItems.find(i => String(i.id) === String(form.inventory_id));
        if (item) {
          payload.item_name = item.name;
          payload.unit = item.unit;
        }
      }

      await api("/api/purchase-requests", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setShowForm(false);
      setForm({ outlet_id: "", inventory_id: "", item_name: "", brand: "", category: "", qty: "", unit: "pcs", estimated_price: "", urgency: "normal", reason: "" });
      loadData();
    } catch (err) {
      console.error("Error saving purchase request:", err);
      alert("Gagal mengajukan permintaan pembelian: " + err.message);
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
          <h1 className="text-2xl font-bold text-slate-800">Purchase Requests</h1>
          <p className="text-sm text-slate-500">Ajukan pengadaan bahan laundry, mesin, atau kebutuhan operasional outlet</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Ajukan Pembelian
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">Ajukan Pembelian Barang</h3>
          
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
              <label className="text-sm font-semibold text-slate-700">Pilih Barang dari Katalog (Opsional)</label>
              <select
                value={form.inventory_id}
                onChange={(e) => setForm({ ...form, inventory_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="">-- Free Text (Input manual nama barang di bawah) --</option>
                {inventoryItems.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
            </div>

            {!form.inventory_id && (
              <>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-semibold text-slate-700">Nama Barang</label>
                  <input
                    type="text"
                    value={form.item_name}
                    onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                    placeholder="Contoh: Plastik Packing 60x100"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Satuan (Unit)</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                    placeholder="Contoh: pack, kg, pcs"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Jumlah (Qty)</label>
              <input
                type="number"
                step="0.001"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Estimasi Harga Satuan (Rp)</label>
              <input
                type="number"
                value={form.estimated_price}
                onChange={(e) => setForm({ ...form, estimated_price: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Urgency</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent (Butuh Cepat)</option>
                <option value="critical">Critical (Segera)</option>
              </select>
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Alasan Kebutuhan</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                rows="2"
                required
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
              Kirim Pengajuan
            </button>
          </div>
        </form>
      )}

      {/* PR Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat permintaan pembelian...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineShoppingCart className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada pengajuan pembelian barang</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Nama Barang</th>
                  <th className="p-4 font-semibold">Qty</th>
                  <th className="p-4 font-semibold text-right">Est. Harga</th>
                  <th className="p-4 font-semibold">Urgency</th>
                  <th className="p-4 font-semibold">Diajukan Oleh</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                    <td className="p-4 font-semibold text-slate-700">{row.inventory_name || row.item_name}</td>
                    <td className="p-4">{row.qty} {row.unit}</td>
                    <td className="p-4 text-right font-medium">{formatRupiah(row.estimated_price)}</td>
                    <td className="p-4 capitalize">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.urgency === "critical" ? "bg-red-50 text-red-700" : row.urgency === "urgent" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                        {row.urgency}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{row.requester_name}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.status === "fulfilled" ? "bg-emerald-50 text-emerald-700" : row.status === "pending" ? "bg-amber-50 text-amber-700" : row.status === "approved" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-400 max-w-xs truncate">{row.reason}</td>
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
