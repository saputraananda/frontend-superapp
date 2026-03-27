import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    HiOutlinePlusCircle,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineXMark,
    HiOutlineUserGroup,
    HiOutlineBuildingStorefront,
    HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import ConfirmDialog from "../../components/ConfirmDialog";
import { api } from "../../lib/api";

/* ── helpers ─────────────────────────────────────────────────── */
function cn(...c) { return c.filter(Boolean).join(" "); }

const inputCls = cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
    "outline-none transition-all placeholder:text-slate-300",
    "focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400",
    "hover:border-slate-300",
    "disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
);

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

const RUPIAH = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const formatRupiah = (n) => RUPIAH.format(n ?? 0);

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
export default function TargetWaschen({ user, onLogout }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("sales");
    const [refreshSales, setRefreshSales] = useState(0);
    const [refreshCustomer, setRefreshCustomer] = useState(0);

    const [toast, setToast] = useState(null);
    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const openConfirm = (type, id) => { setPendingDelete({ type, id }); setConfirmOpen(true); };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        const { type, id } = pendingDelete;
        try {
            if (type === "sales") {
                await api(`/target-waschen/target/${encodeURIComponent(id)}`, { method: "DELETE" });
                showToast("success", "Target sales berhasil dihapus");
                setRefreshSales((k) => k + 1);
            } else {
                await api(`/target-waschen/target-customer/${id}`, { method: "DELETE" });
                showToast("success", "Target customer berhasil dihapus");
                setRefreshCustomer((k) => k + 1);
            }
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setConfirmOpen(false);
            setPendingDelete(null);
        }
    };

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

            {/* ── Top Bar ── */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/portal")}
                                className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition shrink-0"
                                title="Kembali"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                                </svg>
                            </button>
                            <div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                                    <a href="/portal" className="hover:text-orange-600 transition">Portal</a>
                                    <span>/</span>
                                    <span className="text-slate-600 font-medium">Target Waschen Laundry</span>
                                </div>
                                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Target Waschen Laundry</h1>
                                <p className="text-xs text-slate-400 mt-0.5">Manajemen target sales & customer</p>
                            </div>
                        </div>
                        {user && (
                            <div className="flex items-center gap-3">
                                <span className="hidden sm:block text-sm text-slate-500">
                                    Halo, <span className="font-semibold text-slate-700">{user.name}</span>
                                </span>
                                <button
                                    onClick={onLogout}
                                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 pb-14 space-y-6">

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200">
                    {[
                        { key: "sales", label: "Target Sales", icon: HiOutlineBuildingStorefront },
                        { key: "customer", label: "Target Customer", icon: HiOutlineUserGroup },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition",
                                activeTab === key
                                    ? "border-orange-500 text-orange-600"
                                    : "border-transparent text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {activeTab === "sales" && <TargetSalesSection showToast={showToast} openConfirm={openConfirm} refreshKey={refreshSales} />}
                {activeTab === "customer" && <TargetCustomerSection showToast={showToast} openConfirm={openConfirm} refreshKey={refreshCustomer} />}
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title="Hapus data?"
                message="Data yang dihapus tidak dapat dikembalikan."
                onConfirm={handleConfirmDelete}
                onCancel={() => { setConfirmOpen(false); setPendingDelete(null); }}
            />
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   TARGET SALES SECTION
════════════════════════════════════════════════════════════════ */
function TargetSalesSection({ showToast, openConfirm, refreshKey }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [form, setForm] = useState({ outlet: "", nominal: "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const rows = await api("/target-waschen/target");
            setData(rows);
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSales(); }, [refreshKey]);

    const openAdd = () => { setEditRow(null); setForm({ outlet: "", nominal: "" }); setErrors({}); setModalOpen(true); };
    const openEdit = (row) => { setEditRow(row); setForm({ outlet: row.outlet, nominal: String(row.nominal) }); setErrors({}); setModalOpen(true); };

    const validate = () => {
        const e = {};
        if (!form.outlet.trim()) e.outlet = "Outlet wajib diisi";
        if (!form.nominal || isNaN(Number(form.nominal)) || Number(form.nominal) < 0)
            e.nominal = "Nominal harus angka positif";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        try {
            if (editRow) {
                await api(`/target-waschen/target/${encodeURIComponent(editRow.outlet)}`, {
                    method: "PUT",
                    body: JSON.stringify({ outlet: form.outlet.trim(), nominal: Number(form.nominal) }),
                });
                showToast("success", "Target sales diperbarui");
            } else {
                await api("/target-waschen/target", {
                    method: "POST",
                    body: JSON.stringify({ outlet: form.outlet.trim(), nominal: Number(form.nominal) }),
                });
                showToast("success", "Target sales ditambahkan");
            }
            setModalOpen(false);
            fetchSales();
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setSaving(false);
        }
    };

    const filtered = data.filter((r) =>
        r.outlet?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                    <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Cari outlet..."
                        className={cn(inputCls, "pl-10")}
                    />
                </div>
                <p className="text-sm text-slate-500 shrink-0 sm:ml-auto">
                    Menampilkan <span className="font-semibold text-slate-700">{filtered.length}</span> dari <span className="font-semibold text-slate-700">{data.length}</span> outlet
                </p>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition shrink-0"
                >
                    <HiOutlinePlusCircle className="h-4 w-4" />
                    Tambah Target
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-sm text-slate-400">Memuat data...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <HiOutlineBuildingStorefront className="h-10 w-10 text-slate-300" />
                        <p className="text-sm text-slate-400">Tidak ada data outlet ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Outlet</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Nominal Target</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/60 transition">
                                        <td className="px-5 py-4 text-slate-400">{i + 1}</td>
                                        <td className="px-5 py-4 font-medium text-slate-800">{row.outlet}</td>
                                        <td className="px-5 py-4 text-right font-semibold text-emerald-700">{formatRupiah(row.nominal)}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(row)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                                                >
                                                    <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openConfirm("sales", row.outlet)}
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

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-50">
                                    <HiOutlineBuildingStorefront className="h-4 w-4 text-orange-600" />
                                </div>
                                <h2 className="text-base font-bold text-slate-800">
                                    {editRow ? "Edit Target Sales" : "Tambah Target Sales"}
                                </h2>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <Field label="Outlet" required error={errors.outlet}>
                                <input
                                    className={inputCls}
                                    value={form.outlet}
                                    onChange={(e) => setForm((f) => ({ ...f, outlet: e.target.value }))}
                                    placeholder="Nama outlet"
                                />
                            </Field>
                            <Field label="Nominal Target (Rp)" required error={errors.nominal}>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={form.nominal}
                                    onChange={(e) => setForm((f) => ({ ...f, nominal: e.target.value }))}
                                    placeholder="Contoh: 50000000"
                                />
                            </Field>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition"
                                >
                                    {saving ? "Menyimpan..." : editRow ? "Simpan Perubahan" : "Tambah Target"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ════════════════════════════════════════════════════════════════
   TARGET CUSTOMER SECTION
════════════════════════════════════════════════════════════════ */
function TargetCustomerSection({ showToast, openConfirm, refreshKey }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editRow, setEditRow] = useState(null);
    const [form, setForm] = useState({ tahun: "", jumlah: "" });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const rows = await api("/target-waschen/target-customer");
            setData(rows);
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCustomer(); }, [refreshKey]);

    const openAdd = () => { setEditRow(null); setForm({ tahun: new Date().getFullYear().toString(), jumlah: "" }); setErrors({}); setModalOpen(true); };
    const openEdit = (row) => { setEditRow(row); setForm({ tahun: String(row.tahun), jumlah: String(row.jumlah) }); setErrors({}); setModalOpen(true); };

    const validate = () => {
        const e = {};
        const y = Number(form.tahun);
        if (!form.tahun || isNaN(y) || y < 2000 || y > 2100) e.tahun = "Tahun tidak valid";
        if (!form.jumlah || isNaN(Number(form.jumlah)) || Number(form.jumlah) < 0)
            e.jumlah = "Jumlah harus angka positif";
        return e;
    };

    const handleSave = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setSaving(true);
        try {
            if (editRow) {
                await api(`/target-waschen/target-customer/${editRow.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ tahun: Number(form.tahun), jumlah: Number(form.jumlah) }),
                });
                showToast("success", "Target customer diperbarui");
            } else {
                await api("/target-waschen/target-customer", {
                    method: "POST",
                    body: JSON.stringify({ tahun: Number(form.tahun), jumlah: Number(form.jumlah) }),
                });
                showToast("success", "Target customer ditambahkan");
            }
            setModalOpen(false);
            fetchCustomer();
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-sm text-slate-500 sm:ml-auto shrink-0">
                    <span className="font-semibold text-slate-700">{data.length}</span> data terdaftar
                </p>
                <button
                    onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition shrink-0"
                >
                    <HiOutlinePlusCircle className="h-4 w-4" />
                    Tambah Target
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-sm text-slate-400">Memuat data...</div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <HiOutlineUserGroup className="h-10 w-10 text-slate-300" />
                        <p className="text-sm text-slate-400">Tidak ada data customer ditemukan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">No</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tahun</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Customer</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Dibuat</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.map((row, i) => (
                                    <tr key={row.id} className="hover:bg-slate-50/60 transition">
                                        <td className="px-5 py-4 text-slate-400">{i + 1}</td>
                                        <td className="px-5 py-4 font-bold text-slate-800">{row.tahun}</td>
                                        <td className="px-5 py-4 text-right font-semibold text-blue-700">
                                            {Number(row.jumlah).toLocaleString("id-ID")} customer
                                        </td>
                                        <td className="px-5 py-4 text-right text-slate-400 text-xs">
                                            {row.created_at ? new Date(row.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(row)}
                                                    className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                                                >
                                                    <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => openConfirm("customer", row.id)}
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

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-orange-50">
                                    <HiOutlineUserGroup className="h-4 w-4 text-orange-600" />
                                </div>
                                <h2 className="text-base font-bold text-slate-800">
                                    {editRow ? "Edit Target Customer" : "Tambah Target Customer"}
                                </h2>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <Field label="Tahun" required error={errors.tahun}>
                                <input
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    className={inputCls}
                                    value={form.tahun}
                                    onChange={(e) => setForm((f) => ({ ...f, tahun: e.target.value }))}
                                    placeholder="2025"
                                />
                            </Field>
                            <Field label="Jumlah Target Customer" required error={errors.jumlah}>
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={form.jumlah}
                                    onChange={(e) => setForm((f) => ({ ...f, jumlah: e.target.value }))}
                                    placeholder="Contoh: 5000"
                                />
                            </Field>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition"
                                >
                                    {saving ? "Menyimpan..." : editRow ? "Simpan Perubahan" : "Tambah Target"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}