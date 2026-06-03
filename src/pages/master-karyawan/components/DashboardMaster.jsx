import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "../../../lib/api";
import LoadingScreen from "../../../components/LoadingScreen";
import {
    HiOutlineUsers,
    HiOutlineBriefcase,
    HiOutlineExclamationTriangle,
    HiOutlineUserMinus,
    HiOutlineClipboardDocumentList,
    HiOutlineBuildingOffice2,
    HiOutlineCalendarDays,
    HiOutlineArrowTrendingUp,
    HiOutlineXMark,
    HiOutlineChartBar,
    HiOutlineAcademicCap,
    HiOutlineHeart,
    HiOutlineClock,
    HiOutlineUserGroup,
    HiOutlineArrowPath,
    HiOutlineSparkles,
} from "react-icons/hi2";
import {
    PieChart, Pie, Cell,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    AreaChart, Area,
} from "recharts";

function cn(...c) { return c.filter(Boolean).join(" "); }
const toTitleCase = (s) => (s ?? "").replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

/* ─── COLOR PALETTE (ikut absensi-ikm: blue-600 accent, white bg, slate text) ─── */
const P = {
    blue:    ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"],
    emerald: ["#059669", "#10b981", "#34d399", "#6ee7b7"],
    rose:    ["#e11d48", "#f43f5e", "#fb7185", "#fda4af"],
    amber:   ["#d97706", "#f59e0b", "#fbbf24", "#fcd34d"],
    violet:  ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"],
    mixed:   ["#2563eb", "#059669", "#d97706", "#e11d48", "#7c3aed", "#0891b2", "#db2777", "#0d9488", "#ea580c", "#65a30d"],
};

/* ─── Animated Counter ─── */
function useAnimatedCounter(target, duration = 850) {
    const [val, setVal] = useState(0);
    const startRef = useRef(null);
    const raf = useRef(null);
    useEffect(() => {
        if (target == null) return;
        const num = parseFloat(target);
        if (isNaN(num)) return;
        startRef.current = null;
        const animate = (ts) => {
            if (!startRef.current) startRef.current = ts;
            const prog = Math.min((ts - startRef.current) / duration, 1);
            const ease = 1 - Math.pow(1 - prog, 3);
            setVal(Math.round(ease * num * 10) / 10);
            if (prog < 1) raf.current = requestAnimationFrame(animate);
        };
        raf.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return val;
}

/* ─── Recharts Tooltip ─── */
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xl shadow-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">{label || payload[0].name}</p>
                {payload.map((e, i) => (
                    <p key={i} className="text-sm font-black tabular-nums" style={{ color: e.color || e.fill }}>
                        {e.value} <span className="text-xs font-semibold text-slate-400">Karyawan</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

/* ─── Stat Card (absensi-ikm style: white card, blue accent) ─── */
const CARD_CFG = {
    blue:    { top: "bg-blue-600",    icon: "bg-blue-50 text-blue-600",    num: "text-blue-700",    badge: "bg-blue-50 text-blue-600 border-blue-200" },
    emerald: { top: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-600", num: "text-emerald-700", badge: "bg-emerald-50 text-emerald-600 border-emerald-200" },
    rose:    { top: "bg-rose-500",    icon: "bg-rose-50 text-rose-600",    num: "text-rose-700",    badge: "bg-rose-50 text-rose-600 border-rose-200" },
    amber:   { top: "bg-amber-400",   icon: "bg-amber-50 text-amber-600",  num: "text-amber-700",   badge: "bg-amber-50 text-amber-600 border-amber-200" },
    violet:  { top: "bg-violet-500",  icon: "bg-violet-50 text-violet-600",num: "text-violet-700",  badge: "bg-violet-50 text-violet-600 border-violet-200" },
    slate:   { top: "bg-slate-400",   icon: "bg-slate-50 text-slate-600",  num: "text-slate-700",   badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

function StatCard({ icon: Icon, label, value, sub, accent = "blue", onClick, suffix = "" }) {
    const c = CARD_CFG[accent] ?? CARD_CFG.blue;
    const animated = useAnimatedCounter(value);
    return (
        <div
            onClick={onClick}
            className={cn(
                "group bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 overflow-hidden transition-all duration-200",
                onClick ? "cursor-pointer hover:shadow-xl hover:shadow-slate-300 hover:-translate-y-1" : "cursor-default"
            )}
        >
            {/* Top accent strip */}
            <div className={cn("h-1 w-full", c.top)} />
            <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", c.icon)}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {onClick && (
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border", c.badge)}>
                            Detail
                        </span>
                    )}
                </div>
                <p className={cn("text-4xl font-black tabular-nums leading-none", c.num)}>
                    {animated}{suffix}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1.5">{label}</p>
                {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
        </div>
    );
}

/* ─── Avatar ─── */
function Avatar({ name, size = "md" }) {
    const dim = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
    const initials = (name ?? "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    const colors = [
        "bg-blue-100 text-blue-700",
        "bg-violet-100 text-violet-700",
        "bg-emerald-100 text-emerald-700",
        "bg-rose-100 text-rose-700",
        "bg-amber-100 text-amber-700",
        "bg-cyan-100 text-cyan-700",
    ];
    const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
    return (
        <div className={cn(dim, "rounded-full shrink-0 ring-2 ring-white flex items-center justify-center font-bold shadow-md shadow-slate-200", color)}>
            {initials}
        </div>
    );
}

/* ─── Chart Section Header ─── */
function ChartHeader({ icon: Icon, title, subtitle }) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <p className="text-sm font-bold text-slate-800">{title}</p>
                {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

/* ─── Donut Card ─── */
function DonutCard({ title, subtitle, icon: Icon, data, colors, onSliceClick }) {
    const [activeIdx, setActiveIdx] = useState(null);
    const total = data.reduce((s, d) => s + d.total, 0);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6 flex flex-col">
            <ChartHeader icon={Icon} title={title} subtitle={subtitle} />
            <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data} cx="50%" cy="50%"
                            innerRadius={58} outerRadius={80}
                            paddingAngle={4} dataKey="total"
                            onMouseEnter={(_, i) => setActiveIdx(i)}
                            onMouseLeave={() => setActiveIdx(null)}
                            onClick={onSliceClick ? (entry) => onSliceClick(entry) : undefined}
                            style={onSliceClick ? { cursor: "pointer" } : {}}
                        >
                            {data.map((_, i) => (
                                <Cell
                                    key={i} fill={colors[i % colors.length]}
                                    opacity={activeIdx === null || activeIdx === i ? 1 : 0.4}
                                    stroke={activeIdx === i ? "#fff" : "transparent"}
                                    strokeWidth={2}
                                />
                            ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <p className="text-center text-xs text-slate-400 mt-1">
                Total: <span className="font-black text-slate-700">{total}</span>
                {onSliceClick && <span className="ml-2 text-[10px] text-blue-400 font-semibold">· klik segmen untuk detail</span>}
            </p>
        </div>
    );
}

/* ─── Horizontal Progress Bar Card ─── */
function HBarCard({ title, subtitle, icon: Icon, data, nameKey, onBarClick }) {
    const max = Math.max(...data.map(d => d.total), 1);
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
            <ChartHeader icon={Icon} title={title} subtitle={subtitle} />
            <div className="space-y-2.5">
                {data.slice(0, 8).map((row, i) => {
                    const pct = Math.round((row.total / max) * 100);
                    const color = P.mixed[i % P.mixed.length];
                    return (
                        <div
                            key={i}
                            onClick={onBarClick ? () => onBarClick(row) : undefined}
                            className={cn(
                                "rounded-xl p-2 -mx-2 transition-all duration-150",
                                onBarClick ? "cursor-pointer hover:bg-slate-50" : ""
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-600 truncate max-w-[65%]" title={row[nameKey]}>{row[nameKey] ?? "—"}</span>
                                <span className="text-xs font-black tabular-nums text-slate-700">{row.total}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            {onBarClick && <p className="text-[10px] text-blue-400 font-semibold mt-3 text-center">· klik baris untuk detail karyawan</p>}
        </div>
    );
}

/* ─── Modal Karyawan ─── */
function EmployeeModal({ isOpen, onClose, title, data, loading }) {
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    if (!isOpen) return null;

    const genderBadge = (g) =>
        g === "L" ? "bg-blue-50 text-blue-700 border-blue-200"
        : g === "P" ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-slate-100 text-slate-500 border-slate-200";
    const genderLabel = (g) => g === "L" ? "Laki-laki" : g === "P" ? "Perempuan" : "—";

    const modalContent = (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
                style={{ animation: "modalIn 0.25s cubic-bezier(0.32,0.72,0,1)" }}
                onClick={e => e.stopPropagation()}
            >
                <style>{`@keyframes modalIn{from{transform:scale(0.97) translateY(16px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}`}</style>

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white/95 backdrop-blur z-10 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                            <HiOutlineUsers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">{title}</h2>
                            <p className="text-xs text-slate-400">Rincian daftar karyawan</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {data.length > 0 && (
                            <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm shadow-blue-500/30">
                                {data.length} orang
                            </span>
                        )}
                        <button type="button" onClick={onClose}
                            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                            <HiOutlineXMark className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                            <p className="text-xs font-semibold text-slate-400">Memuat data...</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                                <HiOutlineUsers className="w-7 h-7 text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">Tidak ada data karyawan.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.map((emp, i) => (
                                <div key={emp.employee_id ?? i}
                                    className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={emp.full_name} size="md" />
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors" title={emp.full_name}>
                                                {toTitleCase(emp.full_name)}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                <span className="font-medium text-slate-600">{emp.position_name || "—"}</span>
                                                {emp.department_name && <> · {emp.department_name}</>}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {emp.gender && (
                                                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide", genderBadge(emp.gender))}>
                                                        {genderLabel(emp.gender)}
                                                    </span>
                                                )}
                                                {emp.employment_status_name && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wide">
                                                        {emp.employment_status_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 pl-3 space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{emp.company_name || "—"}</p>
                                        {emp.exit_date && (
                                            <p className="text-[10px] text-rose-500 font-bold flex items-center justify-end gap-1">
                                                <HiOutlineCalendarDays className="w-3 h-3" />Keluar: {emp.exit_date.split("T")[0]}
                                            </p>
                                        )}
                                        {emp.contract_end_date && !emp.exit_date && (
                                            <p className="text-[10px] text-amber-500 font-bold flex items-center justify-end gap-1">
                                                <HiOutlineCalendarDays className="w-3 h-3" />Habis: {emp.contract_end_date.split("T")[0]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Portal ke document.body agar keluar dari overflow container
    return createPortal(modalContent, document.body);
}

/* ─── Tabs ─── */
const TABS = [
    { id: "overview",   label: "Overview",     icon: HiOutlineChartBar },
    { id: "demografi",  label: "Demografi",    icon: HiOutlineUserGroup },
    { id: "organisasi", label: "Organisasi",   icon: HiOutlineBuildingOffice2 },
    { id: "trend",      label: "Trend",        icon: HiOutlineArrowTrendingUp },
];

const axisStyle = { fontSize: 11, fill: "#94a3b8" };

/* ─── MAIN ─── */
export default function DashboardMaster() {
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);
    const [companies, setCompanies] = useState([]);
    const [filterCompany, setFilterCompany] = useState("");
    const [activeTab, setActiveTab] = useState("overview");
    const [refreshing, setRefreshing] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalData, setModalData] = useState([]);
    const [loadingModal, setLoadingModal] = useState(false);

    useEffect(() => {
        api("/employees/master-data").then(res => setCompanies(res.companies || [])).catch(() => {});
    }, []);

    const loadSummary = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoadingSummary(true);
        try {
            const q = filterCompany ? `?company_id=${filterCompany}` : "";
            const res = await api(`/hr/dashboard${q}`);
            setSummary(res);
        } catch (e) { console.error(e); }
        finally { setLoadingSummary(false); setRefreshing(false); }
    }, [filterCompany]);

    useEffect(() => { loadSummary(); }, [loadSummary]);

    // openModal: accepts arbitrary filter params object
    const openModal = async (extraParams, title) => {
        setIsModalOpen(true);
        setModalTitle(title);
        setLoadingModal(true);
        try {
            const params = new URLSearchParams();
            if (filterCompany) params.set("company_id", filterCompany);
            params.set("limit", 99999);
            // merge extra filter params
            if (extraParams && typeof extraParams === "object") {
                Object.entries(extraParams).forEach(([k, v]) => { if (v != null && v !== "") params.set(k, v); });
            }
            const res = await api(`/hr/employees?${params}`);
            setModalData(res.data || []);
        } catch { setModalData([]); }
        finally { setLoadingModal(false); }
    };

    if (loadingSummary && !summary) return <LoadingScreen />;
    if (!summary) return null;

    /* prep data */
    const fmt = (arr, lk) => (arr || []).map(d => ({ name: d[lk] || "Belum Diisi", total: d.total }));

    // Gender: simpan raw value (L/P) untuk filter, display name untuk label
    const genderData = (summary.byGender || []).map(d => ({
        name:    d.gender === "L" ? "Laki-laki" : d.gender === "P" ? "Perempuan" : "Belum Diisi",
        rawName: d.gender || "Belum Diisi",
        total:   d.total,
    }));
    const maritalData    = fmt(summary.byMaritalStatus, "marital_status");
    const educationData  = fmt(summary.byEducation, "education_level_name");
    const religionData   = fmt(summary.byReligion, "religion_name");
    const jobLevelData   = fmt(summary.byJobLevel, "job_level_name");
    const departmentData = fmt(summary.byDepartment, "department_name");
    const statusData     = fmt(summary.byStatus, "employment_status_name");
    const positionData   = fmt(summary.byPosition, "position_name");
    const ageGroupData   = fmt(summary.byAgeGroup, "age_group");
    const trendData      = (summary.headcountTrend || []).map(t => ({ name: t.label, total: t.total, raw: t }));

    // Parse avg_tenure_months: MySQL ROUND() kadang mengembalikan string
    const avgTenureRaw   = parseFloat(summary.avg_tenure_months) || 0;
    const avgTenureYears = summary.avg_tenure_months != null
        ? `${Math.floor(avgTenureRaw / 12)}t ${Math.round(avgTenureRaw % 12)}b`
        : "—";
    const activeRatio = summary.total > 0 ? Math.round((summary.active / summary.total) * 100) : 0;
    const incompleteRatio = summary.total > 0 ? Math.round((summary.incomplete_profile / summary.total) * 100) : 0;

    return (
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-8 space-y-5">

            {/* ── Header Bar ── */}
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md shadow-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">HR Dashboard</span>
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Ringkasan Karyawan</h1>
                    <p className="text-xs text-slate-400 mt-0.5">Ikhtisar demografi, organisasi & tren kepegawaian</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadSummary(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition shadow-sm"
                    >
                        <HiOutlineArrowPath className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        Refresh
                    </button>
                    <select
                        value={filterCompany}
                        onChange={e => setFilterCompany(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition cursor-pointer shadow-sm"
                    >
                        <option value="">Semua Perusahaan</option>
                        {companies.map(c => (
                            <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon={HiOutlineUsers}               label="Total Karyawan"       value={summary.total}              accent="blue"    sub="seluruh perusahaan"      onClick={() => openModal({}, "Total Karyawan")} />
                <StatCard icon={HiOutlineBriefcase}           label="Aktif"                value={summary.active}             accent="emerald" sub="sedang aktif bekerja"    onClick={() => openModal({ status: "active" }, "Karyawan Aktif")} />
                <StatCard icon={HiOutlineUserMinus}           label="Keluar / Resign"      value={summary.resigned}           accent="rose"    sub="total karyawan keluar"   onClick={() => openModal({ status: "resigned" }, "Karyawan Keluar")} />
                <StatCard icon={HiOutlineExclamationTriangle} label="Habis Kontrak"        value={summary.contract_ending}    accent="amber"   sub="dalam 30 hari ke depan"  onClick={() => openModal({ status: "contract_ending" }, "Habis Kontrak")} />
                <StatCard icon={HiOutlineClipboardDocumentList} label="Profil Tak Lengkap" value={summary.incomplete_profile} accent="violet"  sub="data belum diisi"        onClick={() => openModal({ status: "incomplete_profile" }, "Profil Tidak Lengkap")} />
                <StatCard icon={HiOutlineClock}               label="Ratio Aktif"          value={activeRatio}               accent="slate"   suffix="%" sub={`dari ${summary.total} total`} />
            </div>

            {/* ── Company Composition ── */}
            {!filterCompany && summary.byCompany?.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                        <HiOutlineBuildingOffice2 className="w-40 h-40 text-slate-900" />
                    </div>
                    <ChartHeader icon={HiOutlineBuildingOffice2} title="Komposisi Perusahaan" subtitle="Distribusi karyawan per entitas" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 relative z-10">
                        {summary.byCompany.map((c, i) => {
                            const pct = summary.total ? Math.round((c.total / summary.total) * 100) : 0;
                            const color = P.mixed[i % P.mixed.length];
                            return (
                                <div
                                    key={i}
                                    onClick={() => openModal({ company_id: c.company_id }, `Karyawan ${c.company_name ?? ""}`)}
                                    className="rounded-xl border border-slate-100 bg-white p-4 hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                                    </div>
                                    <p className="text-3xl font-black text-slate-800 tabular-nums">{c.total}</p>
                                    <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">{c.company_name ?? "—"}</p>
                                    <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="flex items-center gap-1 bg-slate-100/80 border border-slate-200/60 p-1 rounded-xl overflow-x-auto w-full sm:w-auto">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150",
                            activeTab === t.id
                                ? "bg-white text-blue-600 shadow-sm border border-slate-200/60"
                                : "text-slate-500 hover:text-slate-700 hover:bg-white/70"
                        )}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ══ TAB: OVERVIEW ══ */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <DonutCard title="Status Kepegawaian" subtitle="Distribusi jenis kontrak" icon={HiOutlineBriefcase} data={statusData} colors={P.mixed}
                            onSliceClick={e => openModal({ employment_status_name: e.name }, `Status: ${e.name}`)} />
                        <DonutCard title="Jenis Kelamin" subtitle="Rasio gender karyawan" icon={HiOutlineUserGroup}
                            data={genderData} colors={[P.blue[0], "#e11d48", "#64748b"]}
                            onSliceClick={e => openModal({ gender: e.rawName ?? e.name }, `Gender: ${e.name}`)} />
                        <DonutCard title="Status Pernikahan" subtitle="Distribusi status menikah" icon={HiOutlineHeart} data={maritalData} colors={P.mixed}
                            onSliceClick={e => openModal({ marital_status: e.name }, `Menikah: ${e.name}`)} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <HBarCard title="Departemen" subtitle="Jumlah karyawan per departemen" icon={HiOutlineBuildingOffice2} data={departmentData} nameKey="name"
                            onBarClick={row => openModal({ department_name: row.name }, `Departemen: ${row.name}`)} />
                        <HBarCard title="Level Jabatan" subtitle="Distribusi grade kepegawaian" icon={HiOutlineArrowTrendingUp} data={jobLevelData} nameKey="name"
                            onBarClick={row => openModal({ job_level_name: row.name }, `Level: ${row.name}`)} />
                    </div>
                </div>
            )}

            {/* ══ TAB: DEMOGRAFI ══ */}
            {activeTab === "demografi" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Kelompok Umur */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                            <ChartHeader icon={HiOutlineUsers} title="Kelompok Umur" subtitle="Klik bar untuk detail · Distribusi usia" />
                            <div className="h-[270px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={ageGroupData} margin={{ top: 0, right: 10, left: -22, bottom: 0 }}
                                        onClick={e => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; openModal({ age_group: d.name }, `Usia: ${d.name}`); } }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
                                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff" }} />
                                        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={55} style={{ cursor: "pointer" }}>
                                            {ageGroupData.map((_, i) => <Cell key={i} fill={P.blue[i % P.blue.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pendidikan */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                            <ChartHeader icon={HiOutlineAcademicCap} title="Tingkat Pendidikan" subtitle="Klik bar untuk detail · Jenjang pendidikan" />
                            <div className="h-[270px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={educationData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                                        onClick={e => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; openModal({ education_level_name: d.name }, `Pendidikan: ${d.name}`); } }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" width={112} tick={axisStyle} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff" }} />
                                        <Bar dataKey="total" radius={[0, 5, 5, 0]} barSize={18} style={{ cursor: "pointer" }}>
                                            {educationData.map((_, i) => <Cell key={i} fill={P.violet[i % P.violet.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <DonutCard title="Agama" subtitle="Distribusi agama karyawan" icon={HiOutlineSparkles} data={religionData} colors={P.mixed}
                            onSliceClick={e => openModal({ religion_name: e.name }, `Agama: ${e.name}`)} />

                        {/* Marital detail bars — clickable */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                            <ChartHeader icon={HiOutlineHeart} title="Status Pernikahan" subtitle="Klik untuk detail · Perincian" />
                            <div className="space-y-4 mt-2">
                                {maritalData.map((d, i) => {
                                    const tot = maritalData.reduce((s, x) => s + x.total, 0);
                                    const pct = tot ? Math.round((d.total / tot) * 100) : 0;
                                    return (
                                        <div key={i}
                                            onClick={() => openModal({ marital_status: d.name }, `Menikah: ${d.name}`)}
                                            className="rounded-xl p-2 -mx-2 cursor-pointer hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-sm font-semibold text-slate-700">{d.name}</span>
                                                <span className="text-sm font-black text-slate-700 tabular-nums">
                                                    {d.total} <span className="text-xs font-semibold text-slate-400">({pct}%)</span>
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: P.mixed[i % P.mixed.length] }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TAB: ORGANISASI ══ */}
            {activeTab === "organisasi" && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Departemen */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                            <ChartHeader icon={HiOutlineBuildingOffice2} title="Komposisi Departemen" subtitle="Klik bar untuk detail" />
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={departmentData} layout="vertical" margin={{ top: 0, right: 35, left: 0, bottom: 0 }}
                                        onClick={e => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; openModal({ department_name: d.name }, `Departemen: ${d.name}`); } }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" width={115} tick={axisStyle} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff" }} />
                                        <Bar dataKey="total" radius={[0, 5, 5, 0]} barSize={20} style={{ cursor: "pointer" }}>
                                            {departmentData.map((_, i) => <Cell key={i} fill={P.mixed[i % P.mixed.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Level Jabatan */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                            <ChartHeader icon={HiOutlineArrowTrendingUp} title="Level Jabatan" subtitle="Klik bar untuk detail" />
                            <div className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={jobLevelData} margin={{ top: 0, right: 10, left: -22, bottom: 0 }}
                                        onClick={e => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; openModal({ job_level_name: d.name }, `Level: ${d.name}`); } }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
                                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff" }} />
                                        <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={50} style={{ cursor: "pointer" }}>
                                            {jobLevelData.map((_, i) => <Cell key={i} fill={P.amber[i % P.amber.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <HBarCard title="Top Posisi / Jabatan" subtitle="8 posisi terbanyak · klik untuk detail" icon={HiOutlineBriefcase} data={positionData} nameKey="name"
                        onBarClick={row => openModal({ position_name: row.name }, `Posisi: ${row.name}`)} />

                    {/* Status Kepegawaian */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                        <ChartHeader icon={HiOutlineClipboardDocumentList} title="Status Kepegawaian" subtitle="Klik bar untuk detail · Distribusi jenis kontrak" />
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData} margin={{ top: 0, right: 10, left: -22, bottom: 0 }}
                                    onClick={e => { if (e?.activePayload?.[0]) { const d = e.activePayload[0].payload; openModal({ employment_status_name: d.name }, `Status: ${d.name}`); } }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
                                    <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "#eff6ff" }} />
                                    <Bar dataKey="total" radius={[5, 5, 0, 0]} maxBarSize={55} style={{ cursor: "pointer" }}>
                                        {statusData.map((_, i) => <Cell key={i} fill={P.mixed[i % P.mixed.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ TAB: TREND ══ */}
            {activeTab === "trend" && (
                <div className="space-y-4">
                    {/* Area Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 p-6">
                        <ChartHeader icon={HiOutlineArrowTrendingUp} title="Trend Headcount (12 Bulan)" subtitle="Jumlah karyawan bergabung per bulan" />
                        {trendData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <HiOutlineChartBar className="w-10 h-10 text-slate-200" />
                                <p className="text-sm text-slate-400 font-semibold">Belum ada data trend.</p>
                            </div>
                        ) : (
                            <div className="h-[290px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} />
                                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone" dataKey="total"
                                            stroke="#2563eb" strokeWidth={2.5} fill="url(#blueGrad)"
                                            dot={{ fill: "#2563eb", r: 4, strokeWidth: 2, stroke: "#fff" }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                icon: HiOutlineClock,
                                label: "Rata-rata Masa Kerja",
                                value: avgTenureYears,
                                sub: `${summary.avg_tenure_months != null ? avgTenureRaw.toFixed(1) : "—"} bulan rata-rata`,
                                border: "border-blue-100", bg: "bg-blue-50/60", iconCls: "bg-blue-100 text-blue-600", num: "text-blue-700", label2: "text-blue-500",
                            },
                            {
                                icon: HiOutlineBriefcase,
                                label: "Karyawan Aktif",
                                value: `${activeRatio}%`,
                                sub: `${summary.active} dari ${summary.total} karyawan`,
                                border: "border-emerald-100", bg: "bg-emerald-50/60", iconCls: "bg-emerald-100 text-emerald-600", num: "text-emerald-700", label2: "text-emerald-500",
                            },
                            {
                                icon: HiOutlineExclamationTriangle,
                                label: "Profil Tak Lengkap",
                                value: `${incompleteRatio}%`,
                                sub: `${summary.incomplete_profile} karyawan perlu dilengkapi`,
                                border: "border-violet-100", bg: "bg-violet-50/60", iconCls: "bg-violet-100 text-violet-600", num: "text-violet-700", label2: "text-violet-500",
                            },
                        ].map((m, i) => (
                            <div key={i} className={cn("rounded-2xl border p-6", m.border, m.bg)}>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", m.iconCls)}>
                                        <m.icon className="w-4 h-4" />
                                    </div>
                                    <p className={cn("text-[11px] font-bold uppercase tracking-widest", m.label2)}>{m.label}</p>
                                </div>
                                <p className={cn("text-4xl font-black tabular-nums", m.num)}>{m.value}</p>
                                <p className="text-xs text-slate-400 mt-1.5">{m.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Recent Joins */}
                    {summary.recentJoins?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        <HiOutlineCalendarDays className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Bergabung Bulan Ini</p>
                                        <p className="text-[11px] text-slate-400">Karyawan baru di bulan berjalan</p>
                                    </div>
                                </div>
                                <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm shadow-blue-500/20">
                                    {summary.recentJoins.length} Karyawan Baru
                                </span>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {summary.recentJoins.map((e, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-slate-50/70 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar name={e.full_name} size="md" />
                                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{toTitleCase(e.full_name)}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    <span className="font-medium text-slate-600">{e.position_name ?? "—"}</span>
                                                    {e.department_name && <> · {e.department_name}</>}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {e.gender && (
                                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase",
                                                            e.gender === "L" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                                        )}>
                                                            {e.gender === "L" ? "Laki-laki" : "Perempuan"}
                                                        </span>
                                                    )}
                                                    {e.employment_status_name && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase">
                                                            {e.employment_status_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right mt-3 sm:mt-0 pl-14 sm:pl-0">
                                            <p className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">{e.company_name ?? "—"}</p>
                                            <p className="text-[11px] font-bold text-slate-400 mt-1.5 tabular-nums tracking-wide uppercase">
                                                Bergabung: {e.join_date?.split("T")[0] ?? "—"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Modal ── */}
            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalTitle}
                data={modalData}
                loading={loadingModal}
            />
        </div>
    );
}
