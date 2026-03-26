// src/pages/project-management/PMMonthly.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { pmApi } from "./pmApi";
import { api } from "../../lib/api";
import { getEmployeeFromLocal, canSupervisorUp } from "./role";
import { NotifPanel } from "./components/pm/NotifPanel";
import { useNavigate, useParams } from "react-router-dom";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle, FiX, FiTrash2 } from "react-icons/fi";
import {
    HiOutlineArrowLeft,
    HiOutlineHome,
    HiOutlinePlus,
    HiOutlineChevronRight,
    HiOutlineCalendarDays,
    HiOutlineLockClosed,
    HiOutlineExclamationTriangle,
    HiOutlineInboxStack,
    HiOutlineXMark,
    HiOutlineRectangleStack,
    HiOutlineTableCells,
    HiOutlineMagnifyingGlass,
    HiOutlineAdjustmentsHorizontal,
    HiOutlinePencilSquare,
    HiOutlineTrash,
} from "react-icons/hi2";

// ─── Helpers ──────────────────────────────────────────
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

function capitalizeEachWord(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Toast System ──────────────────────────────────────
let toastListeners = [];
let toastCounter = 0;

function emitToast(t) { toastListeners.forEach(fn => fn(t)); }

const toast = {
    success: (msg) => emitToast({ type: "success", message: msg }),
    error: (msg) => emitToast({ type: "error", message: msg }),
    info: (msg) => emitToast({ type: "info", message: msg }),
    warning: (msg) => emitToast({ type: "warning", message: msg }),
};

function useToast() {
    const [toasts, setToasts] = useState([]);
    useEffect(() => {
        const handler = (t) => setToasts(prev => [...prev, { ...t, id: ++toastCounter }]);
        toastListeners.push(handler);
        return () => { toastListeners = toastListeners.filter(fn => fn !== handler); };
    }, []);
    const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    return { toasts, remove };
}

const ToastItem = ({ toast: t, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => onRemove(t.id), 4000);
        return () => clearTimeout(timer);
    }, [t.id, onRemove]);

    const configs = {
        success: { icon: <FiCheckCircle size={16} />, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon_cls: "text-emerald-600" },
        error: { icon: <FiXCircle size={16} />, bg: "bg-rose-50 border-rose-200", text: "text-rose-800", icon_cls: "text-rose-600" },
        warning: { icon: <FiAlertTriangle size={16} />, bg: "bg-amber-50 border-amber-200", text: "text-amber-800", icon_cls: "text-amber-600" },
        info: { icon: <FiInfo size={16} />, bg: "bg-blue-50 border-blue-200", text: "text-blue-800", icon_cls: "text-blue-600" },
    };
    const cfg = configs[t.type] || configs.info;

    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${cfg.bg}`}
            style={{ animation: "slideInRight 0.3s ease-out" }}>
            <span className={`shrink-0 mt-0.5 ${cfg.icon_cls}`}>{cfg.icon}</span>
            <p className={`flex-1 text-sm font-medium leading-snug ${cfg.text}`}>{t.message}</p>
            <button onClick={() => onRemove(t.id)} className={`shrink-0 opacity-50 hover:opacity-100 transition ${cfg.text}`}>
                <FiX size={14} />
            </button>
        </div>
    );
};

const ToastContainer = () => {
    const { toasts, remove } = useToast();
    if (!toasts.length) return null;
    return ReactDOM.createPortal(
        <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
            <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <ToastItem toast={t} onRemove={remove} />
                </div>
            ))}
        </div>,
        document.body
    );
};

// ─── Custom Confirm Modal ──────────────────────────────
let modalResolver = null;
let modalListeners = [];

function showModal(config) {
    return new Promise((resolve) => {
        modalResolver = resolve;
        modalListeners.forEach(fn => fn({ ...config, open: true }));
    });
}

function customConfirm(title, message, confirmLabel = "Ya, Lanjutkan", danger = true) {
    return showModal({ type: "confirm", title, message, confirmLabel, danger });
}

const ModalDialog = () => {
    const [modal, setModal] = useState({ open: false });

    useEffect(() => {
        const handler = (m) => setModal(m);
        modalListeners.push(handler);
        return () => { modalListeners = modalListeners.filter(fn => fn !== handler); };
    }, []);

    function resolve(val) {
        setModal(m => ({ ...m, open: false }));
        if (modalResolver) { modalResolver(val); modalResolver = null; }
    }

    useEffect(() => {
        function onKey(e) { if (e.key === "Escape" && modal.open) resolve(false); }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [modal.open]);

    if (!modal.open) return null;

    const iconMap = {
        danger: { icon: <FiTrash2 size={22} />, bg: "bg-rose-100", text: "text-rose-600", btn: "bg-rose-600 hover:bg-rose-700 text-white" },
        info: { icon: <FiInfo size={22} />, bg: "bg-blue-100", text: "text-blue-600", btn: "bg-blue-600 hover:bg-blue-700 text-white" },
        warning: { icon: <FiAlertTriangle size={22} />, bg: "bg-amber-100", text: "text-amber-600", btn: "bg-amber-500 hover:bg-amber-600 text-white" },
    };
    const ic = modal.danger ? iconMap.danger : iconMap.info;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[99998] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => resolve(false)}>
            <div
                className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
                style={{ animation: "modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}
                onClick={e => e.stopPropagation()}>
                <style>{`
          @keyframes modalPop {
            from { opacity: 0; transform: scale(0.85) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>
                <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
                    <div className={`h-14 w-14 rounded-2xl ${ic.bg} ${ic.text} flex items-center justify-center mb-4`}>
                        {ic.icon}
                    </div>
                    <div className="text-slate-900 font-bold text-base leading-snug mb-1.5">{modal.title}</div>
                    {modal.message && (
                        <div className="text-slate-500 text-sm leading-relaxed">{modal.message}</div>
                    )}
                </div>
                <div className="px-6 pb-6 flex gap-2.5">
                    <button type="button" onClick={() => resolve(false)}
                        className="flex-1 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold transition-all active:scale-95">
                        Batal
                    </button>
                    <button type="button" onClick={() => resolve(true)}
                        className={`flex-1 h-10 rounded-xl text-sm font-bold transition-all active:scale-95 ${ic.btn}`}>
                        {modal.confirmLabel || "Ya"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Main Component ────────────────────────────────────
export default function PMMonthly() {
    const { projectId, semesterId } = useParams();
    const nav = useNavigate();
    const employee = useMemo(() => getEmployeeFromLocal(), []);
    const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);
    const isDirektur = useMemo(() => canSupervisorUp(employee) && employee.job_level_id == 1, [employee]);

    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState([]);
    const [semesterData, setSemesterData] = useState(null);
    const [projectData, setProjectData] = useState(null);
    const [err, setErr] = useState("");
    const [open, setOpen] = useState(false);
    const [month, setMonth] = useState(1);
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("month_asc");
    const [viewMode, setViewMode] = useState("grid");

    // Edit
    const [editItem, setEditItem] = useState(null);
    const [editMonth, setEditMonth] = useState(1);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);

    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    const [showNotifs, setShowNotifs] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Click outside → tutup dropdown
    useEffect(() => {
        function handleOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    async function handleLogout() {
        try { await api("/auth/logout", { method: "POST" }); } catch { /* ignore */ }
        localStorage.removeItem("user");
        window.location.href = "/login";
    }

    async function loadNotifCount() {
        try {
            const res = await pmApi.listNotifications();
            setUnreadCount((res?.data || []).filter(n => !n.is_read).length);
        } catch { /* silent */ }
    }

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

            // ← Set title setelah data semester berhasil dimuat
            document.title = sem?.title
                ? `${sem.title} - Monthly | Project Management Alora`
                : "Monthly Plans | Project Management Alora";

            if (sem?.id_project) {
                try {
                    const projRes = await pmApi.getProjectDetail(sem.id_project);
                    setProjectData(projRes?.project || null);
                } catch (err) {
                    console.error("getProjectDetail (non-critical):", err);
                }
            }
        } catch (e) {
            console.error("load monthly error:", e);
            setErr(e?.message || "Gagal memuat monthly");
            document.title = "Monthly Plans | Project Management Alora";
        } finally {
            setLoading(false);
        }
    }

    async function create() {
        const t = title.trim();
        if (!t) { toast.error("Title wajib diisi."); return; }
        if (!semesterId) { toast.error("semesterId tidak ditemukan."); return; }
        setSubmitting(true);
        try {
            await pmApi.createMonth(semesterId, { projectId, month, title: t, desc: desc.trim() });
            setOpen(false);
            setTitle("");
            setDesc("");
            toast.success("Monthly berhasil dibuat");
            await load();
        } catch (e) {
            console.error("create monthly error:", e);
            toast.error(e?.message || "Gagal membuat monthly");
        } finally {
            setSubmitting(false);
        }
    }

    const goBoard = (m) => {
        const id = monthIdOf(m);
        if (!id) { toast.error("Monthly ID tidak ditemukan."); return; }
        nav(`/projectmanagement/month/${id}`, { state: { projectId, semesterId } });
    };

    useEffect(() => { load(); }, [semesterId]);

    useEffect(() => { load(); loadNotifCount(); }, [semesterId]);

    function openEditMonth(e, m) {
        e.stopPropagation();
        setEditItem(m);
        setEditMonth(m.month);
        setEditTitle(m.title || "");
        setEditDesc(m.desc || "");
    }

    async function saveEditMonth() {
        const id = monthIdOf(editItem);
        if (!id) return;
        if (!editTitle.trim()) { toast.error("Title wajib diisi."); return; }
        setEditSubmitting(true);
        try {
            await pmApi.updateMonth(id, { month: editMonth, title: editTitle.trim(), desc: editDesc.trim() });
            setEditItem(null);
            toast.success("Monthly berhasil diperbarui");
            await load();
        } catch (e) {
            console.error("saveEditMonth error:", e);
            toast.error(e?.message || "Gagal update monthly");
        } finally {
            setEditSubmitting(false);
        }
    }

    async function handleDeleteMonth(e, m) {
        e.stopPropagation();
        const id = monthIdOf(m);
        if (!id) return;

        const confirmed = await customConfirm(
            "Hapus Monthly",
            `Monthly "${m.title}" dan semua task di dalamnya akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`,
            "Hapus Monthly",
            true
        );
        if (!confirmed) return;

        try {
            await pmApi.deleteMonth(id);
            toast.success(`Monthly "${m.title}" berhasil dihapus`);
            await load();
        } catch (e) {
            console.error("deleteMonth error:", e);
            toast.error(e?.message || "Gagal hapus monthly");
        }
    }

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

    const semCfg = semesterData?.semester === 1
        ? { gradient: "from-emerald-600 to-teal-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" }
        : { gradient: "from-violet-600 to-purple-500", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" };

    // ─── RENDER ──────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50">
            <ToastContainer />
            <ModalDialog />

            {/* ── Topbar ── */}
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
                <div className="mx-auto flex h-16 sm:h-18 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">

                    {/* Back Button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => nav("/apps")}
                            title="Kembali ke Portal Alora"
                            className="flex items-center gap-2 h-9 px-3 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                            <HiOutlineHome className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => nav(`/projectmanagement/${projectId}`)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                            <HiOutlineArrowLeft className="h-5 w-5" />
                            <span className="hidden sm:inline">Project Semester</span>
                        </button>
                    </div>

                    {/* Title Section */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white shadow-sm">
                            <HiOutlineTableCells className="h-5 w-5" />
                        </div>
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                            Monthly Projects
                        </h1>
                    </div>

                    {/* User Info */}
                    <div className="relative flex items-center gap-3" ref={dropdownRef}>
                        <button type="button" onClick={() => setShowNotifs(true)}
                            className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition">
                            <span className="text-sm">🔔</span>
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center px-1">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        <div className="hidden sm:block text-right">
                            <div className="text-sm font-semibold text-slate-900">
                                {capitalizeEachWord(employee?.full_name || "User")}
                            </div>
                            <div className="text-xs text-slate-500">
                                {isDirektur ? "Direktur" : isSupervisorUp ? "Supervisor" : "Staff"}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowDropdown(v => !v)}
                            className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:bg-slate-700 transition"
                        >
                            {initials(employee?.full_name)}
                        </button>

                        {showDropdown && (
                            <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                                <a
                                    href="/profile"
                                    className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
                                    onClick={() => setShowDropdown(false)}
                                >
                                    👤 Lihat Profil
                                </a>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                                >
                                    🚪 Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* ✅ max-w-[1440px] + padding sesuai PMBoard */}
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">

                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap">
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
                    <button
                        onClick={() => nav(`/projectmanagement/${projectId}`)}
                        className="hover:text-slate-700 transition truncate max-w-[120px]"
                        title={semesterData?.title}
                    >
                        {semesterData?.title ?? `Semester ${semesterData?.semester ?? "—"}`}
                    </button>
                    <HiOutlineChevronRight className="h-3 w-3 shrink-0" />
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
                                    <span className="flex items-center gap-1"><HiOutlineCalendarDays className="h-3 w-3" />Dibuat {fmtDate(semesterData.created_at)}</span>
                                    <span className="flex items-center gap-1"><HiOutlineRectangleStack className="h-3 w-3" />{months.length} Monthly</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Page Header ── */}
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Monthly Plans</h2>
                        <p className="text-xs text-slate-500 mt-1">Klik setiap kartu untuk masuk ke board task & progress tracking.</p>
                    </div>

                    {isSupervisorUp ? (
                        <button
                            onClick={() => setOpen(true)}
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
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <HiOutlineAdjustmentsHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                <option value="month_asc">Bulan ↑</option>
                                <option value="month_desc">Bulan ↓</option>
                                <option value="newest">Terbaru</option>
                                <option value="az">A → Z</option>
                            </select>
                        </div>
                        <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden bg-white">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn("h-9 px-3 text-xs font-semibold transition", viewMode === "grid" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                            >Grid</button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={cn("h-9 px-3 text-xs font-semibold transition border-l border-slate-200", viewMode === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
                            >List</button>
                        </div>
                    </div>
                </div>

                {/* ── Error banner ── */}
                {err && !open && !editItem && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                        <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-rose-700 font-medium flex-1">{err}</p>
                        <button onClick={() => setErr("")} className="text-rose-400 hover:text-rose-600 font-bold text-sm">✕</button>
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
                            const canEdit = isSupervisorUp || m.requestor_employee_id === employee?.employee_id;
                            return (
                                <div key={id ?? JSON.stringify(m)} className="group relative">
                                    {canEdit && (
                                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                            <button type="button" onClick={(e) => openEditMonth(e, m)} title="Edit"
                                                className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-slate-400 hover:text-blue-600 transition shadow-sm">
                                                <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                            </button>
                                            <button type="button" onClick={(e) => handleDeleteMonth(e, m)} title="Hapus"
                                                className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center text-slate-400 hover:text-rose-600 transition shadow-sm">
                                                <HiOutlineTrash className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => goBoard(m)}
                                        onKeyDown={(e) => e.key === "Enter" && goBoard(m)}
                                        className="cursor-pointer w-full text-left"
                                    >
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
                                    </div>
                                </div>
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

                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Bulan</span>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {MONTH_NAMES.map((name, i) => {
                                        const cfg = monthConfig(i + 1);
                                        return (
                                            <button key={i} type="button" onClick={() => setMonth(i + 1)} disabled={submitting}
                                                className={cn("h-9 rounded-lg text-xs font-bold transition-all",
                                                    month === i + 1
                                                        ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-sm`
                                                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}>
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                                <input
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-400 transition"
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
                                    className="mt-1.5 min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    placeholder="Target & fokus bulan ini..."
                                    disabled={submitting}
                                />
                            </label>

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
                                <button type="button" onClick={() => !submitting && setOpen(false)}
                                    className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    disabled={submitting}>Batal</button>
                                <button type="button" onClick={create}
                                    className="h-9 px-5 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 disabled:opacity-50 transition border border-orange-700"
                                    disabled={submitting}>
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

            {/* ── Modal Edit ── */}
            {editItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    onClick={() => !editSubmitting && setEditItem(null)}
                >
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-white">Edit Monthly</h3>
                                <p className="text-xs text-blue-200 mt-0.5">Ubah bulan, title & deskripsi</p>
                            </div>
                            <button onClick={() => !editSubmitting && setEditItem(null)}
                                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">
                                <HiOutlineXMark className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Bulan</span>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {MONTH_NAMES.map((name, i) => {
                                        const cfg = monthConfig(i + 1);
                                        return (
                                            <button key={i} type="button" onClick={() => setEditMonth(i + 1)} disabled={editSubmitting}
                                                className={cn("h-9 rounded-lg text-xs font-bold transition-all",
                                                    editMonth === i + 1
                                                        ? `bg-gradient-to-br ${cfg.gradient} text-white shadow-sm`
                                                        : "bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}>
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="block">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                                <input
                                    className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition"
                                    value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                    disabled={editSubmitting} autoFocus />
                            </label>

                            <label className="block">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</span>
                                <textarea
                                    className="mt-1.5 min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                                    value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                    disabled={editSubmitting} />
                            </label>

                            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => !editSubmitting && setEditItem(null)}
                                    className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    disabled={editSubmitting}>Batal</button>
                                <button type="button" onClick={saveEditMonth}
                                    className="h-9 px-5 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition"
                                    disabled={editSubmitting}>
                                    {editSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            Menyimpan...
                                        </span>
                                    ) : "Simpan Perubahan"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <NotifPanel open={showNotifs} onClose={() => { setShowNotifs(false); loadNotifCount(); }} />
        </div>
    );
}