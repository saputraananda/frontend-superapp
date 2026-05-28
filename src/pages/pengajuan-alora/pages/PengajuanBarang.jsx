import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import {
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineMagnifyingGlass,
    HiOutlinePlus,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineClipboardDocumentList,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlinePencilSquare,
    HiOutlineTrash,
    HiOutlineEye,
    HiOutlineCalendarDays,
    HiOutlineUserGroup,
    HiOutlineUser,
    HiOutlineClipboardDocumentCheck,
    HiOutlineGlobeAlt,
    HiOutlineDocumentText,
    HiOutlineReceiptRefund,
    HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { canSupervisorUp } from "../../project-management/role";
import PengajuanDetailModal from "../components/PengajuanDetailModal";
import PRModal from "../components/PRModal";
import POModal from "../components/POModal";
import useCutoffPeriod from "../utils/useCutoffPeriod";
import { exportPengajuanExcel } from "../utils/exportPengajuanExcel";

function cn(...c) { return c.filter(Boolean).join(" "); }

const toTitleCase = (str) => {
    if (!str) return str;
    return String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

const STATUS_CONFIG = {
    1: { label: "Telah Diajukan",       cls: "bg-amber-50 text-amber-700 border-amber-200" },
    2: { label: "Disetujui Supervisor", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    3: { label: "Disetujui Direktur",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    4: { label: "PR Ready",             cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    5: { label: "Menunggu Bayar",       cls: "bg-orange-50 text-orange-700 border-orange-200" },
    6: { label: "Terbayar",             cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    7: { label: "Selesai",              cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    9: { label: "Ditolak",              cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

// Status badge logic: jika status 6 + kredit + belum jatuh tempo → "Belum Terbayar"
const getStatusDisplay = (row) => {
    const status = Number(row.status);
    if (status === 6 && row.payment_method === "kredit") {
        // Kredit: cek jatuh tempo
        if (row.jatuh_tempo) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const jt = new Date(row.jatuh_tempo);
            jt.setHours(0, 0, 0, 0);
            if (jt >= today) {
                return { label: "Belum Terbayar", cls: "bg-amber-50 text-amber-700 border-amber-200" };
            }
        }
        return { label: "Terbayar (Kredit)", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" };
    }
    return STATUS_CONFIG[status] ?? STATUS_CONFIG[1];
};

const formatRp = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
        .format(Number(v) || 0);

const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

function StatusBadge({ status, row }) {
    const c = row ? getStatusDisplay(row) : (STATUS_CONFIG[status] ?? STATUS_CONFIG[1]);
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", c.cls)}>
            {c.label}
        </span>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={cn("fixed top-5 right-5 z-[9999] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-lg border",
            toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-700"
                : "bg-rose-50/95 border-rose-200 text-rose-700")}>
            {toast.type === "success"
                ? <HiOutlineCheckCircle className="h-5 w-5" />
                : <HiOutlineExclamationTriangle className="h-5 w-5" />}
            {toast.msg}
        </div>
    );
}

// ── Period filter (hanya untuk mode department & me) ──────────────────────────
function PeriodFilter({ period }) {
    const { years, months, selectedYear, selectedMonth, handleYearChange, setSelectedMonth, monthLabel, rangeLabelShort } = period;
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <HiOutlineCalendarDays className="h-3.5 w-3.5" />
                <span className="font-semibold">Cutoff:</span>
            </div>
            <select value={selectedYear} onChange={e => handleYearChange(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
                {years.length === 0 && <option value={selectedYear}>{selectedYear}</option>}
            </select>
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                {months.length === 0 && <option value={selectedMonth}>{monthLabel(selectedMonth)}</option>}
            </select>
            {rangeLabelShort && (
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-3 py-1.5 hidden sm:inline">
                    {rangeLabelShort}
                </span>
            )}
        </div>
    );
}

// ── Modes ─────────────────────────────────────────────────────────────────────
// "department" → semua pengajuan satu departemen  (default)
// "me"         → pengajuan milik sendiri
// "approval"   → menunggu approval (SPV+)

export default function PengajuanBarang() {
    const navigate = useNavigate();

    // ── auth ────────────────────────────────────────────────────────────────
    const userRaw         = localStorage.getItem("user");
    const currentUser     = userRaw ? JSON.parse(userRaw) : null;
    const currentEmployee = currentUser?.employee || null;
    const isSpvUp         = canSupervisorUp(currentEmployee);
    const positionName    = currentEmployee?.position_name || "";
    const isGAFinance     = positionName.toLowerCase().includes("general affair")
                         || positionName.toLowerCase().includes("finance")
                         || positionName.toLowerCase().includes("accounting")
                         || positionName.toLowerCase().includes("accountiing");
    const isGAOnly        = positionName.toLowerCase().includes("general affair");
    const isFinanceOnly   = positionName.toLowerCase().includes("finance")
                         || positionName.toLowerCase().includes("accounting")
                         || positionName.toLowerCase().includes("accountiing");

    // ── view mode ────────────────────────────────────────────────────────────
    // "department" | "me" | "approval" | "all" | "ga-review" | "finance-review" | "payment"
    const [mode, setMode] = useState("department");

    // ── list state ───────────────────────────────────────────────────────────
    const [data, setData]         = useState([]);
    const [total, setTotal]       = useState(0);
    const [loading, setLoading]   = useState(true);
    const [page, setPage]         = useState(1);
    const [searchInput, setSI]    = useState("");
    const [search, setSearch]     = useState("");
    const [filterStatus, setFS]   = useState("");
    const [filterType, setFT]     = useState("");
    const [filterMethod, setFM]   = useState("");
    const [showAllDates, setShowAllDates] = useState(false);
    const [toast, setToast]       = useState(null);
    const [detailId, setDetailId] = useState(null);
    const [prDocId, setPrDocId]   = useState(null);
    const [poId, setPoId]         = useState(null);
    const [approvalCount, setAC]  = useState(0);

    const LIMIT = 10;

    // period hook — scope sesuai mode (approval & all & ga-review & finance-review & payment tidak pakai period)
    const periodScope = (mode === "approval" || mode === "ga-review" || mode === "finance-review" || mode === "payment") ? "me" : (mode === "all" ? "all" : mode);
    const period      = useCutoffPeriod(periodScope);
    const usePeriod   = mode !== "approval" && mode !== "ga-review" && mode !== "finance-review" && mode !== "payment";

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // reset page saat mode / period berubah
    useEffect(() => { setPage(1); setShowAllDates(false); }, [mode]);
    useEffect(() => { if (!showAllDates) setPage(1); }, [period.dateFrom, period.dateTo]);

    // ── load list ────────────────────────────────────────────────────────────
    const loadList = useCallback(async (silent = false) => {
        if (usePeriod && !showAllDates && !period.dateFrom) return;
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (search)       params.set("search",    search);
            if (filterStatus) params.set("status",    filterStatus);
            if (filterType)   params.set("type",      filterType);
            if (filterMethod) params.set("payment_method", filterMethod);
            if (usePeriod && !showAllDates) {
                params.set("date_from", period.dateFrom);
                params.set("date_to",   period.dateTo);
            }

            const endpoints = {
                department: "/pengajuan/department",
                me:         "/pengajuan/me",
                approval:   "/pengajuan/approval",
                all:        "/pengajuan/all",
                "ga-review":"/pengajuan/ga-review",
                "finance-review": "/pengajuan/finance-review",
                "payment":  "/pengajuan/payment-pending",
            };
            const d = await api(`${endpoints[mode]}?${params}`);
            setData(d.data || []);
            setTotal(d.total ?? (d.data?.length ?? 0));
        } catch (err) {
            if (!silent) showToast("error", err.message || "Gagal memuat data");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [mode, page, search, filterStatus, filterType, filterMethod, usePeriod, showAllDates, period.dateFrom, period.dateTo]);

    useEffect(() => { loadList(); }, [loadList]);

    // ── Auto-refresh setiap 5 detik (silent — tanpa spinner) ─────────────
    useEffect(() => {
        const interval = setInterval(() => { loadList(true); }, 5000);
        return () => clearInterval(interval);
    }, [loadList]);

    // approval badge count
    useEffect(() => {
        if (!isSpvUp) return;
        (async () => {
            try {
                const d = await api("/pengajuan/approval");
                setAC((d.data || []).length);
            } catch { /* ignore */ }
        })();
    }, [isSpvUp, mode]);

    // GA review badge count
    const [gaReviewCount, setGaRC] = useState(0);
    useEffect(() => {
        if (!isGAOnly) return;
        (async () => {
            try {
                const d = await api("/pengajuan/ga-review");
                setGaRC((d.data || []).length);
            } catch { /* ignore */ }
        })();
    }, [isGAOnly, mode]);

    // Finance review badge count
    const [finReviewCount, setFinRC] = useState(0);
    const [payPendingCount, setPayPC] = useState(0);
    useEffect(() => {
        if (!isFinanceOnly) return;
        (async () => {
            try {
                const [fr, pp] = await Promise.all([
                    api("/pengajuan/finance-review"),
                    api("/pengajuan/payment-pending"),
                ]);
                setFinRC((fr.data || []).length);
                setPayPC((pp.data || []).length);
            } catch { /* ignore */ }
        })();
    }, [isFinanceOnly, mode]);

    const handleDelete = async (id) => {
        if (!confirm("Hapus pengajuan ini?")) return;
        try {
            await api(`/pengajuan/${id}`, { method: "DELETE" });
            showToast("success", "Pengajuan dihapus");
            loadList();
        } catch (err) { showToast("error", err.message); }
    };

    const handleExportExcel = () => {
        if (!data.length) return showToast("error", "Tidak ada data untuk diexport");
        exportPengajuanExcel({
            records: data,
            periodLabel: period.periodLabel || "",
            filters: {
                type: filterType || null,
                status: filterStatus || null,
                payment_method: filterMethod || null,
            },
        });
        showToast("success", "File Excel berhasil diunduh");
    };

    const totalPages  = Math.ceil(total / LIMIT) || 1;
    const isDept      = mode === "department";
    const isMe        = mode === "me";
    const isApproval  = mode === "approval";
    const isAll       = mode === "all";
    const isGaReview  = mode === "ga-review";
    const isFinReview = mode === "finance-review";
    const isPayment   = mode === "payment";

    // ── titik mode: label & deskripsi ────────────────────────────────────────
    const modeLabels = {
        department:       { title: "Pengajuan Departemen",  desc: "Seluruh pengajuan rekan sedepartemen" },
        me:               { title: "Pengajuan Saya",        desc: "Riwayat & progress pengajuan saya" },
        approval:         { title: "Daftar Approval",       desc: "Pengajuan yang menunggu persetujuan Anda" },
        all:              { title: "Semua Pengajuan",       desc: "Seluruh pengajuan semua karyawan" },
        "ga-review":      { title: "Review GA",             desc: "Pengajuan yang menunggu persetujuan GA" },
        "finance-review": { title: "Finance Approval",      desc: "Pengajuan yang menunggu persetujuan SPV Finance" },
        "payment":        { title: "Proses Pembayaran",     desc: "Pengajuan yang menunggu pembayaran" },
    };

    return (
        <div className="p-6 space-y-5">
            <Toast toast={toast} />

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-lg font-bold text-slate-800">{modeLabels[mode].title}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{modeLabels[mode].desc}</p>
                </div>
                <div className="flex items-center gap-2">
                    {isAll && (
                        <button onClick={handleExportExcel}
                            className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition">
                            <HiOutlineArrowDownTray className="h-4 w-4" />
                            <span className="hidden sm:inline">Export Excel</span>
                        </button>
                    )}
                    <button onClick={() => navigate("/pengajuan-alora/form")}
                        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm">
                        <HiOutlinePlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Buat Pengajuan</span>
                    </button>
                </div>
            </div>

            {/* ── Mode tabs ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* All — Finance / GA only */}
                {isGAFinance && (
                    <button onClick={() => setMode("all")}
                        className={cn(
                            "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                            isAll
                                ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        <HiOutlineGlobeAlt className="h-4 w-4" />
                        All
                    </button>
                )}

                {/* Semua Departemen */}
                <button onClick={() => setMode("department")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                        isDept
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}>
                    <HiOutlineUserGroup className="h-4 w-4" />
                    <span className="hidden sm:inline">Departemen</span>
                    <span className="sm:hidden">Departemen</span>
                </button>

                {/* Pengajuan Saya */}
                <button onClick={() => setMode("me")}
                    className={cn(
                        "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                        isMe
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}>
                    <HiOutlineUser className="h-4 w-4" />
                    Pengajuan Saya
                </button>

                {/* Approval — hanya SPV+ */}
                {isSpvUp && (
                    <button onClick={() => setMode("approval")}
                        className={cn(
                            "relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                            isApproval
                                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
                        Approval
                        {!isApproval && approvalCount > 0 && (
                            <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none min-w-[18px]">
                                {approvalCount}
                            </span>
                        )}
                    </button>
                )}

                {/* GA Review — hanya GA */}
                {isGAOnly && (
                    <button onClick={() => setMode("ga-review")}
                        className={cn(
                            "relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                            isGaReview
                                ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        <HiOutlineDocumentText className="h-4 w-4" />
                        GA Review
                        {!isGaReview && gaReviewCount > 0 && (
                            <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none min-w-[18px]">
                                {gaReviewCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Finance Review — hanya Finance */}
                {isFinanceOnly && (
                    <button onClick={() => setMode("finance-review")}
                        className={cn(
                            "relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                            isFinReview
                                ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        <HiOutlineClipboardDocumentCheck className="h-4 w-4" />
                        Finance
                        {!isFinReview && finReviewCount > 0 && (
                            <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none min-w-[18px]">
                                {finReviewCount}
                            </span>
                        )}
                    </button>
                )}

                {/* Payment Pending — hanya Finance */}
                {isFinanceOnly && (
                    <button onClick={() => setMode("payment")}
                        className={cn(
                            "relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
                            isPayment
                                ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        <HiOutlineCreditCard className="h-4 w-4" />
                        Pembayaran
                        {!isPayment && payPendingCount > 0 && (
                            <span className="rounded-full bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none min-w-[18px]">
                                {payPendingCount}
                            </span>
                        )}
                    </button>
                )}
            </div>

            {/* ── Period filter (tidak tampil untuk approval & ga-review & finance-review & payment) ── */}
            {!isApproval && !isGaReview && !isFinReview && !isPayment && (
                <div className="flex items-center gap-3 flex-wrap">
                    {!showAllDates && <PeriodFilter period={period} />}
                    <button onClick={() => { setShowAllDates(prev => !prev); setPage(1); }}
                        className={cn(
                            "rounded-xl border px-3.5 py-2 text-xs font-semibold transition",
                            showAllDates
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}>
                        {showAllDates ? "✓ Semua Periode" : "Tampilkan Semua"}
                    </button>
                </div>
            )}

            {/* ── Search + filters ── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={searchInput} onChange={e => setSI(e.target.value)}
                        placeholder={isDept || isAll || isGaReview ? "Cari nama barang, kode, atau nama pengaju..." : "Cari nama barang / kode pengajuan..."}
                        className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition" />
                </div>
                <select value={filterType} onChange={e => { setFT(e.target.value); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                    <option value="">Semua Tipe</option>
                    <option value="pengajuan">Pengajuan</option>
                    <option value="reimburse">Reimburse</option>
                </select>
                <select value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                    <option value="">Semua Status</option>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) =>
                        <option key={k} value={k}>{v.label}</option>
                    )}
                </select>
                {isAll && (
                    <select value={filterMethod} onChange={e => { setFM(e.target.value); setPage(1); }}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                        <option value="">Semua Metode</option>
                        <option value="cash">Cash</option>
                        <option value="kredit">Kredit</option>
                    </select>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                        <HiOutlineClipboardDocumentList className="h-10 w-10 text-slate-300" />
                        <p className="text-sm text-slate-400">
                            {isApproval ? "Tidak ada pengajuan menunggu approval"
                            : isGaReview ? "Tidak ada pengajuan menunggu review GA"
                            : isFinReview ? "Tidak ada pengajuan menunggu approval Finance"
                            : isPayment ? "Tidak ada pengajuan menunggu pembayaran"
                            : "Belum ada pengajuan"}
                        </p>
                        {!isApproval && period.rangeLabelShort && (
                            <p className="text-[11px] text-slate-300">{period.rangeLabelShort}</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pengajuan</th>
                                    {/* kolom pengaju: tampil jika dept atau approval atau all atau ga-review atau finance-review atau payment */}
                                    {(isDept || isApproval || isAll || isGaReview || isFinReview || isPayment) && (
                                        <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Pengaju</th>
                                    )}
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Tipe</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Estimasi</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Metode</th>
                                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Tanggal</th>
                                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.map(row => {
                                    // edit/hapus hanya di mode "me" dan status yang boleh
                                    const editable = isMe && [1, 2, 9].includes(Number(row.status));
                                    return (
                                        <tr key={row.pr_id}
                                            onClick={() => setDetailId(row.pr_id)}
                                            className="hover:bg-emerald-50/30 transition-colors cursor-pointer">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                        row.type === "reimburse" ? "bg-teal-50 text-teal-600" : "bg-emerald-50 text-emerald-600"
                                                    )}>
                                                        {row.type === "reimburse"
                                                            ? <HiOutlineCreditCard className="h-4 w-4" />
                                                            : <HiOutlineDocumentPlus className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{toTitleCase(row.nama_barang)}</p>
                                                        <p className="text-[11px] text-slate-400 truncate">{row.pr_code} · {row.qty} {row.satuan_name || ""}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {(isDept || isApproval || isAll || isGaReview || isFinReview || isPayment) && (
                                                <td className="px-5 py-4 hidden md:table-cell">
                                                    <p className="text-sm text-slate-700">{toTitleCase(row.pengaju_name) || "—"}</p>
                                                    <p className="text-[11px] text-slate-400">{toTitleCase(row.department_name) || ""}</p>
                                                </td>
                                            )}

                                            <td className="px-5 py-4 hidden sm:table-cell">
                                                <span className={cn(
                                                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                                    row.type === "reimburse"
                                                        ? "bg-teal-50 text-teal-700 border-teal-200"
                                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                )}>
                                                    {row.type === "reimburse" ? "Reimburse" : "Pengajuan"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <span className="text-sm font-semibold text-emerald-700">
                                                    {row.estimasi_harga ? formatRp(row.estimasi_harga) : "—"}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4">
                                                <StatusBadge status={Number(row.status)} row={row} />
                                            </td>

                                            <td className="px-5 py-4 hidden lg:table-cell">
                                                {row.payment_method ? (
                                                    <div>
                                                        <span className={cn(
                                                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                                            row.payment_method === "kredit"
                                                                ? "bg-violet-50 text-violet-700 border-violet-200"
                                                                : "bg-slate-50 text-slate-600 border-slate-200"
                                                        )}>
                                                            {row.payment_method === "kredit" ? "Kredit" : "Cash"}
                                                        </span>
                                                        {row.payment_method === "kredit" && row.jatuh_tempo && (
                                                            <p className="text-[10px] text-slate-400 mt-0.5">JT: {formatDate(row.jatuh_tempo)}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-slate-300">—</span>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 hidden lg:table-cell">
                                                <span className="text-sm text-slate-500">{formatDate(row.tanggal_pengajuan)}</span>
                                            </td>

                                            <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => setDetailId(row.pr_id)}
                                                        title="Lihat detail"
                                                        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
                                                        <HiOutlineEye className="h-4 w-4" />
                                                    </button>
                                                    {/* PR (Purchase Request) — hanya GA & Finance, status >= 2 (bukan 9) */}
                                                    {isGAFinance && [2, 3, 4, 5, 6, 7].includes(Number(row.status)) && (
                                                        <button
                                                            onClick={() => setPrDocId(row.pr_id)}
                                                            title="Lihat / Cetak PR"
                                                            className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-600 hover:bg-indigo-100 transition">
                                                            <HiOutlineDocumentText className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {/* PO (Purchase Order) — hanya GA & Finance, status >= 4 (bukan 9) */}
                                                    {isGAFinance && [4, 5, 6, 7].includes(Number(row.status)) && (
                                                        <button
                                                            onClick={() => setPoId(row.pr_id)}
                                                            title="Lihat / Cetak PO"
                                                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100 transition">
                                                            <HiOutlineReceiptRefund className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {editable && (
                                                        <>
                                                            <button
                                                                onClick={() => navigate(`/pengajuan-alora/form?id=${row.pr_id}`)}
                                                                title="Edit"
                                                                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 transition">
                                                                <HiOutlinePencilSquare className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(row.pr_id)}
                                                                title="Hapus"
                                                                className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition">
                                                                <HiOutlineTrash className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* pagination — approval, ga-review, finance-review, payment tidak paginasi */}
                {!isApproval && !isGaReview && !isFinReview && !isPayment && totalPages > 1 && (
                    <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/50">
                        <p className="text-xs text-slate-500">
                            Halaman <span className="font-bold text-slate-700">{page}</span> dari{" "}
                            <span className="font-bold text-slate-700">{totalPages}</span>
                            <span className="ml-1.5 text-slate-400">({total} data)</span>
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

            {/* Detail modal */}
            <PengajuanDetailModal
                open={!!detailId}
                prId={detailId}
                onClose={() => setDetailId(null)}
                onChanged={loadList}
                currentEmployee={currentEmployee}
            />

            {/* PR modal (status 4) */}
            <PRModal
                open={!!prDocId}
                prId={prDocId}
                onClose={() => setPrDocId(null)}
            />

            {/* PO modal (status 5+) */}
            <POModal
                open={!!poId}
                prId={poId}
                onClose={() => setPoId(null)}
            />
        </div>
    );
}
