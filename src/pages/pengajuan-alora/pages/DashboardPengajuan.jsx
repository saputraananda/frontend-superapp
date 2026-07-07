import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import {
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineArrowRight,
    HiOutlineBuildingOffice2,
    HiOutlineExclamationTriangle,
    HiOutlineMagnifyingGlass,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineClipboardDocumentList,
    HiOutlineCalendarDays,
    HiOutlineBanknotes,
} from "react-icons/hi2";
import PengajuanDetailModal from "../components/PengajuanDetailModal";
import InstallmentPaymentModal from "../components/InstallmentPaymentModal";
import useCutoffPeriod from "../utils/useCutoffPeriod";

function cn(...c) { return c.filter(Boolean).join(" "); }

// Title Case helper — konsistensi tampilan nama
const toTitleCase = (str) => {
    if (!str) return str;
    return String(str)
        .toLowerCase()
        .replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
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

const STATUS_BAR = [
    { key: 1, label: "Diajukan",  bar: "bg-amber-400" },
    { key: 2, label: "Acc SPV",   bar: "bg-blue-400" },
    { key: 4, label: "PR Ready",  bar: "bg-indigo-400" },
    { key: 5, label: "Mng Bayar", bar: "bg-orange-400" },
    { key: 6, label: "Terbayar",  bar: "bg-cyan-500" },
    { key: 7, label: "Selesai",   bar: "bg-emerald-500" },
    { key: 9, label: "Ditolak",   bar: "bg-rose-400" },
];

const formatRupiah = (v) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
        .format(Number(v) || 0);

const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const isFinanceOrGAPosition = (positionName) => {
    if (!positionName) return false;
    const pos = String(positionName).toLowerCase();
    return pos.includes("general affair")
        || pos.includes("finance")
        || pos.includes("accounting")
        || pos.includes("accountiing");
};

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconText, onClick, active }) {
    const Component = onClick ? "button" : "div";
    return (
        <Component
            onClick={onClick}
            className={cn(
                "bg-white rounded-2xl border shadow-lg shadow-slate-300/40 p-5 flex items-start gap-4 text-left w-full transition",
                onClick && "cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                active ? "border-cyan-400 ring-2 ring-cyan-200" : "border-slate-200/80",
            )}
        >
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
                <Icon className={cn("h-5 w-5", iconText)} />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1.5 leading-none">{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
            </div>
        </Component>
    );
}

// ── StatusBreakdown ───────────────────────────────────────────────────────────
function StatusBreakdown({ title, total, byStatus }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 p-5">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-700">{title}</p>
                <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{total} total</span>
            </div>
            <div className="space-y-2.5">
                {STATUS_BAR.map(({ key, label, bar }) => {
                    const count = byStatus[key] || 0;
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                        <div key={key} className="flex items-center gap-2.5">
                            <span className="w-[68px] shrink-0 text-[11px] text-slate-500">{label}</span>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-500", bar)}
                                    style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-4 shrink-0 text-right text-[11px] font-semibold text-slate-600">{count}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const c = STATUS_CONFIG[status] ?? STATUS_CONFIG[1];
    return (
        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", c.cls)}>
            {c.label}
        </span>
    );
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function DashboardPengajuan() {
    const navigate = useNavigate();

    const userRaw = localStorage.getItem("user");
    const currentEmployee = userRaw ? (JSON.parse(userRaw)?.employee || null) : null;
    const isFinanceOrGA   = isFinanceOrGAPosition(currentEmployee?.position_name) || Number(currentEmployee?.job_level_id) === 1;

    // ── Department selector (khusus finance/GA) ──────────────────────────
    // Default = "all" (Semua Departemen) untuk Finance/GA
    const myDeptId   = currentEmployee?.department_id ?? null;
    const myDeptName = currentEmployee?.department_name ?? "—";
    const [selectedDeptId, setSelectedDeptId] = useState(isFinanceOrGA ? "all" : myDeptId);
    const [departments, setDepartments]       = useState([]);

    useEffect(() => {
        if (!isFinanceOrGA) return;
        let cancel = false;
        (async () => {
            try {
                const d = await api("/pengajuan/departments");
                if (!cancel) setDepartments(d.data || []);
            } catch { /* ignore */ }
        })();
        return () => { cancel = true; };
    }, [isFinanceOrGA]);

    // ── Cutoff period — satu state, berlaku untuk SEMUA section ──────────
    // Pass selectedDeptId supaya periode dropdown ikut ter-scope dgn
    // departemen yang dipilih (penting untuk Finance/GA "Semua Departemen").
    const period = useCutoffPeriod("department", { departmentId: selectedDeptId });

    // ── Summary state ─────────────────────────────────────────────────────
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryErr, setSummaryErr]         = useState(null);
    const [summaryLoaded, setSummaryLoaded]   = useState(false); // first-load flag
    const [summary, setSummary] = useState({
        department: { id: null, name: "—" },
        pengajuan:  { total: 0, byStatus: {}, totalNominal: 0 },
        reimburse:  { total: 0, byStatus: {}, totalNominal: 0 },
    });

    // ── Total Kredit (khusus finance/GA, dari endpoint credit) ───────────
    const [creditSummary, setCreditSummary] = useState({ totalTarget: 0, totalPaid: 0, totalSisa: 0, countAll: 0, countUnpaid: 0, countPaid: 0 });
    const [creditLoading, setCreditLoading] = useState(false);
    const [creditData, setCreditData]       = useState([]);

    // ── View toggle: "summary" (default) | "credit" — only finance/GA ────
    const [view, setView] = useState("summary");
    const [creditFilter, setCreditFilter]   = useState("unpaid");
    const [creditSearch, setCreditSearch]   = useState("");
    const [creditSearchInput, setCSI]       = useState("");

    // ── "Tampilkan Semua" — disable filter periode sama sekali ──────────
    const [showAllDates, setShowAllDates] = useState(false);

    // ── Department list state ─────────────────────────────────────────────
    const [listData, setListData]       = useState([]);
    const [listTotal, setListTotal]     = useState(0);
    const [listLoading, setListLoading] = useState(true);
    const [page, setPage]               = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch]           = useState("");
    const [filterStatus, setFS]         = useState("");
    const [filterType, setFT]           = useState("");

    const [detailId, setDetailId]               = useState(null);
    const [installmentId, setInstallmentId]     = useState(null);
    const [refreshTick, setRefreshTick]         = useState(0);
    const LIMIT = 10;

    // ── Auto-refresh tick setiap 5 detik (berlaku untuk summary + list) ──
    useEffect(() => {
        const interval = setInterval(() => setRefreshTick(t => t + 1), 5000);
        return () => clearInterval(interval);
    }, []);

    // ── Load summary (filtered by period + selectedDeptId) ────────────────
    useEffect(() => {
        // Saat showAllDates = true: tidak butuh period.dateFrom (semua periode)
        if (!showAllDates && !period.dateFrom) return;
        let cancel = false;
        (async () => {
            // Loading skeleton hanya pada first load (sebelum data pernah masuk).
            // Polling berikutnya silent supaya tidak glitch.
            if (!summaryLoaded) setSummaryLoading(true);
            setSummaryErr(null);
            try {
                const params = new URLSearchParams();
                if (!showAllDates) {
                    params.set("date_from", period.dateFrom);
                    params.set("date_to",   period.dateTo);
                }
                if (isFinanceOrGA && selectedDeptId != null && selectedDeptId !== "")
                    params.set("department_id", String(selectedDeptId));
                const d = await api(`/pengajuan/dashboard?${params}`);
                if (!cancel) {
                    setSummary({
                        department: d.department || { id: null, name: "—" },
                        pengajuan:  d.summary?.pengajuan || { total: 0, byStatus: {}, totalNominal: 0 },
                        reimburse:  d.summary?.reimburse || { total: 0, byStatus: {}, totalNominal: 0 },
                    });
                    setSummaryLoaded(true);
                }
            } catch (e) {
                if (!cancel) setSummaryErr(e.message || "Gagal memuat ringkasan");
            } finally {
                if (!cancel) setSummaryLoading(false);
            }
        })();
        return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period.dateFrom, period.dateTo, refreshTick, selectedDeptId, isFinanceOrGA, showAllDates]);

    // ── Load credit summary (khusus finance/GA, scoped per department) ───
    useEffect(() => {
        if (!isFinanceOrGA) return;
        let cancel = false;
        (async () => {
            try {
                const params = new URLSearchParams();
                if (selectedDeptId != null && selectedDeptId !== "")
                    params.set("department_id", String(selectedDeptId));
                if (!showAllDates && period.dateFrom) {
                    params.set("date_from", period.dateFrom);
                    params.set("date_to",   period.dateTo);
                }
                const d = await api(`/pengajuan/credit?${params}`);
                if (!cancel) setCreditSummary(d.summary || { totalTarget: 0, totalPaid: 0, totalSisa: 0, countAll: 0, countUnpaid: 0, countPaid: 0 });
            } catch { /* ignore */ }
        })();
        return () => { cancel = true; };
    }, [isFinanceOrGA, selectedDeptId, period.dateFrom, period.dateTo, refreshTick, showAllDates]);

    // ── Load credit list (only when view === "credit") ───────────────────
    useEffect(() => {
        const t = setTimeout(() => setCreditSearch(creditSearchInput), 400);
        return () => clearTimeout(t);
    }, [creditSearchInput]);

    const loadCredit = useCallback(async (silent = false) => {
        if (view !== "credit" || !isFinanceOrGA) return;
        if (!silent) setCreditLoading(true);
        try {
            const params = new URLSearchParams();
            if (creditFilter) params.set("status", creditFilter);
            if (creditSearch) params.set("search", creditSearch);
            if (selectedDeptId != null && selectedDeptId !== "")
                params.set("department_id", String(selectedDeptId));
            if (!showAllDates && period.dateFrom) {
                params.set("date_from", period.dateFrom);
                params.set("date_to",   period.dateTo);
            }
            const d = await api(`/pengajuan/credit?${params}`);
            setCreditData(d.data || []);
            setCreditSummary(d.summary || { totalTarget: 0, totalPaid: 0, totalSisa: 0, countAll: 0, countUnpaid: 0, countPaid: 0 });
        } catch {
            if (!silent) setCreditData([]);
        } finally {
            if (!silent) setCreditLoading(false);
        }
    }, [view, isFinanceOrGA, creditFilter, creditSearch, selectedDeptId, period.dateFrom, period.dateTo, showAllDates]);

    useEffect(() => { loadCredit(); }, [loadCredit]);

    useEffect(() => {
        if (view !== "credit") return;
        const interval = setInterval(() => loadCredit(true), 5000);
        return () => clearInterval(interval);
    }, [view, loadCredit]);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // reset page saat period / dept / showAllDates berubah
    useEffect(() => { setPage(1); }, [period.dateFrom, period.dateTo, selectedDeptId, showAllDates]);

    // ── Load department list (filtered by period + selectedDeptId) ────────
    const loadList = useCallback(async (silent = false) => {
        if (!showAllDates && !period.dateFrom) return;
        if (view !== "summary") return; // hanya saat view summary
        if (!silent) setListLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (search)       params.set("search",    search);
            if (filterStatus) params.set("status",    filterStatus);
            if (filterType)   params.set("type",      filterType);
            if (!showAllDates) {
                params.set("date_from", period.dateFrom);
                params.set("date_to",   period.dateTo);
            }
            if (isFinanceOrGA && selectedDeptId != null && selectedDeptId !== "")
                params.set("department_id", String(selectedDeptId));
            const d = await api(`/pengajuan/department?${params}`);
            setListData(d.data  || []);
            setListTotal(d.total || 0);
        } catch {
            if (!silent) setListData([]);
        } finally {
            if (!silent) setListLoading(false);
        }
    }, [view, page, search, filterStatus, filterType, period.dateFrom, period.dateTo, selectedDeptId, isFinanceOrGA, showAllDates]);

    useEffect(() => { loadList(); }, [loadList]);

    // ── Auto-refresh setiap 5 detik (silent — tanpa spinner) ─────────────
    useEffect(() => {
        if (view !== "summary") return;
        const interval = setInterval(() => { loadList(true); }, 5000);
        return () => clearInterval(interval);
    }, [view, loadList]);

    const totalPages    = Math.ceil(listTotal / LIMIT) || 1;
    const { pengajuan, reimburse } = summary;
    const pendingTotal  = (pengajuan.byStatus[1] || 0) + (pengajuan.byStatus[2] || 0)
                        + (reimburse.byStatus[1] || 0) + (reimburse.byStatus[2] || 0);
    const approvedTotal = (pengajuan.byStatus[3] || 0) + (reimburse.byStatus[3] || 0);

    const handleChangedRefresh = () => { setRefreshTick(t => t + 1); loadCredit(true); loadList(true); };

    // ── render ────────────────────────────────────────────────────────────
    if (summaryLoading && !summaryLoaded) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (summaryErr) {
        return (
            <div className="p-6">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 flex items-center gap-3">
                    <HiOutlineExclamationTriangle className="h-5 w-5 shrink-0" />
                    {summaryErr}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">

            {/* ── Header + Period Filter + (opsional) Department Selector ── */}
            <div className="flex flex-col gap-3">
                {/* top row: judul + departemen */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Dashboard Pengajuan</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isFinanceOrGA
                                ? "Monitoring pengajuan & reimburse per departemen"
                                : "Ringkasan pengajuan & reimburse departemen Anda"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <HiOutlineBuildingOffice2 className="h-4 w-4" />
                        {summary.department.name || "—"}
                    </div>
                </div>

                {/* period + (opsional) department filter — Finance/GA */}
                <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm shadow-slate-200/50 flex flex-col gap-2.5">
                    {/* Row 1: Periode + tombol Tampilkan Semua */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
                            <HiOutlineCalendarDays className="h-4 w-4" />
                            Periode Cutoff:
                        </div>
                        <select
                            value={period.selectedYear}
                            onChange={e => period.handleYearChange(e.target.value)}
                            disabled={showAllDates}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {period.years.map(y => <option key={y} value={y}>{y}</option>)}
                            {period.years.length === 0 && <option value={period.selectedYear}>{period.selectedYear}</option>}
                        </select>
                        <select
                            value={period.selectedMonth}
                            onChange={e => period.setSelectedMonth(Number(e.target.value))}
                            disabled={showAllDates}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {period.months.map(m => <option key={m} value={m}>{period.monthLabel(m)}</option>)}
                            {period.months.length === 0 && <option value={period.selectedMonth}>{period.monthLabel(period.selectedMonth)}</option>}
                        </select>
                        {!showAllDates && period.rangeLabelShort && (
                            <span className="text-[11px] text-slate-400 bg-slate-100 rounded-full px-3 py-1 hidden sm:inline">
                                {period.rangeLabelShort}
                            </span>
                        )}
                        {period.loading && (
                            <span className="text-[11px] text-slate-400 italic">memuat periode...</span>
                        )}
                        {/* Tombol Tampilkan Semua — pojok kanan */}
                        <button
                            type="button"
                            onClick={() => setShowAllDates(prev => !prev)}
                            className={cn(
                                "ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold transition shrink-0",
                                showAllDates
                                    ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {showAllDates ? "✓ Semua Periode" : "Tampilkan Semua"}
                        </button>
                    </div>

                    {/* Row 2: Department selector (khusus Finance/GA) */}
                    {isFinanceOrGA && (
                        <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0">
                                <HiOutlineBuildingOffice2 className="h-4 w-4" />
                                Departemen:
                            </div>
                            <select
                                value={selectedDeptId == null ? "" : String(selectedDeptId)}
                                onChange={e => {
                                    const v = e.target.value;
                                    if (v === "all") setSelectedDeptId("all");
                                    else if (v === "") setSelectedDeptId(null);
                                    else setSelectedDeptId(Number(v));
                                }}
                                className="flex-1 min-w-[200px] rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition"
                            >
                                <option value="all">Semua Departemen</option>
                                {myDeptId && (
                                    <option value={String(myDeptId)}>{myDeptName} (Dept Saya)</option>
                                )}
                                {departments
                                    .filter(d => d.department_id !== myDeptId)
                                    .map(d => (
                                        <option key={d.department_id} value={String(d.department_id)}>
                                            {d.department_name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Stat cards ── */}
            {(summaryLoading && !summaryLoaded) ? (
                <div className={cn("grid grid-cols-2 gap-4", isFinanceOrGA ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
                    {[...Array(isFinanceOrGA ? 5 : 4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 p-5 h-24 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className={cn("grid grid-cols-2 gap-4", isFinanceOrGA ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
                    <StatCard icon={HiOutlineDocumentPlus} label="Pengajuan Barang"
                        value={pengajuan.total}
                        sub={`${pengajuan.byStatus[3] || 0} disetujui`}
                        iconBg="bg-emerald-100" iconText="text-emerald-700" />
                    <StatCard icon={HiOutlineCreditCard} label="Reimburse"
                        value={reimburse.total}
                        sub={formatRupiah(reimburse.totalNominal)}
                        iconBg="bg-teal-100" iconText="text-teal-700" />
                    <StatCard icon={HiOutlineClock} label="Menunggu Approval"
                        value={pendingTotal} sub="perlu tindak lanjut"
                        iconBg="bg-amber-100" iconText="text-amber-700" />
                    <StatCard icon={HiOutlineCheckCircle} label="Total Disetujui"
                        value={approvedTotal} sub="lolos direktur"
                        iconBg="bg-blue-100" iconText="text-blue-700" />
                    {isFinanceOrGA && (
                        <StatCard icon={HiOutlineBanknotes} label="Total Kredit"
                            value={creditSummary.countUnpaid}
                            sub={`Sisa: ${formatRupiah(creditSummary.totalSisa)}`}
                            iconBg="bg-cyan-100" iconText="text-cyan-700"
                            onClick={() => setView(v => v === "credit" ? "summary" : "credit")}
                            active={view === "credit"} />
                    )}
                </div>
            )}

            {/* ── Body: summary view (default) atau credit list view ── */}
            {view === "credit" && isFinanceOrGA ? (
                <CreditListSection
                    data={creditData}
                    summary={creditSummary}
                    loading={creditLoading}
                    filter={creditFilter}
                    setFilter={setCreditFilter}
                    searchInput={creditSearchInput}
                    setSearchInput={setCSI}
                    onPay={(id) => setInstallmentId(id)}
                    onDetail={(id) => setDetailId(id)}
                    deptName={summary.department.name}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* breakdown bars */}
                    <div className="space-y-4">
                        <StatusBreakdown
                            title="Status Pengajuan Barang"
                            total={pengajuan.total}
                            byStatus={pengajuan.byStatus} />
                        <StatusBreakdown
                            title="Status Reimburse"
                            total={reimburse.total}
                            byStatus={reimburse.byStatus} />
                    </div>

                    {/* department list */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 flex flex-col overflow-hidden">

                        {/* list header + search/filter */}
                        <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Pengajuan Departemen</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Semua rekan sedepartemen · {listTotal} data
                                    </p>
                                </div>
                                <button onClick={() => navigate("/pengajuan-alora/list")}
                                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition shrink-0">
                                    Pengajuan Saya <HiOutlineArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1 min-w-0">
                                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <input
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        placeholder="Cari barang, kode, atau nama..."
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition" />
                                </div>
                                <select value={filterType} onChange={e => { setFT(e.target.value); setPage(1); }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                                    <option value="">Semua Tipe</option>
                                    <option value="pengajuan">Pengajuan</option>
                                    <option value="reimburse">Reimburse</option>
                                </select>
                                <select value={filterStatus} onChange={e => { setFS(e.target.value); setPage(1); }}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition">
                                    <option value="">Semua Status</option>
                                    {Object.entries(STATUS_CONFIG).map(([k, v]) =>
                                        <option key={k} value={k}>{v.label}</option>
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* list body */}
                        <div className="flex-1 overflow-y-auto">
                            {listLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                                </div>
                            ) : listData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                                    <HiOutlineClipboardDocumentList className="h-9 w-9 text-slate-200" />
                                    <p className="text-sm text-slate-400">
                                        {showAllDates ? "Belum ada pengajuan" : "Belum ada pengajuan pada periode ini"}
                                    </p>
                                    {!showAllDates && (
                                        <p className="text-[11px] text-slate-300">{period.rangeLabelShort}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {listData.map(item => (
                                        <button
                                            key={item.pr_id}
                                            onClick={() => setDetailId(item.pr_id)}
                                            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/80 transition text-left group"
                                        >
                                            <div className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                item.type === "reimburse" ? "bg-teal-50 text-teal-600" : "bg-emerald-50 text-emerald-600",
                                            )}>
                                                {item.type === "reimburse"
                                                    ? <HiOutlineCreditCard className="h-4 w-4" />
                                                    : <HiOutlineDocumentPlus className="h-4 w-4" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-emerald-700 transition">
                                                    {toTitleCase(item.nama_barang)}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {toTitleCase(item.pengaju_name) || "—"}
                                                    {" · "}{item.qty}{item.satuan_name ? ` ${item.satuan_name}` : ""}
                                                    {" · "}{formatDate(item.tanggal_pengajuan || item.created_at)}
                                                    {item.estimasi_harga ? ` · ${formatRupiah(item.estimasi_harga)}` : ""}
                                                </p>
                                            </div>
                                            <StatusBadge status={Number(item.status)} />
                                            <HiOutlineArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 transition shrink-0 ml-1" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* pagination */}
                        {totalPages > 1 && (
                            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50/50">
                                <p className="text-[11px] text-slate-400">
                                    Hal <span className="font-semibold text-slate-600">{page}</span>/{totalPages}
                                    <span className="ml-1">({listTotal} data)</span>
                                </p>
                                <div className="flex items-center gap-1">
                                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                                        className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                        <HiOutlineChevronLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                                        className="flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                                        <HiOutlineChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Quick actions ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => navigate("/pengajuan-alora/form")}
                    className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 px-5 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50 transition group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition">
                        <HiOutlineDocumentPlus className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700">Buat Pengajuan</p>
                        <p className="text-xs text-slate-500">Pengadaan barang / jasa</p>
                    </div>
                    <HiOutlineArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-emerald-500 transition" />
                </button>
                <button onClick={() => navigate("/pengajuan-alora/form?type=reimburse")}
                    className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/40 px-5 py-4 text-left hover:border-teal-300 hover:bg-teal-50 transition group">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-600 group-hover:bg-teal-200 transition">
                        <HiOutlineCreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700">Ajukan Reimburse</p>
                        <p className="text-xs text-slate-500">Penggantian biaya operasional</p>
                    </div>
                    <HiOutlineArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-teal-500 transition" />
                </button>
            </div>

            {/* ── Modals ── */}
            <PengajuanDetailModal
                open={!!detailId}
                prId={detailId}
                onClose={() => setDetailId(null)}
                onChanged={handleChangedRefresh}
                currentEmployee={currentEmployee}
            />
            <InstallmentPaymentModal
                open={!!installmentId}
                prId={installmentId}
                onClose={() => setInstallmentId(null)}
                onChanged={handleChangedRefresh}
            />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CreditListSection — list pembayaran kredit (full grid col)
// ─────────────────────────────────────────────────────────────────────────────
function CreditListSection({ data, summary, loading, filter, setFilter, searchInput, setSearchInput, onPay, onDetail, deptName }) {
    const formatPct = (target, paid) => {
        if (!target) return 0;
        return Math.min(100, Math.round((paid / target) * 100));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-300/40 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <HiOutlineBanknotes className="h-4 w-4 text-cyan-600" />
                            Pengajuan Pembayaran Kredit
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Departemen: <span className="font-semibold text-slate-600">{deptName || "—"}</span>
                            {" · "}Klik pengajuan untuk proses pelunasan
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Total Target</p>
                            <p className="text-sm font-bold text-slate-700 tabular-nums">{formatRupiah(summary.totalTarget)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Sudah Bayar</p>
                            <p className="text-sm font-bold text-emerald-700 tabular-nums">{formatRupiah(summary.totalPaid)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase">Sisa</p>
                            <p className="text-sm font-bold text-rose-600 tabular-nums">{formatRupiah(summary.totalSisa)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 min-w-0">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Cari kode PR, barang, atau pengaju..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 transition" />
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                        {[
                            { key: "unpaid", label: `Belum Lunas (${summary.countUnpaid || 0})` },
                            { key: "paid",   label: `Lunas (${summary.countPaid || 0})` },
                            { key: "",       label: `Semua (${summary.countAll || 0})` },
                        ].map(opt => (
                            <button key={opt.key}
                                onClick={() => setFilter(opt.key)}
                                className={cn(
                                    "px-3 py-1.5 rounded-md text-[11px] font-semibold transition",
                                    filter === opt.key
                                        ? "bg-white text-cyan-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700",
                                )}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <HiOutlineBanknotes className="h-10 w-10 text-slate-200" />
                    <p className="text-sm text-slate-400">Tidak ada pengajuan kredit pada filter ini</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50">
                    {data.map(row => {
                        const target = Number(row.nominal_bayar) || 0;
                        const paid   = Number(row.total_paid)    || 0;
                        const sisa   = Number(row.sisa)          || 0;
                        const pct    = formatPct(target, paid);
                        const isLunas = row.is_lunas;
                        return (
                            <div key={row.pr_id}
                                className="px-5 py-4 hover:bg-slate-50/80 transition group">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                                        <HiOutlineCreditCard className="h-4.5 w-4.5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="min-w-0">
                                                <button onClick={() => onPay(row.pr_id)}
                                                    className="text-sm font-bold text-slate-800 hover:text-cyan-700 transition text-left">
                                                    {toTitleCase(row.nama_barang)}
                                                </button>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    <span className="font-semibold text-slate-600">{row.pr_code}</span>
                                                    {" · "}{toTitleCase(row.pengaju_name)}
                                                    {row.department_name && ` · ${toTitleCase(row.department_name)}`}
                                                </p>
                                                {row.jatuh_tempo && (
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                        Jatuh tempo: <span className="font-semibold">{formatDate(row.jatuh_tempo)}</span>
                                                        {row.termin_value && row.termin_unit && (
                                                            <span> ({row.termin_value} {row.termin_unit})</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0",
                                                isLunas
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border-amber-200",
                                            )}>
                                                {isLunas ? "Lunas" : "Belum Terbayar"}
                                            </span>
                                        </div>

                                        <div className="mt-2.5">
                                            <div className="grid grid-cols-3 gap-3 text-[10px] mb-1">
                                                <div>
                                                    <p className="text-slate-400 uppercase tracking-wider">Target</p>
                                                    <p className="font-bold text-slate-700 tabular-nums">{formatRupiah(target)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 uppercase tracking-wider">Sudah Bayar</p>
                                                    <p className="font-bold text-emerald-700 tabular-nums">{formatRupiah(paid)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-400 uppercase tracking-wider">Sisa</p>
                                                    <p className={cn("font-bold tabular-nums",
                                                        sisa > 0 ? "text-rose-600" : "text-emerald-700")}>
                                                        {formatRupiah(sisa)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={cn(
                                                    "h-full rounded-full transition-all duration-500",
                                                    isLunas ? "bg-emerald-500" : "bg-cyan-500",
                                                )} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3">
                                            <button onClick={() => onPay(row.pr_id)}
                                                className={cn(
                                                    "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition flex items-center gap-1",
                                                    isLunas
                                                        ? "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                        : "bg-cyan-600 text-white hover:bg-cyan-700",
                                                )}>
                                                <HiOutlineBanknotes className="h-3.5 w-3.5" />
                                                {isLunas ? "Riwayat Pembayaran" : "Proses Pelunasan"}
                                            </button>
                                            <button onClick={() => onDetail(row.pr_id)}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition">
                                                Detail PR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
