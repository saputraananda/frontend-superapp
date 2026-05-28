import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, apiUpload, assetUrl } from "../../../lib/api";
import {
    HiOutlineArrowLeft,
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineXMark,
    HiOutlineCloudArrowUp,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineArrowDownTray,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (str) => {
    if (!str) return str;
    return String(str)
        .toLowerCase()
        .replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm shadow-slate-200/60 outline-none transition focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 focus:shadow-md focus:shadow-emerald-200/40 placeholder:text-slate-400";
const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

const formatRupiah = (raw) => {
    if (raw === "" || raw == null) return "";
    const n = String(raw).replace(/\D/g, "");
    if (!n) return "";
    return new Intl.NumberFormat("id-ID").format(Number(n));
};
const stripRupiah = (s) => String(s || "").replace(/\D/g, "");

const getExt = (name) => (String(name || "").split(".").pop() || "").toLowerCase();
const isImageExt = (ext) => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
const isPdfExt = (ext) => ext === "pdf";
const formatBytes = (b) => {
    if (!b && b !== 0) return "—";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

function PreviewModal({ item, onClose }) {
    if (!item) return null;
    const { kind, name, src, downloadUrl } = item;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                            kind === "image" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
                            {kind === "image" ? <HiOutlineEye className="h-4 w-4" /> : <HiOutlineDocumentText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                            <p className="text-[11px] text-slate-400">{kind === "image" ? "Gambar" : "PDF Document"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {downloadUrl && (
                            <a href={downloadUrl} download={name}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition" title="Download">
                                <HiOutlineArrowDownTray className="h-4 w-4" />
                            </a>
                        )}
                        <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
                            <HiOutlineXMark className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-slate-100">
                    {kind === "image" ? (
                        <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                            <img src={src} alt={name} className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
                        </div>
                    ) : (
                        <iframe src={src} title={name} className="h-full w-full border-0" />
                    )}
                </div>
            </div>
        </div>,
        document.body
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

// ── EMPTY state — ditambahkan 4 field yang kini editable ──────────────────
const EMPTY = {
    type: "pengajuan",
    tanggal_pengajuan: "",
    company_id: "",
    outlet_id: "",
    // identitas — editable, pre-filled dari DB
    full_name: "",
    department_name: "",
    // detail barang
    nama_barang: "",
    deskripsi: "",
    merk: "",
    qty: "1",
    satuan_id: "",
    estimasi_harga_str: "",
    alasan_pembelian: "",
    // link referensi (opsional, bisa diisi karyawan)
    link_url: "",
    link_title: "",
    // reimburse — editable, pre-filled dari DB
    bank_name: "",
    bank_account_number: "",
    atas_nama: "",
};

export default function FormPengajuan() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialType = searchParams.get("type") === "reimburse" ? "reimburse" : "pengajuan";
    const editId = searchParams.get("id");

    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;

    const [emp, setEmp] = useState(user?.employee || null);

    const [companies, setCompanies] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [satuan, setSatuan] = useState([]);

    const [form, setForm] = useState({
        ...EMPTY,
        type: initialType,
        tanggal_pengajuan: new Date().toISOString().split("T")[0],
    });
    const [files, setFiles] = useState([]);
    const [existing, setExisting] = useState([]);
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!editId);
    const [toast, setToast] = useState(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ── load master + employee (fresh dari server) ──────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const [c, o, s, me] = await Promise.all([
                    api("/pengajuan/companies"),
                    api("/pengajuan/outlets"),
                    api("/pengajuan/satuan"),
                    api("/auth/me"),
                ]);
                setCompanies(c.data || []);
                setOutlets(o.data || []);
                setSatuan(s.data || []);

                if (me?.user?.employee) {
                    const e = me.user.employee;
                    setEmp(e);

                    // Pre-fill identitas & bank ke form state (editable)
                    // Hanya set jika bukan mode edit (mode edit akan di-override oleh useEffect berikutnya)
                    if (!editId) {
                        setForm(p => ({
                            ...p,
                            full_name: toTitleCase(e.full_name || ""),
                            department_name: toTitleCase(e.department_name || ""),
                            bank_name: e.bank_name || "",
                            bank_account_number: e.bank_account_number || "",
                            atas_nama: toTitleCase(e.full_name || ""), // default atas_nama = nama karyawan
                        }));
                    }

                    // Sync ke localStorage
                    try {
                        const stored = JSON.parse(localStorage.getItem("user") || "{}");
                        localStorage.setItem("user", JSON.stringify({ ...stored, employee: e }));
                    } catch { /* ignore */ }
                }
            } catch (err) {
                showToast("error", err.message || "Gagal memuat master data");
            }
        })();
    }, []);

    // ── load existing record untuk edit ────────────────────────────────────
    useEffect(() => {
        if (!editId) return;
        (async () => {
            setLoading(true);
            try {
                const d = await api(`/pengajuan/${editId}`);
                const r = d.data;
                setForm({
                    type: r.type,
                    tanggal_pengajuan: r.tanggal_pengajuan ? r.tanggal_pengajuan.split("T")[0] : "",
                    company_id: r.company_id || "",
                    outlet_id: r.outlet_id || "",
                    // Identitas — ambil dari record; fallback ke emp jika kosong
                    full_name: toTitleCase(r.full_name || emp?.full_name || ""),
                    department_name: toTitleCase(r.department_name || emp?.department_name || ""),
                    // Detail barang
                    nama_barang: r.nama_barang || "",
                    deskripsi: r.deskripsi || "",
                    merk: r.merk || "",
                    qty: String(r.qty || 1),
                    satuan_id: r.satuan_id || "",
                    estimasi_harga_str: r.estimasi_harga ? formatRupiah(r.estimasi_harga) : "",
                    alasan_pembelian: r.alasan_pembelian || "",
                    // Link referensi
                    link_url: r.link_url || "",
                    link_title: r.link_title || "",
                    // Reimburse
                    bank_name: r.bank_name || emp?.bank_name || "",
                    bank_account_number: r.bank_account_number || emp?.bank_account_number || "",
                    atas_nama: toTitleCase(r.atas_nama || ""),
                });
                setExisting(d.attachments || []);
            } catch (err) {
                showToast("error", err.message || "Gagal memuat data");
            } finally {
                setLoading(false);
            }
        })();
    }, [editId]);

    const needsOutlet = useMemo(() => Number(form.company_id) === 5, [form.company_id]);

    const filePreviews = useMemo(() => {
        return files.map(f => {
            const ext = getExt(f.name);
            const url = URL.createObjectURL(f);
            return { file: f, ext, url, kind: isImageExt(ext) ? "image" : isPdfExt(ext) ? "pdf" : "other" };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    useEffect(() => {
        return () => filePreviews.forEach(p => URL.revokeObjectURL(p.url));
    }, [filePreviews]);

    const openPreviewExisting = (att) => {
        const ext = getExt(att.original_name || att.file_path);
        const src = assetUrl(att.file_path);
        if (isImageExt(ext)) setPreview({ kind: "image", name: att.original_name || att.file_path, src, downloadUrl: src });
        else if (isPdfExt(ext)) setPreview({ kind: "pdf", name: att.original_name || att.file_path, src, downloadUrl: src });
        else window.open(src, "_blank", "noopener");
    };
    const openPreviewNew = (p) => {
        if (p.kind === "image") setPreview({ kind: "image", name: p.file.name, src: p.url, downloadUrl: p.url });
        else if (p.kind === "pdf") setPreview({ kind: "pdf", name: p.file.name, src: p.url, downloadUrl: p.url });
    };

    const onFileChange = (e) => {
        const incoming = Array.from(e.target.files || []);
        const merged = [...files];
        for (const f of incoming) {
            if (f.size > 10 * 1024 * 1024) { showToast("error", `${f.name} > 10MB`); continue; }
            merged.push(f);
        }
        setFiles(merged);
        e.target.value = "";
    };
    const removeFile = (idx) => setFiles(files.filter((_, i) => i !== idx));
    const removeExisting = async (att) => {
        if (!confirm("Hapus lampiran ini?")) return;
        try {
            await api(`/pengajuan/attachment/${att.attachment_id}`, { method: "DELETE" });
            setExisting(existing.filter(a => a.attachment_id !== att.attachment_id));
            showToast("success", "Lampiran dihapus");
        } catch (err) { showToast("error", err.message); }
    };

    // ── submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nama_barang.trim()) return showToast("error", "Nama barang wajib diisi");
        if (!form.alasan_pembelian.trim()) return showToast("error", "Alasan pembelian wajib diisi");
        if (!form.company_id) return showToast("error", "Kategori wajib dipilih");
        if (needsOutlet && !form.outlet_id) return showToast("error", "Outlet wajib dipilih");
        if (form.type === "reimburse" && !form.atas_nama.trim()) return showToast("error", "Atas nama wajib diisi");

        setSaving(true);
        try {
            const fd = new FormData();
            fd.append("type", form.type);
            fd.append("tanggal_pengajuan", form.tanggal_pengajuan);
            fd.append("company_id", form.company_id);
            if (needsOutlet) fd.append("outlet_id", form.outlet_id);

            // ── identitas yang mungkin diedit user ──
            fd.append("full_name", form.full_name.trim());
            fd.append("department_name", form.department_name.trim());

            fd.append("nama_barang", form.nama_barang.trim());
            fd.append("deskripsi", form.deskripsi || "");
            fd.append("merk", form.merk || "");
            fd.append("qty", form.qty || 1);
            if (form.satuan_id) fd.append("satuan_id", form.satuan_id);
            const estimasi = stripRupiah(form.estimasi_harga_str);
            if (estimasi) fd.append("estimasi_harga", estimasi);
            fd.append("alasan_pembelian", form.alasan_pembelian.trim());

            if (form.type === "reimburse") {
                fd.append("bank_name", form.bank_name.trim());
                fd.append("bank_account_number", form.bank_account_number.trim());
                fd.append("atas_nama", form.atas_nama.trim());
            }

            // ── link referensi (opsional) ──
            if (form.link_url.trim()) fd.append("link_url", form.link_url.trim());
            if (form.link_title.trim()) fd.append("link_title", form.link_title.trim());

            files.forEach(f => fd.append("attachments", f));

            if (editId) {
                await apiUpload(`/pengajuan/${editId}`, { method: "PUT", body: fd });
                showToast("success", "Pengajuan berhasil diperbarui");
            } else {
                await apiUpload("/pengajuan", { method: "POST", body: fd });
                showToast("success", "Pengajuan berhasil dibuat");
            }
            setTimeout(() => navigate("/pengajuan-alora/list"), 600);
        } catch (err) {
            showToast("error", err.message || "Gagal menyimpan");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5">
            <Toast toast={toast} />

            {/* Header */}
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition">
                    <HiOutlineArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">{editId ? "Edit Pengajuan" : "Buat Pengajuan Baru"}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Lengkapi data berikut untuk mengajukan kebutuhan</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Tipe selector */}
                {!editId && (
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setForm(p => ({ ...p, type: "pengajuan" }))}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left transition",
                                form.type === "pengajuan"
                                    ? "border-emerald-500 bg-emerald-50/50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            )}>
                            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                form.type === "pengajuan" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500")}>
                                <HiOutlineDocumentPlus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Pengajuan</p>
                                <p className="text-xs text-slate-500">Pengadaan barang / jasa</p>
                            </div>
                        </button>
                        <button type="button" onClick={() => setForm(p => ({ ...p, type: "reimburse" }))}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left transition",
                                form.type === "reimburse"
                                    ? "border-teal-500 bg-teal-50/50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            )}>
                            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                form.type === "reimburse" ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500")}>
                                <HiOutlineCreditCard className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Reimburse</p>
                                <p className="text-xs text-slate-500">Penggantian biaya operasional</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* ── Identitas Pengaju ─────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Identitas Pengaju</p>
                        <span className="text-[10px] text-slate-400 italic">Data dapat diedit jika diperlukan</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* ✅ Nama — kini editable */}
                        <div>
                            <label className={labelCls}>Nama</label>
                            <input
                                className={inputCls}
                                value={form.full_name}
                                onChange={e => setForm(p => ({ ...p, full_name: toTitleCase(e.target.value) }))}
                                placeholder="Nama lengkap pengaju"
                            />
                        </div>
                        {/* ✅ Departemen — kini editable */}
                        <div>
                            <label className={labelCls}>Departemen</label>
                            <input
                                className={inputCls}
                                value={form.department_name}
                                onChange={e => setForm(p => ({ ...p, department_name: toTitleCase(e.target.value) }))}
                                placeholder="Nama departemen"
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Tanggal Pengajuan</label>
                            <input type="date" className={inputCls} value={form.tanggal_pengajuan}
                                onChange={e => setForm(p => ({ ...p, tanggal_pengajuan: e.target.value }))} />
                        </div>
                    </div>
                </div>

                {/* ── Kategori ─────────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 p-5 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kategori</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Kategori Pengajuan <span className="text-rose-500">*</span></label>
                            <select className={inputCls} value={form.company_id}
                                onChange={e => setForm(p => ({ ...p, company_id: e.target.value, outlet_id: "" }))}>
                                <option value="">— Pilih kategori —</option>
                                {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
                            </select>
                        </div>
                        {needsOutlet && (
                            <div>
                                <label className={labelCls}>Outlet <span className="text-rose-500">*</span></label>
                                <select className={inputCls} value={form.outlet_id}
                                    onChange={e => setForm(p => ({ ...p, outlet_id: e.target.value }))}>
                                    <option value="">— Pilih outlet —</option>
                                    {outlets.map(o => <option key={o.outlet_id} value={o.outlet_id}>{o.full_name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Detail Barang ─────────────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 p-5 space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Detail {form.type === "reimburse" ? "Reimburse" : "Pengajuan"}
                    </p>

                    <div>
                        <label className={labelCls}>Nama Barang <span className="text-rose-500">*</span></label>
                        <input className={inputCls} value={form.nama_barang} maxLength={200}
                            style={{ textTransform: "capitalize" }}
                            onChange={e => setForm(p => ({ ...p, nama_barang: e.target.value }))}
                            placeholder="Contoh: Printer Epson L3150" />
                    </div>

                    <div>
                        <label className={labelCls}>Deskripsi Lengkap</label>
                        <textarea rows={3} className={cn(inputCls, "resize-none")} value={form.deskripsi}
                            onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
                            placeholder="Spesifikasi, ukuran, warna, dsb." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Merk / Brand</label>
                            <input className={inputCls} value={form.merk} maxLength={120}
                                style={{ textTransform: "capitalize" }}
                                onChange={e => setForm(p => ({ ...p, merk: e.target.value }))}
                                placeholder="Contoh: Canon, Epson" />
                        </div>
                        <div>
                            <label className={labelCls}>Estimasi Harga (Rp)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                <input className={cn(inputCls, "pl-9 tabular-nums")} value={form.estimasi_harga_str} inputMode="numeric"
                                    onChange={e => setForm(p => ({ ...p, estimasi_harga_str: formatRupiah(e.target.value) }))}
                                    placeholder="0" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Jumlah / Qty</label>
                            <input type="number" min={1} step="0.01" className={inputCls} value={form.qty}
                                onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} />
                        </div>
                        <div>
                            <label className={labelCls}>Satuan</label>
                            <select className={inputCls} value={form.satuan_id}
                                onChange={e => setForm(p => ({ ...p, satuan_id: e.target.value }))}>
                                <option value="">— Pilih satuan —</option>
                                {satuan.map(s => <option key={s.satuan_id} value={s.satuan_id}>{s.satuan_name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Alasan Pembelian <span className="text-rose-500">*</span></label>
                        <textarea rows={3} className={cn(inputCls, "resize-none")} value={form.alasan_pembelian}
                            onChange={e => setForm(p => ({ ...p, alasan_pembelian: e.target.value }))}
                            placeholder="Tuliskan alasan kebutuhan ini..." />
                    </div>

                    {/* Link Referensi (opsional) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Judul Link / Sumber (opsional)</label>
                            <input className={inputCls} value={form.link_title} maxLength={255}
                                onChange={e => setForm(p => ({ ...p, link_title: e.target.value }))}
                                placeholder="Contoh: Shopee, Tokopedia, Astro" />
                        </div>
                        <div>
                            <label className={labelCls}>URL Link (opsional)</label>
                            <input className={inputCls} value={form.link_url} maxLength={500}
                                onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))}
                                placeholder="https://..." />
                        </div>
                    </div>

                    {/* Lampiran */}
                    <div>
                        <label className={labelCls}>Lampiran (max 10 MB / file, gambar atau PDF)</label>

                        {existing.length > 0 && (
                            <div className="mb-3">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Lampiran tersimpan ({existing.length})</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {existing.map(a => {
                                        const ext = getExt(a.original_name || a.file_path);
                                        const isImg = isImageExt(ext);
                                        const isPdf = isPdfExt(ext);
                                        const previewable = isImg || isPdf;
                                        return (
                                            <div key={a.attachment_id}
                                                className="group relative flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm shadow-slate-200/60 hover:shadow-md hover:shadow-slate-300/40 transition">
                                                <button type="button" onClick={() => previewable && openPreviewExisting(a)}
                                                    disabled={!previewable}
                                                    className={cn(
                                                        "relative h-28 w-full flex items-center justify-center overflow-hidden",
                                                        isImg ? "bg-slate-100" : isPdf ? "bg-rose-50" : "bg-slate-50",
                                                        previewable ? "cursor-pointer" : "cursor-default"
                                                    )}>
                                                    {isImg ? (
                                                        <img src={assetUrl(a.file_path)} alt={a.original_name || ""}
                                                            className="h-full w-full object-cover transition group-hover:scale-105"
                                                            onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                    ) : isPdf ? (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <HiOutlineDocumentText className="h-9 w-9 text-rose-500" />
                                                            <span className="text-[10px] font-bold text-rose-600 uppercase">PDF</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <HiOutlineDocumentText className="h-9 w-9 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{ext || "FILE"}</span>
                                                        </div>
                                                    )}
                                                    {previewable && (
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                                            <HiOutlineEye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex items-center justify-between gap-1 px-2.5 py-2 border-t border-slate-100 bg-white">
                                                    <p className="flex-1 text-[11px] font-medium text-slate-700 truncate" title={a.original_name || a.file_path}>
                                                        {a.original_name || a.file_path}
                                                    </p>
                                                    <button type="button" onClick={() => removeExisting(a)}
                                                        className="rounded-md p-1 text-rose-500 hover:bg-rose-50 transition shrink-0" title="Hapus">
                                                        <HiOutlineXMark className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 px-5 py-8 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition">
                            <HiOutlineCloudArrowUp className="h-7 w-7 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-600">Klik untuk upload</p>
                            <p className="text-[11px] text-slate-400">PNG, JPG, PDF — max 10 MB per file</p>
                            <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden"
                                onChange={onFileChange} />
                        </label>

                        {filePreviews.length > 0 && (
                            <div className="mt-3">
                                <p className="text-[11px] font-semibold text-emerald-600 uppercase mb-2">Akan diupload ({filePreviews.length})</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {filePreviews.map((p, i) => {
                                        const previewable = p.kind === "image" || p.kind === "pdf";
                                        return (
                                            <div key={i}
                                                className="group relative flex flex-col rounded-xl border border-emerald-200 bg-white overflow-hidden shadow-sm shadow-emerald-200/40">
                                                <button type="button" onClick={() => previewable && openPreviewNew(p)}
                                                    disabled={!previewable}
                                                    className={cn(
                                                        "relative h-28 w-full flex items-center justify-center overflow-hidden",
                                                        p.kind === "image" ? "bg-slate-100" : p.kind === "pdf" ? "bg-rose-50" : "bg-slate-50",
                                                        previewable ? "cursor-pointer" : "cursor-default"
                                                    )}>
                                                    {p.kind === "image" ? (
                                                        <img src={p.url} alt={p.file.name}
                                                            className="h-full w-full object-cover transition group-hover:scale-105" />
                                                    ) : p.kind === "pdf" ? (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <HiOutlineDocumentText className="h-9 w-9 text-rose-500" />
                                                            <span className="text-[10px] font-bold text-rose-600 uppercase">PDF</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1.5">
                                                            <HiOutlineDocumentText className="h-9 w-9 text-slate-400" />
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{p.ext || "FILE"}</span>
                                                        </div>
                                                    )}
                                                    {previewable && (
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                                            <HiOutlineEye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" />
                                                        </div>
                                                    )}
                                                    <span className="absolute top-1.5 left-1.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5">BARU</span>
                                                </button>
                                                <div className="flex items-center justify-between gap-1 px-2.5 py-2 border-t border-emerald-100 bg-white">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-medium text-slate-700 truncate" title={p.file.name}>{p.file.name}</p>
                                                        <p className="text-[10px] text-slate-400">{formatBytes(p.file.size)}</p>
                                                    </div>
                                                    <button type="button" onClick={() => removeFile(i)}
                                                        className="rounded-md p-1 text-rose-500 hover:bg-rose-50 transition shrink-0" title="Hapus">
                                                        <HiOutlineXMark className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Detail Reimburse ──────────────────────────────────────────────── */}
                {form.type === "reimburse" && (
                    <div className="bg-white rounded-2xl border border-teal-200/80 shadow-lg shadow-teal-200/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Detail Reimburse</p>
                            <span className="text-[10px] text-slate-400 italic">Data dapat diedit jika diperlukan</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* ✅ Nama Bank — kini editable */}
                            <div>
                                <label className={labelCls}>Nama Bank</label>
                                <input
                                    className={inputCls}
                                    value={form.bank_name}
                                    style={{ textTransform: "uppercase" }}
                                    onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))}
                                    placeholder="Contoh: BCA, Mandiri, BRI"
                                />
                            </div>
                            {/* ✅ Nomor Rekening — kini editable */}
                            <div>
                                <label className={labelCls}>Nomor Rekening</label>
                                <input
                                    className={cn(inputCls, "tabular-nums")}
                                    value={form.bank_account_number}
                                    inputMode="numeric"
                                    onChange={e => setForm(p => ({ ...p, bank_account_number: e.target.value.replace(/\D/g, "") }))}
                                    placeholder="Nomor rekening"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Atas Nama <span className="text-rose-500">*</span></label>
                                <input className={inputCls} value={form.atas_nama} maxLength={200}
                                    onChange={e => setForm(p => ({ ...p, atas_nama: toTitleCase(e.target.value) }))}
                                    placeholder="Nama pemilik rekening" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Action bar */}
                <div className="flex justify-end gap-3 sticky bottom-0 bg-slate-100/80 -mx-6 px-6 py-3 backdrop-blur">
                    <button type="button" onClick={() => navigate(-1)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                        Batal
                    </button>
                    <button type="submit" disabled={saving}
                        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm">
                        {saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Ajukan"}
                    </button>
                </div>
            </form>

            <PreviewModal item={preview} onClose={() => setPreview(null)} />
        </div>
    );
}