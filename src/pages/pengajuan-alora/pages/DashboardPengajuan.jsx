import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import {
    HiOutlineDocumentPlus,
    HiOutlineCreditCard,
    HiOutlineArrowRight,
    HiOutlineBuildingOffice2,
    HiOutlineBuildingStorefront,
    HiOutlineBriefcase,
    HiOutlineExclamationTriangle,
    HiOutlineMagnifyingGlass,
    HiOutlineCalendarDays,
    HiOutlineBanknotes,
} from "react-icons/hi2";
import PengajuanDetailModal from "../components/PengajuanDetailModal";
import InstallmentPaymentModal from "../components/InstallmentPaymentModal";
import CheckboxFilter from "../components/CheckboxFilter";
import ClassificationPanel from "../components/ClassificationPanel";
import useCutoffPeriod from "../utils/useCutoffPeriod";


function cn(...c) { return c.filter(Boolean).join(" "); }

// Title Case helper — konsistensi tampilan nama
const toTitleCase = (str) => {
    if (!str) return str;
    return String(str)
        .toLowerCase()
        .replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase());
};

export const STATUS_CONFIG = {
    1: { label: "Telah Diajukan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    2: { label: "Disetujui Supervisor", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    3: { label: "Disetujui Direktur", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    4: { label: "PR Ready", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    5: { label: "Menunggu Bayar", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    6: { label: "Terbayar", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    7: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    9: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const STATUS_FILTER_OPTIONS = [
    { key: "done", label: "Terbayar + Selesai", statuses: "6,7" },
    ...[1, 2, 3, 4, 5, 6, 7, 9].map((s) => ({
        key: String(s),
        label: STATUS_CONFIG[s].label,
        statuses: String(s),
    })),
    { key: "all", label: "Semua Status", statuses: "1,2,3,4,5,6,7,9" },
];


const DEFAULT_STATUS_FILTER = "done";

// Status yang sudah berarti uang keluar; selain ini nominal PR hanya perkiraan.
export const PAID_STATUS_KEYS = ["done", "7", "6"];


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

// Outlet hanya berlaku untuk company ini (sama dengan WASCHEN_COMPANY_ID di backend)
const WASCHEN_COMPANY_ID = 5;
const CLS_LIMIT = 5;      // klasifikasi per halaman
const REFRESH_MS = 30000;  // query per klasifikasi lebih berat dari list biasa

const EMPTY_SUMMARY = {
    pengajuan: { count: 0, nominal: 0 },
    reimburse: { count: 0, nominal: 0 },
    grandTotal: 0,
};
const EMPTY_CREDIT = { totalTarget: 0, totalPaid: 0, totalSisa: 0, countAll: 0, countUnpaid: 0, countPaid: 0 };

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconText, onClick, active, large }) {
    const Component = onClick ? "button" : "div";
    return (
        <Component
            onClick={onClick}
            className={cn(
                "bg-white rounded-2xl border shadow-lg shadow-slate-300/40 flex items-start gap-4 text-left w-full transition",
                large ? "p-4" : "p-5",
                onClick && "cursor-pointer hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0",
                active ? "border-cyan-400 ring-2 ring-cyan-200" : "border-slate-200/80",
            )}
        >
            <div className={cn("flex shrink-0 items-center justify-center rounded-xl", large ? "h-10 w-10" : "h-11 w-11", iconBg)}>
                <Icon className={cn(large ? "h-5 w-5" : "h-5 w-5", iconText)} />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</p>
                <p className={cn("font-bold text-slate-800 mt-1.5 leading-none tabular-nums", large ? "text-lg sm:text-xl" : "text-2xl")}>{value}</p>
                {sub && <p className="text-xs text-slate-500 mt-1.5">{sub}</p>}
            </div>
        </Component>
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
    const isFinanceOrGA = isFinanceOrGAPosition(currentEmployee?.position_name) || Number(currentEmployee?.job_level_id) === 1;
    const myDeptName = currentEmployee?.department_name ?? "—";

    // ── Opsi filter + pilihan user ───────────────────────────────────────
    // Pilihan: null = semua terpilih (tidak ada filter terkirim), array = id terpilih.
    const [departments, setDepartments] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [outlets, setOutlets] = useState([]);
    const [deptSel, setDeptSel] = useState(null);
    const [compSel, setCompSel] = useState(null);
    const [outSel, setOutSel] = useState(null);

    useEffect(() => {
        let cancel = false;
        const load = async (path) => {
            try { return (await api(path)).data || []; } catch { return []; }
        };
        (async () => {
            const [c, o, d] = await Promise.all([
                load("/pengajuan/companies"),
                load("/pengajuan/outlets"),
                isFinanceOrGA ? load("/pengajuan/departments") : Promise.resolve([]),
            ]);
            if (cancel) return;
            setCompanies(c);
            setOutlets(o);
            setDepartments(d);
        })();
        return () => { cancel = true; };
    }, [isFinanceOrGA]);

    const deptOptions = useMemo(
        () => departments.map(d => ({ value: d.department_id, label: d.department_name })), [departments]);
    const compOptions = useMemo(
        () => companies.map(c => ({ value: c.company_id, label: c.company_name })), [companies]);
    const outOptions = useMemo(
        () => outlets.map(o => ({ value: o.outlet_id, label: o.name })), [outlets]);

    const waschenOn = compSel === null || (Array.isArray(compSel) && compSel.includes(WASCHEN_COMPANY_ID));

    // ── Cutoff period — satu state, berlaku untuk SEMUA section ──────────
    const period = useCutoffPeriod("department", { departmentId: isFinanceOrGA ? "all" : null });

    // ── "Tampilkan Semua" — disable filter periode sama sekali ──────────
    const [showAllDates, setShowAllDates] = useState(false);

    // ── Search + dropdown tipe & status (panel klasifikasi) ──────────────
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
    const statusOption = STATUS_FILTER_OPTIONS.find(o => o.key === statusFilter) || STATUS_FILTER_OPTIONS[0];

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    // ── Query string scope + periode (departemen/company/outlet/tanggal) ─
    // Dipakai endpoint kredit; kartu & panel klasifikasi menambah status/tipe/search di atasnya.
    const baseQuery = useMemo(() => {
        const p = new URLSearchParams();
        const setIfSubset = (key, sel, opts) => {
            if (sel !== null && opts.length && sel.length < opts.length) p.set(key, sel.join(","));
        };
        if (isFinanceOrGA) setIfSubset("department_ids", deptSel, deptOptions.map(o => o.value));
        setIfSubset("company_ids", compSel, compOptions.map(o => o.value));
        if (waschenOn) setIfSubset("outlet_ids", outSel, outOptions.map(o => o.value));
        if (!showAllDates && period.dateFrom) {
            p.set("date_from", period.dateFrom);
            p.set("date_to", period.dateTo);
        }
        return p.toString();
    }, [isFinanceOrGA, deptSel, compSel, outSel, waschenOn, deptOptions, compOptions, outOptions,
        showAllDates, period.dateFrom, period.dateTo]);

    // Query lengkap untuk kartu + panel klasifikasi (tanpa page/sort)
    const filterQuery = useMemo(() => {
        const p = new URLSearchParams(baseQuery);
        p.set("statuses", statusOption.statuses);
        if (typeFilter) p.set("type", typeFilter);
        if (search) p.set("search", search);
        return p.toString();
    }, [baseQuery, statusOption, typeFilter, search]);

    const periodReady = showAllDates || !!period.dateFrom;

    // ── Auto-refresh tick (berlaku untuk klasifikasi + kredit) ───────────
    const [refreshTick, setRefreshTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setRefreshTick(t => t + 1), REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    // ── Data per klasifikasi + ringkasan kartu ───────────────────────────
    const [clsSort, setClsSort] = useState("desc");
    const [clsPage, setClsPage] = useState(1);
    const [cls, setCls] = useState({ data: [], total: 0, summary: EMPTY_SUMMARY });
    const [clsLoading, setClsLoading] = useState(true);
    const [clsLoaded, setClsLoaded] = useState(false); // first-load flag
    const [clsErr, setClsErr] = useState(null);

    // kembali ke halaman 1 saat filter / urutan berubah
    useEffect(() => { setClsPage(1); }, [filterQuery, clsSort]);

    useEffect(() => {
        if (!periodReady) return;
        let cancel = false;
        (async () => {
            // Spinner hanya pada first load; polling berikutnya silent.
            if (!clsLoaded) setClsLoading(true);
            setClsErr(null);
            try {
                const p = new URLSearchParams(filterQuery);
                p.set("page", String(clsPage));
                p.set("limit", String(CLS_LIMIT));
                p.set("sort", clsSort);
                const d = await api(`/pengajuan/by-classification?${p}`);
                if (cancel) return;
                setCls({ data: d.data || [], total: d.total || 0, summary: d.summary || EMPTY_SUMMARY });
                setClsLoaded(true);
            } catch (e) {
                if (!cancel) setClsErr(e.message || "Gagal memuat ringkasan");
            } finally {
                if (!cancel) setClsLoading(false);
            }
        })();
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterQuery, clsPage, clsSort, refreshTick, periodReady]);

    // ── Total Kredit (khusus finance/GA, dari endpoint credit) ───────────
    const [creditSummary, setCreditSummary] = useState(EMPTY_CREDIT);
    const [creditLoading, setCreditLoading] = useState(false);
    const [creditData, setCreditData] = useState([]);

    // ── View toggle: "summary" (default) | "credit" — only finance/GA ────
    const [view, setView] = useState("summary");
    const [creditFilter, setCreditFilter] = useState("unpaid");
    const [creditSearch, setCreditSearch] = useState("");
    const [creditSearchInput, setCSI] = useState("");

    const [detailId, setDetailId] = useState(null);
    const [installmentId, setInstallmentId] = useState(null);

    // kartu Total Kredit mengikuti filter yang sama
    useEffect(() => {
        if (!isFinanceOrGA || !periodReady) return;
        let cancel = false;
        (async () => {
            try {
                const d = await api(`/pengajuan/credit?${baseQuery}`);
                if (!cancel) setCreditSummary(d.summary || EMPTY_CREDIT);
            } catch { /* ignore */ }
        })();
        return () => { cancel = true; };
    }, [isFinanceOrGA, baseQuery, refreshTick, periodReady]);

    // ── Load credit list (only when view === "credit") ───────────────────
    useEffect(() => {
        const t = setTimeout(() => setCreditSearch(creditSearchInput), 400);
        return () => clearTimeout(t);
    }, [creditSearchInput]);

    const loadCredit = useCallback(async (silent = false) => {
        if (view !== "credit" || !isFinanceOrGA || !periodReady) return;
        if (!silent) setCreditLoading(true);
        try {
            const params = new URLSearchParams(baseQuery);
            if (creditFilter) params.set("status", creditFilter);
            if (creditSearch) params.set("search", creditSearch);
            const d = await api(`/pengajuan/credit?${params}`);
            setCreditData(d.data || []);
            setCreditSummary(d.summary || EMPTY_CREDIT);
        } catch {
            if (!silent) setCreditData([]);
        } finally {
            if (!silent) setCreditLoading(false);
        }
    }, [view, isFinanceOrGA, periodReady, creditFilter, creditSearch, baseQuery]);

    useEffect(() => { loadCredit(); }, [loadCredit]);

    useEffect(() => {
        if (view !== "credit") return;
        const interval = setInterval(() => loadCredit(true), 5000);
        return () => clearInterval(interval);
    }, [view, loadCredit]);

    const handleChangedRefresh = () => { setRefreshTick(t => t + 1); loadCredit(true); };

    // Label departemen di pojok kanan atas
    const scopeLabel = !isFinanceOrGA
        ? myDeptName
        : deptSel === null
            ? "Semua Departemen"
            : deptSel.length === 0
                ? "Tidak ada departemen"
                : deptSel.length === 1
                    ? (departments.find(d => d.department_id === deptSel[0])?.department_name || "1 departemen")
                    : `${deptSel.length} departemen`;

    const pengajuan = cls?.summary?.pengajuan || EMPTY_SUMMARY.pengajuan;
    const reimburse = cls?.summary?.reimburse || EMPTY_SUMMARY.reimburse;

    // ── render ────────────────────────────────────────────────────────────
    if (clsLoading && !clsLoaded) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="h-7 w-7 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (clsErr && !clsLoaded) {
        return (
            <div className="p-6">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 flex items-center gap-3">
                    <HiOutlineExclamationTriangle className="h-5 w-5 shrink-0" />
                    {clsErr}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">

            {/* ── Header + Filter ── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-lg font-bold text-slate-800">Dashboard Pengajuan</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isFinanceOrGA
                                ? "Monitoring pengeluaran per klasifikasi, departemen, company & outlet"
                                : "Ringkasan pengeluaran departemen Anda per klasifikasi"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                        <HiOutlineBuildingOffice2 className="h-4 w-4" />
                        {scopeLabel}
                    </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-3 shadow-sm shadow-slate-200/50 flex flex-col gap-2.5">
                    {/* Row 1: Periode + tombol Tampilkan Semua */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0 w-28">
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

                    {/* Row 2: Filter Scope Dropdowns (Departemen, Company, Outlet) */}
                    {isFinanceOrGA && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 shrink-0 w-28">
                                <HiOutlineBuildingOffice2 className="h-4 w-4" />
                                Filter Scope:
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-1">
                                <>
                                    <CheckboxFilter
                                        label="Departemen"
                                        icon={HiOutlineBuildingOffice2}
                                        options={deptOptions}
                                        selected={deptSel}
                                        onChange={setDeptSel}
                                    />
                                    <CheckboxFilter
                                        label="Company"
                                        icon={HiOutlineBriefcase}
                                        options={compOptions}
                                        selected={compSel}
                                        onChange={setCompSel}
                                    />
                                    <CheckboxFilter
                                        label="Outlet"
                                        icon={HiOutlineBuildingStorefront}
                                        options={outOptions}
                                        selected={outSel}
                                        onChange={setOutSel}
                                        disabled={!waschenOn}
                                        hint="Aktif jika Waschen Laundry dipilih"
                                    />
                                </>
                            </div>
                        </div>)}
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", isFinanceOrGA && "xl:grid-cols-3")}>
                <StatCard icon={HiOutlineDocumentPlus} label="Pengajuan Barang"
                    value={formatRupiah(pengajuan.nominal)}
                    sub={`${pengajuan.count} pengajuan · ${statusOption.label}`}
                    iconBg="bg-emerald-100" iconText="text-emerald-700" large />
                <StatCard icon={HiOutlineCreditCard} label="Reimburse"
                    value={formatRupiah(reimburse.nominal)}
                    sub={`${reimburse.count} reimburse · ${statusOption.label}`}
                    iconBg="bg-teal-100" iconText="text-teal-700" large />
                {isFinanceOrGA && (
                    <StatCard icon={HiOutlineBanknotes} label="Total Kredit"
                        value={creditSummary.countUnpaid}
                        sub={`Sisa: ${formatRupiah(creditSummary.totalSisa)}`}
                        iconBg="bg-cyan-100" iconText="text-cyan-700"
                        onClick={() => setView(v => v === "credit" ? "summary" : "credit")}
                        active={view === "credit"} />
                )}
            </div>

            {/* ── Body: per klasifikasi (default) atau credit list view ── */}
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
                    deptName={scopeLabel}
                />
            ) : (
                <ClassificationPanel
                    data={cls.data}
                    total={cls.total}
                    page={clsPage}
                    limit={CLS_LIMIT}
                    grandTotal={cls?.summary?.grandTotal || 0}
                    loading={clsLoading}
                    sort={clsSort}
                    onSort={() => setClsSort(s => s === "desc" ? "asc" : "desc")}
                    onPage={setClsPage}
                    searchInput={searchInput}
                    onSearchInput={setSearchInput}
                    typeFilter={typeFilter}
                    onTypeFilter={setTypeFilter}
                    statusFilter={statusFilter}
                    onStatusFilter={setStatusFilter}
                    statusLabel={statusOption.label}
                    isEstimate={!PAID_STATUS_KEYS.includes(statusFilter)}
                    filterQuery={filterQuery}
                    refreshTick={refreshTick}
                    onOpenPR={setDetailId}
                    emptyHint={showAllDates
                        ? "Belum ada pengeluaran yang cocok dengan filter"
                        : `Belum ada pengeluaran pada periode ini${period.rangeLabelShort ? ` (${period.rangeLabelShort})` : ""}`}
                />
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
                            { key: "paid", label: `Lunas (${summary.countPaid || 0})` },
                            { key: "", label: `Semua (${summary.countAll || 0})` },
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
                        const paid = Number(row.total_paid) || 0;
                        const sisa = Number(row.sisa) || 0;
                        const pct = formatPct(target, paid);
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
