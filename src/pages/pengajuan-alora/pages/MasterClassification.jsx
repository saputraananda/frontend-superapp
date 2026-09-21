import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import {
    HiOutlineMagnifyingGlass,
    HiOutlinePlus,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineXMark,
    HiOutlineTag,
    HiOutlineSquares2X2,
    HiOutlineNoSymbol,
    HiOutlineArchiveBox,
    HiOutlineArrowTrendingUp,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineChevronUpDown,
    HiOutlineArrowUp,
    HiOutlineArrowDown,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (str) => {
    if (!str) return str;
    return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const FILTERS = [
    { key: "all",      label: "Semua" },
    { key: "active",   label: "Aktif" },
    { key: "inactive", label: "Nonaktif" },
    { key: "unused",   label: "Belum Dipakai" },
];

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={cn(
            "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
            toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
        )}>
            {toast.type === "error"
                ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
            {toast.message}
        </div>
    );
}

function SortButton({ label, col, sort, onSort, align = "left" }) {
    const activeCol = sort.key === col;
    const Icon = !activeCol ? HiOutlineChevronUpDown : sort.dir === "asc" ? HiOutlineArrowUp : HiOutlineArrowDown;
    return (
        <button type="button" onClick={() => onSort(col)}
            className={cn("inline-flex w-full items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition",
                align === "center" ? "justify-center" : "justify-start",
                activeCol ? "text-emerald-600" : "text-slate-500 hover:text-slate-700")}>
            {label}
            <Icon className="h-3 w-3" />
        </button>
    );
}

function StatCard({ icon: Icon, label, value, sub, tone }) {
    const tones = {
        slate:   "border-slate-200 bg-white text-slate-500",
        emerald: "border-emerald-200 bg-emerald-50 text-emerald-600",
        rose:    "border-rose-200 bg-rose-50 text-rose-600",
        indigo:  "border-indigo-200 bg-indigo-50 text-indigo-600",
    };
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold leading-none tabular-nums text-slate-800">{value}</p>
                    {sub && <p className="mt-1.5 truncate text-[11px] text-slate-400">{sub}</p>}
                </div>
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border", tones[tone] || tones.slate)}>
                    <Icon className="h-4 w-4" />
                </span>
            </div>
        </div>
    );
}

export default function MasterClassification() {
    const userRaw = localStorage.getItem("user");
    const employee = userRaw ? JSON.parse(userRaw)?.employee : null;
    const isFinance = useMemo(() => {
        const pos = (employee?.position_name || "").toLowerCase();
        return pos.includes("finance") || pos.includes("accounting") || pos.includes("accountiing");
    }, [employee]);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [sort, setSort] = useState({ key: "name", dir: "asc" });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [toast, setToast] = useState(null);

    // form tambah/edit
    const [formOpen, setFormOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [name, setName] = useState("");
    const [active, setActive] = useState(true);
    const [saving, setSaving] = useState(false);

    // konfirmasi hapus
    const [confirmRow, setConfirmRow] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    // Ambil seluruh master sekali — filter & pencarian dilakukan di client
    // agar stat card tetap mencerminkan total keseluruhan.
    const load = useCallback(async () => {
        if (!isFinance) { setLoading(false); return; }
        setLoading(true);
        try {
            const r = await api("/pengajuan/master-classification");
            setRows(r.data || []);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat klasifikasi");
        } finally {
            setLoading(false);
        }
    }, [isFinance]);

    useEffect(() => { load(); }, [load]);

    const stats = useMemo(() => {
        const total = rows.length;
        const aktif = rows.filter(r => Number(r.is_active) === 1).length;
        const dipakai = rows.reduce((a, r) => a + (Number(r.usage_count) || 0), 0);
        const belum = rows.filter(r => !Number(r.usage_count)).length;
        const top = rows.reduce((best, r) =>
            (Number(r.usage_count) || 0) > (Number(best?.usage_count) || 0) ? r : best, null);
        return { total, aktif, nonaktif: total - aktif, dipakai, belum, top };
    }, [rows]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = rows.filter(r => {
            if (q && !String(r.classification_name || "").toLowerCase().includes(q)) return false;
            if (filter === "active"   && Number(r.is_active) !== 1) return false;
            if (filter === "inactive" && Number(r.is_active) === 1) return false;
            if (filter === "unused"   && Number(r.usage_count) > 0) return false;
            return true;
        });

        const dir = sort.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            if (sort.key === "usage") {
                return ((Number(a.usage_count) || 0) - (Number(b.usage_count) || 0)) * dir;
            }
            if (sort.key === "status") {
                return ((Number(a.is_active) || 0) - (Number(b.is_active) || 0)) * dir;
            }
            return String(a.classification_name || "")
                .localeCompare(String(b.classification_name || ""), "id") * dir;
        });
    }, [rows, search, filter, sort]);

    const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
    const safePage   = Math.min(page, totalPages);
    const paged      = useMemo(
        () => visible.slice((safePage - 1) * perPage, safePage * perPage),
        [visible, safePage, perPage]
    );

    // Reset ke halaman 1 setiap kali filter/pencarian/urutan berubah
    useEffect(() => { setPage(1); }, [search, filter, sort, perPage]);

    const toggleSort = (key) => setSort(s =>
        s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

    const openCreate = () => {
        setEditId(null); setName(""); setActive(true); setFormOpen(true);
    };

    const openEdit = (row) => {
        setEditId(row.id);
        setName(row.classification_name || "");
        setActive(Number(row.is_active) === 1);
        setFormOpen(true);
    };

    const doSave = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2 || trimmed.length > 100) {
            return showToast("error", "Nama klasifikasi harus 2–100 karakter");
        }
        setSaving(true);
        try {
            if (editId) {
                await api(`/pengajuan/master-classification/${editId}`, {
                    method: "PUT",
                    body: JSON.stringify({ classification_name: trimmed, is_active: active ? "1" : "0" }),
                });
                showToast("success", "Klasifikasi diperbarui");
            } else {
                await api("/pengajuan/master-classification", {
                    method: "POST",
                    body: JSON.stringify({ classification_name: trimmed }),
                });
                showToast("success", "Klasifikasi ditambahkan");
            }
            setFormOpen(false);
            load();
        } catch (err) {
            showToast("error", err.message || "Gagal menyimpan");
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!confirmRow) return;
        setDeleting(true);
        try {
            const r = await api(`/pengajuan/master-classification/${confirmRow.id}`, { method: "DELETE" });
            showToast("success", r.message || "Klasifikasi dihapus");
            setConfirmRow(null);
            load();
        } catch (err) {
            showToast("error", err.message || "Gagal menghapus");
        } finally {
            setDeleting(false);
        }
    };

    if (!isFinance) {
        return (
            <div className="p-6">
                <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                    <HiOutlineExclamationTriangle className="mx-auto h-8 w-8 text-amber-500" />
                    <p className="mt-2 text-sm font-semibold text-amber-800">Akses ditolak</p>
                    <p className="text-xs text-amber-700">Halaman ini hanya untuk Tim Finance.</p>
                </div>
            </div>
        );
    }

    const nameInvalid  = name.trim().length < 2;
    const confirmUsed  = Number(confirmRow?.usage_count) || 0;
    const confirmSoft  = confirmUsed > 0;

    return (
        <div className="space-y-5 p-4 sm:p-6">
            <Toast toast={toast} />

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Master Klasifikasi</h1>
                    <p className="text-xs text-slate-400">Klasifikasi pembelian untuk pencatatan Finance</p>
                </div>
                <button onClick={openCreate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[.98]">
                    <HiOutlinePlus className="h-4 w-4" /> Tambah Klasifikasi
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={HiOutlineSquares2X2} tone="slate" label="Total Klasifikasi"
                    value={stats.total} sub={`${stats.belum} belum pernah dipakai`} />
                <StatCard icon={HiOutlineCheckCircle} tone="emerald" label="Aktif"
                    value={stats.aktif} sub="Tersedia saat input pembayaran" />
                <StatCard icon={HiOutlineNoSymbol} tone="rose" label="Nonaktif"
                    value={stats.nonaktif} sub="Disembunyikan dari pilihan" />
                <StatCard icon={HiOutlineArchiveBox} tone="indigo" label="Dipakai Pengajuan"
                    value={stats.dipakai} sub="Total relasi ke pengajuan" />
            </div>

            {stats.top && Number(stats.top.usage_count) > 0 && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-indigo-200 bg-white text-indigo-600">
                        <HiOutlineArrowTrendingUp className="h-4 w-4" />
                    </span>
                    <p className="text-sm text-slate-600">
                        Paling sering dipakai:{" "}
                        <span className="font-bold text-slate-800">{toTitleCase(stats.top.classification_name)}</span>{" "}
                        <span className="text-slate-400">({stats.top.usage_count} pengajuan)</span>
                    </p>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                    <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari klasifikasi..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={cn("rounded-xl border px-3 py-2 text-xs font-semibold transition",
                                filter === f.key
                                    ? "border-emerald-600 bg-emerald-600 text-white"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700")}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabel */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Daftar Klasifikasi</p>
                    <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold tabular-nums text-slate-400">
                            {visible.length} dari {stats.total} data
                        </p>
                        <select value={perPage} onChange={e => setPerPage(Number(e.target.value))}
                            aria-label="Baris per halaman"
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 outline-none focus:border-emerald-400">
                            {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / hal</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="w-14 px-4 py-3 text-center font-semibold">No</th>
                                <th className="px-4 py-3 text-left font-semibold">
                                    <SortButton label="Nama Klasifikasi" col="name" sort={sort} onSort={toggleSort} />
                                </th>
                                <th className="w-32 px-4 py-3 text-center font-semibold">
                                    <SortButton label="Dipakai" col="usage" sort={sort} onSort={toggleSort} align="center" />
                                </th>
                                <th className="w-28 px-4 py-3 text-center font-semibold">
                                    <SortButton label="Status" col="status" sort={sort} onSort={toggleSort} align="center" />
                                </th>
                                <th className="w-28 px-4 py-3 text-right font-semibold">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">Memuat...</td></tr>
                            )}
                            {!loading && paged.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                                    {rows.length ? "Tidak ada klasifikasi yang cocok" : "Belum ada klasifikasi"}
                                </td></tr>
                            )}
                            {!loading && paged.map((row, i) => {
                                const used = Number(row.usage_count) || 0;
                                const aktif = Number(row.is_active) === 1;
                                return (
                                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-4 py-3 text-center text-xs font-semibold tabular-nums text-slate-400">
                                            {(safePage - 1) * perPage + i + 1}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-xl border",
                                                    aktif ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                                                          : "border-slate-200 bg-slate-50 text-slate-400")}>
                                                    <HiOutlineTag className="h-4 w-4" />
                                                </span>
                                                <span className={cn("font-semibold", aktif ? "text-slate-700" : "text-slate-400")}>
                                                    {toTitleCase(row.classification_name)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn("inline-flex min-w-[2.25rem] justify-center rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums",
                                                used ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-400")}>
                                                {used}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                                aktif ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                      : "border-slate-200 bg-slate-50 text-slate-500")}>
                                                {aktif ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => openEdit(row)} aria-label="Edit" title="Edit"
                                                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600">
                                                    <HiOutlinePencilSquare className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => setConfirmRow(row)} aria-label="Hapus" title="Hapus"
                                                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600">
                                                    <HiOutlineTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && visible.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                        <p className="text-[11px] font-semibold text-slate-400 tabular-nums">
                            Menampilkan {(safePage - 1) * perPage + 1}–{Math.min(safePage * perPage, visible.length)} dari {visible.length}
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                                aria-label="Halaman sebelumnya"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40">
                                <HiOutlineChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="px-2 text-xs font-semibold tabular-nums text-slate-500">
                                {safePage} / {totalPages}
                            </span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                                aria-label="Halaman berikutnya"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-40">
                                <HiOutlineChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal tambah / edit (portal ke document.body) ── */}
            {formOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                        onClick={saving ? undefined : () => setFormOpen(false)} />

                    <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-fade-in"
                        style={{ maxHeight: "92vh" }}>
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                            <div className="flex items-center gap-2.5">
                                <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600">
                                    <HiOutlineTag className="h-4 w-4" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold tracking-tight text-slate-800">
                                        {editId ? "Edit Klasifikasi" : "Tambah Klasifikasi"}
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-slate-400">Master klasifikasi pembelian</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setFormOpen(false)} disabled={saving} aria-label="Tutup"
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    Nama Klasifikasi <span className="text-rose-500">*</span>
                                </label>
                                <input value={name} onChange={e => setName(e.target.value)} maxLength={100} autoFocus
                                    onKeyDown={e => { if (e.key === "Enter" && !nameInvalid) doSave(); }}
                                    placeholder="Contoh: Biaya Atk"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30" />
                                <p className="mt-1.5 text-[11px] text-slate-400">
                                    2–100 karakter. Nama otomatis dirapikan menjadi Kapital Tiap Kata.
                                </p>
                            </div>

                            {editId && (
                                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3">
                                    <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                    <span className="text-xs">
                                        <span className="font-bold text-slate-700">Aktif</span>
                                        <span className="block text-slate-400">Muncul saat Finance memilih klasifikasi pembayaran.</span>
                                    </span>
                                </label>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                            <button type="button" onClick={() => setFormOpen(false)} disabled={saving}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
                                Batal
                            </button>
                            <button type="button" onClick={doSave} disabled={saving || nameInvalid}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60">
                                {saving && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                                {saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Tambah"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Konfirmasi hapus / nonaktifkan (portal ke document.body) ── */}
            {confirmRow && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl animate-fade-in">
                        <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-xl shadow-inner",
                            confirmSoft ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600")}>
                            {confirmSoft ? <HiOutlineNoSymbol className="h-6 w-6" /> : <HiOutlineTrash className="h-6 w-6" />}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-800">
                                {confirmSoft ? "Nonaktifkan klasifikasi?" : "Hapus klasifikasi?"}
                            </h3>
                            <p className="text-xs leading-relaxed text-slate-400">
                                <span className="font-semibold text-slate-600">{toTitleCase(confirmRow.classification_name)}</span>
                                {confirmSoft
                                    ? ` masih dipakai ${confirmUsed} pengajuan, jadi hanya akan dinonaktifkan agar riwayat pembayaran tetap utuh.`
                                    : " belum dipakai pengajuan apa pun dan akan dihapus permanen."}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button type="button" onClick={() => setConfirmRow(null)} disabled={deleting}
                                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 active:scale-95 disabled:opacity-60">
                                Batal
                            </button>
                            <button type="button" onClick={doDelete} disabled={deleting}
                                className={cn("flex-1 rounded-xl py-2.5 text-xs font-bold text-white shadow-md transition active:scale-95 disabled:opacity-60",
                                    confirmSoft
                                        ? "bg-amber-600 shadow-amber-600/20 hover:bg-amber-700"
                                        : "bg-rose-600 shadow-rose-600/20 hover:bg-rose-700")}>
                                {deleting ? "Memproses..." : confirmSoft ? "Nonaktifkan" : "Hapus"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
