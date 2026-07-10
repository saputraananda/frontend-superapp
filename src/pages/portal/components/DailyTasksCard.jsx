import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import DailyTaskModal from "./DailyTaskModal";

// Helper untuk get current user
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

// Adaptive items per page - minimum 5, maksimum tergantung viewport
const MIN_PER_PAGE = 5;
const ITEM_HEIGHT_ESTIMATE = 90; // estimasi tinggi satu task card dalam pixel

function capitalizeEachWord(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper untuk border dan badge warna berdasarkan progress
const progressConfig = {
  todo: { border: "border-red-200", bg: "bg-red-50", hoverBg: "hover:bg-red-100", hoverBorder: "hover:border-red-300", badgeBg: "bg-red-100", badgeText: "text-red-700", label: "To Do", dot: "bg-red-500" },
  on_progress: { border: "border-amber-200", bg: "bg-amber-50", hoverBg: "hover:bg-amber-100", hoverBorder: "hover:border-amber-300", badgeBg: "bg-amber-100", badgeText: "text-amber-700", label: "On Progress", dot: "bg-amber-500" },
  completed: { border: "border-green-200", bg: "bg-green-50", hoverBg: "hover:bg-green-100", hoverBorder: "hover:border-green-300", badgeBg: "bg-green-100", badgeText: "text-green-700", label: "Completed", dot: "bg-green-500" },
};

function TaskItem({ task, onClick }) {
  const date = new Date(task.created_at);
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  const pCfg = progressConfig[task.progress] || progressConfig.todo;

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      className={`w-full text-left p-3 rounded-xl border-2 ${pCfg.border} ${pCfg.bg} ${pCfg.hoverBg} ${pCfg.hoverBorder} transition group`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-slate-900 line-clamp-1">
              {task.title}
            </h4>
            <span className="flex-shrink-0 text-[10px] text-slate-400 whitespace-nowrap">{dateStr}</span>
          </div>

          {task.department_name && (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 rounded">
              {task.department_name}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {/* Progress Badge */}
            <span className={`text-[10px] font-medium ${pCfg.badgeText} ${pCfg.badgeBg} px-1.5 py-0.5 rounded border ${pCfg.border} flex items-center gap-1`}>
              <span className={`w-2 h-2 rounded-full ${pCfg.dot}`}></span>
              {pCfg.label}
            </span>

            {(() => {
              const hasTargets =
                (Array.isArray(task.target_company_ids)    && task.target_company_ids.length > 0) ||
                (Array.isArray(task.target_department_ids) && task.target_department_ids.length > 0) ||
                (Array.isArray(task.target_employee_ids)   && task.target_employee_ids.length > 0);

              if (hasTargets) {
                return (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    🎯 Target Audience
                  </span>
                );
              }

              return task.is_public ? (
                <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  🌐 Public
                </span>
              ) : (
                <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                  🔒 Private
                </span>
              );
            })()}

            {/* Target audience badges */}
            {task.target_companies?.map((c) => (
              <span key={c.id} className="text-[10px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                🏢 {c.name}
              </span>
            ))}
            {task.target_departments?.map((d) => (
              <span key={d.id} className="text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                🏬 {d.name}
              </span>
            ))}
            {task.target_employees?.length > 0 && (
              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                👤 {task.target_employees.length} karyawan
              </span>
            )}

            {task.links?.length > 0 &&
              task.links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                >
                  🔗 {l.label || "Link"}
                </a>
              ))}

            {task.evidences?.length > 0 && (
              <span className="text-[10px] text-slate-500">
                📎 {task.evidences.length} file
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-400 mt-1">
            Creator :{" "}
            <span className="font-medium text-slate-500">
              {capitalizeEachWord(task.creator_name)}
            </span>
          </p>
        </div>
      </div>
    </button>
  );
}

export default function DailyTasksCard() {
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedTask, setSelectedTask] = useState(null);
  const [page, setPage] = useState(1);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState(""); // "YYYY"
  const [filterMonthNum, setFilterMonthNum] = useState(""); // "1"-"12"
  const [filterDept, setFilterDept] = useState(""); // department_id as string
  const [filterVis, setFilterVis] = useState("all"); // "all" | "public" | "private"
  const [filterProgress, setFilterProgress] = useState("all"); // "all" | "todo" | "on_progress" | "completed"
  const [showFilters, setShowFilters] = useState(false);

  // ─── Adaptive items per page ────────────────────────────────────────────
  const [itemsPerPage, setItemsPerPage] = useState(MIN_PER_PAGE);

  useEffect(() => {
    const calculateItemsPerPage = () => {
      const viewportHeight = window.innerHeight;
      // Estimasi ruang untuk card (header card ~100px, pagination ~60px, padding ~40px, nav/header halaman ~80px)
      const overhead = 280;
      const availableHeight = Math.max(300, viewportHeight - overhead);
      const calculated = Math.floor(availableHeight / ITEM_HEIGHT_ESTIMATE);
      // Clamp antara MIN_PER_PAGE dan 8 (agar tidak terlalu banyak)
      const optimal = Math.max(MIN_PER_PAGE, Math.min(8, calculated));
      console.log(`[DailyTasks] viewport=${viewportHeight}px, available=${availableHeight}px, itemsPerPage=${optimal}`);
      setItemsPerPage(optimal);
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);
    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const d = await api("/daily-tasks");
      setTasks(d.tasks || []);
      setPage(1);
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ─── Derived: unique departments from loaded tasks ────────────────────────
  const deptOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.department_id && t.department_name) {
        map.set(String(t.department_id), t.department_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const availableYears = useMemo(() => {
    const yrs = [...new Set(tasks.map(t => new Date(t.created_at).getFullYear()))];
    return yrs.sort((a, b) => b - a);
  }, [tasks]);

  // ─── Filtered tasks ───────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.creator_name?.toLowerCase().includes(q))
        return false;
      if (filterYear) {
        const d = new Date(t.created_at);
        const y = d.getFullYear();
        if (y !== parseInt(filterYear, 10)) return false;
      }
      if (filterMonthNum) {
        const d = new Date(t.created_at);
        const m = d.getMonth() + 1;
        if (m !== parseInt(filterMonthNum, 10)) return false;
      }
      if (filterDept && String(t.department_id) !== filterDept) return false;
      const hasTargets =
        (Array.isArray(t.target_company_ids)    && t.target_company_ids.length > 0) ||
        (Array.isArray(t.target_department_ids) && t.target_department_ids.length > 0) ||
        (Array.isArray(t.target_employee_ids)   && t.target_employee_ids.length > 0);

      if (filterVis === "public" && (!t.is_public || hasTargets)) return false;
      if (filterVis === "private" && t.is_public) return false;
      if (filterVis === "target" && !hasTargets) return false;
      if (filterProgress !== "all" && t.progress !== filterProgress) return false;
      return true;
    });
  }, [tasks, search, filterYear, filterMonthNum, filterDept, filterVis, filterProgress]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, filterYear, filterMonthNum, filterDept, filterVis, filterProgress]);

  const isFiltered = search || filterYear || filterMonthNum || filterDept || filterVis !== "all" || filterProgress !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterYear("");
    setFilterMonthNum("");
    setFilterDept("");
    setFilterVis("all");
    setFilterProgress("all");
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const currentUser = getCurrentUser();

  const openCreate = () => {
    setSelectedTask(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openTask = (task) => {
    const isOwner = task.creator_id === currentUser?.id;
    setSelectedTask(task);
    setModalMode(isOwner ? "edit" : "view");
    setShowModal(true);
  };

  const handleSaved = (savedTask, mode) => {
    if (mode === "create") {
      setTasks((prev) => [savedTask, ...prev]);
      setPage(1);
    } else if (mode === "edit") {
      setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else if (mode === "delete") {
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== savedTask.id);
        const newTotalPages = Math.max(1, Math.ceil(next.length / itemsPerPage));
        setPage((p) => Math.min(p, newTotalPages));
        return next;
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const pagedTasks = filteredTasks.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">📋 Notulensi & Daily Report</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Catat rapat, laporan, dan agenda harian</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${showFilters || isFiltered
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-300 text-slate-600 hover:border-blue-300"
                }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filter
              {isFiltered && (
                <span className="h-4 w-4 flex items-center justify-center bg-blue-600 text-white rounded-full text-[9px] font-bold">
                  {[search, filterYear, filterMonthNum, filterDept, filterVis !== "all", filterProgress !== "all"].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Add button */}
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah
            </button>
          </div>
        </div>

        {/* ── Filter Panel ── */}
        {showFilters && (
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 space-y-3">
            {/* Row 1: Search */}
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul atau nama creator..."
                className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Row 2: Tahun + Bulan + Dept */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tahun</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bulan</label>
                <select
                  value={filterMonthNum}
                  onChange={(e) => setFilterMonthNum(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="">Semua Bulan</option>
                  {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Departemen</label>
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
                >
                  <option value="">Semua Dept</option>
                  {deptOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Visibility toggle + Progress filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Visibilitas:</span>
                {[
                  { val: "all", label: "Semua" },
                  { val: "public", label: "🌐 Public" },
                  { val: "private", label: "🔒 Private" },
                  { val: "target", label: "🎯 Target" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setFilterVis(val)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${filterVis === val
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Progres:</span>
                {[
                  { val: "all", label: "Semua" },
                  { val: "todo", label: "🔴 To Do" },
                  { val: "on_progress", label: "🟡 On Progress" },
                  { val: "completed", label: "🟢 Completed" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setFilterProgress(val)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${filterProgress === val
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 4: Clear filters */}
            {isFiltered && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-red-500 hover:text-red-700 font-semibold transition"
                >
                  ✕ Reset Filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Results summary when filtered ── */}
        {isFiltered && !loadingTasks && (
          <div className="px-5 pt-3 pb-0">
            <p className="text-[10px] text-blue-600 font-medium">
              Menampilkan {filteredTasks.length} dari {tasks.length} notulensi
            </p>
          </div>
        )}

        {/* ── Body ── */}
        <div className="p-4 space-y-2 flex-1">
          {loadingTasks ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl">{isFiltered ? "🔍" : "📭"}</span>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                {isFiltered ? "Tidak ada notulensi yang cocok" : "Belum ada notulensi"}
              </p>
              <p className="text-xs text-slate-400">
                {isFiltered ? (
                  <button onClick={clearFilters} className="text-blue-500 hover:underline">
                    Reset filter
                  </button>
                ) : (
                  'Klik "Tambah" untuk mulai mencatat'
                )}
              </p>
            </div>
          ) : (
            pagedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onClick={openTask} />
            ))
          )}
        </div>

        {/* ── Footer Pagination ── */}
        {filteredTasks.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, filteredTasks.length)} dari {filteredTasks.length}
              {isFiltered && <span className="text-slate-300"> (filter aktif)</span>}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-6 w-6 flex items-center justify-center rounded border text-[10px] font-semibold transition ${p === page
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <DailyTaskModal
          mode={modalMode}
          task={selectedTask}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}