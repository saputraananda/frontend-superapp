import { useState, useEffect, useMemo } from "react";
import { api } from "../../../lib/api";
import { statusOf, priorityOf } from "../../project-management/constants/pmConstants";

const PER_PAGE = 4;

const STATUS_MAP = {
  todo: { label: "To Do", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  in_progress: { label: "In Progress", badge: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  review: { label: "Review", badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  done: { label: "Done", badge: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500" },
};

const PRIORITY_MAP = {
  critical: { label: "Critical", badge: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Medium", badge: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "Low", badge: "bg-green-100 text-green-700 border-green-200" },
};

function getDaysRemaining(enddate) {
  if (!enddate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end = new Date(enddate); end.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
}

function getTimelineProgress(startdate, enddate) {
  if (!startdate || !enddate) return null;
  const start = new Date(startdate).getTime();
  const end = new Date(enddate).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}

function formatDateId(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}


export default function PersonalTasksCard() {
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState(null);
  const [page, setPage] = useState(1);

  // ─── Filters ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active"); // active = semua non-done
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all"); // all | today | week | overdue
  const [filterYear, setFilterYear] = useState("");
  const [filterMonthNum, setFilterMonthNum] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load employee id
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const userData = parsed.user ?? parsed;
        setEmployeeId(userData.employee?.employee_id ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  // Load semua tasks
  useEffect(() => {
    if (!employeeId) return;

    const fetchMyTasks = async () => {
      try {
        setLoading(true);
        const projectsRes = await api("/api/pm/projects");
        const projects = projectsRes.data || [];
        let allMyTasks = [];

        for (const project of projects) {
          try {
            const semestersRes = await api(`/api/pm/projects/${project.id}/semesters`);
            const semesters = semestersRes.data || [];
            for (const semester of semesters) {
              try {
                const monthliesRes = await api(`/api/pm/semesters/${semester.id}/monthlies`);
                const monthlies = monthliesRes.data || [];
                for (const monthly of monthlies) {
                  try {
                    const tasksRes = await api(`/api/pm/monthlies/${monthly.id}/tasks`);
                    const tasks = tasksRes.data || [];
                    const myTasks = tasks
                      .filter(t => t.assignees.some(a => a.employee_id === employeeId))
                      .map(t => ({
                        ...t,
                        project_title: project.title,
                        semester_title: semester.title,
                        monthly_title: monthly.title,
                        monthly_id: monthly.id,
                        project_id: project.id,
                        semester_id: semester.id,
                      }));
                    allMyTasks = [...allMyTasks, ...myTasks];
                  } catch (err) {
                    console.error("Error fetching tasks for monthly:", err);
                  }
                }
              } catch (err) {
                console.error("Error fetching monthlies for semester:", err);
              }
            }
          } catch (err) {
            console.error("Error fetching semesters for project:", err);
          }
        }

        setAllTasks(allMyTasks);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, [employeeId]);

  // ─── Stats (dari SEMUA task) ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter(t => t.status === "completed").length;
    const active = total - done;
    const overdue = allTasks.filter(t => {
      if (!t.enddate || t.status === "completed") return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const end = new Date(t.enddate); end.setHours(0, 0, 0, 0);
      return end < today;
    }).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, active, overdue, pct };
  }, [allTasks]);

  const yearOptions = useMemo(() => {
    const years = new Set();
    const cur = new Date().getFullYear();
    [cur - 1, cur, cur + 1].forEach(y => years.add(y));
    allTasks.forEach(t => { if (t.enddate) years.add(new Date(t.enddate).getFullYear()); });
    return [...years].sort((a, b) => b - a);
  }, [allTasks]);

  // ─── Filtered tasks ────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const q = search.trim().toLowerCase();

    return allTasks
      .filter(t => {
        // Status
        if (filterStatus === "active" && t.status === "completed") return false;
        if (filterStatus !== "active" && filterStatus !== "all" && t.status !== filterStatus) return false;

        // Search
        if (q && !t.title.toLowerCase().includes(q) && !t.project_title?.toLowerCase().includes(q))
          return false;

        // Priority
        if (filterPriority !== "all" && t.priority !== filterPriority) return false;

        // Urgency
        if (filterUrgency !== "all") {
          const end = t.enddate ? new Date(t.enddate) : null;
          if (end) end.setHours(0, 0, 0, 0);
          if (filterUrgency === "today" && end?.getTime() !== today.getTime()) return false;
          if (filterUrgency === "overdue" && (end >= today || !end)) return false;
          if (filterUrgency === "week") {
            const week = new Date(today); week.setDate(week.getDate() + 7);
            if (!end || end < today || end > week) return false;
          }
        }

        // Month (berdasarkan deadline)
        if (filterYear || filterMonthNum) {
          if (!t.enddate) return false;
          const d = new Date(t.enddate);
          if (filterYear && d.getFullYear() !== Number(filterYear)) return false;
          if (filterMonthNum && (d.getMonth() + 1) !== Number(filterMonthNum)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (!a.enddate) return 1;
        if (!b.enddate) return -1;
        return new Date(a.enddate) - new Date(b.enddate);
      });
  }, [allTasks, search, filterStatus, filterPriority, filterUrgency, filterYear, filterMonthNum]);

  // Reset page saat filter berubah
  useEffect(() => { setPage(1); }, [search, filterStatus, filterPriority, filterUrgency, filterYear, filterMonthNum]);

  const isFiltered =
    !!search ||
    filterStatus !== "active" ||
    filterPriority !== "all" ||
    filterUrgency !== "all" ||
    !!filterYear ||
    !!filterMonthNum;

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("active");
    setFilterPriority("all");
    setFilterUrgency("all");
    setFilterYear("");
    setFilterMonthNum("");
  };

  const activeFilterCount = [
    search,
    filterStatus !== "active",
    filterPriority !== "all",
    filterUrgency !== "all",
    filterYear,
    filterMonthNum,
  ].filter(Boolean).length;

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PER_PAGE));
  const pagedTasks = filteredTasks.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="h-5 bg-slate-200 rounded w-32 animate-pulse mb-3" />
          <div className="h-2 bg-slate-100 rounded-full w-full animate-pulse mb-2" />
          <div className="h-3 bg-slate-100 rounded w-40 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

      {/* ── Header + Stats ── */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Task Pribadi</h2>
              <p className="text-[10px] text-slate-400">Task yang di-assign ke saya</p>
            </div>
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${showFilters || isFiltered
              ? "bg-purple-50 border-purple-300 text-purple-700"
              : "bg-white border-slate-300 text-slate-600 hover:border-purple-300"
              }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filter
            {isFiltered && activeFilterCount > 0 && (
              <span className="h-4 w-4 flex items-center justify-center bg-purple-600 text-white rounded-full text-[9px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Progress bar keseluruhan */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Progress Keseluruhan</span>
            <span className="font-bold text-slate-700">{stats.pct}% selesai</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700"
              style={{ width: `${stats.pct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <span className="text-green-600 font-semibold">✓ {stats.done} selesai</span>
            <span className="text-blue-600">⏳ {stats.active} aktif</span>
            {stats.overdue > 0 && (
              <span className="text-red-600 font-semibold">❌ {stats.overdue} terlambat</span>
            )}
            <span className="text-slate-400 ml-auto">{stats.total} total task</span>
          </div>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul task atau project..."
              className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none bg-white"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Status + Bulan */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 outline-none bg-white"
              >
                <option value="active">Belum Selesai</option>
                <option value="all">Semua Status</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="submitted_for_review">For Review</option>
                <option value="revision_required">Revision</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Deadline Bulan</label>
              <div className="flex gap-1">
                <select
                  value={filterMonthNum}
                  onChange={e => setFilterMonthNum(e.target.value)}
                  className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                >
                  <option value="">Bulan</option>
                  {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
                    .map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-1/2 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                >
                  <option value="">Tahun</option>
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Prioritas */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-500 mr-1">Prioritas:</span>
            {[
              { val: "all", label: "Semua" },
              { val: "critical", label: "🔴 Critical" },
              { val: "medium", label: "🟡 Medium" },
              { val: "low", label: "🟢 Low" },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => setFilterPriority(val)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${filterPriority === val
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white border-slate-200 text-slate-500 hover:border-purple-300"
                  }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Urgensi deadline + Reset */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-semibold text-slate-500 mr-1">Deadline:</span>
              {[
                { val: "all", label: "Semua" },
                { val: "today", label: "Hari Ini" },
                { val: "week", label: "7 Hari" },
                { val: "overdue", label: "⚠️ Lewat" },
              ].map(({ val, label }) => (
                <button key={val} onClick={() => setFilterUrgency(val)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border transition ${filterUrgency === val
                    ? "bg-purple-600 border-purple-600 text-white"
                    : "bg-white border-slate-200 text-slate-500 hover:border-purple-300"
                    }`}>
                  {label}
                </button>
              ))}
            </div>
            {isFiltered && (
              <button onClick={clearFilters}
                className="text-[10px] text-red-500 hover:text-red-700 font-semibold transition">
                ✕ Reset Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Results summary ── */}
      {isFiltered && !loading && (
        <div className="px-5 pt-3 pb-0">
          <p className="text-[10px] text-purple-600 font-medium">
            Menampilkan {filteredTasks.length} dari {allTasks.length} task
          </p>
        </div>
      )}

      {/* ── Task List ── */}
      <div className="p-4 space-y-2.5 flex-1">
        {pagedTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-3">
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              {isFiltered ? "Tidak ada task yang cocok" : "Semua task sudah selesai 🎉"}
            </p>
            {isFiltered ? (
              <button onClick={clearFilters} className="text-xs text-purple-500 hover:underline mt-1">
                Reset filter
              </button>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Tidak ada task aktif saat ini</p>
            )}
          </div>
        ) : (
          pagedTasks.map((task) => {
            const statusCfg = statusOf(task.status);
            const priorityCfg = priorityOf(task.priority);
            const myRole = task.assignees.find(a => a.employee_id === employeeId)?.role || "assignee";
            const days = getDaysRemaining(task.enddate);
            const timeline = getTimelineProgress(task.startdate, task.enddate);
            const isDone = task.status === "completed";
            const isOverdue = !isDone && days !== null && days < 0;
            const isToday = !isDone && days === 0;
            const isThisWeek = !isDone && days !== null && days > 0 && days <= 7;

            return (
              <a
                key={task.id}
                href={`/projectmanagement/month/${task.monthly_id}?task=${task.id}`}
                className={`group block p-3 rounded-xl border transition-all ${isOverdue
                  ? "border-red-200 bg-red-50/40 hover:border-red-300 hover:shadow-sm"
                  : isToday
                    ? "border-amber-200 bg-amber-50/40 hover:border-amber-300 hover:shadow-sm"
                    : isDone
                      ? "border-slate-100 bg-slate-50 opacity-65 hover:opacity-100"
                      : "border-slate-200 bg-white hover:border-purple-200 hover:shadow-sm"
                  }`}
              >
                {/* Judul + Prioritas */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`text-xs font-semibold leading-snug line-clamp-1 group-hover:text-purple-700 transition ${isDone ? "line-through text-slate-400" : isOverdue ? "text-red-800" : "text-slate-800"
                    }`}>
                    {task.title}
                  </h4>
                  <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold rounded border ${priorityCfg.pill}`}>
                    {priorityCfg.label}
                  </span>
                </div>

                {/* Project path */}
                <p className="text-[10px] text-slate-400 mb-2 truncate">
                  📁 {task.project_title} › {task.monthly_title}
                </p>

                {/* Status + Role */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${statusCfg.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${myRole === "pic"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>
                    {myRole === "pic" ? "PIC" : "CO-PIC"}
                  </span>
                </div>

                {/* Timeline progress bar */}
                {timeline !== null ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-400 truncate">
                        {formatDateId(task.startdate)} → {formatDateId(task.enddate)}
                      </span>
                      <span className={`text-[10px] font-bold flex-shrink-0 ml-2 ${isDone ? "text-green-600" :
                        isOverdue ? "text-red-600" :
                          isToday ? "text-amber-600" :
                            isThisWeek ? "text-orange-500" : "text-slate-500"
                        }`}>
                        {isDone ? "✓ Selesai"
                          : days === null ? "—"
                            : days < 0 ? `Lewat ${Math.abs(days)} hari`
                              : days === 0 ? "🔥 Hari ini!"
                                : days <= 7 ? `⚠️ ${days} hari lagi`
                                  : `${days} hari lagi`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${isDone ? "bg-green-500" :
                          isOverdue ? "bg-red-500" :
                            isToday ? "bg-amber-500" :
                              isThisWeek ? "bg-orange-400" : "bg-purple-500"
                          }`}
                        style={{ width: `${isDone ? 100 : timeline}%` }}
                      />
                    </div>
                    {!isDone && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeline}% waktu berlalu</p>
                    )}
                  </div>
                ) : task.enddate ? (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Deadline: {formatDateId(task.enddate)}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400">Tidak ada deadline</p>
                )}
              </a>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {filteredTasks.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredTasks.length)} dari {filteredTasks.length} task
            {isFiltered && <span className="text-slate-300"> (filter aktif)</span>}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-6 w-6 flex items-center justify-center rounded border text-[10px] font-semibold transition ${p === page
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
  );
}