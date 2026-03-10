import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiUpload, assetUrl } from "../../lib/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { QRCodeSVG } from "qrcode.react";

import {
    HiOutlineArrowLeft,
    HiOutlinePlus,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineMagnifyingGlass,
    HiOutlineQrCode,
    HiOutlineCamera,
    HiOutlineXMark,
    HiOutlineMapPin,
    HiOutlinePhoto,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineFunnel,
    HiOutlineArrowDownTray,
    HiOutlinePrinter,
    HiOutlineCube,
    HiOutlineWrenchScrewdriver,
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineEye,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const SUB_KATEGORI = ["Aset Fasilitas", "Aset Operasional", "Aset Kantor", "Aset IT"];
const SATUAN = ["Unit", "Pcs", "Set", "Buah", "Pasang", "Lembar", "Roll", "Box", "Lusin", "Rim", "Pak", "Batang", "Meter", "Kg", "Liter"];
const KONDISI = ["Baik", "Rusak Ringan", "Rusak Berat", "Dalam Perbaikan", "Tidak Layak Pakai"];

const KONDISI_COLOR = {
    "Baik": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Rusak Ringan": "bg-amber-100 text-amber-700 border-amber-200",
    "Rusak Berat": "bg-rose-100 text-rose-700 border-rose-200",
    "Dalam Perbaikan": "bg-blue-100 text-blue-700 border-blue-200",
    "Tidak Layak Pakai": "bg-slate-200 text-slate-600 border-slate-300",
};

const SUBKAT_COLOR = {
    "Aset Fasilitas": "bg-cyan-100 text-cyan-700",
    "Aset Operasional": "bg-violet-100 text-violet-700",
    "Aset Kantor": "bg-amber-100 text-amber-700",
    "Aset IT": "bg-blue-100 text-blue-700",
};

const inputCls = cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800",
    "outline-none transition-all placeholder:text-slate-400",
    "focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400",
    "disabled:bg-slate-100 disabled:text-slate-400"
);

const EMPTY_FORM = {
    kode_aset: "", nama_aset: "", company_id: "", sub_kategori: "",
    brand: "", model: "", no_seri: "", lokasi_nama: "",
    lokasi_lat: "", lokasi_lng: "", jumlah: 1, satuan: "Unit",
    pic_employee_id: "", kondisi: "Baik",
    is_active: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AsetManagement() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // ── State ──
    const [asets, setAsets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSub, setFilterSub] = useState("");
    const [filterKondisi, setFilterKondisi] = useState("");
    const [filterCompany, setFilterCompany] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [stats, setStats] = useState(null);

    // Master data
    const [companies, setCompanies] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Modal states
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Detail view
    const [detailAset, setDetailAset] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Photo upload
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const photoInputRef = useRef(null);

    // QR Scanner
    const [scannerOpen, setScannerOpen] = useState(false);
    const scannerRef = useRef(null);
    const html5QrRef = useRef(null);

    // Confirm dialog
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Toast
    const [toast, setToast] = useState(null);

    // QR modal
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrAset, setQrAset] = useState(null);

    // ── Toast helper ──
    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Load master data ──
    useEffect(() => {
        document.title = "Manajemen Aset | Alora Group Indonesia";
        (async () => {
            try {
                const d = await api("/aset/master-data");
                setCompanies(d.companies || []);
                setEmployees(d.employees || []);
            } catch { /* ignore */ }
        })();
    }, []);

    // ── Load stats ──
    const loadStats = useCallback(async () => {
        try {
            const d = await api("/aset/stats");
            setStats(d);
        } catch { /* ignore */ }
    }, []);

    // ── Load asets ──
    const loadAsets = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filterSub) params.set("sub_kategori", filterSub);
            if (filterKondisi) params.set("kondisi", filterKondisi);
            if (filterCompany) params.set("company_id", filterCompany);
            params.set("page", page);
            params.set("limit", 20);
            const d = await api(`/aset?${params}`);
            setAsets(d.asets || []);
            setTotal(d.total || 0);
            setTotalPages(d.totalPages || 1);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat data aset");
        } finally {
            setLoading(false);
        }
    }, [search, filterSub, filterKondisi, filterCompany, page]);

    useEffect(() => { loadAsets(); loadStats(); }, [loadAsets, loadStats]);

    // ── Handle QR scan from URL ──
    useEffect(() => {
        const kode = searchParams.get("kode");
        if (kode) {
            openDetailByKode(kode);
            setSearchParams({}, { replace: true });
        }
    }, []);

    // ── Open detail by kode_aset ──
    const openDetailByKode = async (kode) => {
        try {
            const d = await api(`/aset/kode/${encodeURIComponent(kode)}`);
            setDetailAset(d.aset);
            setDetailOpen(true);
        } catch (err) {
            showToast("error", err.message || "Aset tidak ditemukan");
        }
    };

    // ── Open detail by ID ──
    const openDetail = async (id) => {
        try {
            const d = await api(`/aset/${id}`);
            setDetailAset(d.aset);
            setDetailOpen(true);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat detail aset");
        }
    };

    // ── Modal — Add/Edit ──
    const openAdd = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setFormErrors({});
        setModalOpen(true);
    };

    const openEdit = (aset) => {
        setEditTarget(aset);
        setForm({
            kode_aset: aset.kode_aset || "",
            nama_aset: aset.nama_aset || "",
            company_id: aset.company_id || "",
            sub_kategori: aset.sub_kategori || "",
            brand: aset.brand || "",
            model: aset.model || "",
            no_seri: aset.no_seri || "",
            lokasi_nama: aset.lokasi_nama || "",
            lokasi_lat: aset.lokasi_lat || "",
            lokasi_lng: aset.lokasi_lng || "",
            jumlah: aset.jumlah || 1,
            satuan: aset.satuan || "Unit",
            pic_employee_id: aset.pic_employee_id || "",
            kondisi: aset.kondisi || "Baik",
            is_active: aset.is_active === 1 || aset.is_active === true,
        });
        setFormErrors({});
        setModalOpen(true);
    };

    const validate = () => {
        const e = {};
        if (!form.nama_aset.trim()) e.nama_aset = "Nama aset wajib diisi";
        if (!form.sub_kategori) e.sub_kategori = "Sub kategori wajib dipilih";
        if (!form.kondisi) e.kondisi = "Kondisi wajib dipilih";
        setFormErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const body = {
                ...form,
                company_id: form.company_id || null,
                pic_employee_id: form.pic_employee_id || null,
                lokasi_lat: form.lokasi_lat || null,
                lokasi_lng: form.lokasi_lng || null,
            };
            if (editTarget) {
                await api(`/aset/${editTarget.id}`, { method: "PUT", body: JSON.stringify(body) });
                showToast("success", "Aset berhasil diperbarui");
            } else {
                await api("/aset", { method: "POST", body: JSON.stringify(body) });
                showToast("success", "Aset berhasil ditambahkan");
            }
            setModalOpen(false);
            loadAsets();
            loadStats();
        } catch (err) {
            showToast("error", err.message || "Terjadi kesalahan");
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDeleteClick = (aset) => { setDeleteTarget(aset); setConfirmOpen(true); };
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await api(`/aset/${deleteTarget.id}`, { method: "DELETE" });
            showToast("success", "Aset berhasil dihapus");
            loadAsets();
            loadStats();
            if (detailOpen && detailAset?.id === deleteTarget.id) setDetailOpen(false);
        } catch (err) {
            showToast("error", err.message || "Gagal menghapus");
        } finally {
            setConfirmOpen(false);
            setDeleteTarget(null);
        }
    };

    // ── Photo upload ──
    const handlePhotoUpload = async (files) => {
        if (!detailAset || !files.length) return;
        setUploadingPhotos(true);
        try {
            const fd = new FormData();
            Array.from(files).forEach((f) => fd.append("photos", f));
            const d = await apiUpload(`/aset/${detailAset.id}/photos`, { method: "POST", body: fd });
            setDetailAset((prev) => ({ ...prev, photos: d.photos }));
            showToast("success", "Foto berhasil diupload");
        } catch (err) {
            showToast("error", err.message || "Gagal upload foto");
        } finally {
            setUploadingPhotos(false);
        }
    };

    // ── Photo delete ──
    const handlePhotoDelete = async (photoId) => {
        try {
            await api(`/aset/photos/${photoId}`, { method: "DELETE" });
            setDetailAset((prev) => ({
                ...prev,
                photos: prev.photos.filter((p) => p.id !== photoId),
            }));
            showToast("success", "Foto berhasil dihapus");
        } catch (err) {
            showToast("error", err.message || "Gagal menghapus foto");
        }
    };

    // ── QR Scanner ──
    const startScanner = async () => {
        setScannerOpen(true);
        // Dynamic import to avoid SSR issues
        const { Html5Qrcode } = await import("html5-qrcode");
        setTimeout(() => {
            if (!scannerRef.current) return;
            const scanner = new Html5Qrcode("qr-reader");
            html5QrRef.current = scanner;
            scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    scanner.stop().catch(() => { });
                    setScannerOpen(false);
                    // Parse URL or raw kode
                    let kode = decodedText;
                    try {
                        const url = new URL(decodedText);
                        kode = url.searchParams.get("kode") || decodedText;
                    } catch { /* not a URL, use raw text */ }
                    openDetailByKode(kode);
                },
                () => { } // ignore error frames
            ).catch((err) => {
                showToast("error", err.message || "Tidak bisa mengakses kamera");
                setScannerOpen(false);
            });
        }, 300);
    };

    const stopScanner = () => {
        if (html5QrRef.current) {
            html5QrRef.current.stop().catch(() => { });
            html5QrRef.current = null;
        }
        setScannerOpen(false);
    };

    // ── QR Print ──
    const printQr = () => {
        const el = document.getElementById("qr-print-area");
        if (!el) return;
        const w = window.open("", "_blank", "width=400,height=500");
        w.document.write(`
      <html><head><title>QR Code - ${qrAset?.kode_aset}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif}h2{margin-bottom:4px}p{color:#666;font-size:14px}</style>
      </head><body>${el.innerHTML}</body></html>
    `);
        w.document.close();
        w.print();
    };

    // ── Get current location ──
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            showToast("error", "Geolocation tidak didukung browser ini");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm((p) => ({
                    ...p,
                    lokasi_lat: pos.coords.latitude.toFixed(8),
                    lokasi_lng: pos.coords.longitude.toFixed(8),
                }));
                showToast("success", "Lokasi berhasil diambil");
            },
            () => showToast("error", "Gagal mengambil lokasi"),
            { enableHighAccuracy: true }
        );
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#f4f6f9]">

            {/* ── Toast ── */}
            {toast && (
                <div className={cn(
                    "fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg backdrop-blur-sm border",
                    toast.type === "success"
                        ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
                        : "bg-rose-50/95 border-rose-200 text-rose-700"
                )}>
                    {toast.type === "success" ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineExclamationTriangle className="h-5 w-5" />}
                    {toast.msg}
                </div>
            )}

            {/* ── Confirm Delete ── */}
            <ConfirmDialog
                open={confirmOpen}
                title="Hapus Aset"
                message={`Yakin ingin menghapus aset "${deleteTarget?.nama_aset}"? Tindakan ini tidak dapat dibatalkan.`}
                onConfirm={handleDeleteConfirm}
                onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
            />

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* TOP BAR */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
                <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate("/portal")} className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50 transition">
                                <HiOutlineArrowLeft className="h-4 w-4 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-lg sm:text-xl font-bold text-slate-800">Manajemen Aset</h1>
                                <p className="text-xs text-slate-500">Kelola seluruh aset perusahaan</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={startScanner} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                                <HiOutlineCamera className="h-4 w-4" />
                                <span className="hidden sm:inline">Scan QR</span>
                            </button>
                            <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm">
                                <HiOutlinePlus className="h-4 w-4" />
                                <span className="hidden sm:inline">Tambah Aset</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-5 space-y-5">

                {/* ═══════════════ STATS CARDS ═══════════════ */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard label="Total Aset" value={stats.total} icon={<HiOutlineCube className="h-5 w-5" />} color="blue" />
                        {stats.byKondisi?.map((k) => (
                            <StatCard key={k.kondisi} label={k.kondisi} value={k.cnt}
                                icon={k.kondisi === "Baik" ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineWrenchScrewdriver className="h-5 w-5" />}
                                color={k.kondisi === "Baik" ? "emerald" : k.kondisi === "Rusak Ringan" ? "amber" : "rose"} />
                        ))}
                    </div>
                )}

                {/* ═══════════════ SEARCH & FILTERS ═══════════════ */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Cari kode, nama, brand, seri..."
                                className={cn(inputCls, "pl-10")} />
                        </div>
                        <select value={filterSub} onChange={(e) => { setFilterSub(e.target.value); setPage(1); }} className={cn(inputCls, "sm:w-44")}>
                            <option value="">Semua Sub Kategori</option>
                            {SUB_KATEGORI.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterKondisi} onChange={(e) => { setFilterKondisi(e.target.value); setPage(1); }} className={cn(inputCls, "sm:w-40")}>
                            <option value="">Semua Kondisi</option>
                            {KONDISI.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }} className={cn(inputCls, "sm:w-44")}>
                            <option value="">Semua Kategori</option>
                            {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                        </select>
                    </div>
                </div>

                {/* ═══════════════ TABLE / CARDS ═══════════════ */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    {loading ? (
                        <div className="py-20 text-center text-slate-400 text-sm">Memuat data...</div>
                    ) : asets.length === 0 ? (
                        <div className="py-20 text-center">
                            <HiOutlineCube className="mx-auto h-12 w-12 text-slate-300" />
                            <p className="mt-3 text-slate-500 text-sm">Belum ada aset ditemukan.</p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden lg:block overflow-x-auto rounded-t-xl">
                                <table className="w-full min-w-[1100px] text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <th className="px-4 py-3">Kode</th>
                                            <th className="px-4 py-3">Nama Aset</th>
                                            <th className="px-4 py-3">Kategori</th>
                                            <th className="px-4 py-3">Sub Kategori</th>
                                            <th className="px-4 py-3">Brand / Model</th>
                                            <th className="px-4 py-3">Lokasi</th>
                                            <th className="px-4 py-3">PIC</th>
                                            <th className="px-4 py-3">Qty</th>
                                            <th className="px-4 py-3">Kondisi</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {asets.map((a) => (
                                            <tr key={a.id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold whitespace-nowrap">{a.kode_aset}</td>
                                                <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{a.nama_aset}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{a.company_name || "-"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", SUBKAT_COLOR[a.sub_kategori])}>
                                                        {a.sub_kategori}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{[a.brand, a.model].filter(Boolean).join(" ") || "-"}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">{a.lokasi_nama || "-"}</td>
                                                <td className="px-4 py-3 text-slate-600 text-xs">{a.pic_name || "-"}</td>
                                                <td className="px-4 py-3 text-slate-600 text-center">{a.jumlah} {a.satuan}</td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium", KONDISI_COLOR[a.kondisi])}>
                                                        {a.kondisi}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap",
                                                        a.is_active === 1
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                                    )}>
                                                        <span className={cn("h-1.5 w-1.5 rounded-full", a.is_active === 1 ? "bg-emerald-500" : "bg-slate-400")} />
                                                        {a.is_active === 1 ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => openDetail(a.id)} title="Lihat" className="rounded-md p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                                            <HiOutlineEye className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => { setQrAset(a); setQrModalOpen(true); }} title="QR Code" className="rounded-md p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
                                                            <HiOutlineQrCode className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => { openEdit(a); setDetailOpen(false); }} title="Edit" className="rounded-md p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition">
                                                            <HiOutlinePencilSquare className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(a)} title="Hapus" className="rounded-md p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                                                            <HiOutlineTrash className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="lg:hidden divide-y divide-slate-100">
                                {asets.map((a) => (
                                    <div key={a.id} className="p-4 hover:bg-slate-50/50 transition">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0" onClick={() => openDetail(a.id)}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-mono text-xs text-blue-600 font-semibold">{a.kode_aset}</span>
                                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", KONDISI_COLOR[a.kondisi])}>{a.kondisi}</span>
                                                    <span className={cn(
                                                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                                        a.is_active === 1 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                                                    )}>
                                                        {a.is_active === 1 ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-semibold text-slate-800 truncate">{a.nama_aset}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {a.company_name || "-"} • {a.sub_kategori}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    PIC: {a.pic_name || "-"} • {a.jumlah} {a.satuan}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                <button onClick={() => { setQrAset(a); setQrModalOpen(true); }} className="rounded-md p-1.5 text-slate-400 hover:text-indigo-600">
                                                    <HiOutlineQrCode className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => { openEdit(a); setDetailOpen(false); }} className="rounded-md p-1.5 text-slate-400 hover:text-amber-600">
                                                    <HiOutlinePencilSquare className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDeleteClick(a)} className="rounded-md p-1.5 text-slate-400 hover:text-rose-600">
                                                    <HiOutlineTrash className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                                    <p className="text-xs text-slate-500">
                                        Menampilkan <span className="font-semibold text-slate-700">{asets.length}</span> dari <span className="font-semibold text-slate-700">{total}</span> aset
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
                                            <HiOutlineChevronLeft className="h-4 w-4" />
                                        </button>
                                        <span className="px-3 text-xs font-medium text-slate-600">{page} / {totalPages}</span>
                                        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50">
                                            <HiOutlineChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* ADD / EDIT MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editTarget ? "Edit Aset" : "Tambah Aset Baru"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100 transition">
                                <HiOutlineXMark className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Kode Aset */}
                            <Field label="Kode Aset" hint="Auto-generate jika kosong" error={formErrors.kode_aset}>
                                <input className={inputCls} value={form.kode_aset} onChange={(e) => setForm((p) => ({ ...p, kode_aset: e.target.value }))} placeholder="AST-00001 (opsional)" />
                            </Field>

                            {/* Nama */}
                            <Field label="Nama Aset" required error={formErrors.nama_aset}>
                                <input className={inputCls} value={form.nama_aset} onChange={(e) => setForm((p) => ({ ...p, nama_aset: e.target.value }))} placeholder="Contoh: Laptop Dell Latitude 5520" />
                            </Field>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Kategori (Company) */}
                                <Field label="Kategori (Company)">
                                    <select className={inputCls} value={form.company_id} onChange={(e) => setForm((p) => ({ ...p, company_id: e.target.value }))}>
                                        <option value="">Pilih Kategori</option>
                                        {companies.map((c) => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                                    </select>
                                </Field>

                                {/* Sub Kategori */}
                                <Field label="Sub Kategori" required error={formErrors.sub_kategori}>
                                    <select className={inputCls} value={form.sub_kategori} onChange={(e) => setForm((p) => ({ ...p, sub_kategori: e.target.value }))}>
                                        <option value="">Pilih Sub Kategori</option>
                                        {SUB_KATEGORI.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Brand */}
                                <Field label="Brand">
                                    <input className={inputCls} value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} placeholder="Contoh: Dell" />
                                </Field>
                                {/* Model */}
                                <Field label="Model">
                                    <input className={inputCls} value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="Contoh: Latitude 5520" />
                                </Field>
                                {/* No Seri */}
                                <Field label="No Seri / IMEI">
                                    <input className={inputCls} value={form.no_seri} onChange={(e) => setForm((p) => ({ ...p, no_seri: e.target.value }))} placeholder="SN/IMEI" />
                                </Field>
                            </div>

                            {/* Lokasi */}
                            <Field label="Lokasi">
                                <input className={inputCls} value={form.lokasi_nama} onChange={(e) => setForm((p) => ({ ...p, lokasi_nama: e.target.value }))} placeholder="Nama lokasi, misal: Gudang Utama Lt. 2" />
                            </Field>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                <Field label="Latitude">
                                    <input type="number" step="any" className={inputCls} value={form.lokasi_lat} onChange={(e) => setForm((p) => ({ ...p, lokasi_lat: e.target.value }))} placeholder="-6.xxxxxxxx" />
                                </Field>
                                <Field label="Longitude">
                                    <input type="number" step="any" className={inputCls} value={form.lokasi_lng} onChange={(e) => setForm((p) => ({ ...p, lokasi_lng: e.target.value }))} placeholder="106.xxxxxxxx" />
                                </Field>
                                <button type="button" onClick={getCurrentLocation}
                                    className="flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-100 transition">
                                    <HiOutlineMapPin className="h-4 w-4" /> Ambil Lokasi Saat Ini
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Jumlah */}
                                <Field label="Jumlah">
                                    <input type="number" min="1" className={inputCls} value={form.jumlah} onChange={(e) => setForm((p) => ({ ...p, jumlah: parseInt(e.target.value) || 1 }))} />
                                </Field>
                                {/* Satuan */}
                                <Field label="Satuan">
                                    <select className={inputCls} value={form.satuan} onChange={(e) => setForm((p) => ({ ...p, satuan: e.target.value }))}>
                                        {SATUAN.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                                {/* Kondisi */}
                                <Field label="Kondisi" required error={formErrors.kondisi}>
                                    <select className={inputCls} value={form.kondisi} onChange={(e) => setForm((p) => ({ ...p, kondisi: e.target.value }))}>
                                        {KONDISI.map((k) => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* PIC */}
                            <Field label="PIC (Penanggung Jawab)">
                                <select className={inputCls} value={form.pic_employee_id} onChange={(e) => setForm((p) => ({ ...p, pic_employee_id: e.target.value }))}>
                                    <option value="">Pilih PIC</option>
                                    {employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.full_name}{e.position_name ? ` — ${e.position_name}` : ""}</option>)}
                                </select>
                            </Field>

                            {/* Status Aktif */}
                            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Status Aset</p>
                                    <p className="text-xs text-slate-500">Tandai aset ini sebagai aktif atau tidak aktif</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer",
                                        form.is_active ? "bg-blue-600" : "bg-slate-200"
                                    )}
                                >
                                    <span className={cn(
                                        "inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200",
                                        form.is_active ? "translate-x-5" : "translate-x-0"
                                    )} />
                                </button>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                    Batal
                                </button>
                                <button type="submit" disabled={saving}
                                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm">
                                    {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Aset"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* DETAIL PANEL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {detailOpen && detailAset && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-4 px-3 sm:py-6 sm:px-4">
                    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4">
                            <div>
                                <span className="font-mono text-xs text-blue-600 font-semibold">{detailAset.kode_aset}</span>
                                <h2 className="text-lg font-bold text-slate-800">{detailAset.nama_aset}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setQrAset(detailAset); setQrModalOpen(true); }} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition" title="QR Code">
                                    <HiOutlineQrCode className="h-4 w-4 text-slate-600" />
                                </button>
                                <button onClick={() => { openEdit(detailAset); setDetailOpen(false); }} className="rounded-lg border border-slate-200 p-2 hover:bg-amber-50 transition" title="Edit">
                                    <HiOutlinePencilSquare className="h-4 w-4 text-amber-600" />
                                </button>
                                <button onClick={() => setDetailOpen(false)} className="rounded-lg p-2 hover:bg-slate-100 transition">
                                    <HiOutlineXMark className="h-5 w-5 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                            {/* Info Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                                <InfoRow label="Kategori" value={detailAset.company_name || "-"} />
                                <InfoRow label="Sub Kategori" value={
                                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", SUBKAT_COLOR[detailAset.sub_kategori])}>{detailAset.sub_kategori}</span>
                                } />
                                <InfoRow label="Brand" value={detailAset.brand || "-"} />
                                <InfoRow label="Model" value={detailAset.model || "-"} />
                                <InfoRow label="No Seri / IMEI" value={detailAset.no_seri || "-"} />
                                <InfoRow label="Kondisi" value={
                                    <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", KONDISI_COLOR[detailAset.kondisi])}>{detailAset.kondisi}</span>
                                } />
                                <InfoRow label="Jumlah" value={`${detailAset.jumlah} ${detailAset.satuan}`} />
                                <InfoRow label="PIC" value={detailAset.pic_name || "-"} />
                                <InfoRow label="Lokasi" value={detailAset.lokasi_nama || "-"} />
                                {detailAset.lokasi_lat && detailAset.lokasi_lng && (
                                    <InfoRow label="Maps" value={
                                        <a href={`https://www.google.com/maps?q=${detailAset.lokasi_lat},${detailAset.lokasi_lng}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                                            <HiOutlineMapPin className="h-3.5 w-3.5" />
                                            Buka di Google Maps
                                        </a>
                                    } />
                                )}
                                <InfoRow label="Status" value={
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                        detailAset.is_active === 1
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-slate-100 text-slate-500 border-slate-200"
                                    )}>
                                        <span className={cn("h-1.5 w-1.5 rounded-full", detailAset.is_active === 1 ? "bg-emerald-500" : "bg-slate-400")} />
                                        {detailAset.is_active === 1 ? "Aktif" : "Tidak Aktif"}
                                    </span>
                                } />
                            </div>

                            {/* Photos */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <HiOutlinePhoto className="h-4 w-4" />
                                        Foto Aset ({detailAset.photos?.length || 0})
                                    </h3>
                                    <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhotos}
                                        className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition disabled:opacity-50">
                                        <HiOutlinePlus className="h-3.5 w-3.5" />
                                        {uploadingPhotos ? "Mengupload..." : "Upload Foto"}
                                    </button>
                                    <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload(e.target.files)} />
                                </div>
                                {detailAset.photos?.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {detailAset.photos.map((p) => (
                                            <div key={p.id} className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square">
                                                <img src={assetUrl(p.photo_path)} alt={p.photo_name || "Foto aset"} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button onClick={() => handlePhotoDelete(p.id)} className="rounded-full bg-white/90 p-2 text-rose-600 hover:bg-rose-50 shadow-lg transition">
                                                        <HiOutlineTrash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {p.caption && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 p-2">
                                                        <p className="text-[10px] text-white truncate">{p.caption}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center">
                                        <HiOutlinePhoto className="mx-auto h-8 w-8 text-slate-300" />
                                        <p className="text-xs text-slate-400 mt-2">Belum ada foto. Klik "Upload Foto" untuk menambahkan.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* QR CODE MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {qrModalOpen && qrAset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <h3 className="text-base font-bold text-slate-800">QR Code Aset</h3>
                            <button onClick={() => setQrModalOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100"><HiOutlineXMark className="h-5 w-5 text-slate-500" /></button>
                        </div>
                        <div className="p-6 flex flex-col items-center" id="qr-print-area">
                            <QRCodeSVG value={`${window.location.origin}/aset-management?kode=${qrAset.kode_aset}`} size={200} level="H"
                                imageSettings={{ src: "/alora.png", height: 30, width: 30, excavate: true }} />
                            <h2 className="mt-4 text-lg font-bold text-slate-800">{qrAset.kode_aset}</h2>
                            <p className="text-sm text-slate-500 text-center">{qrAset.nama_aset}</p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={printQr} className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                                <HiOutlinePrinter className="h-4 w-4" /> Print
                            </button>
                            <button onClick={() => setQrModalOpen(false)} className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* QR SCANNER MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {scannerOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex items-center justify-between bg-black/80 px-4 py-3">
                        <h3 className="text-white font-semibold text-sm">Scan QR Code Aset</h3>
                        <button onClick={stopScanner} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition">
                            <HiOutlineXMark className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-1 flex items-center justify-center" ref={scannerRef}>
                        <div id="qr-reader" className="w-full max-w-md" />
                    </div>
                    <div className="bg-black/80 px-4 py-3 text-center">
                        <p className="text-white/70 text-xs">Arahkan kamera ke QR code aset</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function Field({ label, required, hint, error, children }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">
                    {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
                </label>
                {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
            </div>
            {children}
            {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
            <span className="text-sm text-slate-700">{value}</span>
        </div>
    );
}

function StatCard({ label, value, icon, color = "blue" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
    };
    return (
        <div className={cn("rounded-xl border p-3 sm:p-4", colors[color] || colors.blue)}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
        </div>
    );
}