import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api, assetUrl, BASE_URL } from "../../../lib/api";
import {
    HiOutlineCreditCard,
    HiOutlineXMark,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineEye,
    HiOutlineDocumentText,
    HiOutlineArrowDownTray,
    HiOutlineBanknotes,
    HiOutlineClock,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (s) => !s ? s : String(s).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());

const formatRp = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
        .format(Number(v) || 0);

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
    return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getExt      = (name) => (String(name || "").split(".").pop() || "").toLowerCase();
const isImageExt  = (ext)  => ["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext);
const isPdfExt    = (ext)  => ext === "pdf";

// ── Preview Modal (dipakai untuk menampilkan bukti) ─────────────────────────
function PreviewModal({ item, onClose }) {
    if (!item) return null;
    const { kind, name, src, downloadUrl } = item;
    return createPortal(
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4">
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
        <div className={cn("fixed top-5 right-5 z-[10011] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
            toast.type === "success" ? "bg-emerald-50/95 border-emerald-200 text-emerald-700" : "bg-rose-50/95 border-rose-200 text-rose-700")}>
            {toast.type === "success" ? <HiOutlineCheckCircle className="h-5 w-5" /> : <HiOutlineExclamationTriangle className="h-5 w-5" />}
            {toast.msg}
        </div>
    );
}

/**
 * Modal pelunasan pembayaran kredit (multi-installment).
 *
 * Props:
 *   - open
 *   - prId
 *   - onClose
 *   - onChanged (dipanggil setelah ada cicilan baru)
 *   - canPay   (boolean: apakah user boleh melakukan pembayaran; default true)
 */
export default function InstallmentPaymentModal({
    open, prId, onClose, onChanged, canPay = true,
}) {
    const [loading, setLoading]   = useState(false);
    const [acting, setActing]     = useState(false);
    const [data, setData]         = useState(null); // { pr, payments, summary }
    const [toast, setToast]       = useState(null);
    const [preview, setPreview]   = useState(null);

    // Form state
    const [nominal, setNominal]   = useState("");
    const [note, setNote]         = useState("");
    const [file, setFile]         = useState(null);
    const [paidAt, setPaidAt]     = useState(""); // YYYY-MM-DD; default: hari ini

    const todayISO = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }, []);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    const load = useCallback(async () => {
        if (!prId) return;
        setLoading(true);
        try {
            const d = await api(`/pengajuan/${prId}/payments`);
            setData(d);
            // Default nominal = sisa hutang (boleh diubah user)
            const sisa = Number(d?.summary?.sisa) || 0;
            setNominal(sisa > 0 ? formatRupiah(String(Math.round(sisa))) : "");
            // Default tanggal bayar = hari ini
            const t = new Date();
            setPaidAt(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
        } catch (err) {
            showToast("error", err.message || "Gagal memuat riwayat pembayaran");
        } finally {
            setLoading(false);
        }
    }, [prId]);

    useEffect(() => {
        if (open) {
            load();
        } else {
            setData(null);
            setNominal("");
            setNote("");
            setFile(null);
            setPaidAt("");
            setPreview(null);
        }
    }, [open, load]);

    const submitInstallment = async () => {
        const nom = Number(stripRupiah(nominal));
        if (!nom || nom <= 0) return showToast("error", "Nominal bayar wajib diisi");
        if (!file) return showToast("error", "Bukti pembayaran wajib dilampirkan");

        const sisa = Number(data?.summary?.sisa) || 0;
        if (nom > sisa + 0.01) return showToast("error", `Nominal bayar melebihi sisa hutang (${formatRp(sisa)})`);

        // Validasi tanggal bayar (jika diisi) tidak boleh masa depan
        if (paidAt && paidAt > todayISO) {
            return showToast("error", "Tanggal bayar tidak boleh di masa depan");
        }

        setActing(true);
        try {
            const fd = new FormData();
            fd.append("nominal_bayar", String(nom));
            if (note.trim()) fd.append("note", note.trim());
            if (paidAt) fd.append("paid_at", paidAt);
            fd.append("attachments", file);
            const res = await fetch(`${BASE_URL}/pengajuan/${prId}/installment`, {
                method: "POST",
                body: fd,
                credentials: "include",
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.message || "Gagal");
            showToast("success", j.message || "Pembayaran tercatat");
            // refresh data, reset form
            setNominal("");
            setNote("");
            setFile(null);
            // paidAt akan di-reset oleh load() ke hari ini
            await load();
            onChanged?.();
        } catch (err) {
            showToast("error", err.message);
        } finally {
            setActing(false);
        }
    };

    const openPreviewProof = (proofPath, label) => {
        if (!proofPath) return;
        const ext = getExt(proofPath);
        const src = assetUrl(proofPath);
        if (isImageExt(ext))      setPreview({ kind: "image", name: label || "Bukti Bayar", src, downloadUrl: src });
        else if (isPdfExt(ext))   setPreview({ kind: "pdf",   name: label || "Bukti Bayar", src, downloadUrl: src });
        else                      window.open(src, "_blank", "noopener");
    };

    const summary = data?.summary || { target: 0, totalPaid: 0, sisa: 0, isLunas: false };
    const pr      = data?.pr || null;
    const payments = data?.payments || [];

    const progressPct = useMemo(() => {
        if (!summary.target) return 0;
        return Math.min(100, Math.round((summary.totalPaid / summary.target) * 100));
    }, [summary.target, summary.totalPaid]);

    if (!open) return null;

    return createPortal(
        <>
            <PreviewModal item={preview} onClose={() => setPreview(null)} />

            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <Toast toast={toast} />
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 shrink-0">
                                <HiOutlineCreditCard className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-800 truncate">Proses Pelunasan Kredit</h2>
                                <p className="text-[11px] text-slate-400 truncate">{pr?.pr_code || "Memuat..."}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition shrink-0">
                            <HiOutlineXMark className="h-4 w-4 text-slate-500" />
                        </button>
                    </div>

                    {loading || !data ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-7 w-7 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5 bg-slate-50/40">

                            {/* Info PR */}
                            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-400 uppercase">Item</p>
                                        <p className="text-sm font-semibold text-slate-800">{toTitleCase(pr?.nama_barang) || "—"}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {toTitleCase(pr?.pengaju_name) || "—"} · {toTitleCase(pr?.department_name) || "—"}
                                        </p>
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0",
                                        summary.isLunas
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                            : "bg-amber-50 text-amber-700 border-amber-200",
                                    )}>
                                        {summary.isLunas ? "Lunas" : "Belum Terbayar"}
                                    </span>
                                </div>
                                {pr?.jatuh_tempo && (
                                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <HiOutlineClock className="h-3.5 w-3.5" />
                                        Jatuh Tempo: <span className="font-semibold text-slate-700">{
                                            new Date(pr.jatuh_tempo).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
                                        }</span>
                                        {pr?.termin_value && pr?.termin_unit && (
                                            <span className="text-slate-400"> ({pr.termin_value} {pr.termin_unit})</span>
                                        )}
                                    </p>
                                )}
                            </div>

                            {/* Ringkasan nominal */}
                            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 space-y-3">
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Nominal</p>
                                        <p className="text-sm font-bold text-slate-800 tabular-nums">{formatRp(summary.target)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sudah Bayar</p>
                                        <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatRp(summary.totalPaid)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Sisa</p>
                                        <p className={cn("text-sm font-bold tabular-nums",
                                            summary.sisa > 0 ? "text-rose-600" : "text-emerald-700")}>
                                            {formatRp(summary.sisa)}
                                        </p>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                        <span>Progress Pelunasan</span>
                                        <span className="font-semibold tabular-nums">{progressPct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            summary.isLunas ? "bg-emerald-500" : "bg-cyan-500",
                                        )} style={{ width: `${progressPct}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Form Cicilan baru — hidden jika sudah lunas atau tidak boleh bayar */}
                            {canPay && !summary.isLunas && (
                                <div className="bg-white rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50/30 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <HiOutlineBanknotes className="h-4 w-4 text-cyan-700" />
                                        <p className="text-sm font-bold text-cyan-700">Tambah Pembayaran / Cicilan</p>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Masukkan nominal yang dibayar. Default = sisa hutang. Jika nominal yang dibayar
                                        kurang dari sisa, status tetap "Belum Terbayar" dan akan ada cicilan berikutnya.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Nominal Bayar <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
                                                <input
                                                    className="w-full rounded-lg border border-cyan-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200 tabular-nums"
                                                    value={nominal}
                                                    inputMode="numeric"
                                                    onChange={e => setNominal(formatRupiah(e.target.value))}
                                                    placeholder="0" />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Sisa hutang: <span className="font-semibold text-rose-600">{formatRp(summary.sisa)}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Tanggal Bayar <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={paidAt}
                                                max={todayISO}
                                                onChange={e => setPaidAt(e.target.value)}
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                Default: hari ini. Ubah jika pembayaran sudah lewat.
                                            </p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                                                Bukti Bayar <span className="text-rose-500">*</span>
                                            </label>
                                            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-sm outline-none file:mr-2 file:rounded file:border-0 file:bg-cyan-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-cyan-700"
                                                onChange={e => setFile(e.target.files?.[0] || null)} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Catatan (opsional)</label>
                                            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                                                className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-200 resize-none"
                                                placeholder="Catatan tambahan (opsional)..." />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-1">
                                        <button onClick={submitInstallment} disabled={acting || !nominal || !file || !paidAt}
                                            className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 transition flex items-center gap-1.5">
                                            <HiOutlineBanknotes className="h-4 w-4" />
                                            {acting ? "Memproses..." : "Catat Pembayaran"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Sudah Lunas */}
                            {summary.isLunas && (
                                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 flex items-center gap-3">
                                    <HiOutlineCheckCircle className="h-6 w-6 shrink-0" />
                                    <div>
                                        <p className="font-bold">Pembayaran Lunas</p>
                                        <p className="text-xs">Total pembayaran telah memenuhi nominal yang disetujui finance.</p>
                                    </div>
                                </div>
                            )}

                            {/* Riwayat Pembayaran */}
                            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4">
                                <p className="text-sm font-bold text-slate-700 mb-3">Riwayat Pembayaran ({payments.length})</p>
                                {payments.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Belum ada pembayaran tercatat.</p>
                                ) : (
                                    <div className="space-y-2.5">
                                        {payments.map((p, idx) => (
                                            <div key={p.payment_id}
                                                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/40 px-3 py-2.5">
                                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700 font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                        <p className="text-sm font-bold text-cyan-700 tabular-nums">
                                                            {formatRp(p.nominal_bayar)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">{formatDate(p.paid_at)}</p>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        oleh <span className="font-semibold text-slate-600">{toTitleCase(p.paid_by_name) || "Sistem"}</span>
                                                    </p>
                                                    {p.note && (
                                                        <p className="text-[11px] text-slate-500 mt-0.5 italic">"{p.note}"</p>
                                                    )}
                                                    {p.proof_path && (
                                                        <button
                                                            onClick={() => openPreviewProof(p.proof_path, `Bukti Bayar #${idx + 1}`)}
                                                            className="mt-1 inline-flex items-center gap-1 rounded-md bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                                                            <HiOutlineEye className="h-3 w-3" />
                                                            Lihat Bukti
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="border-t border-slate-200 px-6 py-3 flex justify-end gap-2 bg-white flex-shrink-0">
                        <button onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
