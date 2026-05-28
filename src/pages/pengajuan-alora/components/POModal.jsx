import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import { HiOutlineXMark, HiOutlinePrinter, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { buildPrintWindow } from "../utils/printStyles";

const toTitleCase = (str) => {
    if (!str) return "—";
    return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};
const formatRp = (v) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v) || 0);
const formatDate = (s) => { if (!s) return "—"; const d = new Date(s); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }); };
const formatDateShort = (s) => { if (!s) return "—"; const d = new Date(s); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); };

// ── Preview ───────────────────────────────────────────────────────────────────
function POPreview({ data: d }) {
    const finalQty  = d.ga_qty  ? Number(d.ga_qty)       : Number(d.qty);
    const finalMerk = d.ga_merk ? toTitleCase(d.ga_merk) : (d.merk ? toTitleCase(d.merk) : "—");
    const totalEst  = d.estimasi_harga ? Number(d.estimasi_harga) * finalQty : null;

    // Vendor display: jika mode link, tampilkan judul link saja
    const vendorDisplay = d.vendor_mode === "link"
        ? (d.link_title || "—")
        : (d.vendor ? toTitleCase(d.vendor) : "—");

    // Alamat: jika company_id = 5 (Waschen) pakai alamat outlet, lainnya pakai alamat company
    const fromAddress = (Number(d.company_id) === 5 && d.outlet_address)
        ? d.outlet_address
        : (d.company_address || "—");

    // Status TTD: cek apakah sudah approve atau belum
    const hasFinanceApproval = !!d.finance_spv_name;
    const hasDirectorApproval = !!d.approved_finance_at; // Direktur otomatis approve saat Finance approve

    return (
        <div className="bg-white text-slate-800 font-sans">
            {/* Kop */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5 mb-6">
                <div>
                    <div className="text-2xl font-extrabold text-slate-900 tracking-tight">PT WASCHEN ALORA INDONESIA</div>
                    <div className="text-sm text-slate-500 mt-1">Alora Group Indonesia</div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-extrabold text-emerald-700 tracking-widest uppercase">Purchase Order</div>
                    <div className="text-base font-bold text-slate-700 mt-1">{d.pr_code}</div>
                    <div className="text-sm text-slate-400">{formatDate(d.approved_ga_at || d.created_at)}</div>
                </div>
            </div>

            {/* Info — PO format: kategori (perusahaan) ke vendor/link */}
            <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="space-y-3">
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kategori</div>
                        <div className="text-base font-bold text-slate-800">{d.company_name || "—"}</div>
                        {d.outlet_name && <div className="text-xs text-slate-500 mt-0.5">Outlet: {d.outlet_name}</div>}
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase">Alamat</div>
                        <div className="text-sm text-slate-700 whitespace-pre-line">{fromAddress}</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase">Tanggal PO</div>
                        <div className="text-sm font-semibold text-slate-700">{formatDate(d.approved_ga_at)}</div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kepada</div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase">{d.vendor_mode === "link" ? "Sumber" : "Vendor"}</div>
                        <div className="text-base font-bold text-slate-800">{vendorDisplay}</div>
                    </div>
                    {d.vendor_mode !== "link" && d.vendor_alamat && (
                        <div><div className="text-[10px] text-slate-400 uppercase">Alamat</div><div className="text-sm text-slate-700">{d.vendor_alamat}</div></div>
                    )}
                    {d.vendor_mode !== "link" && d.vendor_telepon && (
                        <div><div className="text-[10px] text-slate-400 uppercase">Telepon</div><div className="text-sm text-slate-700">{d.vendor_telepon}</div></div>
                    )}
                    {d.vendor_mode === "link" && d.link_url && (
                        <div><div className="text-[10px] text-slate-400 uppercase">URL</div><a href={d.link_url.trim().match(/^https?:\/\//i) ? d.link_url.trim() : `https://${d.link_url.trim()}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline break-all">{d.link_url}</a></div>
                    )}
                    <div><div className="text-[10px] text-slate-400 uppercase">Tipe</div><div className="text-sm font-semibold text-slate-700">{d.type === "reimburse" ? "Reimburse" : "Pengajuan Barang"}</div></div>
                    {d.type === "reimburse" && (<><div><div className="text-[10px] text-slate-400 uppercase">Bank</div><div className="text-sm font-semibold text-slate-700">{toTitleCase(d.bank_name)}</div></div><div><div className="text-[10px] text-slate-400 uppercase">No. Rekening</div><div className="text-sm font-mono font-semibold text-slate-700">{d.nomor_rekening || "—"}</div></div><div><div className="text-[10px] text-slate-400 uppercase">Atas Nama</div><div className="text-sm font-semibold text-slate-700">{toTitleCase(d.atas_nama)}</div></div></>)}
                </div>
            </div>

            {/* Tabel */}
            <div className="rounded-xl overflow-hidden border border-slate-200 mb-6">
                <table className="w-full text-sm">
                    <thead><tr className="bg-slate-100 text-slate-600"><th className="text-center px-3 py-3 text-[11px] font-bold uppercase w-8">#</th><th className="text-left px-4 py-3 text-[11px] font-bold uppercase">Nama Barang</th><th className="text-left px-3 py-3 text-[11px] font-bold uppercase">Merk</th><th className="text-right px-3 py-3 text-[11px] font-bold uppercase">Qty</th><th className="text-left px-3 py-3 text-[11px] font-bold uppercase">Satuan</th><th className="text-right px-3 py-3 text-[11px] font-bold uppercase">Harga</th><th className="text-right px-4 py-3 text-[11px] font-bold uppercase">Subtotal</th></tr></thead>
                    <tbody><tr className="border-t border-slate-100"><td className="px-3 py-4 text-slate-400 text-center">1</td><td className="px-4 py-4"><div className="font-bold text-slate-800">{toTitleCase(d.nama_barang)}</div>{d.deskripsi && <div className="text-xs text-slate-400 mt-0.5">{d.deskripsi}</div>}</td><td className="px-3 py-4">{finalMerk}</td><td className="px-3 py-4 text-right font-bold tabular-nums">{finalQty}</td><td className="px-3 py-4">{d.satuan_name || "—"}</td><td className="px-3 py-4 text-right tabular-nums">{d.estimasi_harga ? formatRp(d.estimasi_harga) : "—"}</td><td className="px-4 py-4 text-right font-bold tabular-nums text-emerald-700">{totalEst ? formatRp(totalEst) : "—"}</td></tr></tbody>
                    <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50"><td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-slate-600">Total Estimasi</td><td className="px-4 py-3 text-right text-lg font-extrabold text-emerald-700 tabular-nums">{totalEst ? formatRp(totalEst) : "—"}</td></tr></tfoot>
                </table>
            </div>

            {/* Notes */}
            {d.alasan_pembelian && (
                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alasan Pembelian</p>
                    <p className="text-sm text-slate-600">{d.alasan_pembelian}</p>
                </div>
            )}
            {d.ga_note && (
                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan General Affair</p>
                    <p className="text-sm text-slate-600">{d.ga_note}</p>
                </div>
            )}
            {d.finance_note && (
                <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm shadow-slate-200/50 p-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan Finance</p>
                    <p className="text-sm text-slate-600">{d.finance_note}</p>
                </div>
            )}

            {/* Tanda Tangan: Mengajukan (GA) — Mengetahui (SPV Finance) — Menyetujui (Direktur) */}
            <div className="mt-6 grid grid-cols-3 gap-4">
                {/* GA - Mengajukan */}
                <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Mengajukan</div>
                    <div className="h-14 border-b border-dashed border-slate-300 mb-3" />
                    {d.ga_name ? (
                        <>
                            <div className="text-sm font-semibold text-slate-700">{toTitleCase(d.ga_name)}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">General Affair</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{formatDateShort(d.approved_ga_at)}</div>
                        </>
                    ) : (
                        <div className="text-[11px] text-slate-300 italic">—</div>
                    )}
                </div>
                {/* SPV Finance - Mengetahui */}
                <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Mengetahui</div>
                    <div className="h-14 border-b border-dashed border-slate-300 mb-3" />
                    {hasFinanceApproval ? (
                        <>
                            <div className="text-sm font-semibold text-slate-700">{toTitleCase(d.finance_spv_name)}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Supervisor Finance</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{formatDateShort(d.approved_finance_at)}</div>
                        </>
                    ) : (
                        <div className="text-[11px] text-amber-500 italic font-medium">Belum Menyetujui</div>
                    )}
                </div>
                {/* Direktur - Menyetujui */}
                <div className="border border-slate-200 rounded-xl p-4 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Menyetujui</div>
                    <div className="h-14 border-b border-dashed border-slate-300 mb-3" />
                    {hasDirectorApproval ? (
                        <>
                            <div className="text-sm font-semibold text-slate-700">{toTitleCase(d.director_name)}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Direktur Alora Group</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{formatDateShort(d.approved_finance_at)}</div>
                        </>
                    ) : (
                        <div className="text-[11px] text-amber-500 italic font-medium">Belum Menyetujui</div>
                    )}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
                <span>Dicetak: {new Date().toLocaleString("id-ID")}</span>
                <span>{d.pr_code} · PT Waschen Alora Indonesia</span>
            </div>
        </div>
    );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function POModal({ open, prId, onClose }) {
    const [loading, setLoading] = useState(false);
    const [data, setData]       = useState(null);
    const [error, setError]     = useState(null);

    const load = useCallback(async () => {
        if (!prId) return;
        setLoading(true); setError(null);
        try { const d = await api(`/pengajuan/${prId}/po`); setData(d.data); }
        catch (err) { setError(err.message || "Gagal memuat data"); }
        finally { setLoading(false); }
    }, [prId]);

    useEffect(() => { if (open) load(); else { setData(null); setError(null); } }, [open, load]);

    const handlePrint = () => {
        if (!data) return;
        const d = data;
        const finalQty  = d.ga_qty  ? Number(d.ga_qty) : Number(d.qty);
        const finalMerk = d.ga_merk ? toTitleCase(d.ga_merk) : (d.merk ? toTitleCase(d.merk) : "—");
        const totalEst  = d.estimasi_harga ? Number(d.estimasi_harga) * finalQty : null;
        const vendorDisplay = d.vendor_mode === "link"
            ? (d.link_title || "—")
            : (d.vendor ? toTitleCase(d.vendor) : "—");

        const hasFinanceApproval = !!d.finance_spv_name;
        const hasDirectorApproval = !!d.approved_finance_at;

        // Alamat: jika company_id = 5 (Waschen) pakai alamat outlet, lainnya pakai alamat company
        const fromAddress = (Number(d.company_id) === 5 && d.outlet_address)
            ? d.outlet_address
            : (d.company_address || "—");

        const html = `
<div class="kop"><div><div class="text-2xl text-900">PT WASCHEN ALORA INDONESIA</div><div class="text-xs text-400" style="margin-top:4px">Alora Group Indonesia</div></div><div class="text-right"><div class="text-xl text-emerald tracking-widest uppercase">Purchase Order</div><div class="text-base text-700" style="margin-top:4px">${d.pr_code}</div><div class="text-xs text-400" style="margin-top:2px">${formatDate(d.approved_ga_at || d.created_at)}</div></div></div>

<div class="grid-2">
  <div class="space-y"><div class="info-item"><div class="info-label">Kategori</div><div class="info-value" style="font-size:14px;font-weight:700">${d.company_name || "—"}</div>${d.outlet_name ? `<div class="info-sub">Outlet: ${d.outlet_name}</div>` : ""}</div><div class="info-item"><div class="info-label">Alamat</div><div class="info-value" style="font-weight:400;white-space:pre-line">${fromAddress}</div></div><div class="info-item"><div class="info-label">Tanggal PO</div><div class="info-value">${formatDate(d.approved_ga_at)}</div></div></div>
  <div class="space-y"><div class="section-title">Kepada</div><div class="info-item"><div class="info-label">${d.vendor_mode === "link" ? "Sumber" : "Vendor"}</div><div class="info-value" style="font-size:14px;font-weight:700">${vendorDisplay}</div></div>${d.vendor_mode !== "link" && d.vendor_alamat ? `<div class="info-item"><div class="info-label">Alamat</div><div class="info-value" style="font-weight:400">${d.vendor_alamat}</div></div>` : ""}${d.vendor_mode !== "link" && d.vendor_telepon ? `<div class="info-item"><div class="info-label">Telepon</div><div class="info-value" style="font-weight:400">${d.vendor_telepon}</div></div>` : ""}${d.vendor_mode === "link" && d.link_url ? `<div class="info-item"><div class="info-label">URL</div><div class="info-value" style="font-weight:400;color:#059669;word-break:break-all;font-size:11px">${d.link_url}</div></div>` : ""}<div class="info-item"><div class="info-label">Tipe</div><div class="info-value">${d.type === "reimburse" ? "Reimburse" : "Pengajuan Barang"}</div></div>${d.type === "reimburse" ? `<div class="info-item"><div class="info-label">Bank</div><div class="info-value">${toTitleCase(d.bank_name)}</div></div><div class="info-item"><div class="info-label">No. Rekening</div><div class="info-value mono">${d.nomor_rekening || "—"}</div></div><div class="info-item"><div class="info-label">Atas Nama</div><div class="info-value">${toTitleCase(d.atas_nama)}</div></div>` : ""}</div>
</div>

<table class="item-table"><thead><tr><th class="c" style="width:32px">#</th><th>Nama Barang</th><th>Merk</th><th class="r" style="width:50px">Qty</th><th style="width:60px">Satuan</th><th class="r" style="width:110px">Harga</th><th class="r" style="width:120px">Subtotal</th></tr></thead><tbody><tr><td class="c no">1</td><td><div class="item-name">${toTitleCase(d.nama_barang)}</div>${d.deskripsi ? `<div class="item-desc">${d.deskripsi}</div>` : ""}</td><td>${finalMerk}</td><td class="r" style="font-weight:700">${finalQty}</td><td>${d.satuan_name || "—"}</td><td class="r">${d.estimasi_harga ? formatRp(d.estimasi_harga) : "—"}</td><td class="r item-total">${totalEst ? formatRp(totalEst) : "—"}</td></tr></tbody><tfoot><tr><td colspan="6" class="r">Total Estimasi</td><td class="r total-amount">${totalEst ? formatRp(totalEst) : "—"}</td></tr></tfoot></table>

${d.alasan_pembelian ? `<div class="note-box"><div class="note-label">Alasan Pembelian</div><div class="note-text">${d.alasan_pembelian}</div></div>` : ""}
${d.ga_note ? `<div class="note-box"><div class="note-label">Catatan General Affair</div><div class="note-text">${d.ga_note}</div></div>` : ""}
${d.finance_note ? `<div class="note-box"><div class="note-label">Catatan Finance</div><div class="note-text">${d.finance_note}</div></div>` : ""}

<div class="grid-3" style="margin-top:24px;margin-bottom:0"><div class="sig-box"><div class="sig-label">Mengajukan</div><div class="sig-space"></div>${d.ga_name ? `<div class="sig-name">${toTitleCase(d.ga_name)}</div><div class="sig-role">General Affair</div><div class="sig-date">${formatDateShort(d.approved_ga_at)}</div>` : `<div class="sig-date" style="font-style:italic">—</div>`}</div><div class="sig-box"><div class="sig-label">Mengetahui</div><div class="sig-space"></div>${hasFinanceApproval ? `<div class="sig-name">${toTitleCase(d.finance_spv_name)}</div><div class="sig-role">Supervisor Finance</div><div class="sig-date">${formatDateShort(d.approved_finance_at)}</div>` : `<div class="sig-date" style="font-style:italic;color:#d97706">Belum Menyetujui</div>`}</div><div class="sig-box"><div class="sig-label">Menyetujui</div><div class="sig-space"></div>${hasDirectorApproval ? `<div class="sig-name">${toTitleCase(d.director_name)}</div><div class="sig-role">Direktur Alora Group</div><div class="sig-date">${formatDateShort(d.approved_finance_at)}</div>` : `<div class="sig-date" style="font-style:italic;color:#d97706">Belum Menyetujui</div>`}</div></div>

<div class="doc-footer"><span>Dicetak: ${new Date().toLocaleString("id-ID")}</span><span>${d.pr_code} · PT Waschen Alora Indonesia</span></div>`;

        buildPrintWindow(`Purchase Order — ${d.pr_code}`, html);
    };

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 flex-shrink-0 bg-white">
                    <div><h2 className="text-base font-bold text-slate-800">Purchase Order</h2><p className="text-[11px] text-slate-400 mt-0.5">{data?.pr_code || "Memuat..."}</p></div>
                    <div className="flex items-center gap-2">
                        {data && <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm"><HiOutlinePrinter className="h-4 w-4" />Cetak / Save PDF</button>}
                        <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 hover:bg-slate-50 transition"><HiOutlineXMark className="h-4 w-4 text-slate-500" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
                    {loading ? <div className="flex items-center justify-center py-20"><div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" /></div>
                    : error ? <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700"><HiOutlineExclamationTriangle className="h-5 w-5 shrink-0" />{error}</div>
                    : data ? <div id="po-print-area" className="bg-white rounded-2xl border border-slate-200 shadow-sm px-10 py-8"><POPreview data={data} /></div> : null}
                </div>
            </div>
        </div>,
        document.body
    );
}
