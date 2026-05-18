import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import {
    HiOutlineDocumentPlus,
    HiOutlineMagnifyingGlass,
    HiOutlinePlus,
    HiOutlineXMark,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineClipboardDocumentList,
    HiOutlineClock,
    HiOutlineXCircle,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const STATUS_CONFIG = {
    draft:        { label: "Draft",           cls: "bg-slate-100 text-slate-600 border-slate-200" },
    pending_spv:  { label: "Menunggu SPV",     cls: "bg-amber-50 text-amber-700 border-amber-200" },
    pending_bod:  { label: "Menunggu Direktur",cls: "bg-orange-50 text-orange-700 border-orange-200" },
    approved:     { label: "Disetujui",        cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected:     { label: "Ditolak",          cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const PRIORITAS = ["Rendah", "Sedang", "Tinggi", "Urgent"];

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 placeholder:text-slate-400";

function StatusBadge({ status }) {
    const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", c.cls)}>
            {c.label}
        </span>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={cn("fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
            toast.type === "success" ? "bg-emerald-50/95 border-emerald-200 text-emerald-700" : "bg-rose-50/95 border-rose-200 text-rose-700")}>
            {toast.type === "success" ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineExclamationTriangle className="h-5 w-5" />}
            {toast.msg}
        </div>
    );
}

const EMPTY_FORM = { judul: "", deskripsi: "", jumlah: 1, satuan: "Unit", prioritas: "Sedang", estimasi_harga: "" };

export default function PengajuanBarang() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [toast, setToast] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const LIMIT = 20;

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (search) params.set("search", search);
            if (filterStatus) params.set("status", filterStatus);
            const d = await api(`/pengajuan/barang?${params}`);
            setData(d.data || []);
            setTotal(d.total || 0);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat data");
        } finally {
            setLoading(false);
        }
    }, [page, search, filterStatus]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setModalOpen(true); };
    const openEdit = (row) => {
        setEditTarget(row);
        setForm({ judul: row.judul || "", deskripsi: row.deskripsi || "", jumlah: row.jumlah || 1, satuan: row.satuan || "Unit", prioritas: row.prioritas || "Sedang", estimasi_harga: row.estimasi_harga || "" });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.judul.trim()) return showToast("error", "Judul wajib diisi");
        setSaving(true);
        try {
            if (editTarget) {
                await api(`/pengajuan/barang/${editTarget.id}`, { method: "PUT", body: JSON.stringify(form) });
                showToast("success", "Pengajuan berhasil diperbarui");
            } else {
                await api("/pengajuan/barang", { method: "POST", body: JSON.stringify(form) });
                showToast("success", "Pengajuan berhasil dibuat");
            }
            setModalOpen(false);
            load();
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitApproval = async (id) => {
        try {
            await api(`/pengajuan/barang/${id}/submit`, { method: "POST" });
            showToast("success", "Pengajuan dikirim untuk approval");
            load();
        } catch (err) { showToast("error", err.message); }
    };

    const totalPages = Math.ceil(total / LIMIT);

    return (
        <div className="p-6 space-y-5">
            <Toast toast={toast} />

            {/* Page header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <HiOutlineDocumentPlus className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Pengajuan Barang</h1>
                        <p className="text-xs text-slate-500">Ajukan kebutuhan pengadaan barang / jasa</p>
                    </div>
                </div>
                <button onClick={openAdd}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm">
                    <HiOutlinePlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Buat Pengajuan</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Cari judul pengajuan..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition" />
                </div>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <HiOutlineClipboardDocumentList className="h-10 w-10 text-slate-300" />
                        <p className="text-sm text-slate-400">Belum ada pengajuan</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Judul</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Jumlah</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Prioritas</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Tanggal</th>
                                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.map((row) => (
                                    <tr key={row.id} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-semibold text-slate-800">{row.judul}</p>
                                            {row.deskripsi && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{row.deskripsi}</p>}
                                        </td>
                                        <td className="px-5 py-4 hidden sm:table-cell">
                                            <span className="text-sm text-slate-600">{row.jumlah} {row.satuan}</span>
                                        </td>
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                                row.prioritas === "Urgent" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                                row.prioritas === "Tinggi" ? "bg-orange-50 text-orange-700 border-orange-200" :
                                                row.prioritas === "Sedang" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-slate-100 text-slate-600 border-slate-200")}>
                                                {row.prioritas}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4"><StatusBadge status={row.status} /></td>
                                        <td className="px-5 py-4 hidden lg:table-cell">
                                            <span className="text-sm text-slate-500 tabular-nums">{row.created_at?.split("T")[0] ?? "—"}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {row.status === "draft" && (
                                                    <button onClick={() => handleSubmitApproval(row.id)}
                                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                                                        Ajukan
                                                    </button>
                                                )}
                                                {(row.status === "draft" || row.status === "rejected") && (
                                                    <button onClick={() => openEdit(row)}
                                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Halaman <span className="font-bold text-slate-700">{page}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <HiOutlineChevronLeft className="h-4 w-4" />
                            </button>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <HiOutlineChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && createPortal(
                <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0 bg-white">
                            <h2 className="text-base font-bold text-slate-800">{editTarget ? "Edit Pengajuan" : "Buat Pengajuan Baru"}</h2>
                            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition">
                                <HiOutlineXMark className="h-4 w-4 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="overflow-y-auto flex-1 p-6 space-y-4 bg-slate-50/40">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Judul <span className="text-rose-500">*</span></label>
                                    <input className={inputCls} value={form.judul} onChange={e => setForm(p => ({ ...p, judul: e.target.value }))} placeholder="Nama barang / kebutuhan..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi</label>
                                    <textarea rows={3} className={cn(inputCls, "resize-none")} value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} placeholder="Jelaskan kebutuhan secara singkat..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Jumlah</label>
                                        <input type="number" min={1} className={inputCls} value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Satuan</label>
                                        <select className={inputCls} value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))}>
                                            {["Unit", "Pcs", "Set", "Box", "Lusin", "Rim", "Liter", "Kg", "Meter"].map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Prioritas</label>
                                        <select className={inputCls} value={form.prioritas} onChange={e => setForm(p => ({ ...p, prioritas: e.target.value }))}>
                                            {PRIORITAS.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estimasi Harga (Rp)</label>
                                        <input type="number" min={0} className={inputCls} value={form.estimasi_harga} onChange={e => setForm(p => ({ ...p, estimasi_harga: e.target.value }))} placeholder="0" />
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-slate-200 px-6 py-4 flex-shrink-0 bg-white flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Batal</button>
                                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                    {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Buat Pengajuan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                , document.body
            )}
        </div>
    );
}
