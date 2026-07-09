import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineMapPin, HiOutlinePlus } from "react-icons/hi2";

export default function ManajemenOutletPage() {
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ outlet_code: "", name: "", address: "", phone: "", email: "", npwp: "", latitude: "", longitude: "" });

  async function loadData() {
    try {
      setLoading(true);
      const res = await api("/api/outlets/admin/all");
      setOutlets(res.data || []);
    } catch (err) {
      console.error("Error loading outlets list:", err);
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
      let path = "/api/outlets";
      let method = "POST";
      
      if (editingId) {
        path = `/api/outlets/${editingId}`;
        method = "PUT";
      }

      await api(path, {
        method,
        body: JSON.stringify(form)
      });

      setShowForm(false);
      setEditingId(null);
      setForm({ outlet_code: "", name: "", address: "", phone: "", email: "", npwp: "", latitude: "", longitude: "" });
      loadData();
    } catch (err) {
      console.error("Error saving outlet:", err);
      alert("Gagal menyimpan outlet: " + err.message);
    }
  };

  const handleEdit = (o) => {
    setEditingId(o.id);
    setForm({
      outlet_code: o.outlet_code,
      name: o.name,
      address: o.address,
      phone: o.phone || "",
      email: o.email || "",
      npwp: o.npwp || "",
      latitude: o.latitude || "",
      longitude: o.longitude || ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menonaktifkan/menghapus outlet ini?")) return;
    try {
      await api(`/api/outlets/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Error deleting outlet:", err);
      alert("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Outlet</h1>
          <p className="text-sm text-slate-500">Kelola master ruko, outlet laundry, NPWP, koordinat GPS maps, dan kontak operasional</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ outlet_code: "", name: "", address: "", phone: "", email: "", npwp: "", latitude: "", longitude: "" });
            setShowForm(!showForm);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Outlet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">{editingId ? "Edit Outlet" : "Tambah Outlet Baru"}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Kode Outlet</label>
              <input
                type="text"
                value={form.outlet_code}
                onChange={(e) => setForm({ ...form, outlet_code: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: OUT-01"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nama Outlet</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder="Contoh: Waschen Alora Bintaro"
                required
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">Alamat Lengkap</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                rows="2"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">No. Telp</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Latitude</label>
              <input
                type="text"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Longitude</label>
              <input
                type="text"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">NPWP</label>
              <input
                type="text"
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
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
              {editingId ? "Simpan Perubahan" : "Simpan Outlet"}
            </button>
          </div>
        </form>
      )}

      {/* Outlets table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat data outlet...</p>
          </div>
        ) : outlets.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineMapPin className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada outlet terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Kode</th>
                  <th className="p-4 font-semibold">Nama Outlet</th>
                  <th className="p-4 font-semibold">Alamat</th>
                  <th className="p-4 font-semibold">No. Telepon</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">NPWP</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outlets.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-xs font-bold text-slate-600">{row.outlet_code}</td>
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{row.address}</td>
                    <td className="p-4 text-xs">{row.phone || "-"}</td>
                    <td className="p-4 text-xs text-slate-400">{row.email || "-"}</td>
                    <td className="p-4 text-xs text-slate-400 font-mono">{row.npwp || "-"}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {row.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
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
