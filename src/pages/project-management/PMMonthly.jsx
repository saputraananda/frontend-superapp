// src/pages/project-management/PMMonthly.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canSupervisorUp } from "./role";
import { useNavigate, useParams } from "react-router-dom";
import {
    HiOutlineArrowLeft,
    HiOutlinePlus,
    HiOutlineChevronRight,
    HiOutlineCalendarDays,
    HiOutlineLockClosed,
    HiOutlineExclamationTriangle,
    HiOutlineInboxStack,
    HiOutlineXMark,
    HiOutlineRectangleStack,
    HiOutlineAcademicCap,
    HiOutlineBriefcase,
    HiOutlineMagnifyingGlass,
    HiOutlineAdjustmentsHorizontal,
    HiOutlineTableCells,
    HiOutlineViewColumns,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTH_FULL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const monthName = (m) => MONTH_NAMES[Number(m) - 1] || `M${m}`;
const monthFull = (m) => MONTH_FULL[Number(m) - 1] || `Bulan ${m}`;

const MONTH_CONFIGS = [
    { gradient: "from-rose-500 to-pink-500", light: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    { gradient: "from-orange-500 to-amber-500", light: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    { gradient: "from-amber-500 to-yellow-500", light: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    { gradient: "from-lime-500 to-green-500", light: "bg-lime-50", border: "border-lime-200", text: "text-lime-700" },
    { gradient: "from-emerald-500 to-teal-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    { gradient: "from-teal-500 to-cyan-500", light: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
    { gradient: "from-cyan-500 to-sky-500", light: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700" },
    { gradient: "from-sky-500 to-blue-500", light: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
    { gradient: "from-blue-500 to-indigo-500", light: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
    { gradient: "from-violet-500 to-purple-500", light: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
    { gradient: "from-purple-500 to-fuchsia-500", light: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
    { gradient: "from-pink-500 to-rose-500", light: "bg-pink-50", border: "border-pink-200", text: "text-pink-700" },
];
const monthConfig = (m) => MONTH_CONFIGS[(Number(m) - 1) % 12];

function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
}

function fmtDate(str) {
    if (!str) return "—";
    return new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function monthIdOf(x) {
    return x?.id ?? x?.monthly_id ?? x?.id_monthly ?? null;
}

export default function PMMonthly() {
    const { projectId, semesterId } = useParams();
    const nav = useNavigate();
    const employee = useMemo(() => getEmployeeFromLocal(), []);
    const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);

    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState([]);
    const [semesterData, setSemesterData] = useState(null);
    const [projectData, setProjectData] = useState(null); // ← tambah ini
    const [err, setErr] = useState("");
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(1);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("month_asc");
    const [viewMode, setViewMode] = useState("grid");

    async function load() {
        setErr("");
        setLoading(true);
        try {
            const [semRes, monthRes] = await Promise.all([
                pmApi.getSemesterDetail(semesterId),
                pmApi.listMonths(semesterId),
            ]);
            const sem = semRes?.data || null;
            setSemesterData(sem);
            setMonths(monthRes?.data || []);

            // fetch project detail untuk ambil title
            if (sem?.id_project) {
                try {
                    const projRes = await pmApi.getProjectDetail(sem.id_project);
                    setProjectData(projRes?.project || null);
                } catch {
                    // project detail not critical, silently ignore
                }
            }
        } catch (e) {
            setErr(e?.message || "Gagal memuat monthly");
        } finally {
            setLoading(false);
        }
    }

    async function create() {
        setErr("");
        const t = title.trim();
        if (!t) return setErr("Title wajib diisi.");
        if (!semesterId) return setErr("semesterId tidak ditemukan.");
        setSubmitting(true);
        try {
            await pmApi.createMonth(semesterId, { projectId, month, title: t, desc: desc.trim() });
            setOpen(false);
            setTitle("");
            setDesc("");
            await load();
        } catch (e) {
            setErr(e?.message || "Gagal membuat monthly");
        } finally {
            setSubmitting(false);
        }
    }

    const goBoard = (m) => {
        const id = monthIdOf(m);
        if (!id) { setErr("Monthly ID tidak ditemukan."); return; }
        nav(`/projectmanagement/month/${id}`, { state: { projectId, semesterId } });
    };

    useEffect(() => { load(); }, [semesterId]);

    const filtered = useMemo(() => {
        let list = [...months];
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(m => m.title?.toLowerCase().includes(q) || m.desc?.toLowerCase().includes(q));
        }
        if (sortBy === "month_asc") list.sort((a, b) => Number(a.month) - Number(b.month));
        if (sortBy === "month_desc") list.sort((a, b) => Number(b.month) - Number(a.month));
        if (sortBy === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (sortBy === "az") list.sort((a, b) => a.title?.localeCompare(b.title));
        return list;
    }, [months, search, sortBy]);

    // Semester color
    const semCfg = semesterData?.semester === 1
        ? { gradient: "from-emerald-600 to-teal-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" }
        : { gradient: "from-violet-600 to-purple-500", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" };

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Topbar ── */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <button
                        onClick={() => nav(`/projectmanagement/${projectId}`)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                        <HiOutlineArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">Project Semester</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white">
                            <HiOutlineTableCells className="h-4 w-4" />
                        </div>
                        <h1 className="text-sm font-bold text-slate-900">Monthly Projects</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-semibold text-slate-800">{employee?.full_name || "User"}</span>
                            <span className="text-[10px] text-slate-400">{isSupervisorUp ? "Supervisor" : "Staff"}</span>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                            {initials(employee?.full_name)}
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap">
                    {/* Annual title */}
                    <button onClick={() => nav("/projectmanagement")} className="hover:text-slate-700 transition">Annual</button>
                    <HiOutlineChevronRight className="h-3 w-3 shrink-0" />
                    <button
                        onClick={() => nav("/projectmanagement")}
                        className="hover:text-slate-700 transition truncate max-w-[100px]"
                        title={projectData?.title}
                    >
                        {projectData?.title ?? "Annual"}
                    </button>

                    <HiOutlineChevronRight className="h-3 w-3 shrink-0" />

                    {/* Semester title */}
                    <button
                        onClick={() => nav(`/projectmanagement/${projectId}`)}
                        className="hover:text-slate-700 transition truncate max-w-[120px]"
                        title={semesterData?.title}
                    >
                        {semesterData?.title ?? `Semester ${semesterData?.semester ?? "—"}`}
                    </button>

                    <HiOutlineChevronRight className="h-3 w-3 shrink-0" />

                    {/* Current: Monthly label */}
                    <span className="text-slate-700 font-semibold">Monthly</span>
                </div>

                {/* ── Semester Info Banner ── */}
                {semesterData && (
                    <div className={`mb-6 rounded-xl border ${semCfg.border} ${semCfg.bg} px-5 py-4`}>
                        <div className="flex items-start gap-4">
                            <div className={`h-10 w-10 rounded-lg text-white flex items-center justify-center text-sm font-extrabold shrink-0 bg-gradient-to-br ${semCfg.gradient}`}>
                                S{semesterData.semester}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h3 className={`text-sm font-bold truncate ${semCfg.text}`}>{semesterData.title}</h3>
                                    <span className={`shrink-0 inline-flex items-center rounded-md ${semCfg.bg} border ${semCfg.border} px-2 py-0.5 text-[10px] font-bold ${semCfg.text}`}>
                                        Sem {semesterData.semester} · {semesterData.semester === 1 ? "Jan–Jun" : "Jul–Des"}
                                    </span>
                                </div>
                                {semesterData.desc && (
                                    <p className={`text-xs leading-relaxed line-clamp-2 ${semCfg.text} opacity-80`}>{semesterData.desc}</p>
                                )}
                                <div className={`flex items-center gap-3 mt-2 text-[10px] ${semCfg.text} opacity-70 flex-wrap`}>
                                    <span className="flex items-center gap-1"><HiOutlineCalendarDays className="h-3 w-3" /> Dibuat {fmtDate(semesterData.created_at)}</span>
                                    <span className="flex items-center gap-1"><HiOutlineRectangleStack className="h-3 w-3" /> {months.length} Monthly</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Page Header ── */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Monthly Plans</h2>
                        <p className="text-xs text-slate-500 mt-1">Klik setiap kartu untuk masuk ke board task & progress tracking.</p>
                    </div>

                    {isSupervisorUp ? (
                        <button
                            onClick={() => { setErr(""); setOpen(true); }}
                            className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                        >
                            <HiOutlinePlus className="h-4 w-4" />
                            Buat Monthly
                        </button>
                    ) : (
                        <div className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-400">
                            <HiOutlineLockClosed className="h-3.5 w-3.5" />
                            Hanya Supervisor & BoD yang bisa membuat monthly
                        </div>
                    )}
                </div>

                {/* ── Filters ── */}
                <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Cari monthly..."
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-300 focus:bg-white transition"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <HiOutlineAdjustmentsHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-300"
                            >
                                <option value="month_asc">Bulan ↑</option>
                                <option value="month_desc">Bulan ↓</option>
                                <option value="newest">Terbaru</option>
                                <option value="az">A → Z</option>
                            </select>
                        </div>
                        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn("h-9 px-3 text-xs font-semibold transition", viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
                            >Grid</button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn("h-9 px-3 text-xs font-semibold transition border-l border-slate-200", viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100")}
                            >List</button>
                        </div>
                    </div>
                </div>

                {/* ── Error ── */}
                {err && !open && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                        <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-rose-700 font-medium">{err}</p>
                    </div>
                )}

                {/* ── Content ── */}
                {loading ? (
                    <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1")}>
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl bg-slate-200 animate-pulse" />)}
                    </div>
                ) : filtered.length ? (
                    <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1")}>
                        {filtered.map(m => {
                            const id = monthIdOf(m);
                            const cfg = monthConfig(m.month);
                            return (
                                <button key={id ?? JSON.stringify(m)} type="button" onClick={() => goBoard(m)} className="group text-left w-full">
                                    {viewMode === "grid" ? (
                                        <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200">
                                            <div className={`h-1.5 bg-gradient-to-r ${cfg.gradient}`} />
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center text-xs font-extrabold shadow-sm shrink-0`}>
                                                        {monthName(m.month)}
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-md ${cfg.light} ${cfg.border} border px-2 py-0.5 text-[10px] font-semibold ${cfg.text}`}>
                                                        Bulan {m.month}
                                                    </span>
                                                </div>

                                                <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-orange-600 transition-colors line-clamp-2 mb-1.5">
                                                    {m.title || "—"}
                                                </h3>

                                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                                                    {m.desc || <span className="italic text-slate-400">Tidak ada deskripsi.</span>}
                                                </p>

                                                {/* Creator */}
                                                {m.requestor_employee_id && (
                                                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 mb-3">
                                                        <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                            {initials(m.requestor_name || "?")}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="text-[10px] font-semibold text-slate-700 truncate">{m.requestor_name || `Emp #${m.requestor_employee_id}`}</div>
                                                            <div className="text-[9px] text-slate-400">Creator</div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                        <HiOutlineCalendarDays className="h-3 w-3" />
                                                        {monthFull(m.month)}
                                                    </div>
                                                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-orange-600 group-hover:gap-1 transition-all">
                                                        Board <HiOutlineChevronRight className="h-3 w-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // List view
                                        <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-orange-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center text-xs font-extrabold shrink-0`}>
                                                    {monthName(m.month)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors truncate">{m.title || "—"}</h3>
                                                        <span className={`shrink-0 inline-flex items-center rounded-md ${cfg.light} border ${cfg.border} px-2 py-0.5 text-[10px] font-semibold ${cfg.text}`}>
                                                            {monthFull(m.month)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate">{m.desc || "Tidak ada deskripsi."}</p>
                                                </div>
                                                <div className="shrink-0 hidden sm:flex items-center gap-3">
                                                    {m.requestor_employee_id && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold">
                                                                {initials(m.requestor_name || "?")}
                                                            </div>
                                                            <span className="hidden md:inline">{m.requestor_name || `Emp #${m.requestor_employee_id}`}</span>
                                                        </div>
                                                    )}
                                                    <HiOutlineChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-xl bg-white border border-slate-200 p-16 text-center shadow-sm">
                        <HiOutlineInboxStack className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-700">
                            {search ? "Tidak ada hasil" : "Belum ada monthly"}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {search ? "Coba ubah kata kunci pencarian." : "Supervisor dapat membuat monthly project di sini."}
                        </p>
                        {search && (
                            <button onClick={() => setSearch("")} className="mt-4 h-8 px-4 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition">
                                Reset
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modal Create ── */}
            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => !submitting && setOpen(false)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white">Buat Monthly Plan</h3>
                                <p className="text-xs text-orange-100 mt-0.5">Pilih bulan dan isi detail project</p>
                            </div>
                            <button
                                onClick={() => !submitting && setOpen(false)}
                                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                            >
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {err && (
                                <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                                    <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-rose-700">{err}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Bulan</span>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {MONTH_NAMES.map((name, i) => {
                                        const cfg = monthConfig(i + 1);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setMonth(i + 1)}
                                                disabled={submitting}
                                                className={cn(
                                                    "h-9 rounded-lg text-xs font-bold transition-all",
                                                    month === i + 1
                                                        ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-sm`
                                                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                                <input
                                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder={`Rencana ${monthFull(month)}...`}
                                    disabled={submitting}
                                    autoFocus
                                />
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</span>
                                <textarea
                                    className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition resize-none"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Target & fokus bulan ini..."
                                    disabled={submitting}
                                />
                            </label>

                            {/* Creator preview */}
                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                                    {initials(employee?.full_name)}
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-800">{employee?.full_name || "User"}</div>
                                    <div className="text-[10px] text-slate-400">Creator · {isSupervisorUp ? "Supervisor" : "Staff"}</div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => !submitting && setOpen(false)}
                                    className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    disabled={submitting}
                                >Batal</button>
                                <button
                                    type="button"
                                    onClick={create}
                                    className="h-9 px-5 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Menyimpan...
                                        </span>
                                    ) : "Buat Monthly"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}