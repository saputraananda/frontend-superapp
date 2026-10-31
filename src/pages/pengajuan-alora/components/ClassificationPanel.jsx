import { useEffect, useState } from "react";
import {
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineClipboardDocumentList,
    HiOutlineArrowsUpDown,
    HiOutlineArrowRight,
    HiOutlineMagnifyingGlass,
    HiOutlineInformationCircle,
} from "react-icons/hi2";
import { api } from "../../../lib/api";
import { STATUS_CONFIG, STATUS_FILTER_OPTIONS } from "../pages/DashboardPengajuan";


function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (str) => {
    if (!str) return str;
    return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const formatRupiah = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
        .format(Number(v) || 0);

const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const ITEM_LIMIT = 10;

/**
 * Panel "Pengeluaran per Klasifikasi": daftar klasifikasi (kiri) dan PR di dalamnya (kanan).
 *
 * Daftar klasifikasi dimuat oleh parent (kartu ringkasan memakai respons yang sama);
 * detail PR dimuat di sini setelah satu klasifikasi dipilih.
 *
 * filterQuery : query string filter aktif (departemen/company/outlet/tanggal/status/tipe/search),
 *               tanpa page/sort.
 * statusLabel : teks pilihan dropdown status yang aktif, untuk subjudul.
 * isEstimate  : true bila status yang dipilih mencakup PR yang belum dibayar.
 */
export default function ClassificationPanel({
    data, total, page, limit, grandTotal, loading,
    sort, onSort, onPage,
    searchInput, onSearchInput, typeFilter, onTypeFilter, statusFilter, onStatusFilter,
    statusLabel, isEstimate,
    filterQuery, refreshTick, onOpenPR, emptyHint,
}) {
    const [selKey, setSelKey] = useState(null);
    const [items, setItems] = useState([]);
    const [itemTotal, setItemTotal] = useState(0);
    const [itemNominal, setItemNominal] = useState(0);
    const [itemPage, setItemPage] = useState(1);
    const [itemLoading, setItemLoading] = useState(false);

    // Pilih klasifikasi pertama bila pilihan hilang dari halaman yang tampil
    useEffect(() => {
        if (!data.length) { setSelKey(null); return; }
        if (!data.some(r => r.key === selKey)) setSelKey(data[0].key);
    }, [data, selKey]);

    // Kembali ke halaman 1 saat klasifikasi, filter, atau urutan berubah
    useEffect(() => { setItemPage(1); }, [selKey, filterQuery, sort]);

    useEffect(() => {
        if (!selKey) { setItems([]); setItemTotal(0); setItemNominal(0); return; }
        let cancel = false;
        (async () => {
            setItemLoading(true);
            try {
                const p = new URLSearchParams(filterQuery);
                p.set("key", selKey);
                p.set("page", String(itemPage));
                p.set("limit", String(ITEM_LIMIT));
                p.set("sort", sort);
                const d = await api(`/pengajuan/by-classification/items?${p}`);
                if (cancel) return;
                setItems(d.data || []);
                setItemTotal(d.total || 0);
                setItemNominal(d.total_nominal || 0);
            } catch {
                if (!cancel) { setItems([]); setItemTotal(0); setItemNominal(0); }
            } finally {
                if (!cancel) setItemLoading(false);
            }
        })();
        return () => { cancel = true; };
    }, [selKey, itemPage, sort, filterQuery, refreshTick]);

    const totalPages = Math.ceil(total / limit) || 1;
    const itemTotalPages = Math.ceil(itemTotal / ITEM_LIMIT) || 1;
    const selected = data.find(r => r.key === selKey);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 overflow-hidden">

            {/* header */}
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-sm font-bold text-slate-700">Pengeluaran per Klasifikasi</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {statusLabel} · {total} klasifikasi · total {formatRupiah(grandTotal)}
                        </p>
                    </div>
                    <button type="button" onClick={onSort}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <HiOutlineArrowsUpDown className="h-3.5 w-3.5 text-slate-400" />
                        Nominal: {sort === "desc" ? "Terbesar ↓" : "Terkecil ↑"}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 min-w-0">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            value={searchInput}
                            onChange={e => onSearchInput(e.target.value)}
                            placeholder="Cari barang, kode, atau nama..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition" />
                    </div>
                    <select value={typeFilter} onChange={e => onTypeFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                        <option value="">Semua Tipe</option>
                        <option value="pengajuan">Pengajuan</option>
                        <option value="reimburse">Reimburse</option>
                    </select>
                    <select value={statusFilter} onChange={e => onStatusFilter(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                        {STATUS_FILTER_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>

                {isEstimate && (
                    <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-700">
                        <HiOutlineInformationCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
                        Status ini mencakup PR yang belum dibayar, jadi nominalnya perkiraan (estimasi harga), bukan uang yang sudah keluar.
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5">

                {/* kiri: daftar klasifikasi */}
                <div className="lg:col-span-2 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100">
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-14">
                                <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                            </div>
                        ) : data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
                                <HiOutlineClipboardDocumentList className="h-9 w-9 text-slate-200" />
                                <p className="text-sm text-slate-400">{emptyHint}</p>
                            </div>
                        ) : data.map((r, i) => {
                            const pct = grandTotal ? (r.total_nominal / grandTotal) * 100 : 0;
                            const active = r.key === selKey;
                            return (
                                <button key={r.key} type="button" onClick={() => setSelKey(r.key)}
                                    className={cn(
                                        "w-full text-left px-5 py-3 border-b border-slate-50 border-l-[3px] transition",
                                        active
                                            ? "bg-cyan-50/70 border-l-cyan-500"
                                            : "border-l-transparent hover:bg-slate-50/80",
                                    )}>
                                    <div className="flex items-baseline gap-2.5">
                                        <span className="w-5 text-[11px] font-bold text-slate-400 tabular-nums">
                                            {(page - 1) * limit + i + 1}
                                        </span>
                                        <span className="flex-1 min-w-0 truncate text-sm font-bold text-slate-700">
                                            {r.classification_name}
                                        </span>
                                        <span className="text-sm font-bold text-slate-800 tabular-nums">
                                            {formatRupiah(r.total_nominal)}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 ml-[30px] flex justify-between text-[11px] text-slate-500">
                                        <span>{r.pr_count} PR</span>
                                        <span className="tabular-nums">{pct.toFixed(1)}% dari total</span>
                                    </div>
                                    <div className="mt-1.5 ml-[30px] h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                        <div className={cn("h-full rounded-full transition-all duration-500",
                                            active ? "bg-cyan-500" : "bg-emerald-500")}
                                            style={{ width: `${Math.min(100, pct)}%` }} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                            <p className="text-[11px] text-slate-400">
                                Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
                                <span className="ml-1">({total} klasifikasi)</span>
                            </p>
                            <div className="flex items-center gap-1">
                                <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}
                                    aria-label="Halaman sebelumnya"
                                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                    <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)}
                                    aria-label="Halaman berikutnya"
                                    className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                    <HiOutlineChevronRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* kanan: PR dalam klasifikasi terpilih */}
                <div className="lg:col-span-3 flex flex-col min-h-[260px]">
                    {selected ? (
                        <>
                            <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-700 truncate">{selected.classification_name}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Klik PR untuk membuka detail</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Total klasifikasi</p>
                                    <p className="text-base font-bold text-slate-800 tabular-nums">{formatRupiah(itemNominal)}</p>
                                </div>
                            </div>

                            <div className="flex-1">
                                {itemLoading && items.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                    </div>
                                ) : items.length === 0 ? (
                                    <p className="py-12 text-center text-sm text-slate-400">Tidak ada PR pada klasifikasi ini</p>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {items.map(it => {
                                            const badge = STATUS_CONFIG[Number(it.status)] || STATUS_CONFIG[1];
                                            const partial = Math.abs(it.alloc_nominal - it.pr_nominal) > 1;
                                            return (
                                                <button key={it.pr_id} type="button" onClick={() => onOpenPR(it.pr_id)}
                                                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition text-left group">
                                                    <div className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                        it.type === "reimburse" ? "bg-teal-50 text-teal-600" : "bg-emerald-50 text-emerald-600",
                                                    )}>
                                                        {it.type === "reimburse"
                                                            ? <HiOutlineCreditCard className="h-4 w-4" />
                                                            : <HiOutlineDocumentPlus className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-emerald-700 transition">
                                                            {toTitleCase(it.nama_barang)}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400 truncate">
                                                            {it.pr_code}
                                                            {" · "}{toTitleCase(it.pengaju_name) || "—"}
                                                            {it.department_name ? ` · ${toTitleCase(it.department_name)}` : ""}
                                                            {it.company_name ? ` · ${it.company_name}` : ""}
                                                            {it.outlet_name ? ` (${it.outlet_name})` : ""}
                                                            {" · "}{formatDate(it.tanggal_pengajuan || it.created_at)}
                                                        </p>
                                                    </div>
                                                    <span className={cn("hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", badge.cls)}>
                                                        {badge.label}
                                                    </span>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-sm font-bold text-slate-800 tabular-nums">{formatRupiah(it.alloc_nominal)}</p>
                                                        {partial && (
                                                            <p className="text-[10px] text-slate-400 tabular-nums">dari {formatRupiah(it.pr_nominal)}</p>
                                                        )}
                                                    </div>
                                                    <HiOutlineArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 transition shrink-0" />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {itemTotalPages > 1 && (
                                <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                                    <p className="text-[11px] text-slate-400">
                                        Hal <span className="font-semibold text-slate-600">{itemPage}</span>/{itemTotalPages}
                                        <span className="ml-1">({itemTotal} PR)</span>
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button type="button" disabled={itemPage <= 1} onClick={() => setItemPage(p => p - 1)}
                                            aria-label="Halaman PR sebelumnya"
                                            className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                            <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                                        </button>
                                        <button type="button" disabled={itemPage >= itemTotalPages} onClick={() => setItemPage(p => p + 1)}
                                            aria-label="Halaman PR berikutnya"
                                            className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                            <HiOutlineChevronRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center py-14 text-sm text-slate-300">
                            Pilih klasifikasi di sebelah kiri
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
