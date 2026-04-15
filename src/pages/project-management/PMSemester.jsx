// src/pages/project-management/PMSemester.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { pmApi } from "./pmApi";
import { api } from "../../lib/api";
import { getEmployeeFromLocal, canDirektur, canSupervisorUp, getJobLevelLabel } from "./role";
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
  HiOutlineAcademicCap,
  HiOutlineRectangleStack,
  HiOutlineBriefcase,
  HiOutlinePencilSquare,
  HiOutlineTrash,
} from "react-icons/hi2";

// ─── Helpers ──────────────────────────────────────────
function cn(...c) { return c.filter(Boolean).join(" "); }

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

function capitalizeEachWord(text) {
  if (!text) return "";
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const semesterLabel = (s) => s === 1 ? "Januari — Juni" : "Juli — Desember";
const semesterConfig = (s) => s === 1
  ? { gradient: "from-emerald-600 to-teal-500", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" }
  : { gradient: "from-violet-600 to-purple-500", bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" };

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
export default function PMSemester() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);
  const isDirektur = useMemo(() => canDirektur(employee), [employee]);
  const roleLabel = useMemo(() => getJobLevelLabel(employee), [employee]);

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [semester, setSemester] = useState(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit
  const [editItem, setEditItem] = useState(null);
  const [editSemester, setEditSemester] = useState(1);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.getProjectDetail(projectId);
      setProject(res.project);
      setSemesters(res.semesters || []);
      // ← Set title setelah data project berhasil dimuat
      document.title = res.project?.title
        ? `${res.project.title} - Semester | Project Management Alora`
        : "Semester Plans | Project Management Alora";
    } catch (e) {
      console.error("load error:", e);
      setErr(e?.message || "Gagal memuat data");
      document.title = "Semester Plans | Project Management Alora";
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function create() {
    if (!title.trim()) {
      toast.error("Title wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await pmApi.createSemester(projectId, { semester, title: title.trim(), desc: desc.trim() });
      setOpen(false);
      setTitle("");
      setDesc("");
      toast.success("Semester berhasil dibuat");
      await load();
    } catch (e) {
      console.error("create semester error:", e);
      toast.error(e?.message || "Gagal membuat semester");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load(); loadNotifCount(); }, [load]);

  function openEditSem(e, s) {
    e.stopPropagation();
    setEditItem(s);
    setEditSemester(s.semester);
    setEditTitle(s.title || "");
    setEditDesc(s.desc || "");
  }

  async function saveEditSem() {
    if (!editItem?.id) return;
    if (!editTitle.trim()) {
      toast.error("Title wajib diisi.");
      return;
    }
    setEditSubmitting(true);
    try {
      await pmApi.updateSemester(editItem.id, {
        semester: editSemester,
        title: editTitle.trim(),
        desc: editDesc.trim(),
      });
      setEditItem(null);
      toast.success("Semester berhasil diperbarui");
      await load();
    } catch (e) {
      console.error("saveEditSem error:", e);
      toast.error(e?.message || "Gagal update semester");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteSem(e, s) {
    e.stopPropagation();
    if (!s?.id) return;

    const confirmed = await customConfirm(
      "Hapus Semester",
      `Semester "${s.title}" dan semua sub division di dalamnya akan dihapus permanen. Aksi ini tidak dapat dibatalkan.`,
      "Hapus Semester",
      true
    );
    if (!confirmed) return;

    try {
      await pmApi.deleteSemester(s.id);
      toast.success(`Semester "${s.title}" berhasil dihapus`);
      await load();
    } catch (e) {
      console.error("deleteSemester error:", e);
      toast.error(e?.message || "Gagal hapus semester");
    }
  }

  const sem1 = semesters.filter(s => s.semester === 1);
  const sem2 = semesters.filter(s => s.semester === 2);

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
              className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <HiOutlineHome className="h-5 w-5" />
            </button>

            <button
              onClick={() => nav("/projectmanagement")}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <HiOutlineArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Annual Projects</span>
            </button>
          </div>

          {/* Title Section */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <HiOutlineAcademicCap className="h-5 w-5" />
            </div>

            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
              {project?.title || "Semester Projects"}
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
                {roleLabel}
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
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <button onClick={() => nav("/projectmanagement")} className="hover:text-slate-700 transition">Annual</button>
          <HiOutlineChevronRight className="h-3 w-3" />
          <span className="text-slate-700 font-semibold truncate max-w-[200px]">{project?.title || "Project"}</span>
          <HiOutlineChevronRight className="h-3 w-3" />
        </div>

        {/* ── Project Info Banner ── */}
        {project && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                <HiOutlineBriefcase className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-blue-900 truncate">{project.title}</h3>
                  {project.company_name && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-700 mt-1">
                      <HiOutlineBriefcase className="h-3 w-3" />
                      {project.company_name}
                    </span>
                  )}
                </div>
                {project.desc && <p className="text-xs text-blue-700 leading-relaxed line-clamp-2">{project.desc}</p>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-blue-500">
                  <span className="flex items-center gap-1"><HiOutlineCalendarDays className="h-3 w-3" />Dibuat {fmtDate(project.created_at)}</span>
                  <span className="flex items-center gap-1"><HiOutlineRectangleStack className="h-3 w-3" />{semesters.length} Semester</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Semester Plans</h2>
            <p className="text-xs text-slate-500 mt-1">Breakdown project ke semester 1 (Jan–Jun) & semester 2 (Jul–Des).</p>
          </div>

          {isSupervisorUp ? (
            <button
              onClick={() => { setOpen(true); }}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Buat Semester
            </button>
          ) : (
            <div className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-400">
              <HiOutlineLockClosed className="h-3.5 w-3.5" />
              Hanya Direktur/Manager/Supervisor yang dapat membuat proyek semester
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Proyek", value: semesters.length, border: "border-slate-200", bg: "bg-white" },
            { label: "Semester 1", value: sem1.length, border: "border-emerald-200", bg: "bg-emerald-50" },
            { label: "Semester 2", value: sem2.length, border: "border-violet-200", bg: "bg-violet-50" },
            { label: "Update Terakhir", value: semesters.length ? fmtDate(semesters[0]?.updated_at) : "—", border: "border-slate-200", bg: "bg-white", small: true },
          ].map(s => (
            <div key={s.label} className={`rounded-lg border ${s.border} ${s.bg} px-4 py-3`}>
              <div className={cn("font-extrabold text-slate-900", s.small ? "text-sm" : "text-xl")}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Error banner ── */}
        {err && !open && !editItem && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-medium flex-1">{err}</p>
            <button onClick={() => setErr("")} className="text-rose-400 hover:text-rose-600 font-bold text-sm">✕</button>
          </div>
        )}

        {/* ── Semester Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-52 rounded-xl bg-slate-200 animate-pulse" />)}
          </div>
        ) : semesters.length ? (
          <div className="space-y-6">
            {sem1.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester 1 — Januari s/d Juni</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] text-slate-400">{sem1.length} item</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sem1.map(s => (
                    <SemesterCard
                      key={s.id} s={s}
                      onClick={() => nav(`/projectmanagement/${projectId}/semester/${s.id}`)}
                      canEdit={isSupervisorUp || s.requestor_employee_id === employee?.employee_id}
                      onEdit={(e) => openEditSem(e, s)}
                      onDelete={(e) => handleDeleteSem(e, s)}
                    />
                  ))}
                </div>
              </div>
            )}

            {sem2.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester 2 — Juli s/d Desember</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] text-slate-400">{sem2.length} item</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sem2.map(s => (
                    <SemesterCard
                      key={s.id} s={s}
                      onClick={() => nav(`/projectmanagement/${projectId}/semester/${s.id}`)}
                      canEdit={isSupervisorUp || s.requestor_employee_id === employee?.employee_id}
                      onEdit={(e) => openEditSem(e, s)}
                      onDelete={(e) => handleDeleteSem(e, s)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 p-16 text-center shadow-sm">
            <HiOutlineInboxStack className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">Belum ada semester</p>
            <p className="text-xs text-slate-400 mt-1">Direktur/Manager/Supervisor dapat membuat semester 1 & 2 di sini.</p>
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
            <div className="bg-gradient-to-r from-violet-700 to-violet-500 px-6 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Buat Semester Plan</h3>
                <p className="text-xs text-violet-200 mt-0.5">Pilih semester 1 (Jan–Jun) atau 2 (Jul–Des)</p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Semester picker */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Pilih Semester</span>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map(n => {
                    const cfg = semesterConfig(n);
                    return (
                      <button key={n} type="button" onClick={() => setSemester(n)} disabled={submitting}
                        className={cn("rounded-xl border-2 p-4 text-left transition-all",
                          semester === n ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
                        )}>
                        <div className={cn("h-8 w-8 rounded-lg text-white flex items-center justify-center mb-2 text-xs font-extrabold bg-gradient-to-br", cfg.gradient)}>
                          S{n}
                        </div>
                        <div className="text-xs font-bold text-slate-800">Semester {n}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{semesterLabel(n)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Expansion 2 Outlet Baru"
                  disabled={submitting}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Description</span>
                <textarea
                  className="mt-1.5 min-h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 transition resize-none"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Target, KPI, dan fokus semester ini..."
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
                  <div className="text-[10px] text-slate-400">Creator · {roleLabel}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => !submitting && setOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  disabled={submitting}>Batal</button>
                <button type="button" onClick={create}
                  className="h-9 px-5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition border border-violet-700"
                  disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : "Buat Semester"}
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
                <h3 className="text-base font-bold text-white">Edit Semester</h3>
                <p className="text-xs text-blue-200 mt-0.5">Ubah data semester</p>
              </div>
              <button onClick={() => !editSubmitting && setEditItem(null)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition">
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Pilih Semester</span>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map(n => {
                    const cfg = semesterConfig(n);
                    return (
                      <button key={n} type="button" onClick={() => setEditSemester(n)} disabled={editSubmitting}
                        className={cn("rounded-xl border-2 p-4 text-left transition-all",
                          editSemester === n ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"
                        )}>
                        <div className={cn("h-8 w-8 rounded-lg text-white flex items-center justify-center mb-2 text-xs font-extrabold bg-gradient-to-br", cfg.gradient)}>
                          S{n}
                        </div>
                        <div className="text-xs font-bold text-slate-800">Semester {n}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{semesterLabel(n)}</div>
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
                  className="mt-1.5 min-h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                  value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  disabled={editSubmitting} />
              </label>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => !editSubmitting && setEditItem(null)}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  disabled={editSubmitting}>Batal</button>
                <button type="button" onClick={saveEditSem}
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

// ─── Sub-component: Semester Card ──────────────────────
function SemesterCard({ s, onClick, canEdit, onEdit, onDelete }) {
  const cfg = semesterConfig(s.semester);

  return (
    <div className="group relative">
      {canEdit && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
          <button type="button" onClick={onEdit} title="Edit"
            className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 flex items-center justify-center text-slate-400 hover:text-blue-600 transition shadow-sm">
            <HiOutlinePencilSquare className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDelete} title="Hapus"
            className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center text-slate-400 hover:text-rose-600 transition shadow-sm">
            <HiOutlineTrash className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
        className="cursor-pointer rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200"
      >
        <div className={`h-1.5 w-full bg-gradient-to-r ${cfg.gradient}`} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className={`h-10 w-10 rounded-lg text-white flex items-center justify-center text-sm font-extrabold shadow-sm shrink-0 bg-gradient-to-br ${cfg.gradient}`}>
              S{s.semester}
            </div>
            <span className={`inline-flex items-center rounded-md ${cfg.bg} ${cfg.border} border px-2 py-0.5 text-[10px] font-semibold ${cfg.text}`}>
              Sem {s.semester} · {s.semester === 1 ? "Jan–Jun" : "Jul–Des"}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-violet-700 transition-colors line-clamp-2 mb-1.5">
            {s.title}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
            {s.desc || <span className="italic text-slate-400">Tidak ada deskripsi.</span>}
          </p>

          {s.requestor_employee_id && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 mb-3">
              <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                {initials(s.requestor_name || "?")}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-700 truncate">{s.requestor_name || `Emp #${s.requestor_employee_id}`}</div>
                <div className="text-[9px] text-slate-400">Creator</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <HiOutlineCalendarDays className="h-3 w-3" />
              {fmtDate(s.updated_at)}
            </div>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-violet-600 group-hover:gap-1 transition-all">
              Sub Division
              <HiOutlineChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}