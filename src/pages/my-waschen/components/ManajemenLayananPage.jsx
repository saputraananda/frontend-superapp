import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineClipboardDocumentList, HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";

export default function ManajemenLayananPage() {
  const [services, setServices] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    outlet_id: "", category_id: "", service_code: "", name: "", unit_type: "kg", price: "",
    requires_material: 0, min_qty: 1, express_multiplier: 2, is_express_eligible: 1,
    is_requires_unit_detail: 0, estimated_daily_qty: "", durasi_hari: 1, service_kind: "waschen"
  });

  async function loadData() {
    try {
      setLoading(true);
      const serviceRes = await api("/api/services");
      const outletRes = await api("/api/master/outlets");
      const catRes = await api("/api/services/categories/list");
      setServices(serviceRes.data || []);
      setOutlets(outletRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Error loading services master:", err);
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
      let path = "/api/services";
      let method = "POST";
      
      if (editingId) {
        path = `/api/services/${editingId}`;
        method = "PUT";
      }

      await api(path, {
        method,
        body: JSON.stringify(form)
      });

      setShowForm(false);
      setEditingId(null);
      setForm({
        outlet_id: "", category_id: "", service_code: "", name: "", unit_type: "kg", price: "",
        requires_material: 0, min_qty: 1, express_multiplier: 2, is_express_eligible: 1,
        is_requires_unit_detail: 0, estimated_daily_qty: "", durasi_hari: 1, service_kind: "waschen"
      });
      loadData();
    } catch (err) {
      console.error("Error saving service:", err);
      alert("Gagal menyimpan layanan: " + err.message);
    }
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setForm({
      outlet_id: s.outlet_id,
      category_id: s.category_id,
      service_code: s.service_code,
      name: s.name,
      unit_type: s.unit_type,
      price: s.price,
      requires_material: s.requires_material,
      min_qty: s.min_qty,
      express_multiplier: s.express_multiplier,
      is_express_eligible: s.is_express_eligible,
      is_requires_unit_detail: s.is_requires_unit_detail,
      estimated_daily_qty: s.estimated_daily_qty || "",
      durasi_hari: s.durasi_hari,
      service_kind: s.service_kind
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus layanan ini?")) return;
    try {
      await api(`/api/services/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Error deleting service:", err);
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
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Layanan</h1>
          <p className="text-sm text-slate-500">Kelola master catalog layanan laundry PT Waschen Alora Indonesia</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              outlet_id: "", category_id: "", service_code: "", name: "", unit_type: "kg", price: "",
              requires_material: 0, min_qty: 1, express_multiplier: 2, is_express_eligible: 1,
              is_requires_unit_detail: 0, estimated_daily_qty: "", durasi_hari: 1, service_kind: "waschen"
            });
            setShowForm(!showForm);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Layanan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">{editingId ? "Edit Layanan" : "Tambah Layanan Baru"}</h3>
          
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
              <label className="text-sm font-semibold text-slate-700">Kode Layanan</label>
              <input
                type="text"
                value={form.service_code}
                onChange={(e) => setForm({ ...form, service_code: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: CUCI-REG"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nama Layanan</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: Cuci Kering Setrika"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Tipe Unit</label>
              <select
                value={form.unit_type}
                onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="kg">KG</option>
                <option value="pcs">PCS</option>
                <option value="m2">M² (Karpet)</option>
                <option value="stel">Stel</option>
                <option value="pair">Pair (Sepatu)</option>
                <option value="package">Paket</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Harga Layanan (Rp)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Durasi Selesai (Hari)</label>
              <input
                type="number"
                value={form.durasi_hari}
                onChange={(e) => setForm({ ...form, durasi_hari: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Jenis Layanan</label>
              <select
                value={form.service_kind}
                onChange={(e) => setForm({ ...form, service_kind: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="waschen">Waschen (Laundry)</option>
                <option value="cleanox">Cleanox (Cleaning)</option>
              </select>
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
              {editingId ? "Simpan Perubahan" : "Simpan Layanan"}
            </button>
          </div>
        </form>
      )}

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat katalog layanan...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineClipboardDocumentList className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada layanan terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Kode</th>
                  <th className="p-4 font-semibold">Nama Layanan</th>
                  <th className="p-4 font-semibold">Outlet</th>
                  <th className="p-4 font-semibold">Kategori</th>
                  <th className="p-4 font-semibold">Tipe Unit</th>
                  <th className="p-4 font-semibold text-right">Harga</th>
                  <th className="p-4 font-semibold">Durasi</th>
                  <th className="p-4 font-semibold">Kind</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-violet-600 uppercase text-xs">{row.service_code}</td>
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    <td className="p-4 text-slate-500">{row.outlet_name}</td>
                    <td className="p-4 text-xs font-semibold">{row.category_name}</td>
                    <td className="p-4 font-semibold uppercase text-xs">{row.unit_type}</td>
                    <td className="p-4 text-right font-black text-slate-800">{formatRupiah(row.price)}</td>
                    <td className="p-4 text-slate-500">{row.durasi_hari} Hari</td>
                    <td className="p-4 uppercase text-xs font-bold text-slate-400">{row.service_kind}</td>
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
