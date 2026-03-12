// frontend/src/pages/aset-management/index.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiUpload, assetUrl } from "../../lib/api";
import ConfirmDialog from "../../components/ConfirmDialog";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { getEmployeeFromLocal } from "../project-management/role";

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
    HiOutlinePrinter,
    HiOutlineCube,
    HiOutlineWrenchScrewdriver,
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineEye,
} from "react-icons/hi2";

import { cn, toTitleCase, SUB_KATEGORI, SATUAN, KONDISI, KONDISI_COLOR, SUBKAT_COLOR, APPROVAL_STATUS, inputCls, EMPTY_FORM } from "./components/constants";
import { Field, InfoRow, StatCard, ApprovalBadge } from "./components/UIComponents";
import ApprovalSection from "./components/ApprovalSection";
import MutasiTab from "./components/MutasiTab";
import MaintenanceTab from "./components/MaintenanceTab";
import PeminjamanTab from "./components/PeminjamanTab";
import PenghapusanTab from "./components/PenghapusanTab";

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function AsetManagement() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const employee = getEmployeeFromLocal();

    // ── State ──
    const [asets, setAsets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterSub, setFilterSub] = useState("");
    const [filterKondisi, setFilterKondisi] = useState("");
    const [filterCompany, setFilterCompany] = useState("");
    const [filterApproval, setFilterApproval] = useState("");
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
    const [detailTab, setDetailTab] = useState("info");

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
    const [barcodeType, setBarcodeType] = useState("qr");

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
            if (filterApproval) params.set("approval_status", filterApproval);
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
    }, [search, filterSub, filterKondisi, filterCompany, filterApproval, page]);

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
            setDetailTab("info");
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
            setDetailTab("info");
        } catch (err) {
            showToast("error", err.message || "Gagal memuat detail aset");
        }
    };

    // ── Refresh detail (setelah approval, dll) ──
    const refreshDetail = async () => {
        if (!detailAset) return;
        try {
            const d = await api(`/aset/${detailAset.id}`);
            setDetailAset(d.aset);
            loadAsets();
            loadStats();
        } catch { /* ignore */ }
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
                showToast("success", "Aset berhasil ditambahkan (Draft)");
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
            loadAsets();
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
            loadAsets();
        } catch (err) {
            showToast("error", err.message || "Gagal menghapus foto");
        }
    };

    // ── QR Scanner ──
    const startScanner = async () => {
        setScannerOpen(true);
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
                    let kode = decodedText;
                    try {
                        const url = new URL(decodedText);
                        kode = url.searchParams.get("kode") || decodedText;
                    } catch { /* not a URL */ }
                    openDetailByKode(kode);
                },
                () => { }
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
        const el = document.getElementById("barcode-print-area");
        if (!el) return;
        const title = barcodeType === "qr"
            ? `QR Code - ${qrAset?.kode_aset}`
            : `Barcode - ${qrAset?.kode_aset}`;
        const w = window.open("", "_blank", "width=400,height=500");
        w.document.write(`
      <html><head><title>${title}</title>
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

    // Detail tabs
    const DETAIL_TABS = [
        { key: "info", label: "Info" },
        { key: "approval", label: "Approval" },
        { key: "mutasi", label: "Mutasi" },
        { key: "maintenance", label: "Maintenance" },
        { key: "peminjaman", label: "Peminjaman" },
        { key: "penghapusan", label: "Disposal" },
    ];

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
                                <p className="text-xs text-slate-500 hidden sm:block">Kelola inventaris aset perusahaan</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={startScanner} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                <HiOutlineCamera className="h-4 w-4" />
                                <span className="hidden sm:inline">Scan QR</span>
                            </button>
                            <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                <HiOutlinePlus className="h-4 w-4" />
                                Tambah Aset
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">

                {/* ── Stats ── */}
                {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <StatCard label="Total Aset" value={stats.total || 0} icon={<HiOutlineCube className="h-4 w-4" />} color="blue" />
                        <StatCard label="Disetujui" value={stats.approved || 0} icon={<HiOutlineCheckCircle className="h-4 w-4" />} color="emerald" />
                        <StatCard label="Pending" value={(stats.pending_spv || 0) + (stats.pending_bod || 0)} icon={<HiOutlineExclamationTriangle className="h-4 w-4" />} color="amber" />
                        <StatCard label="Draft" value={stats.draft || 0} icon={<HiOutlinePencilSquare className="h-4 w-4" />} color="slate" />
                        <StatCard label="Ditolak" value={stats.rejected || 0} icon={<HiOutlineXMark className="h-4 w-4" />} color="rose" />
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Cari nama, kode, brand..."
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition"
                            />
                        </div>
                        <select value={filterSub} onChange={(e) => { setFilterSub(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
                            <option value="">Semua Kategori</option>
                            {SUB_KATEGORI.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={filterKondisi} onChange={(e) => { setFilterKondisi(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
                            <option value="">Semua Kondisi</option>
                            {KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
                            <option value="">Semua Perusahaan</option>
                            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}                        </select>
                        <select value={filterApproval} onChange={(e) => { setFilterApproval(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition">
                            <option value="">Semua Status</option>
                            {Object.entries(APPROVAL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* ── Asset List ── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-slate-500">{total} aset ditemukan</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="h-8 w-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                        </div>
                    ) : asets.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
                            <HiOutlineCube className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">Tidak ada aset ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {asets.map((aset) => (
                                <div key={aset.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                                    {/* Photo */}
                                    <div className="relative h-36 bg-slate-100 overflow-hidden">
                                        {aset.photos?.[0] ? (
                                            <img src={assetUrl(aset.photos[0].photo_path)} alt={aset.nama_aset} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="h-full flex items-center justify-center">
                                                <HiOutlinePhoto className="h-10 w-10 text-slate-300" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", SUBKAT_COLOR[aset.sub_kategori] || "bg-slate-100 text-slate-600")}>
                                                {aset.sub_kategori}
                                            </span>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <ApprovalBadge status={aset.approval_status} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-3">
                                        <p className="text-[10px] text-slate-400 font-mono mb-0.5">{aset.kode_aset}</p>
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{toTitleCase(aset.nama_aset)}</h3>
                                        {(aset.brand || aset.model) && (
                                            <p className="text-xs text-slate-500 truncate">{[aset.brand, aset.model].filter(Boolean).join(" · ")}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", KONDISI_COLOR[aset.kondisi] || "bg-slate-100 text-slate-600 border-slate-200")}>
                                                {aset.kondisi}
                                            </span>
                                            {aset.lokasi_nama && (
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                                                    <HiOutlineMapPin className="h-3 w-3 flex-shrink-0" />{aset.lokasi_nama}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between gap-1">
                                        <button onClick={() => openDetail(aset.id)} className="flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition">
                                            <HiOutlineEye className="h-3.5 w-3.5" /> Detail
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setQrAset(aset); setQrModalOpen(true); }} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition" title="QR Code">
                                                <HiOutlineQrCode className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => openEdit(aset)} className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition" title="Edit">
                                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                            </button>
                                            <button onClick={() => handleDeleteClick(aset)} className="rounded-md border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50 transition" title="Hapus">
                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Pagination ── */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <HiOutlineChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-slate-600">Halaman {page} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                <HiOutlineChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* DETAIL PANEL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {detailOpen && detailAset && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailOpen(false)} />
                    <div className="relative ml-auto h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 flex-shrink-0">
                            <div>
                                <p className="text-[10px] text-slate-400 font-mono">{detailAset.kode_aset}</p>
                                <h2 className="text-base font-bold text-slate-800">{toTitleCase(detailAset.nama_aset)}</h2>
                            </div>
                            <button onClick={() => setDetailOpen(false)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
                                <HiOutlineXMark className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-slate-200 flex-shrink-0">
                            <div className="flex overflow-x-auto px-4">
                                {DETAIL_TABS.map(t => (
                                    <button key={t.key} onClick={() => setDetailTab(t.key)}
                                        className={cn("px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition",
                                            detailTab === t.key
                                                ? "border-blue-600 text-blue-600"
                                                : "border-transparent text-slate-500 hover:text-slate-700"
                                        )}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {detailTab === "info" && (
                                <div className="space-y-5">
                                    {/* Photos */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Foto Aset</p>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhotos}
                                                    className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition disabled:opacity-50">
                                                    <HiOutlinePlus className="h-3 w-3" />
                                                    {uploadingPhotos ? "Uploading..." : "Upload"}
                                                </button>
                                                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                                                    onChange={(e) => handlePhotoUpload(e.target.files)} />
                                            </div>
                                        </div>
                                        {detailAset.photos?.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {detailAset.photos.map(p => (
                                                    <div key={p.id} className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                                                        <img src={assetUrl(p.photo_path)} alt="" className="h-full w-full object-cover" />
                                                        <button onClick={() => handlePhotoDelete(p.id)}
                                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                            <HiOutlineTrash className="h-5 w-5 text-white" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-lg border-2 border-dashed border-slate-200 py-8 text-center">
                                                <HiOutlinePhoto className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                                                <p className="text-xs text-slate-400">Belum ada foto</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <InfoRow label="Sub Kategori" value={detailAset.sub_kategori || "-"} />
                                        <InfoRow label="Kondisi" value={detailAset.kondisi || "-"} />
                                        <InfoRow label="Brand" value={detailAset.brand || "-"} />
                                        <InfoRow label="Model" value={detailAset.model || "-"} />
                                        <InfoRow label="No. Seri" value={detailAset.no_seri || "-"} />
                                        <InfoRow label="Jumlah" value={`${detailAset.jumlah} ${detailAset.satuan}`} />
                                        <InfoRow label="Perusahaan" value={toTitleCase(detailAset.company_name || "-")} />
                                        <InfoRow label="PIC" value={toTitleCase(detailAset.pic_name || "-")} />
                                    </div>

                                    {detailAset.lokasi_nama && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lokasi</p>
                                            <div className="flex items-start gap-2">
                                                <HiOutlineMapPin className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm text-slate-700">{detailAset.lokasi_nama}</p>
                                                    {detailAset.lokasi_lat && detailAset.lokasi_lng && (
                                                        <a href={`https://maps.google.com/?q=${detailAset.lokasi_lat},${detailAset.lokasi_lng}`} target="_blank" rel="noopener noreferrer"
                                                            className="text-[11px] text-blue-600 hover:underline">
                                                            {detailAset.lokasi_lat}, {detailAset.lokasi_lng}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Edit & QR buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => { setDetailOpen(false); openEdit(detailAset); }}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                            <HiOutlinePencilSquare className="h-4 w-4" /> Edit Aset
                                        </button>
                                        <button onClick={() => { setQrAset(detailAset); setQrModalOpen(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                            <HiOutlineQrCode className="h-4 w-4" /> QR Code
                                        </button>
                                    </div>
                                </div>
                            )}

                            {detailTab === "approval" && (
                                <ApprovalSection aset={detailAset} employee={employee} onRefresh={refreshDetail} showToast={showToast} />
                            )}

                            {detailTab === "mutasi" && (
                                <MutasiTab
                                    asetId={detailAset.id}
                                    aset={detailAset}
                                    employees={employees}
                                    companies={companies}
                                    showToast={showToast}
                                    onRefresh={refreshDetail}
                                />
                            )}

                            {detailTab === "maintenance" && (
                                <MaintenanceTab asetId={detailAset.id} showToast={showToast} />
                            )}

                            {detailTab === "peminjaman" && (
                                <PeminjamanTab asetId={detailAset.id} employees={employees} showToast={showToast} />
                            )}

                            {detailTab === "penghapusan" && (
                                <PenghapusanTab asetId={detailAset.id} showToast={showToast} onAsetUpdated={refreshDetail} />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* ADD / EDIT MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
                            <h2 className="text-base font-bold text-slate-800">
                                {editTarget ? "Edit Aset" : "Tambah Aset Baru"}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
                                <HiOutlineXMark className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Kode Aset" hint="Kosongkan untuk auto-generate">
                                        <input className={inputCls} value={form.kode_aset} onChange={e => setForm(p => ({ ...p, kode_aset: e.target.value }))} placeholder="AST-001" />
                                    </Field>
                                    <Field label="Nama Aset" required error={formErrors.nama_aset}>
                                        <input className={inputCls} value={form.nama_aset} onChange={e => setForm(p => ({ ...p, nama_aset: e.target.value }))} placeholder="Nama aset..." />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Sub Kategori" required error={formErrors.sub_kategori}>
                                        <select className={inputCls} value={form.sub_kategori} onChange={e => setForm(p => ({ ...p, sub_kategori: e.target.value }))}>
                                            <option value="">— Pilih Kategori —</option>
                                            {SUB_KATEGORI.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Kondisi" required error={formErrors.kondisi}>
                                        <select className={inputCls} value={form.kondisi} onChange={e => setForm(p => ({ ...p, kondisi: e.target.value }))}>
                                            {KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Brand / Merek">
                                        <input className={inputCls} value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Samsung, HP, dll." />
                                    </Field>
                                    <Field label="Model">
                                        <input className={inputCls} value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="Model / tipe..." />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="No. Seri">
                                        <input className={inputCls} value={form.no_seri} onChange={e => setForm(p => ({ ...p, no_seri: e.target.value }))} placeholder="Serial number..." />
                                    </Field>
                                    <Field label="Perusahaan">
                                        <select className={inputCls} value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value }))}>
                                            <option value="">— Pilih Perusahaan —</option>
                                            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                                        </select>
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <Field label="Jumlah">
                                            <input type="number" min={1} className={inputCls} value={form.jumlah} onChange={e => setForm(p => ({ ...p, jumlah: e.target.value }))} />
                                        </Field>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <Field label="Satuan">
                                            <select className={inputCls} value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))}>
                                                {SATUAN.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="col-span-2">
                                        <Field label="PIC (Penanggung Jawab)">
                                            <select className={inputCls} value={form.pic_employee_id} onChange={e => setForm(p => ({ ...p, pic_employee_id: e.target.value }))}>
                                                <option value="">— Pilih PIC —</option>
                                                {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{toTitleCase(e.full_name)}{e.position_name ? ` · ${toTitleCase(e.position_name)}` : ""}</option>)}
                                            </select>
                                        </Field>
                                    </div>
                                </div>

                                <Field label="Nama Lokasi">
                                    <input className={inputCls} value={form.lokasi_nama} onChange={e => setForm(p => ({ ...p, lokasi_nama: e.target.value }))} placeholder="Gedung A, Lantai 2, Ruang Server..." />
                                </Field>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Field label="Latitude">
                                        <input className={inputCls} value={form.lokasi_lat} onChange={e => setForm(p => ({ ...p, lokasi_lat: e.target.value }))} placeholder="-6.2088..." />
                                    </Field>
                                    <Field label="Longitude">
                                        <input className={inputCls} value={form.lokasi_lng} onChange={e => setForm(p => ({ ...p, lokasi_lng: e.target.value }))} placeholder="106.8456..." />
                                    </Field>
                                    <div className="flex items-end">
                                        <button type="button" onClick={getCurrentLocation}
                                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                            <HiOutlineMapPin className="h-4 w-4" /> Lokasi Saya
                                        </button>
                                    </div>
                                </div>

                                {editTarget && (
                                    <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                                        <label className="text-sm font-medium text-slate-700">Status Aktif</label>
                                        <button type="button" onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                                            className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                                form.is_active ? "bg-blue-600" : "bg-slate-300")}>
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                                                form.is_active ? "translate-x-6" : "translate-x-1")} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0 bg-white">
                                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                                    Batal
                                </button>
                                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                                    {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Aset"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* QR CODE MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {qrModalOpen && qrAset && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setQrModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 w-full max-w-sm">
                        <div className="flex items-center justify-between w-full">
                            <h3 className="font-bold text-slate-800">QR / Barcode Aset</h3>
                            <button onClick={() => setQrModalOpen(false)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
                                <HiOutlineXMark className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>

                        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                            <button onClick={() => setBarcodeType("qr")} className={cn("px-4 py-2 text-xs font-semibold transition", barcodeType === "qr" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                                QR Code
                            </button>
                            <button onClick={() => setBarcodeType("barcode")} className={cn("px-4 py-2 text-xs font-semibold transition", barcodeType === "barcode" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50")}>
                                Barcode
                            </button>
                        </div>

                        <div id="barcode-print-area" className="flex flex-col items-center gap-2 p-4 bg-white">
                            {barcodeType === "qr" ? (
                                <QRCodeSVG
                                    value={`${window.location.origin}/aset-management?kode=${qrAset.kode_aset}`}
                                    size={200}
                                    level="M"
                                    includeMargin
                                />
                            ) : (
                                <Barcode value={qrAset.kode_aset} width={1.5} height={80} fontSize={12} />
                            )}
                            <h2 className="text-sm font-bold text-slate-800">{toTitleCase(qrAset.nama_aset)}</h2>
                            <p className="text-xs text-slate-500 font-mono">{qrAset.kode_aset}</p>
                        </div>

                        <button onClick={printQr} className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 transition">
                            <HiOutlinePrinter className="h-4 w-4" /> Print
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════ */}
            {/* QR SCANNER MODAL */}
            {/* ════════════════════════════════════════════════════════════════════ */}
            {scannerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Scan QR Code Aset</h3>
                            <button onClick={stopScanner} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition">
                                <HiOutlineXMark className="h-4 w-4 text-slate-600" />
                            </button>
                        </div>
                        <div id="qr-reader" ref={scannerRef} className="w-full rounded-xl overflow-hidden" />
                        <p className="text-xs text-slate-500 text-center">Arahkan kamera ke QR Code aset</p>
                    </div>
                </div>
            )}
        </div>
    );
}