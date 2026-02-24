// src/pages/project-management/PMSemester.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  HiOutlineAcademicCap,
  HiOutlineUser,
  HiOutlineRectangleStack,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineInformationCircle,
  HiOutlineBriefcase,
} from "react-icons/hi2";

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

const semesterLabel  = (s) => s === 1 ? "Januari — Juni" : "Juli — Desember";
const semesterConfig = (s) => s === 1
  ? { gradient: "from-emerald-600 to-teal-500",   bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700",  dot: "bg-emerald-500" }
  : { gradient: "from-violet-600 to-purple-500",  bg: "bg-violet-50",   border: "border-violet-200",  text: "text-violet-700",   dot: "bg-violet-500" };

export default function PMSemester() {
  const { projectId } = useParams();
  const nav      = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isSupervisorUp = useMemo(() => canSupervisorUp(employee), [employee]);

  const [loading,    setLoading]    = useState(true);
  const [project,    setProject]    = useState(null);
  const [semesters,  setSemesters]  = useState([]);
  const [err,        setErr]        = useState("");
  const [open,       setOpen]       = useState(false);
  const [semester,   setSemester]   = useState(1);
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.getProjectDetail(projectId);
      setProject(res.project);
      setSemesters(res.semesters || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  async function create() {
    setErr("");
    if (!title.trim()) { setErr("Title wajib diisi."); return; }
    setSubmitting(true);
    try {
      await pmApi.createSemester(projectId, { semester, title, desc });
      setOpen(false);
      setTitle("");
      setDesc("");
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  const sem1 = semesters.filter(s => s.semester === 1);
  const sem2 = semesters.filter(s => s.semester === 2);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => nav("/projectmanagement")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Annual Projects</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
              <HiOutlineAcademicCap className="h-4 w-4" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs">
              {project?.title || "Semester Projects"}
            </h1>
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
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
          <button onClick={() => nav("/projectmanagement")} className="hover:text-slate-700 transition">Annual</button>
          <HiOutlineChevronRight className="h-3 w-3" />
          <span className="text-slate-700 font-semibold">{project?.title || "Project"}</span>
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
                  <span className="shrink-0 inline-flex items-center rounded-md bg-blue-100 border border-blue-300 px-2 py-0.5 text-[10px] font-bold text-blue-700">Annual Project</span>
                </div>
                {project.desc && <p className="text-xs text-blue-700 leading-relaxed line-clamp-2">{project.desc}</p>}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-blue-500">
                  <span className="flex items-center gap-1"><HiOutlineCalendarDays className="h-3 w-3" /> Dibuat {fmtDate(project.created_at)}</span>
                  <span className="flex items-center gap-1"><HiOutlineRectangleStack className="h-3 w-3" /> {semesters.length} Semester</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Semester Plans</h2>
            <p className="text-xs text-slate-500 mt-1">Breakdown project ke semester 1 (Jan–Jun) & semester 2 (Jul–Des).</p>
          </div>

          {isSupervisorUp ? (
            <button
              onClick={() => { setErr(""); setOpen(true); }}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
            >
              <HiOutlinePlus className="h-4 w-4" />
              Buat Semester
            </button>
          ) : (
            <div className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-400">
              <HiOutlineLockClosed className="h-3.5 w-3.5" />
              Hanya Supervisor+ yang bisa membuat semester
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Semester", value: semesters.length,                 border: "border-slate-200",   bg: "bg-white" },
            { label: "Semester 1",     value: sem1.length,                      border: "border-emerald-200", bg: "bg-emerald-50" },
            { label: "Semester 2",     value: sem2.length,                      border: "border-violet-200",  bg: "bg-violet-50" },
            { label: "Update Terakhir",value: semesters.length ? fmtDate(semesters[0]?.updated_at) : "—", border: "border-slate-200", bg: "bg-white", small: true },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
              <div className={cn("font-extrabold text-slate-900", s.small ? "text-sm" : "text-2xl")}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {err && !open && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-medium">{err}</p>
          </div>
        )}

        {/* ── Semester Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-52 rounded-xl bg-slate-200 animate-pulse" />)}
          </div>
        ) : semesters.length ? (
          <div className="space-y-6">
            {/* Semester 1 Group */}
            {sem1.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester 1 — Januari s/d Juni</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] text-slate-400">{sem1.length} item</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sem1.map(s => <SemesterCard key={s.id} s={s} onClick={() => nav(`/projectmanagement/${projectId}/semester/${s.id}`)} />)}
                </div>
              </div>
            )}

            {/* Semester 2 Group */}
            {sem2.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-violet-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester 2 — Juli s/d Desember</h3>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[10px] text-slate-400">{sem2.length} item</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sem2.map(s => <SemesterCard key={s.id} s={s} onClick={() => nav(`/projectmanagement/${projectId}/semester/${s.id}`)} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-slate-200 p-16 text-center shadow-sm">
            <HiOutlineInboxStack className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-700">Belum ada semester</p>
            <p className="text-xs text-slate-400 mt-1">Supervisor dapat membuat semester 1 & 2 di sini.</p>
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

            <div className="p-6 space-y-5">
              {err && (
                <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                  <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-700">{err}</p>
                </div>
              )}

              {/* Semester picker */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Pilih Semester</span>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map(n => {
                    const cfg = semesterConfig(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSemester(n)}
                        disabled={submitting}
                        className={cn(
                          "rounded-xl border-2 p-4 text-left transition-all",
                          semester === n
                            ? `border-violet-500 bg-violet-50`
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
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
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition"
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
                  className="mt-2 min-h-[90px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition resize-none"
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
                  className="h-9 px-5 rounded-lg bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition"
                  disabled={submitting}
                >
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
    </div>
  );
}

// ── Sub-component: Semester Card ──
function SemesterCard({ s, onClick }) {
  const cfg = semesterConfig(s.semester);

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }

  function fmtDate(str) {
    if (!str) return "—";
    return new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <button type="button" onClick={onClick} className="group text-left w-full">
      <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200">
        {/* Colored top bar */}
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

          {/* Creator */}
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
              Monthly
              <HiOutlineChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}