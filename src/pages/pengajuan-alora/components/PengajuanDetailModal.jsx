import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, assetUrl } from "../../../lib/api";
import {
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineXMark,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineArrowDownTray,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

// Title Case helper — konsistensi tampilan nama
const toTitleCase = (str) => {
    if (!str) return str;
    return String(str)
        .toLowerCase()
        .replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const STATUS_CONFIG = {
    1: { label: "Telah Diajukan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    2: { label: "Disetujui SPV Departemen", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    3: { label: "Disetujui Direktur", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    4: { label: "PR Ready", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    5: { label: "Menunggu Bayar", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    6: { label: "Terbayar", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    7: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    9: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const REIMBURSE_STATUS_CONFIG = {
    1: { label: "Telah Diajukan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    2: { label: "Disetujui SPV Departemen", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    5: { label: "Disetujui SPV Finance", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    7: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    9: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const formatRp = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);

const formatRupiah = (raw) => {
    if (raw === "" || raw == null) return "";
    const n = String(raw).replace(/\D/g, "");
    if (!n) return "";
    return new Intl.NumberFormat("id-ID").format(Number(n));
};
const stripRupiah = (s) => String(s || "").replace(/\D/g, "");

const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

// ── attachment helpers (sama persis dengan FormPengajuan) ─────────────────────
const getExt = (name) => (String(name || "").split(".").pop() || "").toLowerCase();
const isImageExt = (ext) => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
const isPdfExt = (ext) => ext === "pdf";

// Pastikan URL selalu absolute (tambahkan https:// jika belum ada protocol)
const ensureAbsoluteUrl = (url) => {
    if (!url) return url;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

// ── PreviewModal (sama persis dengan FormPengajuan) ──────────────────────────
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
                            {kind === "image"
                                ? <HiOutlineEye className="h-4 w-4" />
                                : <HiOutlineDocumentText className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                            <p className="text-[11px] text-slate-400">{kind === "image" ? "Gambar" : "PDF Document"}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {downloadUrl && (
                            <a href={downloadUrl} download={name}
                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition"
                                title="Download">
                                <HiOutlineArrowDownTray className="h-4 w-4" />
                            </a>
                        )}
                        <button onClick={onClose}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
                            <HiOutlineXMark className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden bg-slate-100">
                    {kind === "image" ? (
                        <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                            <img src={src} alt={name}
                                className="max-h-full max-w-full object-contain rounded-lg shadow-lg" />
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

function StatusBadge({ status, isReimburse }) {
    const config = isReimburse ? REIMBURSE_STATUS_CONFIG : STATUS_CONFIG;
    const c = config[status] ?? STATUS_CONFIG[1];
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", c.cls)}>
            {c.label}
        </span>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={cn("fixed top-5 right-5 z-[10001] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
            toast.type === "success" ? "bg-emerald-50/95 border-emerald-200 text-emerald-700" : "bg-rose-50/95 border-rose-200 text-rose-700")}>
            {toast.type === "success" ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineExclamationTriangle className="h-5 w-5" />}
            {toast.msg}
        </div>
    );
}

/**
 * Shared detail modal untuk Purchase Request / Reimburse.
 * Props:
 * - open, onClose, prId, onChanged, currentEmployee
 * - readOnly (default false): jika true, sembunyikan tombol approve/reject
 */
export default function PengajuanDetailModal({
    open,
    onClose,
    prId,
    onChanged,
    currentEmployee,
    readOnly = false,
}) {
    const [loading, setLoading] = useState(false);
    const [detail, setDetail] = useState(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [acting, setActing] = useState(false);
    const [toast, setToast] = useState(null);
    const [preview, setPreview] = useState(null); // { kind, name, src, downloadUrl }
    const [spvNote, setSpvNote] = useState("");
    const [spvNoteOpen, setSpvNoteOpen] = useState(false);

    // GA review state
    const [gaOpen, setGaOpen] = useState(false);
    const [gaQty, setGaQty] = useState("");
    const [gaMerk, setGaMerk] = useState("");
    const [gaVendor, setGaVendor] = useState("");
    const [gaNote, setGaNote] = useState("");
    const [gaVendorMode, setGaVendorMode] = useState(""); // 'vendor' | 'link'
    const [gaVendorId, setGaVendorId] = useState("");
    const [gaLinkUrl, setGaLinkUrl] = useState("");
    const [gaLinkTitle, setGaLinkTitle] = useState("");
    const [vendorList, setVendorList] = useState([]);
    const [gaInvoiceFile, setGaInvoiceFile] = useState(null);

    // ── derived data (di-declare di sini karena dipakai di hooks dan JSX) ────
    const data = detail?.data;
    const attachments = detail?.attachments || [];
    const logs = detail?.logs || [];
    const isReimburse = data?.type === "reimburse";
    const myJobLevel = Number(currentEmployee?.job_level_id);
    const myDeptId = currentEmployee?.department_id;
    const myPosition = currentEmployee?.position_name || "";
    const myIsGA = myPosition.toLowerCase().includes("general affair");
    const myIsFinance = myPosition.toLowerCase().includes("finance")
        || myPosition.toLowerCase().includes("accounting")
        || myPosition.toLowerCase().includes("accountiing");
    const status = Number(data?.status);
    const myEmployeeId = currentEmployee?.employee_id;

    // Finance review state
    const [finOpen, setFinOpen] = useState(false);
    const [finNote, setFinNote] = useState("");

    // Payment state
    const [payOpen, setPayOpen] = useState(false);
    const [payClassification, setPayClass] = useState("");
    const [payNote, setPayNote] = useState("");
    const [payFiles, setPayFiles] = useState([]); // multi-file array
    const [payMethod, setPayMethod] = useState(""); // 'cash' | 'kredit'
    const [payTerminValue, setPayTV] = useState("");
    const [payTerminUnit, setPayTU] = useState(""); // 'hari' | 'bulan' | 'tahun'
    const [payNominalBayar, setPayNB] = useState(""); // nominal bayar aktual (formatted)
    const [payAdminFee, setPayAdminFee] = useState(""); // biaya admin (formatted)
    const [classificationList, setClassificationList] = useState([]); // list classifications
    const [payPaidAt, setPayPaidAt] = useState(""); // waktu pembayaran (datetime-local)
    const [editPayOpen, setEditPayOpen] = useState(false);

    // Complete state (karyawan upload invoice)
    const [completeOpen, setCompleteOpen] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState(null);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(async () => {
        if (!prId) return;
        setLoading(true);
        try {
            const d = await api(`/pengajuan/${prId}`);
            setDetail(d);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat detail");
        } finally { setLoading(false); }
    }, [prId]);

    useEffect(() => {
        if (open) {
            load();
        } else {
            setDetail(null);
            setRejectOpen(false);
            setRejectReason("");
            setPreview(null);
            setGaOpen(false);
            setGaQty(""); setGaMerk(""); setGaVendor(""); setGaNote("");
            setGaVendorMode(""); setGaVendorId(""); setGaLinkUrl(""); setGaLinkTitle("");
            setVendorList([]);
            setGaInvoiceFile(null);
            setClassificationList([]);
            setFinOpen(false); setFinNote("");
            setPayOpen(false); setPayClass(""); setPayNote(""); setPayFiles([]);
            setPayMethod(""); setPayTV(""); setPayTU(""); setPayNB(""); setPayAdminFee(""); setPayPaidAt("");
            setCompleteOpen(false); setInvoiceFile(null);
            setEditPayOpen(false);
        }
    }, [open, load]);

    // ── open preview — sama persis seperti openPreviewExisting di FormPengajuan ──
    const openPreview = (att) => {
        const ext = getExt(att.original_name || att.file_path);
        const src = assetUrl(att.file_path);
        if (isImageExt(ext)) {
            setPreview({ kind: "image", name: att.original_name || att.file_path, src, downloadUrl: src });
        } else if (isPdfExt(ext)) {
            setPreview({ kind: "pdf", name: att.original_name || att.file_path, src, downloadUrl: src });
        } else {
            // tipe lain (doc, xls, dll) → buka di tab baru
            window.open(src, "_blank", "noopener");
        }
    };

    if (!open) return null;

    const canApproveSpv = !readOnly && myJobLevel === 3 && status === 1 && data?.department_id === myDeptId;
    const canApproveBod = !readOnly && !isReimburse && (myJobLevel === 1 || myJobLevel === 2) && status === 2;
    const canReject = !readOnly && (
        (myJobLevel === 3 && status === 1 && data?.department_id === myDeptId)
        || (!isReimburse && (myJobLevel === 1 || myJobLevel === 2) && [1, 2].includes(status))
    );
    const canApproveGA = !readOnly && !isReimburse && myIsGA && [2, 3].includes(status);
    const canRejectGA = !readOnly && !isReimburse && myIsGA && [2, 3].includes(status);
    const canEditVendorGA = !readOnly && !isReimburse && myIsGA && status === 4 && !data?.vendor_mode;
    const canApproveFinance = !readOnly && myIsFinance && myJobLevel === 3
        && (isReimburse ? status === 2 : status === 4);
    const canRejectFinance = !readOnly && myIsFinance && myJobLevel === 3
        && (isReimburse ? status === 2 : status === 4);
    const canPayment = !readOnly && myIsFinance && status === 5;
    const canRejectPayment = !readOnly && myIsFinance && status === 5;
    const canComplete = !readOnly && !isReimburse && status === 6 && (data?.employee_id === myEmployeeId || myIsGA);

    const doApprove = async () => {
        setActing(true);
        try {
            const body = {};
            if (spvNote.trim()) body.spv_note = spvNote.trim();
            await api(`/pengajuan/${prId}/approve`, { method: "POST", body: JSON.stringify(body) });
            showToast("success", "Pengajuan disetujui");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doReject = async () => {
        if (!rejectReason.trim()) return showToast("error", "Alasan wajib diisi");
        setActing(true);
        try {
            await api(`/pengajuan/${prId}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason.trim() }) });
            showToast("success", "Pengajuan ditolak");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doRejectPayment = async () => {
        if (!rejectReason.trim()) return showToast("error", "Alasan wajib diisi");
        setActing(true);
        try {
            await api(`/pengajuan/${prId}/reject-payment`, { method: "POST", body: JSON.stringify({ reason: rejectReason.trim() }) });
            showToast("success", "Pembayaran ditolak");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doApproveGA = async () => {
        setActing(true);
        try {
            const fd = new FormData();
            if (gaQty) fd.append("ga_qty", gaQty);
            if (gaMerk) fd.append("ga_merk", gaMerk);
            if (gaNote) fd.append("ga_note", gaNote);
            if (gaVendorMode) fd.append("vendor_mode", gaVendorMode);
            if (gaVendorMode === "vendor") {
                if (gaVendorId) fd.append("vendor_id", gaVendorId);
                if (gaVendor) fd.append("vendor", gaVendor);
            } else if (gaVendorMode === "link") {
                if (gaLinkUrl) fd.append("link_url", gaLinkUrl);
                if (gaLinkTitle) fd.append("link_title", gaLinkTitle);
            }
            if (gaInvoiceFile) {
                fd.append("ga_invoice", gaInvoiceFile);
            }

            await fetch(`${import.meta.env.VITE_API_URL || ""}/pengajuan/${prId}/approve-ga`, {
                method: "POST",
                body: fd,
                credentials: "include",
            }).then(async r => {
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "Gagal");
                return j;
            });

            showToast("success", "Disetujui GA — PO siap");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doRejectGA = async () => {
        if (!rejectReason.trim()) return showToast("error", "Alasan wajib diisi");
        setActing(true);
        try {
            await api(`/pengajuan/${prId}/reject-ga`, { method: "POST", body: JSON.stringify({ reason: rejectReason.trim() }) });
            showToast("success", "Pengajuan ditolak oleh GA");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doApproveFinance = async () => {
        setActing(true);
        try {
            await api(`/pengajuan/${prId}/approve-finance`, {
                method: "POST",
                body: JSON.stringify({ finance_note: finNote.trim() || undefined }),
            });
            showToast("success", "Disetujui SPV Finance — menunggu pembayaran");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doRejectFinance = async () => {
        if (!rejectReason.trim()) return showToast("error", "Alasan wajib diisi");
        setActing(true);
        try {
            await api(`/pengajuan/${prId}/reject-finance`, { method: "POST", body: JSON.stringify({ reason: rejectReason.trim() }) });
            showToast("success", "Pengajuan ditolak oleh SPV Finance");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    // Helper: format datetime-local ke ISO string untuk form value
    const nowDatetimeLocal = () => {
        const d = new Date();
        // Format: YYYY-MM-DDTHH:mm (required by datetime-local input)
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const doPayment = async () => {
        if (!payClassification) return showToast("error", "Klasifikasi wajib dipilih");
        if (!payMethod) return showToast("error", "Metode pembayaran wajib dipilih");
        if (payMethod === "kredit" && (!payTerminValue || !payTerminUnit)) return showToast("error", "Termin wajib diisi untuk kredit");
        if (!payFiles.length) return showToast("error", "Bukti pembayaran wajib dilampirkan");
        setActing(true);
        try {
            const fd = new FormData();
            fd.append("classification_id", payClassification);
            fd.append("payment_method", payMethod);
            if (payMethod === "kredit") {
                fd.append("termin_value", payTerminValue);
                fd.append("termin_unit", payTerminUnit);
            }
            // Waktu pembayaran (gunakan yang diisi user, fallback ke NOW di backend)
            if (payPaidAt) fd.append("paid_at", payPaidAt);
            // Nominal bayar aktual
            const nomBayar = stripRupiah(payNominalBayar);
            if (nomBayar) fd.append("nominal_bayar", nomBayar);
            const admFee = stripRupiah(payAdminFee);
            if (admFee) fd.append("admin_fee", admFee);
            if (payNote.trim()) fd.append("payment_note", payNote.trim());
            payFiles.forEach(f => fd.append("attachments", f));
            await fetch(`${import.meta.env.VITE_API_URL || ""}/pengajuan/${prId}/pay`, {
                method: "POST",
                body: fd,
                credentials: "include",
            }).then(async r => {
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "Gagal");
                return j;
            });
            showToast("success", "Pembayaran berhasil dicatat");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    const doUpdatePaymentInfo = async () => {
        const nomBayar = stripRupiah(payNominalBayar);
        if (!nomBayar) return showToast("error", "Nominal bayar wajib diisi");
        if (!payMethod) return showToast("error", "Metode pembayaran wajib dipilih");
        if (!payClassification) return showToast("error", "Klasifikasi wajib dipilih");

        setActing(true);
        try {
            await api(`/pengajuan/${prId}/payment-info`, {
                method: "PUT",
                body: JSON.stringify({
                    nominal_bayar: nomBayar,
                    admin_fee: stripRupiah(payAdminFee) || null,
                    payment_method: payMethod,
                    classification_id: payClassification,
                })
            });
            showToast("success", "Info pembayaran berhasil diperbarui");
            setEditPayOpen(false);
            onChanged?.();
            load();
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setActing(false);
        }
    };

    const doComplete = async () => {
        if (!invoiceFile) return showToast("error", "Invoice wajib dilampirkan");
        setActing(true);
        try {
            const fd = new FormData();
            fd.append("attachments", invoiceFile);
            await fetch(`${import.meta.env.VITE_API_URL || ""}/pengajuan/${prId}/complete`, {
                method: "POST",
                body: fd,
                credentials: "include",
            }).then(async r => {
                const j = await r.json();
                if (!r.ok) throw new Error(j.message || "Gagal");
                return j;
            });
            showToast("success", "Pengajuan selesai — invoice dilampirkan");
            onChanged?.();
            setTimeout(onClose, 600);
        } catch (err) {
            showToast("error", err.message);
        } finally { setActing(false); }
    };

    return createPortal(
        <>
            {/* Preview modal (gambar / PDF) — z-index di atas detail modal */}
            <PreviewModal item={preview} onClose={() => setPreview(null)} />

            <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                <Toast toast={toast} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">

                    {/* header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                                data?.type === "reimburse" ? "bg-teal-100 text-teal-700" : "bg-emerald-100 text-emerald-700")}>
                                {data?.type === "reimburse"
                                    ? <HiOutlineCreditCard className="h-4 w-4" />
                                    : <HiOutlineDocumentPlus className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-800 truncate">Detail Pengajuan</h2>
                                <p className="text-[11px] text-slate-400 truncate">{data?.pr_code}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition shrink-0">
                            <HiOutlineXMark className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    {loading || !data ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 bg-slate-50/40">

                            {/* status & meta */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <StatusBadge status={status} isReimburse={isReimburse} />
                                <span className="text-xs text-slate-500">
                                    {data.type === "reimburse" ? "Reimburse" : "Pengajuan"} · {formatDate(data.tanggal_pengajuan)}
                                </span>
                            </div>

                            {/* identitas */}
                            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase">Pengaju</p>
                                    <p className="font-semibold text-slate-700">{toTitleCase(data.pengaju_name) || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase">Departemen</p>
                                    <p className="font-semibold text-slate-700">{toTitleCase(data.department_name) || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase">Kategori</p>
                                    <p className="font-semibold text-slate-700">{toTitleCase(data.company_name) || "—"}</p>
                                </div>
                                {(data.outlet_name || Number(data.company_id) === 5) && (
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase">Outlet</p>
                                        <p className="font-semibold text-slate-700">
                                            {data.outlet_name ? toTitleCase(data.outlet_name) : "Seluruh Outlet"}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* barang */}
                            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 space-y-3 text-sm">
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase">Nama Barang</p>
                                    <p className="font-semibold text-slate-800">{toTitleCase(data.nama_barang)}</p>
                                </div>
                                {data.deskripsi && (
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase">Deskripsi</p>
                                        <p className="text-slate-600">{data.deskripsi}</p>
                                    </div>
                                )}
                                <div className="grid grid-cols-3 gap-3">
                                    {data.merk && (
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase">Merk</p>
                                            <p className="font-semibold text-slate-700">{toTitleCase(data.merk)}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase">Jumlah</p>
                                        <p className="font-semibold text-slate-700">{Number(data.qty)} {data.satuan_name || ""}</p>
                                    </div>
                                    {data.estimasi_harga && (
                                        <div>
                                            <p className="text-[11px] text-slate-400 uppercase">Harga Satuan</p>
                                            <p className="font-semibold text-emerald-700">{formatRp(data.estimasi_harga)}</p>
                                        </div>
                                    )}
                                </div>
                                {/* Total Estimasi — tampil jika qty > 1 dan ada harga */}
                                {data.estimasi_harga && Number(data.qty) > 1 && (
                                    <div className="bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                                        <p className="text-[11px] text-emerald-600 uppercase">Total Estimasi</p>
                                        <p className="font-bold text-emerald-700 text-base">
                                            {formatRp(Number(data.estimasi_harga) * Number(data.qty))}
                                            <span className="text-[11px] text-emerald-500 font-normal ml-1.5">
                                                ({Number(data.qty)} × {formatRp(data.estimasi_harga)})
                                            </span>
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase">Alasan Pembelian</p>
                                    <p className="text-slate-600">{data.alasan_pembelian}</p>
                                </div>
                                {/* Link referensi dari karyawan (tampil sebelum GA approve) */}
                                {status < 4 && (data.link_url || data.link_title) && (
                                    <div className="border-t border-slate-100 pt-3">
                                        <p className="text-[11px] text-slate-400 uppercase mb-1">Link Referensi (dari Pengaju)</p>
                                        <p className="font-semibold text-slate-700">{data.link_title || "—"}</p>
                                        {data.link_url && (
                                            <a href={ensureAbsoluteUrl(data.link_url)} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-emerald-600 hover:underline break-all">{data.link_url}</a>
                                        )}
                                    </div>
                                )}
                                {/* Info Pembayaran (tampil setelah pembayaran) */}
                                {status >= 6 && status !== 9 && (
                                     <div className="border-t border-slate-100 pt-3 space-y-3">
                                         <div className="flex items-center justify-between">
                                             <p className="text-[11px] text-slate-400 uppercase font-semibold">Info Pembayaran</p>
                                             {myIsFinance && !editPayOpen && (
                                                 <button onClick={() => {
                                                     setEditPayOpen(true);
                                                     setPayNB(formatRupiah(String(data.nominal_bayar || 0)));
                                                     setPayAdminFee(data.admin_fee ? formatRupiah(String(data.admin_fee)) : "");
                                                     setPayClass(String(data.classification_id || ""));
                                                     setPayMethod(data.payment_method || "");
                                                     api("/pengajuan/classifications").then(r => setClassificationList(r.data || [])).catch(() => {});
                                                 }} className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold hover:underline">
                                                     Edit Info
                                                 </button>
                                             )}
                                         </div>
                                         
                                         {editPayOpen ? (
                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-cyan-50/20 border border-dashed border-cyan-200 rounded-xl p-3 text-sm">
                                                 <div>
                                                     <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Nominal Bayar <span className="text-rose-500">*</span></label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                                         <input
                                                             className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-200 tabular-nums"
                                                             value={payNominalBayar}
                                                             inputMode="numeric"
                                                             onChange={e => setPayNB(formatRupiah(e.target.value))}
                                                             placeholder="0" />
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Biaya Admin (Opsional)</label>
                                                     <div className="relative">
                                                         <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                                         <input
                                                             className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-200 tabular-nums"
                                                             value={payAdminFee}
                                                             inputMode="numeric"
                                                             onChange={e => setPayAdminFee(formatRupiah(e.target.value))}
                                                             placeholder="0" />
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Metode Pembayaran <span className="text-rose-500">*</span></label>
                                                     <select
                                                         className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                                                         value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                                         disabled={isReimburse}>
                                                         <option value="">— Pilih —</option>
                                                         <option value="cash">Cash</option>
                                                         {!isReimburse && <option value="kredit">Kredit</option>}
                                                     </select>
                                                 </div>
                                                 <div>
                                                     <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Klasifikasi <span className="text-rose-500">*</span></label>
                                                     <select
                                                         className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-cyan-200"
                                                         value={payClassification} onChange={e => setPayClass(e.target.value)}>
                                                         <option value="">— Pilih —</option>
                                                         {classificationList.map(c => (
                                                             <option key={c.id} value={c.id}>{c.classification_name}</option>
                                                         ))}
                                                     </select>
                                                 </div>
                                                 <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-100">
                                                     <button onClick={() => { setEditPayOpen(false); setPayNB(""); setPayAdminFee(""); setPayClass(""); setPayMethod(""); }}
                                                         className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition" disabled={acting}>
                                                         Batal
                                                     </button>
                                                     <button onClick={doUpdatePaymentInfo}
                                                         className="rounded-lg bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition" disabled={acting || !payNominalBayar || !payMethod || !payClassification}>
                                                         {acting ? "Menyimpan..." : "Simpan"}
                                                     </button>
                                                 </div>
                                             </div>
                                         ) : (
                                             <div className="grid grid-cols-2 gap-3 text-sm">
                                                 <div>
                                                     <p className="text-[11px] text-slate-400 uppercase">
                                                         {data.payment_method === "kredit" ? "Total Tagihan Kredit" : "Nominal Bayar (Aktual)"}
                                                     </p>
                                                     <p className="font-bold text-cyan-700">{formatRp(data.nominal_bayar)}</p>
                                                 </div>
                                                 {data.admin_fee !== null && data.admin_fee !== undefined && (
                                                     <div>
                                                         <p className="text-[11px] text-slate-400 uppercase">Biaya Admin</p>
                                                         <p className="font-semibold text-slate-700">{formatRp(data.admin_fee)}</p>
                                                     </div>
                                                 )}
                                                 <div>
                                                     <p className="text-[11px] text-slate-400 uppercase">Metode Pembayaran</p>
                                                     <p className="font-semibold text-slate-700 uppercase">{data.payment_method || "—"}</p>
                                                 </div>
                                                 <div>
                                                     <p className="text-[11px] text-slate-400 uppercase">Klasifikasi</p>
                                                     <p className="font-semibold text-slate-700">{data.classification_name || "—"}</p>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 )}
                            </div>

                            {/* reimburse-only */}
                            {data.type === "reimburse" && (
                                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase">Bank</p>
                                        <p className="font-semibold text-slate-700">{toTitleCase(data.bank_name) || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-slate-400 uppercase">No. Rekening</p>
                                        <p className="font-semibold text-slate-700 tabular-nums">{data.nomor_rekening || "—"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[11px] text-slate-400 uppercase">Atas Nama</p>
                                        <p className="font-semibold text-slate-700">{toTitleCase(data.atas_nama) || "—"}</p>
                                    </div>
                                </div>
                            )}

                            {/* attachments — klik untuk preview */}
                            {attachments.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4">
                                    <p className="text-[11px] text-slate-400 uppercase mb-2">Lampiran ({attachments.length})</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {attachments.map(a => {
                                            const ext = getExt(a.original_name || a.file_path);
                                            const isImg = isImageExt(ext);
                                            const isPdf = isPdfExt(ext);
                                            const canPreview = isImg || isPdf;
                                            const src = assetUrl(a.file_path);
                                            return (
                                                <div key={a.attachment_id}
                                                    className="rounded-lg border border-slate-200 overflow-hidden">
                                                    {/* thumbnail untuk gambar */}
                                                    {isImg && (
                                                        <div className="relative h-24 bg-slate-100 cursor-pointer"
                                                            onClick={() => openPreview(a)}>
                                                            <img src={src}
                                                                alt={a.original_name}
                                                                className="h-full w-full object-cover" />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition">
                                                                <HiOutlineEye className="h-6 w-6 text-white opacity-0 hover:opacity-100 drop-shadow" />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* bar bawah: nama + tombol aksi */}
                                                    <div className="flex items-center gap-2 px-3 py-2">
                                                        <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded",
                                                            isImg ? "bg-emerald-100 text-emerald-600" :
                                                                isPdf ? "bg-rose-100 text-rose-600" :
                                                                    "bg-slate-100 text-slate-500")}>
                                                            {isImg
                                                                ? <HiOutlineEye className="h-3.5 w-3.5" />
                                                                : isPdf
                                                                    ? <HiOutlineDocumentText className="h-3.5 w-3.5" />
                                                                    : <HiOutlineDocumentPlus className="h-3.5 w-3.5" />}
                                                        </div>
                                                        <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600 font-medium">
                                                            {a.original_name || a.file_path}
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {canPreview && (
                                                                <button onClick={() => openPreview(a)}
                                                                    title="Preview"
                                                                    className="rounded p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition">
                                                                    <HiOutlineEye className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                            <a href={src} download={a.original_name}
                                                                title="Download"
                                                                className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                                                <HiOutlineArrowDownTray className="h-3.5 w-3.5" />
                                                            </a>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* spv note */}
                            {data.spv_note && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-1">Catatan Supervisor</p>
                                    <p>{data.spv_note}</p>
                                </div>
                            )}

                            {/* rejection */}
                            {status === 9 && data.rejection_reason && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide mb-1">Alasan Penolakan</p>
                                    <p>{data.rejection_reason}</p>
                                </div>
                            )}

                            {/* GA info — tampil jika sudah status 4 */}
                            {status >= 4 && status !== 9 && (
                                <div className="bg-violet-50 rounded-xl border border-violet-200 p-4 space-y-3 text-sm">
                                    <p className="text-[11px] font-bold text-violet-600 uppercase tracking-widest">Hasil Review GA / PO</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {data.vendor_mode === "vendor" && data.vendor && (
                                            <div className="col-span-2">
                                                <p className="text-[11px] text-slate-400 uppercase">Vendor / Supplier</p>
                                                <p className="font-semibold text-slate-800">{toTitleCase(data.vendor)}</p>
                                            </div>
                                        )}
                                        {data.vendor_mode === "link" && (
                                            <div className="col-span-2">
                                                <p className="text-[11px] text-slate-400 uppercase">Sumber (Link)</p>
                                                <p className="font-semibold text-slate-800">{data.link_title || "—"}</p>
                                                {data.link_url && (
                                                    <a href={ensureAbsoluteUrl(data.link_url)} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-violet-600 hover:underline break-all">{data.link_url}</a>
                                                )}
                                            </div>
                                        )}
                                        {/* Fallback for old data without vendor_mode */}
                                        {!data.vendor_mode && data.vendor && (
                                            <div className="col-span-2">
                                                <p className="text-[11px] text-slate-400 uppercase">Vendor / Supplier</p>
                                                <p className="font-semibold text-slate-800">{toTitleCase(data.vendor)}</p>
                                            </div>
                                        )}
                                        {data.ga_qty && (
                                            <div>
                                                <p className="text-[11px] text-slate-400 uppercase">Qty Disetujui</p>
                                                <p className="font-semibold text-slate-800">{Number(data.ga_qty)} {data.satuan_name || ""}</p>
                                            </div>
                                        )}
                                        {data.ga_merk && (
                                            <div>
                                                <p className="text-[11px] text-slate-400 uppercase">Merk Dikonfirmasi</p>
                                                <p className="font-semibold text-slate-800">{toTitleCase(data.ga_merk)}</p>
                                            </div>
                                        )}
                                        {data.ga_note && (
                                            <div className="col-span-2">
                                                <p className="text-[11px] text-slate-400 uppercase">Catatan GA</p>
                                                <p className="text-slate-600">{data.ga_note}</p>
                                            </div>
                                        )}
                                        {data.ga_invoice && (
                                            <div className="col-span-2">
                                                <p className="text-[11px] text-slate-400 uppercase mb-1">Invoice / Dokumen GA</p>
                                                <button
                                                    onClick={() => {
                                                        const ext = getExt(data.ga_invoice);
                                                        const src = assetUrl(data.ga_invoice);
                                                        if (isImageExt(ext)) setPreview({ kind: "image", name: "Invoice GA", src, downloadUrl: src });
                                                        else if (isPdfExt(ext)) setPreview({ kind: "pdf", name: "Invoice GA", src, downloadUrl: src });
                                                        else window.open(src, "_blank", "noopener");
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition">
                                                    <HiOutlineEye className="h-3 w-3" />
                                                    Lihat Invoice GA
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* GA review panel */}
                            {gaOpen && (
                                <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 space-y-3">
                                    <p className="text-sm font-bold text-violet-700">Review & Approve GA</p>
                                    <p className="text-[11px] text-slate-500">Qty dan Merk sudah terisi dari pengajuan. Ubah jika diperlukan.</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Vendor Mode */}
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Vendor atau Link <span className="text-rose-500">*</span></label>
                                            <div className="flex gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="vendor_mode" value="vendor"
                                                        checked={gaVendorMode === "vendor"}
                                                        onChange={() => { setGaVendorMode("vendor"); setGaLinkUrl(""); setGaLinkTitle(""); }}
                                                        className="accent-violet-600" />
                                                    <span className="text-sm text-slate-700 font-medium">Vendor</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="vendor_mode" value="link"
                                                        checked={gaVendorMode === "link"}
                                                        onChange={() => { setGaVendorMode("link"); setGaVendor(""); setGaVendorId(""); }}
                                                        className="accent-violet-600" />
                                                    <span className="text-sm text-slate-700 font-medium">Link</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Vendor fields */}
                                        {gaVendorMode === "vendor" && (
                                            <div className="sm:col-span-2 space-y-2">
                                                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Pilih atau Tulis Vendor</label>
                                                <select
                                                    className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                    value={gaVendorId}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setGaVendorId(val);
                                                        if (val) {
                                                            const found = vendorList.find(v => String(v.vendor_id) === val);
                                                            if (found) setGaVendor(found.nama_vendor);
                                                        } else {
                                                            setGaVendor("");
                                                        }
                                                    }}>
                                                    <option value="">— Pilih dari daftar (opsional) —</option>
                                                    {vendorList.map(v => (
                                                        <option key={v.vendor_id} value={v.vendor_id}>{v.nama_vendor} ({v.kategori})</option>
                                                    ))}
                                                </select>
                                                <input className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                    value={gaVendor} onChange={e => { setGaVendor(e.target.value); if (gaVendorId) setGaVendorId(""); }}
                                                    placeholder="Atau tulis nama vendor custom..." />
                                            </div>
                                        )}

                                        {/* Link fields */}
                                        {gaVendorMode === "link" && (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Judul Link <span className="text-rose-500">*</span></label>
                                                    <input className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                        value={gaLinkTitle} onChange={e => setGaLinkTitle(e.target.value)}
                                                        placeholder="Contoh: Shopee, Tokopedia, Astro" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">URL Link <span className="text-rose-500">*</span></label>
                                                    <input className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                        value={gaLinkUrl} onChange={e => setGaLinkUrl(e.target.value)}
                                                        placeholder="https://..." />
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Qty Disetujui</label>
                                            <input type="number" min={1} step="0.01"
                                                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                value={gaQty} onChange={e => setGaQty(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Merk Dikonfirmasi</label>
                                            <input className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                                                value={gaMerk} onChange={e => setGaMerk(e.target.value)} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Catatan</label>
                                            <textarea rows={2} value={gaNote} onChange={e => setGaNote(e.target.value)}
                                                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200 resize-none"
                                                placeholder="Catatan tambahan untuk PO..." />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Dokumen / Foto Invoice (Opsional)
                                            </label>
                                            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-sm outline-none file:mr-2 file:rounded file:border-0 file:bg-violet-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-violet-700"
                                                onChange={e => {
                                                    setGaInvoiceFile(e.target.files?.[0] || null);
                                                    e.target.value = "";
                                                }} />
                                            {gaInvoiceFile && (() => {
                                                const ext = getExt(gaInvoiceFile.name);
                                                const isImg = isImageExt(ext);
                                                const url = isImg ? URL.createObjectURL(gaInvoiceFile) : null;
                                                return (
                                                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50/40 px-2.5 py-1.5 animate-fade-in">
                                                        {isImg && url && (
                                                            <img src={url} alt={gaInvoiceFile.name} className="h-8 w-8 rounded object-cover shrink-0 cursor-pointer"
                                                                onClick={() => setPreview({ kind: "image", name: gaInvoiceFile.name, src: url, downloadUrl: url })} />
                                                        )}
                                                        {!isImg && (
                                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rose-100 text-rose-600 cursor-pointer"
                                                                onClick={() => {
                                                                    const pdfUrl = URL.createObjectURL(gaInvoiceFile);
                                                                    setPreview({ kind: "pdf", name: gaInvoiceFile.name, src: pdfUrl, downloadUrl: pdfUrl });
                                                                }}>
                                                                <HiOutlineDocumentText className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        <span className="flex-1 min-w-0 text-[11px] text-slate-600 font-medium truncate">{gaInvoiceFile.name}</span>
                                                        <button type="button" onClick={() => setGaInvoiceFile(null)}
                                                            className="rounded p-0.5 text-rose-500 hover:bg-rose-50 transition shrink-0">
                                                            <HiOutlineXMark className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setGaOpen(false)}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={doApproveGA} disabled={acting || !gaVendorMode || (gaVendorMode === "vendor" && !gaVendor.trim()) || (gaVendorMode === "link" && (!gaLinkUrl.trim() || !gaLinkTitle.trim()))}
                                            className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : "Approve & Terbitkan PO"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Finance review panel */}
                            {finOpen && (
                                <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-4 space-y-3">
                                    <p className="text-sm font-bold text-orange-700">
                                        {isReimburse ? "Approve Reimburse (SPV Finance)" : "Approve SPV Finance"}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {isReimburse
                                            ? "Setujui reimburse ini. BoD akan auto-approve. Setelah ini masuk antrian pembayaran."
                                            : "Tambahkan catatan jika diperlukan sebelum approve."}
                                    </p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Catatan Finance</label>
                                        <textarea rows={3} value={finNote} onChange={e => setFinNote(e.target.value)}
                                            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                                            placeholder="Catatan / instruksi pembayaran (opsional)..." />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setFinOpen(false); setFinNote(""); }}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={doApproveFinance} disabled={acting}
                                            className="rounded-lg bg-orange-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : "Approve Finance"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Payment panel — staff finance */}
                            {payOpen && (
                                <div className="rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                                    <p className="text-sm font-bold text-cyan-700">
                                        {isReimburse ? "Proses Pembayaran & Selesaikan Reimburse" : "Proses Pembayaran"}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                        {isReimburse
                                            ? "Lampirkan bukti pembayaran untuk menyelesaikan reimburse. Pembayaran hanya cash (sekali bayar)."
                                            : "Isi klasifikasi, metode pembayaran, catatan, dan lampirkan bukti pembayaran."}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Waktu Pembayaran <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                                                value={payPaidAt}
                                                onChange={e => setPayPaidAt(e.target.value)}
                                                onClick={e => { if (!payPaidAt) setPayPaidAt(nowDatetimeLocal()); }}
                                            />
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Tanggal &amp; jam aktual pembayaran dilakukan. Default ke sekarang jika dikosongkan.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Klasifikasi <span className="text-rose-500">*</span></label>
                                            <select
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                                                value={payClassification} onChange={e => setPayClass(e.target.value)}>
                                                <option value="">— Pilih —</option>
                                                {classificationList.map(c => (
                                                    <option key={c.id} value={c.id}>{c.classification_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Metode Pembayaran <span className="text-rose-500">*</span></label>
                                            <select
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                                                value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                                disabled={isReimburse}>
                                                <option value="">— Pilih —</option>
                                                <option value="cash">Cash</option>
                                                {!isReimburse && <option value="kredit">Kredit</option>}
                                            </select>
                                            {isReimburse && payMethod === "" && (
                                                <p className="text-[10px] text-amber-600 mt-0.5">Reimburse hanya cash</p>
                                            )}
                                        </div>
                                        {payMethod === "kredit" && (
                                            <>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Termin (Nilai) <span className="text-rose-500">*</span></label>
                                                    <input type="number" min={1}
                                                        className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                                                        value={payTerminValue} onChange={e => setPayTV(e.target.value)}
                                                        placeholder="Contoh: 30" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Satuan Termin <span className="text-rose-500">*</span></label>
                                                    <select
                                                        className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
                                                        value={payTerminUnit} onChange={e => setPayTU(e.target.value)}>
                                                        <option value="">— Pilih —</option>
                                                        <option value="hari">Hari</option>
                                                        <option value="bulan">Bulan</option>
                                                        <option value="tahun">Tahun</option>
                                                    </select>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                {payMethod === "kredit" ? "Bukti PR / Invoice Awal" : "Bukti Pembayaran"} <span className="text-rose-500">*</span>
                                            </label>
                                            <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-sm outline-none file:mr-2 file:rounded file:border-0 file:bg-cyan-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-cyan-700"
                                                onChange={e => {
                                                    const incoming = Array.from(e.target.files || []);
                                                    setPayFiles(prev => [...prev, ...incoming.filter(f => f.size <= 10 * 1024 * 1024)]);
                                                    e.target.value = "";
                                                }} />
                                            {payMethod === "kredit" && (
                                                <p className="text-[10px] text-amber-600 mt-0.5">
                                                    Lampirkan dokumen pengakuan utang (invoice/PO supplier). Pembayaran aktual dicatat via menu Pelunasan.
                                                </p>
                                            )}
                                            {/* Preview file yang dipilih */}
                                            {payFiles.length > 0 && (
                                                <div className="mt-2 space-y-1.5">
                                                    {payFiles.map((f, idx) => {
                                                        const ext = getExt(f.name);
                                                        const isImg = isImageExt(ext);
                                                        const url = isImg ? URL.createObjectURL(f) : null;
                                                        return (
                                                            <div key={idx} className="flex items-center gap-2 rounded-lg border border-cyan-100 bg-cyan-50/40 px-2.5 py-1.5">
                                                                {isImg && url && (
                                                                    <img src={url} alt={f.name} className="h-8 w-8 rounded object-cover shrink-0 cursor-pointer"
                                                                        onClick={() => setPreview({ kind: "image", name: f.name, src: url, downloadUrl: url })} />
                                                                )}
                                                                {!isImg && (
                                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rose-100 text-rose-600 cursor-pointer"
                                                                        onClick={() => {
                                                                            const pdfUrl = URL.createObjectURL(f);
                                                                            setPreview({ kind: "pdf", name: f.name, src: pdfUrl, downloadUrl: pdfUrl });
                                                                        }}>
                                                                        <HiOutlineDocumentText className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                                <span className="flex-1 min-w-0 text-[11px] text-slate-600 font-medium truncate">{f.name}</span>
                                                                <button type="button" onClick={() => setPayFiles(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="rounded p-0.5 text-rose-500 hover:bg-rose-50 transition shrink-0">
                                                                    <HiOutlineXMark className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                {payMethod === "kredit" ? "Total Tagihan Kredit" : "Nominal Bayar (Aktual)"}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                                <input
                                                    className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200 tabular-nums"
                                                    value={payNominalBayar}
                                                    inputMode="numeric"
                                                    onChange={e => setPayNB(formatRupiah(e.target.value))}
                                                    placeholder="0" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {payMethod === "kredit"
                                                    ? "Total yang harus dibayar (target). Cicilan dicatat di menu Pelunasan."
                                                    : "Masukkan nominal aktual yang dibayarkan."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Biaya Admin (Opsional)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                                <input
                                                    className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200 tabular-nums"
                                                    value={payAdminFee}
                                                    inputMode="numeric"
                                                    onChange={e => setPayAdminFee(formatRupiah(e.target.value))}
                                                    placeholder="0" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Biaya administrasi transfer/pembayaran (jika ada).
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Catatan Pembayaran</label>
                                            <textarea rows={2} value={payNote} onChange={e => setPayNote(e.target.value)}
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200 resize-none"
                                                placeholder="Catatan tambahan (opsional)..." />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setPayOpen(false); setPayClass(""); setPayNote(""); setPayFiles([]); setPayMethod(""); setPayTV(""); setPayTU(""); setPayNB(""); setPayAdminFee(""); setPayPaidAt(""); setClassificationList([]); }}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={doPayment} disabled={acting || !payClassification || !payMethod || !payFiles.length || (payMethod === "kredit" && (!payTerminValue || !payTerminUnit))}
                                            className="rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : isReimburse ? "Bayar & Selesaikan" : "Konfirmasi Pembayaran"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Complete panel — karyawan upload invoice */}
                            {completeOpen && (
                                <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                                    <p className="text-sm font-bold text-emerald-700">Selesaikan Pengajuan</p>
                                    <p className="text-[11px] text-slate-500">Lampirkan invoice/bukti pembelian untuk menyelesaikan proses pengajuan.</p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Invoice / Bukti Pembelian <span className="text-rose-500">*</span></label>
                                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-sm outline-none file:mr-2 file:rounded file:border-0 file:bg-emerald-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-emerald-700"
                                            onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setCompleteOpen(false); setInvoiceFile(null); }}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={doComplete} disabled={acting || !invoiceFile}
                                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : "Selesaikan"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* timeline */}
                            {logs.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4">
                                    <p className="text-[11px] text-slate-400 uppercase mb-3">Riwayat</p>
                                    <div className="space-y-2.5">
                                        {logs.map(l => {
                                            const actionLabels = {
                                                created: isReimburse ? "Reimburse Dibuat" : "Pengajuan Dibuat",
                                                approved_spv: "Persetujuan SPV Departemen",
                                                approved_bod: "Persetujuan Direktur",
                                                approved_ga: "Persetujuan General Affair",
                                                approved_finance: "Persetujuan SPV Finance",
                                                paid: isReimburse ? "Pembayaran & Penyelesaian" : "Proses Pembayaran",
                                                completed: isReimburse ? "Selesai" : "Penyelesaian",
                                                rejected: "Ditolak",
                                                rejected_ga: "Ditolak oleh GA",
                                                rejected_finance: "Ditolak oleh Finance",
                                                rejected_payment: "Pembayaran Ditolak oleh Staff Finance",
                                                updated: "Diperbarui",
                                                deleted: "Dihapus",
                                            };
                                            const label = actionLabels[l.action] || l.action;
                                            const logDate = new Date(l.logged_at);
                                            const dateStr = !Number.isNaN(logDate.getTime())
                                                ? logDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                                : "—";
                                            const timeStr = !Number.isNaN(logDate.getTime())
                                                ? logDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                                                : "";

                                            // Determine if this step has a previewable proof
                                            let proofPath = null;
                                            if (l.action === "paid" && data.payment_proof_path) proofPath = data.payment_proof_path;
                                            if (l.action === "completed" && data.invoice_proof_path) proofPath = data.invoice_proof_path;

                                            return (
                                                <div key={l.log_id} className="flex items-start gap-2.5 text-xs">
                                                    <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-slate-700">
                                                            <span className="font-bold text-slate-800">{label}</span>
                                                            <span className="text-slate-400 ml-1.5">oleh {l.by_name || "Sistem"}</span>
                                                        </p>
                                                        {l.note && <p className="text-slate-500 mt-0.5">{l.note}</p>}
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <p className="text-[10px] text-slate-400">{dateStr}{timeStr ? `, ${timeStr}` : ""}</p>
                                                            {proofPath && (
                                                                <button
                                                                    onClick={() => {
                                                                        const ext = getExt(proofPath);
                                                                        const src = assetUrl(proofPath);
                                                                        if (isImageExt(ext)) setPreview({ kind: "image", name: l.action === "paid" ? "Bukti Pembayaran" : "Invoice", src, downloadUrl: src });
                                                                        else if (isPdfExt(ext)) setPreview({ kind: "pdf", name: l.action === "paid" ? "Bukti Pembayaran" : "Invoice", src, downloadUrl: src });
                                                                        else window.open(src, "_blank", "noopener");
                                                                    }}
                                                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                                                                    <HiOutlineEye className="h-3 w-3" />
                                                                    {l.action === "paid" ? "Lampiran" : "Invoice"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* SPV approval note panel */}
                            {spvNoteOpen && (
                                <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                                    <p className="text-sm font-bold text-emerald-700">Approve Supervisor</p>
                                    <p className="text-[11px] text-slate-500">Tambahkan catatan jika diperlukan (opsional).</p>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Catatan Supervisor</label>
                                        <textarea rows={3} value={spvNote} onChange={e => setSpvNote(e.target.value)}
                                            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
                                            placeholder="Catatan persetujuan (opsional)..." />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setSpvNoteOpen(false); setSpvNote(""); }}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={() => { doApprove(); setSpvNoteOpen(false); }} disabled={acting}
                                            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : "Approve"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* reject panel (shared for SPV/BOD and GA) */}
                            {rejectOpen && (
                                <div className="rounded-xl border-2 border-dashed border-rose-200 bg-rose-50/40 p-4 space-y-3">
                                    <p className="text-sm font-semibold text-rose-700">Alasan Penolakan</p>
                                    <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                                        placeholder="Tuliskan alasan penolakan secara jelas..." />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => { setRejectOpen(false); setRejectReason(""); }}
                                            className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                                            Batal
                                        </button>
                                        <button onClick={canRejectPayment ? doRejectPayment : canRejectFinance ? doRejectFinance : canRejectGA ? doRejectGA : doReject} disabled={acting}
                                            className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition">
                                            {acting ? "Memproses..." : "Tolak Pengajuan"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {data && !rejectOpen && !gaOpen && !finOpen && !payOpen && !completeOpen && !spvNoteOpen && (canApproveSpv || canApproveBod || canReject || canRejectPayment || canApproveGA || canRejectGA || canApproveFinance || canRejectFinance || canPayment || canComplete || canEditVendorGA) && (
                        <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-2 bg-white flex-wrap">
                            {(canReject || canRejectGA || canRejectFinance || canRejectPayment) && (
                                <button onClick={() => setRejectOpen(true)}
                                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition">
                                    Tolak
                                </button>
                            )}
                            {canComplete && (
                                <button onClick={() => setCompleteOpen(true)}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                                    Upload Invoice & Selesaikan
                                </button>
                            )}
                            {canPayment && (
                                <button onClick={() => {
                                    setPayOpen(true);
                                    setPayNB("");
                                    setPayAdminFee("");
                                    api("/pengajuan/classifications").then(r => {
                                        const list = r.data || [];
                                        setClassificationList(list);
                                        if (isReimburse) {
                                            const exp = list.find(c => c.classification_name?.toLowerCase() === "expense");
                                            if (exp) setPayClass(String(exp.id));
                                        }
                                    }).catch(() => {});
                                    if (isReimburse) { setPayMethod("cash"); }
                                }}
                                    className="rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 transition">
                                    {isReimburse ? "Bayar & Selesaikan" : "Proses Pembayaran"}
                                </button>
                            )}
                            {canApproveFinance && (
                                <button onClick={() => setFinOpen(true)}
                                    className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition">
                                    {isReimburse ? "Approve Reimburse" : "Approve Finance"}
                                </button>
                            )}
                            {canEditVendorGA && (
                                <button onClick={() => {
                                    setGaOpen(true);
                                    setGaQty(data.qty ? String(Number(data.qty)) : "");
                                    setGaMerk(data.merk || "");
                                    if (data.link_url || data.link_title) {
                                        setGaVendorMode("link");
                                        setGaLinkUrl(data.link_url || "");
                                        setGaLinkTitle(data.link_title || "");
                                    }
                                    api("/pengajuan/vendors").then(r => setVendorList(r.data || [])).catch(() => { });
                                }}
                                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition">
                                    Lengkapi Info Vendor
                                </button>
                            )}
                            {canApproveGA && (
                                <button onClick={() => {
                                    setGaOpen(true);
                                    // Pre-fill qty dan merk dari data pengajuan
                                    setGaQty(data.qty ? String(Number(data.qty)) : "");
                                    setGaMerk(data.merk || "");
                                    // Pre-fill link dari data pengajuan (jika karyawan sudah isi)
                                    if (data.link_url || data.link_title) {
                                        setGaVendorMode("link");
                                        setGaLinkUrl(data.link_url || "");
                                        setGaLinkTitle(data.link_title || "");
                                    }
                                    // Load vendor list
                                    api("/pengajuan/vendors").then(r => setVendorList(r.data || [])).catch(() => { });
                                }}
                                    className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition">
                                    Review & Approve GA
                                </button>
                            )}
                            {canApproveSpv && (
                                <button onClick={() => setSpvNoteOpen(true)}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                                    Approve Supervisor
                                </button>
                            )}
                            {canApproveBod && (
                                <button onClick={doApprove} disabled={acting}
                                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                    {acting ? "Memproses..." : "Approve Direktur"}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
