import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, assetUrl } from "../../lib/api";
import LoadingScreen from "../../components/LoadingScreen";
import {
    HiOutlineUsers,
    HiOutlineBriefcase,
    HiOutlineExclamationTriangle,
    HiOutlineUserMinus,
    HiOutlineClipboardDocumentList,
    HiOutlineMagnifyingGlass,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineArrowLeft,
    HiOutlineBuildingOffice2,
    HiOutlineChartBar,
    HiOutlineCalendarDays,
    HiOutlineArrowTrendingUp,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

// ── Field yang sama persis dengan ALL_FIELDS di profile/index.jsx ──────────
const COMPLETENESS_FIELDS = [
    "full_name", "email", "gender", "birth_place", "birth_date", "phone_number",
    "address", "ktp_number", "family_card_number", "religion_id", "marital_status",
    "company_id", "department_id", "position_id", "employment_status_id", "join_date",
    "contract_end_date", "education_level_id", "school_name", "bank_id",
    "bank_account_number", "bpjs_health_number", "bpjs_employment_number",
    "npwp_number", "emergency_contact", "notes", "profile_path", "ktp_path",
];

function calcCompleteness(emp) {
    const filled = COMPLETENESS_FIELDS.filter(
        (k) => String(emp[k] ?? "").trim() !== ""
    ).length;
    return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

/* ─── Completeness Bar ─── */
function CompletenessBar({ pct }) {
    const color =
        pct >= 80 ? "bg-emerald-500" :
        pct >= 50 ? "bg-amber-400"   :
                    "bg-rose-500";
    const textColor =
        pct >= 80 ? "text-emerald-700" :
        pct >= 50 ? "text-amber-700"   :
                    "text-rose-600";
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className={cn("text-xs font-bold tabular-nums w-8 shrink-0 text-right", textColor)}>
                {pct}%
            </span>
        </div>
    );
}

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, label, value, sub, accent }) {
    const a = {
        blue:    { bg: "bg-blue-500",    light: "bg-blue-50",    text: "text-blue-600",    num: "text-blue-700",    border: "border-blue-100" },
        emerald: { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", num: "text-emerald-700", border: "border-emerald-100" },
        rose:    { bg: "bg-rose-500",    light: "bg-rose-50",    text: "text-rose-600",    num: "text-rose-700",    border: "border-rose-100" },
        amber:   { bg: "bg-amber-400",   light: "bg-amber-50",   text: "text-amber-600",   num: "text-amber-700",   border: "border-amber-100" },
        violet:  { bg: "bg-violet-500",  light: "bg-violet-50",  text: "text-violet-600",  num: "text-violet-700",  border: "border-violet-100" },
    }[accent] ?? { bg: "bg-slate-400", light: "bg-slate-50", text: "text-slate-600", num: "text-slate-700", border: "border-slate-100" };

    return (
        <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col gap-4 overflow-hidden relative">
            <div className={cn("absolute top-0 left-0 right-0 h-0.5", a.bg)} />
            <div className="flex items-start justify-between">
                <div className={cn("flex items-center justify-center h-10 w-10 rounded-xl", a.light)}>
                    <Icon className={cn("w-5 h-5", a.text)} />
                </div>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", a.light, a.text, a.border)}>
                    {label}
                </span>
            </div>
            <div>
                <p className={cn("text-4xl font-black tabular-nums leading-none", a.num)}>{value ?? "—"}</p>
                {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
            </div>
        </div>
    );
}

/* ─── Bar List ─── */
function BarList({ title, icon: Icon, items, total }) {
    if (!items?.length) return null;
    const bars = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-400", "bg-rose-500", "bg-cyan-500", "bg-orange-400"];
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
                {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                <p className="text-xs font-bold tracking-widest uppercase text-slate-400">{title}</p>
            </div>
            <div className="space-y-4">
                {items.map((item, i) => {
                    const name = item.department_name ?? item.employment_status_name ?? item.company_name ?? "—";
                    const pct = total ? Math.round((item.total / total) * 100) : 0;
                    return (
                        <div key={i}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full shrink-0", bars[i % bars.length])} />
                                    <span className="text-sm text-slate-700 font-medium truncate max-w-[200px]">{name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-sm font-bold text-slate-800">{item.total}</span>
                                    <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                                </div>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-700 ease-out", bars[i % bars.length])}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Status Badge ─── */
function StatusBadge({ exitDate, contractEnd }) {
    if (exitDate) return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-[11px] font-bold text-rose-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Keluar
        </span>
    );
    if (contractEnd) {
        const days = Math.ceil((new Date(contractEnd) - new Date()) / 86400000);
        if (days <= 30 && days >= 0) return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[11px] font-bold text-amber-700">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {days} hari lagi
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Aktif
        </span>
    );
}

/* ─── Avatar ─── */
function Avatar({ src, name, size = "md" }) {
    const [err, setErr] = useState(false);
    const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    const initials = (name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const colors = ["bg-blue-100 text-blue-700", "bg-violet-100 text-violet-700", "bg-emerald-100 text-emerald-700", "bg-rose-100 text-rose-700", "bg-amber-100 text-amber-700"];
    const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
    if (src && !err) return (
        <img src={src} alt="" onError={() => setErr(true)}
            className={cn(dim, "rounded-full object-cover shrink-0 ring-2 ring-white")} />
    );
    return (
        <div className={cn(dim, "rounded-full shrink-0 ring-2 ring-white flex items-center justify-center font-bold", color)}>
            {initials}
        </div>
    );
}

const LIMIT = 20;
const selectCls = "rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition shadow-sm";

export default function MasterKaryawan() {
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingTable, setLoadingTable] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filterCompany, setFilterCompany] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [view, setView] = useState("dashboard");

    useEffect(() => {
        document.title = "Master Karyawan | Alora Group Indonesia";
        api("/employees/master-data").then((res) => {
            setCompanies(res.companies || []);
            setDepartments(res.departments || []);
        }).catch(() => { });
    }, []);

    const loadSummary = useCallback(async () => {
        setLoadingSummary(true);
        try {
            const q = filterCompany ? `?company_id=${filterCompany}` : "";
            const res = await api(`/hr/dashboard${q}`);
            setSummary(res);
        } catch (e) { console.error(e); }
        finally { setLoadingSummary(false); }
    }, [filterCompany]);

    const loadTable = useCallback(async () => {
        setLoadingTable(true);
        try {
            const params = new URLSearchParams();
            if (filterCompany) params.set("company_id", filterCompany);
            if (filterDept) params.set("department_id", filterDept);
            if (filterStatus) params.set("status", filterStatus);
            if (search) params.set("search", search);
            params.set("page", page);
            params.set("limit", LIMIT);
            const res = await api(`/hr/employees?${params}`);
            setEmployees(res.data || []);
            setTotal(res.total || 0);
        } catch (e) { console.error(e); }
        finally { setLoadingTable(false); }
    }, [filterCompany, filterDept, filterStatus, search, page]);

    useEffect(() => { loadSummary(); }, [loadSummary]);
    useEffect(() => { if (view === "list") loadTable(); }, [loadTable, view]);

    const totalPages = Math.ceil(total / LIMIT);
    const handleSearch = () => { setSearch(searchInput); setPage(1); };
    const handleFilterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

    if (loadingSummary && view === "dashboard") return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-slate-50/70">

            {/* ── HEADER ── */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="mx-auto max-w-screen-2xl px-6 lg:px-10">
                    <div className="flex items-center justify-between py-4 gap-4">
                        <div className="flex items-center gap-4">
                            <a href="/portal" className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition">
                                <HiOutlineArrowLeft className="w-4 h-4" />
                            </a>
                            <div>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    <a href="/portal" className="hover:text-blue-600 transition">Portal</a>
                                    <span className="mx-1.5">›</span>
                                    Master Karyawan
                                </p>
                                <h1 className="text-lg font-bold text-slate-900 leading-tight">Master Karyawan</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <select value={filterCompany} onChange={handleFilterChange(setFilterCompany)} className={selectCls}>
                                <option value="">Semua Cabang</option>
                                {companies.map((c) => (
                                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-0.5 -mb-px">
                        {[
                            { id: "dashboard", icon: HiOutlineChartBar, label: "Ringkasan" },
                            { id: "list", icon: HiOutlineUsers, label: "Data Karyawan" },
                        ].map(({ id, icon: Icon, label }) => (
                            <button
                                key={id}
                                onClick={() => setView(id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-150",
                                    view === id
                                        ? "text-blue-600 border-blue-600"
                                        : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200"
                                )}>
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-screen-2xl px-6 lg:px-10 py-8 space-y-6">

                {/* ══ DASHBOARD VIEW ══ */}
                {view === "dashboard" && summary && (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                            <StatCard icon={HiOutlineUsers}                 label="Total"         value={summary.total}              accent="blue"    sub={filterCompany ? "di cabang ini" : "dari semua cabang"} />
                            <StatCard icon={HiOutlineBriefcase}             label="Aktif"         value={summary.active}             accent="emerald" sub="karyawan aktif bekerja" />
                            <StatCard icon={HiOutlineUserMinus}             label="Keluar"        value={summary.resigned}           accent="rose"    sub="resign atau PHK" />
                            <StatCard icon={HiOutlineExclamationTriangle}   label="Kontrak Habis" value={summary.contract_ending}    accent="amber"   sub="dalam 30 hari ke depan" />
                            <StatCard icon={HiOutlineClipboardDocumentList} label="Tak Lengkap"   value={summary.incomplete_profile} accent="violet"  sub="profil belum diisi" />
                        </div>

                        {!filterCompany && summary.byCompany?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <div className="flex items-center gap-2 mb-6">
                                    <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400" />
                                    <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Distribusi per Cabang</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {summary.byCompany.map((c, i) => {
                                        const pct = summary.total ? Math.round((c.total / summary.total) * 100) : 0;
                                        const palette = [
                                            "from-blue-500 to-blue-600",
                                            "from-violet-500 to-violet-600",
                                            "from-emerald-500 to-emerald-600",
                                            "from-amber-400 to-amber-500",
                                            "from-rose-500 to-rose-600",
                                            "from-cyan-500 to-cyan-600",
                                        ];
                                        return (
                                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 hover:shadow-md transition-shadow duration-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate max-w-[70%]">{c.company_name ?? "—"}</p>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{pct}%</span>
                                                </div>
                                                <p className="text-3xl font-black text-slate-800 tabular-nums">{c.total}</p>
                                                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", palette[i % palette.length])}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1.5">dari {summary.total} total</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <BarList icon={HiOutlineUsers}           title="Per Departemen"         items={summary.byDepartment} total={summary.total} />
                            <BarList icon={HiOutlineArrowTrendingUp} title="Per Status Kepegawaian" items={summary.byStatus}     total={summary.total} />
                        </div>

                        {summary.recentJoins?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <HiOutlineCalendarDays className="w-4 h-4 text-slate-400" />
                                        <p className="text-xs font-bold tracking-widest uppercase text-slate-400">Bergabung Bulan Ini</p>
                                    </div>
                                    <span className="bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                                        {summary.recentJoins.length} orang baru
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {summary.recentJoins.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors">
                                            <div className="flex items-center gap-3.5">
                                                <Avatar src={null} name={e.full_name} size="sm" />
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{e.full_name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {e.position_name ?? "—"}
                                                        {e.department_name && <> · <span className="text-slate-500">{e.department_name}</span></>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-semibold text-slate-600">{e.company_name ?? "—"}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{e.join_date?.split("T")[0] ?? "—"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ══ LIST VIEW ══ */}
                {view === "list" && (
                    <>
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                            <div className="flex rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition">
                                <div className="flex items-center pl-3.5 text-slate-400">
                                    <HiOutlineMagnifyingGlass className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                    placeholder="Cari nama, email, NIK..."
                                    className="px-3 py-2.5 text-sm outline-none w-60 bg-transparent text-slate-700 placeholder:text-slate-300"
                                />
                                <button
                                    onClick={handleSearch}
                                    className="px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition">
                                    Cari
                                </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <select value={filterDept} onChange={handleFilterChange(setFilterDept)} className={selectCls}>
                                    <option value="">Semua Departemen</option>
                                    {departments.map((d) => (
                                        <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                                    ))}
                                </select>
                                <select value={filterStatus} onChange={handleFilterChange(setFilterStatus)} className={selectCls}>
                                    <option value="">Semua Status</option>
                                    <option value="active">Aktif</option>
                                    <option value="resigned">Keluar</option>
                                    <option value="contract_ending">Kontrak ≤ 30 hari</option>
                                </select>
                            </div>

                            <p className="sm:ml-auto text-sm text-slate-500">
                                <span className="font-bold text-slate-700 tabular-nums">{total}</span> karyawan ditemukan
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            {loadingTable ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                        <p className="text-sm text-slate-400">Memuat data karyawan...</p>
                                    </div>
                                </div>
                            ) : employees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                        <HiOutlineUsers className="w-7 h-7 text-slate-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-slate-600">Tidak ada data</p>
                                        <p className="text-xs text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Karyawan</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Cabang</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Departemen</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Jabatan</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Bergabung</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Kelengkapan</th>
                                                <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {employees.map((emp) => {
                                                const pct = calcCompleteness(emp);
                                                return (
                                                    <tr key={emp.employee_id} className="group hover:bg-blue-50/30 transition-colors duration-100">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3.5">
                                                                <Avatar src={emp.profile_path ? assetUrl(emp.profile_path) : null} name={emp.full_name} />
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-slate-800 truncate text-sm">{emp.full_name}</p>
                                                                    <p className="text-xs text-slate-400 truncate mt-0.5">{emp.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 hidden md:table-cell">
                                                            <span className="text-sm text-slate-600">{emp.company_name ?? "—"}</span>
                                                        </td>
                                                        <td className="px-6 py-4 hidden lg:table-cell">
                                                            <span className="text-sm text-slate-600">{emp.department_name ?? "—"}</span>
                                                        </td>
                                                        <td className="px-6 py-4 hidden lg:table-cell">
                                                            <p className="text-sm text-slate-700 font-medium">{emp.position_name ?? "—"}</p>
                                                            {emp.job_level_name && <p className="text-xs text-slate-400 mt-0.5">{emp.job_level_name}</p>}
                                                        </td>
                                                        <td className="px-6 py-4 hidden xl:table-cell">
                                                            <span className="text-sm text-slate-500 tabular-nums">{emp.join_date?.split("T")[0] ?? "—"}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <StatusBadge exitDate={emp.exit_date} contractEnd={emp.contract_end_date} />
                                                        </td>
                                                        <td className="px-6 py-4 hidden xl:table-cell">
                                                            <CompletenessBar pct={pct} />
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => navigate(`/master-karyawan/${emp.employee_id}`)}
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 px-3.5 py-2 text-xs font-semibold text-slate-500 transition-all duration-150 shadow-sm">
                                                                Lihat Detail
                                                                <HiOutlineChevronRight className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                                    <p className="text-xs text-slate-500">
                                        Halaman <span className="font-bold text-slate-700">{page}</span> dari <span className="font-bold text-slate-700">{totalPages}</span>
                                        <span className="mx-2 text-slate-300">·</span>
                                        Total <span className="font-bold text-slate-700 tabular-nums">{total}</span> data
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm">
                                            <HiOutlineChevronLeft className="w-4 h-4" />
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const pg = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                            if (pg > totalPages) return null;
                                            return (
                                                <button
                                                    key={pg}
                                                    onClick={() => setPage(pg)}
                                                    className={cn(
                                                        "flex items-center justify-center h-9 w-9 rounded-xl text-xs font-bold transition shadow-sm",
                                                        pg === page
                                                            ? "bg-blue-600 text-white border border-blue-600"
                                                            : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                    )}>
                                                    {pg}
                                                </button>
                                            );
                                        })}
                                        <button
                                            disabled={page >= totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm">
                                            <HiOutlineChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}