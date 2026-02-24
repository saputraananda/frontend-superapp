// src/pages/project-management/PMAnnual.jsx
import React, { useEffect, useMemo, useState } from "react";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canDirektur } from "./role";
import { useNavigate } from "react-router-dom";
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
  HiOutlineUser,
  HiOutlineBriefcase,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineArrowTrendingUp,
  HiOutlineRectangleStack,
  HiOutlineAdjustmentsHorizontal,
} from "react-icons/hi2";

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

export default function PMAnnual() {
  const nav = useNavigate();
  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isDirektur = useMemo(() => canDirektur(employee), [employee]);

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
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.listProjects();
      setProjects(res?.data || []);
    } catch (e) {
      setErr(e?.message || "Gagal memuat annual projects");
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setErr("");
    const t = title.trim();
    if (!t) { setErr("Title wajib diisi."); return; }
    setSubmitting(true);
    try {
      await pmApi.createProject({ title: t, desc: desc.trim() });
      setOpen(false);
      setTitle("");
      setDesc("");
      await load();
    } catch (e) {
      setErr(e?.message || "Gagal membuat annual project");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => { load(); }, []);

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

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    thisYear: projects.filter(p => getYear(p.created_at) === new Date().getFullYear()).length,
    lastYear: projects.filter(p => getYear(p.created_at) === new Date().getFullYear() - 1).length,
  }), [projects]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Topbar ── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => nav("/apps")}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <HiOutlineArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <HiOutlineBriefcase className="h-4 w-4" />
            </div>
            <h1 className="text-sm font-bold text-slate-900">Project Management</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-800">{employee?.full_name || "User"}</span>
              <span className="text-[10px] text-slate-400">
                {isDirektur ? "Direktur" : "Staff"}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
              {initials(employee?.full_name)}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Annual Projects
                </span>
                <span className="text-[10px] font-medium text-slate-400">{projects.length} Project{projects.length !== 1 ? "s" : ""}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Annual Projects</h2>
              <p className="text-sm text-slate-500 mt-1.5 max-w-lg">
                Planning Tahunan Alora Group Indonesia</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Projects", value: stats.total, icon: HiOutlineRectangleStack, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
            { label: "Tahun Ini", value: stats.thisYear, icon: HiOutlineArrowTrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
            { label: "Tahun Lalu", value: stats.lastYear, icon: HiOutlineClock, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3.5`}>
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{s.value}</div>
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
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-300 focus:bg-white transition"
              />
            </div>

            {/* Year filter */}
            <div className="flex items-center gap-1.5">
              <HiOutlineFunnel className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={yearFilter}
                onChange={e => setYearFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300"
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
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
              </select>
            </div>

            {/* View toggle */}
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

        {/* ── Error ── */}
        {err && !open && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
            <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-700 font-medium">{err}</p>
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
              return (
                <button key={id} type="button" onClick={() => id && nav(`${id}`)} className="group text-left w-full">
                  {viewMode === "grid" ? (
                    // ── Grid Card ──
                    <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300 transition-all duration-200">
                      {/* Top accent bar */}
                      <div className="h-1 w-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 mb-4 -mt-1 -mx-0 rounded-t-xl" />

                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shrink-0">
                          <HiOutlineBriefcase className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
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

                      {/* Creator */}
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
                        <div className="shrink-0 hidden sm:flex items-center gap-3">
                          {p?.requestor_employee_id && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold">
                                {initials(p.requestor_name || "?")}
                              </div>
                              <span className="hidden md:inline">{p.requestor_name || `Emp #${p.requestor_employee_id}`}</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-400">{fmtDate(p.created_at)}</span>
                          <HiOutlineChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
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

            <div className="p-6 space-y-5">
              {err && (
                <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                  <HiOutlineExclamationTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-700">{err}</p>
                </div>
              )}

              <label className="block">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
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
                  className="mt-2 min-h-[100px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition resize-none"
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
                  className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50 transition"
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
    </div>
  );
}