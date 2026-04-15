import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineUserPlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineShieldCheck,
  HiOutlineChevronDown,
  HiOutlineFunnel,
} from "react-icons/hi2";
import ConfirmDialog from "../../components/ConfirmDialog";
import { api } from "../../lib/api";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

const inputCls = cn(
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
  "outline-none transition-all placeholder:text-slate-300",
  "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
  "hover:border-slate-300",
  "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
);

const ROLES = [
  "bod",
  "spv_hr",
  "spv_bdsm",
  "spv_finance",
  "spv_ikm",
  "manager_ikm",
  "finance",
  "hr",
  "bdsm",
  "staff_ikm",
  "admin",
  "employee",
  "unauthorized",
];

const ROLE_BADGE = {
  bod: "bg-violet-100 text-violet-700 border-violet-200",
  finance: "bg-emerald-100 text-emerald-700 border-emerald-200",
  spv_hr: "bg-blue-100 text-blue-700 border-blue-200",
  hr: "bg-cyan-100 text-cyan-700 border-cyan-200",
  spv_bdsm: "bg-indigo-100 text-indigo-700 border-indigo-200",
  spv_finance: "bg-green-100 text-green-700 border-green-200",
  spv_ikm: "bg-amber-100 text-amber-700 border-amber-200",
  manager_ikm: "bg-yellow-100 text-yellow-700 border-yellow-200",
  bdsm: "bg-blue-100 text-blue-700 border-blue-200",
  staff_ikm: "bg-orange-100 text-orange-700 border-orange-200",
  admin: "bg-rose-100 text-rose-700 border-rose-200",
  employee: "bg-slate-100 text-slate-600 border-slate-200",
  unauthorized: "bg-amber-100 text-amber-700 border-amber-200",
};

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", username: "", password: "", role: "employee" };

export default function AddUser() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = tambah, obj = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(null); // { type, msg }
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api("/users");               // ← bukan api.get
      setUsers(res.users || []);                     // ← bukan res.data.users
    } catch {
      showToast("error", "Gagal memuat data user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    document.title = "Manajemen Menu | Alora Group Indonesia";
  }, []);

  // ── Toast ──────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Modal ──────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowPass(false);
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditTarget(u);
    setForm({ name: u.name, email: u.email, username: u.username || "", password: "", role: u.role });
    setErrors({});
    setShowPass(false);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  // ── Validate ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.email.trim()) e.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Format email tidak valid";
    if (!editTarget && !form.password.trim()) e.password = "Password wajib diisi";
    if (form.password && form.password.length < 6) e.password = "Password minimal 6 karakter";
    if (!form.role) e.role = "Role wajib dipilih";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await api(`/users/${editTarget.id}`, {       // ← bukan api.put
          method: "PUT",
          body: JSON.stringify(form),
        });
        showToast("success", "User berhasil diperbarui");
      } else {
        await api("/users", {                        // ← bukan api.post
          method: "POST",
          body: JSON.stringify(form),
        });
        showToast("success", "User berhasil ditambahkan");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      showToast("error", err?.message || "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDeleteClick = (u) => {       // ← fungsi ini yang hilang
    setDeleteTarget(u);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/users/${deleteTarget.id}`, {
        method: "DELETE",
      });
      showToast("success", "User berhasil dihapus");
      fetchUsers();
    } catch (err) {
      showToast("error", err?.message || "Gagal menghapus user");
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  // ── Filter ─────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch = [u.name, u.email, u.username, u.role]
      .join(" ").toLowerCase()
      .includes(search.toLowerCase());
    const matchRole = filterRole ? u.role === filterRole : true; // ← tambah
    return matchSearch && matchRole;
  });

  return (
    <div className="min-h-screen bg-[#f4f6f9]">

      {/* ── Toast ── */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition",
          toast.type === "success"
            ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
            : "bg-rose-50 border border-rose-200 text-rose-700"
        )}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={confirmOpen}
        title="Hapus User"
        message={`Yakin ingin menghapus user "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition shrink-0"
                title="Kembali"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                  <a href="/portal" className="hover:text-blue-600 transition">Portal</a>
                  <span>/</span>
                  <span className="text-slate-600 font-medium">Manajemen User</span>
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Manajemen User</h1>
                <p className="text-xs text-slate-400 mt-0.5">Kelola akun pengguna sistem</p>
              </div>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow transition"
            >
              <HiOutlineUserPlus className="h-4 w-4" />
              Tambah User
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 pb-14">

        {/* Search + Filter + Counter */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">

          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, username..."
              className={cn(inputCls, "pl-10")}
            />
          </div>

          {/* Dropdown Filter Role */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((p) => !p)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition shadow-sm",
                filterRole
                  ? cn("border", ROLE_BADGE[filterRole], "ring-2 ring-offset-1 ring-blue-400/30")
                  : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <HiOutlineFunnel className="h-4 w-4 shrink-0" />
              <span>{filterRole || "Filter Role"}</span>
              {filterRole && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setFilterRole(""); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), setFilterRole(""))}
                  className="ml-1 flex items-center justify-center h-4 w-4 rounded-full bg-black/10 hover:bg-black/20 transition"
                >
                  <HiOutlineXMark className="h-3 w-3" />
                </span>
              )}
              <HiOutlineChevronDown className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                dropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 w-44 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                {/* Semua */}
                <button
                  type="button"
                  onClick={() => { setFilterRole(""); setDropdownOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition",
                    !filterRole
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                  Semua Role
                </button>

                <div className="border-t border-slate-100" />

                {/* Per role */}
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setFilterRole(r); setDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition",
                      filterRole === r
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      ROLE_BADGE[r]?.split(" ")[0]?.replace("bg-", "bg-") || "bg-slate-300"
                    )} />
                    {r}
                    {filterRole === r && (
                      <svg className="ml-auto h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Counter */}
          <p className="text-sm text-slate-500 shrink-0 sm:ml-auto">
            Menampilkan{" "}
            <span className="font-semibold text-slate-700">{filtered.length}</span> dari{" "}
            <span className="font-semibold text-slate-700">{users.length}</span> user
          </p>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-slate-400">
              Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <HiOutlineShieldCheck className="h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-400">Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role in App</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dibuat</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u, i) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4 text-slate-400">{i + 1}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">{u.name}</td>
                      <td className="px-5 py-4 text-slate-500">{u.email}</td>
                      <td className="px-5 py-4 text-slate-500">{u.username || <span className="text-slate-300 italic">—</span>}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                          ROLE_BADGE[u.role] || ROLE_BADGE.unauthorized
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric"
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                          >
                            <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(u)}
                            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Form ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-50">
                  <HiOutlineUserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-base font-bold text-slate-800">
                  {editTarget ? "Edit User" : "Tambah User Baru"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              <Field label="Nama Lengkap" required error={errors.name}>
                <input
                  className={inputCls}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <Field label="Email" required error={errors.email}>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>

              <Field label="Username" error={errors.username}>
                <input
                  className={inputCls}
                  placeholder="johndoe (opsional)"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </Field>

              <Field
                label={editTarget ? "Password Baru" : "Password"}
                required={!editTarget}
                error={errors.password}
              >
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className={cn(inputCls, "pr-10")}
                    placeholder={editTarget ? "Kosongkan jika tidak diubah" : "Min. 6 karakter"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPass
                      ? <HiOutlineEyeSlash className="h-4 w-4" />
                      : <HiOutlineEye className="h-4 w-4" />
                    }
                  </button>
                </div>
              </Field>

              <Field label="Role" required error={errors.role}>
                <select
                  className={inputCls}
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition"
                >
                  {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}