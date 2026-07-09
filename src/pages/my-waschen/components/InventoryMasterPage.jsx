import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineArchiveBox, HiOutlinePlus } from "react-icons/hi2";

export default function InventoryMasterPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ category_id: "", item_code: "", name: "", unit: "pcs", tracking_type: "real_time", default_cost: "", min_stock_default: "", is_auto_deduct: 0, is_hpp_component: 1 });

  async function loadData() {
    try {
      setLoading(true);
      const itemRes = await api("/api/inventory/items");
      const catRes = await api("/api/inventory/categories/list");
      setItems(itemRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Error loading inventory catalog:", err);
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
      let path = "/api/inventory/items";
      let method = "POST";

      if (editingId) {
        path = `/api/inventory/items/${editingId}`;
        method = "PUT";
      }

      await api(path, {
        method,
        body: JSON.stringify(form)
      });

      setShowForm(false);
      setEditingId(null);
      setForm({ category_id: "", item_code: "", name: "", unit: "pcs", tracking_type: "real_time", default_cost: "", min_stock_default: "", is_auto_deduct: 0, is_hpp_component: 1 });
      loadData();
    } catch (err) {
      console.error("Error saving inventory item:", err);
      alert("Gagal menyimpan item inventaris: " + err.message);
    }
  };

  const handleEdit = (i) => {
    setEditingId(i.id);
    setForm({
      category_id: i.category_id,
      item_code: i.item_code,
      name: i.name,
      unit: i.unit,
      tracking_type: i.tracking_type,
      default_cost: i.default_cost,
      min_stock_default: i.min_stock_default,
      is_auto_deduct: i.is_auto_deduct,
      is_hpp_component: i.is_hpp_component
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus item inventaris ini?")) return;
    try {
      await api(`/api/inventory/items/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Error deleting item:", err);
      alert("Gagal menghapus: " + err.message);
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
          <h1 className="text-2xl font-bold text-slate-800">Inventory Master</h1>
          <p className="text-sm text-slate-500">Kelola master catalog barang persediaan (plastik, hanger, deterjen, pewangi)</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ category_id: "", item_code: "", name: "", unit: "pcs", tracking_type: "real_time", default_cost: "", min_stock_default: "", is_auto_deduct: 0, is_hpp_component: 1 });
            setShowForm(!showForm);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Item
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">{editingId ? "Edit Item Inventaris" : "Tambah Item Inventaris Baru"}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              >
                <option value="">Pilih Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Kode Barang</label>
              <input
                type="text"
                value={form.item_code}
                onChange={(e) => setForm({ ...form, item_code: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: INV-HGR-01"
                required
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Nama Barang</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: Hanger Kawat Besi Lapis Plastik"
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
                placeholder="Contoh: pcs, pack, kg"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tipe Pelacakan Stok</label>
              <select
                value={form.tracking_type}
                onChange={(e) => setForm({ ...form, tracking_type: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="real_time">Real Time</option>
                <option value="estimated">Estimated (Dihitung estimasi)</option>
                <option value="asset_only">Asset Only (Hanya aset)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Harga Satuan Default (Rp)</label>
              <input
                type="number"
                value={form.default_cost}
                onChange={(e) => setForm({ ...form, default_cost: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Batas Stok Minimum</label>
              <input
                type="number"
                value={form.min_stock_default}
                onChange={(e) => setForm({ ...form, min_stock_default: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
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
              {editingId ? "Simpan Perubahan" : "Simpan Barang"}
            </button>
          </div>
        </form>
      )}

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat katalog persediaan...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineArchiveBox className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada item katalog terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Kode Barang</th>
                  <th className="p-4 font-semibold">Nama Barang</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Satuan (Unit)</th>
                  <th className="p-4 font-semibold text-right">Batas Min. Stok</th>
                  <th className="p-4 font-semibold text-right">Harga Default</th>
                  <th className="p-4 font-semibold">Pelacakan</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-xs font-bold text-slate-600">{row.item_code}</td>
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    <td className="p-4 font-semibold text-slate-500">{row.category_name}</td>
                    <td className="p-4 font-semibold text-xs uppercase">{row.unit}</td>
                    <td className="p-4 text-right font-semibold text-amber-600">{row.min_stock_default}</td>
                    <td className="p-4 text-right font-bold text-slate-800">{formatRupiah(row.default_cost)}</td>
                    <td className="p-4 text-xs font-semibold text-slate-500 uppercase">{row.tracking_type}</td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs border border-blue-200 rounded px-2 py-1 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:text-red-800 font-semibold text-xs border border-red-200 rounded px-2 py-1 transition"
                      >
                        Hapus
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
