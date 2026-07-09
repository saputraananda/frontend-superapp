import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { HiOutlineUsers, HiOutlinePlus } from "react-icons/hi2";

export default function ManajemenUserPage() {
  const [users, setUsers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ outlet_id: "", primary_role_id: "", name: "", username: "", email: "", phone: "", password: "", employee_no: "", pin: "" });

  async function loadData() {
    try {
      setLoading(true);
      const userRes = await api("/api/users");
      const outletRes = await api("/api/master/outlets");
      const roleRes = await api("/api/users/roles/list");
      setUsers(userRes.data || []);
      setOutlets(outletRes.data || []);
      setRoles(roleRes.data || []);
    } catch (err) {
      console.error("Error loading user management data:", err);
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
      let path = "/api/users/register";
      let method = "POST";

      if (editingId) {
        path = `/api/users/${editingId}`;
        method = "PUT";
      }

      await api(path, {
        method,
        body: JSON.stringify(form)
      });

      setShowForm(false);
      setEditingId(null);
      setForm({ outlet_id: "", primary_role_id: "", name: "", username: "", email: "", phone: "", password: "", employee_no: "", pin: "" });
      loadData();
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Gagal menyimpan pengguna: " + err.message);
    }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setForm({
      outlet_id: u.outlet_id || "",
      primary_role_id: u.primary_role_id,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone || "",
      password: "", // Jangan tampilkan password lama
      employee_no: u.employee_no || "",
      pin: ""
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus user ini?")) return;
    try {
      await api(`/api/users/${id}`, { method: "DELETE" });
      loadData();
    } catch (err) {
      console.error("Error deleting user:", err);
      alert("Gagal menghapus: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen User</h1>
          <p className="text-sm text-slate-500">Kelola kredensial login kasir, produksi, kurir, dan admin laundry</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ outlet_id: "", primary_role_id: "", name: "", username: "", email: "", phone: "", password: "", employee_no: "", pin: "" });
            setShowForm(!showForm);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-bold text-slate-800 text-base">{editingId ? "Edit Karyawan / Pengguna" : "Registrasi User Baru"}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Nama Lengkap</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                placeholder={editingId ? "Kosongkan jika tak diubah" : "Password login"}
                required={!editingId}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Role Sistem</label>
              <select
                value={form.primary_role_id}
                onChange={(e) => setForm({ ...form, primary_role_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
                required
              >
                <option value="">Pilih Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">Outlet Tugas (Opsional)</label>
              <select
                value={form.outlet_id}
                onChange={(e) => setForm({ ...form, outlet_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              >
                <option value="">HO / Global User</option>
                {outlets.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">NIP (No. Pegawai)</label>
              <input
                type="text"
                value={form.employee_no}
                onChange={(e) => setForm({ ...form, employee_no: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">PIN Konfirmasi Produksi</label>
              <input
                type="password"
                maxLength="6"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                placeholder="6 Digit PIN"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-violet-500"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-semibold text-slate-700">No. Telepon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
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
              {editingId ? "Simpan User" : "Daftarkan User"}
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Memuat data pengguna...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <HiOutlineUsers className="h-12 w-12 mx-auto stroke-1" />
            <p className="mt-2 text-sm font-medium">Belum ada pengguna terdaftar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="p-4 font-semibold">Nama Lengkap</th>
                  <th className="p-4 font-semibold">Username</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">NIP</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Tugas Outlet</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{row.name}</td>
                    <td className="p-4 font-mono text-xs">{row.username}</td>
                    <td className="p-4 text-xs text-slate-400">{row.email}</td>
                    <td className="p-4 font-semibold">{row.employee_no || "-"}</td>
                    <td className="p-4 font-bold text-violet-600 text-xs uppercase">{row.role_name}</td>
                    <td className="p-4 text-slate-500">{row.outlet_name || "HO / Global"}</td>
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
