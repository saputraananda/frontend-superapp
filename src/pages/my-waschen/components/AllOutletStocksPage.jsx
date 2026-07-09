import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineServer, HiOutlinePlus, HiOutlineArrowPath } from "react-icons/hi2";

export default function AllOutletStocksPage() {
  const [stocks, setStocks] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [form, setForm] = useState({ outlet_id: "", inventory_id: "", qty: "", movement_type: "receipt", notes: "", unit_cost: "" });

  async function loadData() {
    try {
      setLoading(true);
      const stockRes = await api("/api/inventory/stocks");
      const outletRes = await api("/api/master/outlets");
      const itemRes = await api("/api/inventory/items");
      setStocks(stockRes.data || []);
      setOutlets(outletRes.data || []);
      setItems(itemRes.data || []);
    } catch (err) {
      console.error("Error loading outlet stocks:", err);
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
      // Ensure quantity is correct based on movement type (auto negative if waste/usage)
      let adjustedQty = parseFloat(form.qty);
      if (["manual_usage", "waste", "transfer_out"].includes(form.movement_type)) {
        adjustedQty = -Math.abs(adjustedQty);
      } else {
        adjustedQty = Math.abs(adjustedQty);
      }

      await api("/api/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          qty: adjustedQty
        })
      });

      setShowAdjustForm(false);
      setForm({ outlet_id: "", inventory_id: "", qty: "", movement_type: "receipt", notes: "", unit_cost: "" });
      loadData();
    } catch (err) {
      console.error("Error adjusting stock:", err);
      alert("Gagal melakukan penyesuaian stok: " + err.message);
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
          <h1 className="text-2xl font-bold text-slate-800">All Outlet Stocks</h1>
          <p className="text-sm text-slate-500">Monitor level ketersediaan stok fisik barang persediaan di seluruh outlet</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition"
          >
            <HiOutlineArrowPath className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowAdjustForm(!showAdjustForm)}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
          >
            <HiOutlinePlus className="h-4 w-4" />
            Penyesuaian Stok
          </button>
        </div>
      </div>

      {showAdjustForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">Form Penyesuaian Stok Fisik</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
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
              <label className="text-sm font-semibold text-slate-700">Pilih Barang</label>
              <select
                value={form.inventory_id}
                onChange={(e) => setForm({ ...form, inventory_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              >
                <option value="">Pilih Barang</option>
                {items.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tipe Mutasi</label>
              <select
                value={form.movement_type}
                onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="receipt">Receipt (Stok Masuk)</option>
                <option value="manual_usage">Manual Usage (Pemakaian Manual)</option>
                <option value="waste">Waste (Barang Rusak/Dibuang)</option>
                <option value="adjustment">Adjustment (Penyesuaian Fisik)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Jumlah Qty Mutasi</label>
              <input
                type="number"
                step="0.01"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
                placeholder="Selalu masukkan angka positif"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Harga Satuan (HPP/Cost - Rp)</label>
              <input
                type="number"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                placeholder="Kosongkan jika tak berubah"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Catatan / Alasan Mutasi</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                rows="2"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAdjustForm(false)}
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold transition"
            >
              Proses Penyesuaian
            </button>
          </div>
        </form>
      )}

      {/* Stocks Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat stok outlet...</p>
          </div>
        ) : stocks.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineServer className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Tidak ada data stok fisik di outlet saat ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Kode Barang</th>
                  <th className="p-4 font-semibold">Nama Barang</th>
                  <th className="p-4 font-semibold text-right">Stok Saat Ini</th>
                  <th className="p-4 font-semibold">Satuan</th>
                  <th className="p-4 font-semibold text-right">Min. Stok</th>
                  <th className="p-4 font-semibold text-right">Harga Unit Terakhir</th>
                  <th className="p-4 font-semibold text-right">Terakhir Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stocks.map((row) => {
                  const isLow = parseFloat(row.stock_qty) <= parseFloat(row.min_stock);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-800">{row.outlet_name}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{row.item_code}</td>
                      <td className="p-4 font-bold text-slate-700">{row.item_name}</td>
                      <td className={`p-4 text-right font-black ${isLow ? "text-red-600 animate-pulse bg-red-50/30" : "text-slate-800"}`}>
                        {row.stock_qty}
                      </td>
                      <td className="p-4 font-semibold text-xs text-slate-400 uppercase">{row.unit}</td>
                      <td className="p-4 text-right font-medium text-amber-600">{row.min_stock}</td>
                      <td className="p-4 text-right font-medium text-slate-600">{formatRupiah(row.last_cost)}</td>
                      <td className="p-4 text-right text-xs text-slate-400">{new Date(row.last_updated_at).toLocaleString("id-ID")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
