import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import DailyTaskModal from "./DailyTaskModal";

const PER_PAGE = 5;

function capitalizeEachWord(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function TaskItem({ task, onClick }) {
  const date = new Date(task.created_at);
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition group"
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
            <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-blue-700 line-clamp-1">
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
            {task.is_public ? (
              <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                🌐 Public
              </span>
            ) : (
              <span className="text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                🔒 Private
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
  const [tasks, setTasks]               = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [modalMode, setModalMode]       = useState("create");
  const [selectedTask, setSelectedTask] = useState(null);
  const [page, setPage]                 = useState(1);

  // ─── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch]             = useState("");
  const [filterMonth, setFilterMonth]   = useState(""); // "YYYY-MM"
  const [filterDept, setFilterDept]     = useState(""); // department_id as string
  const [filterVis, setFilterVis]       = useState("all"); // "all" | "public" | "private"
  const [showFilters, setShowFilters]   = useState(false);

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

  // ─── Filtered tasks ───────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.creator_name?.toLowerCase().includes(q))
        return false;
      if (filterMonth) {
        const d = new Date(t.created_at);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (ym !== filterMonth) return false;
      }
      if (filterDept && String(t.department_id) !== filterDept) return false;
      if (filterVis === "public"  && !t.is_public)  return false;
      if (filterVis === "private" &&  t.is_public)  return false;
      return true;
    });
  }, [tasks, search, filterMonth, filterDept, filterVis]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, filterMonth, filterDept, filterVis]);

  const isFiltered = search || filterMonth || filterDept || filterVis !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterMonth("");
    setFilterDept("");
    setFilterVis("all");
  };

  // ─── Modal helpers ────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelectedTask(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (task) => {
    setSelectedTask(task);
    setModalMode("edit");
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
        const newTotalPages = Math.max(1, Math.ceil(next.length / PER_PAGE));
        setPage((p) => Math.min(p, newTotalPages));
        return next;
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PER_PAGE));
  const pagedTasks = filteredTasks.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                showFilters || isFiltered
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
                  {[search, filterMonth, filterDept, filterVis !== "all"].filter(Boolean).length}
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

            {/* Row 2: Month + Dept */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Bulan</label>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none bg-white"
                />
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

            {/* Row 3: Visibility toggle + clear */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Visibilitas:</span>
                {[
                  { val: "all",     label: "Semua" },
                  { val: "public",  label: "🌐 Public" },
                  { val: "private", label: "🔒 Private" },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setFilterVis(val)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${
                      filterVis === val
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {isFiltered && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-red-500 hover:text-red-700 font-semibold transition"
                >
                  ✕ Reset Filter
                </button>
              )}
            </div>
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
              <TaskItem key={task.id} task={task} onClick={openEdit} />
            ))
          )}
        </div>

        {/* ── Footer Pagination ── */}
        {filteredTasks.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredTasks.length)} dari {filteredTasks.length}
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
                  className={`h-6 w-6 flex items-center justify-center rounded border text-[10px] font-semibold transition ${
                    p === page
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