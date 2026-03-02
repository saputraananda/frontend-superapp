// src/pages/project-management/PMAnnual.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canDirektur, canSupervisorUp } from "./role";
import { useNavigate } from "react-router-dom";
import { FiEdit2, FiTrash2, FiAlertTriangle, FiCheckCircle, FiInfo, FiXCircle, FiX } from "react-icons/fi";
import {
  HiOutlineFolder,
  HiOutlinePlus,
  HiOutlineChevronRight,
  HiOutlineCalendarDays,
  HiOutlineLockClosed,
  HiOutlineExclamationTriangle,
  HiOutlineInboxStack,
  HiOutlineArrowLeft,
  HiOutlineXMark,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineBriefcase,
  HiOutlineClock,
  HiOutlineArrowTrendingUp,
  HiOutlineRectangleStack,
  HiOutlineAdjustmentsHorizontal,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";

// ─── Helpers ──────────────────────────────────────────
function cn(...c) { return c.filter(Boolean).join(" "); }

function projectIdOf(p) {
  return p?.id ?? p?.project_id ?? p?.id_project ?? null;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getYear(str) {
  if (!str) return null;
  return new Date(str).getFullYear();
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
export default function PMAnnual() {
  const nav = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isDirektur = useMemo(() => canDirektur(employee), [employee]);
  const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);


  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  // Edit
  const [editProject, setEditProject] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.listProjects();
      setProjects(res?.data || []);
    } catch (e) {
      console.error("load projects error:", e);
      setErr(e?.message || "Gagal memuat annual projects");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    const t = title.trim();
    if (!t) {
      toast.error("Title wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await pmApi.createProject({ title: t, desc: desc.trim() });
      setOpen(false);
      setTitle("");
      setDesc("");
      toast.success("Annual project berhasil dibuat");
      await load();
    } catch (e) {
      console.error("create project error:", e);
      toast.error(e?.message || "Gagal membuat annual project");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openEdit(e, p) {
    e.stopPropagation();
    setEditProject(p);
    setEditTitle(p.title || "");
    setEditDesc(p.desc || "");
    setErr("");
  }

  async function saveEdit() {
    const id = projectIdOf(editProject);
    if (!id) return;
    if (!editTitle.trim()) {
      toast.error("Title wajib diisi.");
      return;
    }
    setEditSubmitting(true);
    try {
      await pmApi.updateProject(id, { title: editTitle.trim(), desc: editDesc.trim() });
      setEditProject(null);
      toast.success("Project berhasil diperbarui");
      await load();
    } catch (e) {
      console.error("saveEdit error:", e);
      toast.error(e?.message || "Gagal update project");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(e, p) {
    e.stopPropagation();
    const id = projectIdOf(p);
    if (!id) return;

    const confirmed = await customConfirm(
      "Hapus Annual Project",
      `Project "${p.title}" dan semua data semester & monthly di dalamnya akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`,
      "Hapus Project",
      true
    );
    if (!confirmed) return;

    try {
      await pmApi.deleteProject(id);
      toast.success(`Project "${p.title}" berhasil dihapus`);
      await load();
    } catch (e) {
      console.error("deleteProject error:", e);
      toast.error(e?.message || "Gagal hapus project");
    }
  }

  // Derived
  const availableYears = useMemo(() => {
    const years = [...new Set(projects.map(p => getYear(p.created_at)).filter(Boolean))];
    return years.sort((a, b) => b - a);
  }, [projects]);

  const filtered = useMemo(() => {
    let list = [...projects];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.desc?.toLowerCase().includes(q)
      );
    }
    if (yearFilter !== "all") {
      list = list.filter(p => getYear(p.created_at) === Number(yearFilter));
    }
    if (sortBy === "newest") list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortBy === "oldest") list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortBy === "az") list.sort((a, b) => a.title?.localeCompare(b.title));
    if (sortBy === "za") list.sort((a, b) => b.title?.localeCompare(a.title));
    return list;
  }, [projects, search, yearFilter, sortBy]);

  const stats = useMemo(() => ({
    total: projects.length,
    thisYear: projects.filter(p => getYear(p.created_at) === new Date().getFullYear()).length,
    lastYear: projects.filter(p => getYear(p.created_at) === new Date().getFullYear() - 1).length,
  }), [projects]);

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />
      <ModalDialog />

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        {/* ✅ max-w-[1440px] sesuai PMBoard */}
        <div className="mx-auto flex h-16 sm:h-18 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Back Button */}
          <button
            onClick={() => nav("/apps")}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <HiOutlineArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          {/* Title Section */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <HiOutlineBriefcase className="h-5 w-5" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              Project Management Alora Group Indonesia
            </h1>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold text-slate-900">
                {employee?.full_name || "User"}
              </div>
              <div className="text-xs text-slate-500">
                {isDirektur ? "Direktur" : isSupervisorUp ? "Supervisor" : "Staff"}
              </div>
            </div>

            <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {initials(employee?.full_name)}
            </div>
          </div>

        </div>
      </header>

      {/* ✅ max-w-[1440px] + padding sesuai PMBoard */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Page Header ── */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Annual Projects
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {projects.length} Project{projects.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Annual Projects</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-lg">Rencana Tahunan Alora Group Indonesia</p>
            </div>

            {isDirektur ? (
              <button
                onClick={() => { setErr(""); setOpen(true); }}
                className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Buat Annual Project
              </button>
            ) : (
              <div className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-400">
                <HiOutlineLockClosed className="h-3.5 w-3.5" />
                Hanya Direktur yang bisa membuat project
              </div>
            )}
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Projects", value: stats.total, icon: HiOutlineRectangleStack, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Tahun Ini", value: stats.thisYear, icon: HiOutlineArrowTrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
            { label: "Tahun Lalu", value: stats.lastYear, icon: HiOutlineClock, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} px-4 py-3`}>
              <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari project..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white transition"
              />
            </div>

            {/* Year filter */}
            <div className="flex items-center gap-1.5">
              <HiOutlineFunnel className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <HiOutlineAdjustmentsHorizontal className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </div>

            {/* View toggle */}
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

          {/* Active filter chips */}
          {(search || yearFilter !== "all") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Filter aktif:</span>
              {search && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  "{search}"
                  <button onClick={() => setSearch("")} className="ml-0.5 hover:text-blue-900">✕</button>
                </span>
              )}
              {yearFilter !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  Tahun {yearFilter}
                  <button onClick={() => setYearFilter("all")} className="ml-0.5 hover:text-blue-900">✕</button>
                </span>
              )}
              <span className="text-[10px] text-slate-400 ml-auto">{filtered.length} hasil</span>
            </div>
          )}
        </div>

        {/* ── Error banner (hanya untuk error load, bukan form) ── */}
        {err && !open && !editProject && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-medium flex-1">{err}</p>
            <button onClick={() => setErr("")} className="text-rose-400 hover:text-rose-600 font-bold text-sm">✕</button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 rounded-xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : filtered.length ? (
          <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>
            {filtered.map(p => {
              const id = projectIdOf(p);
              const canEdit = isDirektur || p.created_by === employee?.employee_id || p.requestor_employee_id === employee?.employee_id;
              return (
                <div key={id} className="group relative">
                  <button type="button" onClick={() => id && nav(`${id}`)} className="w-full text-left">
                    {viewMode === "grid" ? (
                      // ── Grid Card ──
                      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
                            <HiOutlineBriefcase className="h-5 w-5" />
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {canEdit && (
                              <>
                                <button type="button" onClick={(e) => openEdit(e, p)} title="Edit"
                                  className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-slate-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100">
                                  <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={(e) => handleDelete(e, p)} title="Hapus"
                                  className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100">
                                  <HiOutlineTrash className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {getYear(p.created_at) || "—"}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Annual
                            </span>
                          </div>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-2 mb-2">
                          {p?.title || "—"}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {p?.desc || <span className="italic text-slate-400">Tidak ada deskripsi.</span>}
                        </p>

                        {p?.requestor_employee_id && (
                          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 mb-3">
                            <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                              {initials(p.requestor_name || "?")}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold text-slate-700 truncate">{p.requestor_name || `Emp #${p.requestor_employee_id}`}</div>
                              <div className="text-[9px] text-slate-400">Creator</div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <HiOutlineCalendarDays className="h-3 w-3" />
                            {fmtDate(p.created_at)}
                          </div>
                          <div className="flex items-center gap-0.5 text-[10px] font-bold text-blue-600 group-hover:gap-1 transition-all">
                            Lihat Semester
                            <HiOutlineChevronRight className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      // ── List Row ──
                      <div className="rounded-xl bg-white border border-slate-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <HiOutlineBriefcase className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">{p?.title || "—"}</h3>
                              <span className="shrink-0 inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                {getYear(p.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{p?.desc || "Tidak ada deskripsi."}</p>
                          </div>
                          <div className="shrink-0 hidden sm:flex items-center gap-2">
                            {p?.requestor_employee_id && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold">
                                  {initials(p.requestor_name || "?")}
                                </div>
                                <span className="hidden md:inline text-xs">{p.requestor_name || `Emp #${p.requestor_employee_id}`}</span>
                              </div>
                            )}
                            <span className="text-xs text-slate-400">{fmtDate(p.created_at)}</span>
                            {canEdit && (
                              <>
                                <button type="button" onClick={(e) => openEdit(e, p)} title="Edit"
                                  className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-slate-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100">
                                  <HiOutlinePencilSquare className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={(e) => handleDelete(e, p)} title="Hapus"
                                  className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100">
                                  <HiOutlineTrash className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <HiOutlineChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 p-16 text-center shadow-sm">
            <HiOutlineInboxStack className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">
              {search || yearFilter !== "all" ? "Tidak ada hasil" : "Belum ada annual project"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search || yearFilter !== "all"
                ? "Coba ubah filter atau keyword pencarian."
                : "Direktur dapat membuat project tahunan pertama."}
            </p>
            {(search || yearFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setYearFilter("all"); }}
                className="mt-4 h-8 px-4 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition"
              >Reset Filter</button>
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
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Buat Annual Project</h3>
                <p className="text-xs text-slate-400 mt-0.5">Project ini akan terlihat oleh semua anggota tim</p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Target 2026 — Market Leader"
                  disabled={submitting}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</span>
                <textarea
                  className="mt-1.5 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition resize-none"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Strategi, KPI, scope, dan target tahunan..."
                  disabled={submitting}
                />
              </label>

              {/* Creator preview */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                  {initials(employee?.full_name)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">{employee?.full_name || "Direktur"}</div>
                  <div className="text-[10px] text-slate-400">Creator · Direktur</div>
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
                  className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition border border-slate-800"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : "Buat Project"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Edit ── */}
      {editProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !editSubmitting && setEditProject(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-blue-700 px-6 py-5 flex items-center justify-between border-b border-blue-600">
              <div>
                <h3 className="text-base font-bold text-white">Edit Project</h3>
                <p className="text-xs text-blue-200 mt-0.5">Ubah title & deskripsi project</p>
              </div>
              <button
                onClick={() => !editSubmitting && setEditProject(null)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  disabled={editSubmitting}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</span>
                <textarea
                  className="mt-1.5 min-h-[100px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  disabled={editSubmitting}
                />
              </label>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => !editSubmitting && setEditProject(null)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  disabled={editSubmitting}
                >Batal</button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="h-9 px-5 rounded-lg bg-blue-700 text-white text-sm font-bold hover:bg-blue-800 disabled:opacity-50 transition"
                  disabled={editSubmitting}
                >
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
    </div>
  );
}