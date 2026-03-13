import { useState, useEffect } from "react";
import { api } from "../../../lib/api";

const PER_PAGE = 3; // ← jumlah task per halaman

export default function PersonalTasksCard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming"); // upcoming, overdue, today
  const [employeeId, setEmployeeId] = useState(null);
  const [page, setPage] = useState(1); // ← tambah state page

  useEffect(() => {
    // Get employee ID from localStorage
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const userData = parsed.user ?? parsed;
        const empId = userData.employee?.employee_id;
        setEmployeeId(empId);
      }
    } catch (err) {
      console.error("Error getting employee ID:", err);
    }
  }, []);

  useEffect(() => {
    if (!employeeId) return;

    const fetchMyTasks = async () => {
      try {
        setLoading(true);

        // Fetch all projects to get monthlies
        const projectsRes = await api("/api/pm/projects");
        const projects = projectsRes.data || [];

        let allMyTasks = [];

        // Loop through projects to get all tasks
        for (const project of projects) {
          try {
            // Get semesters
            const semestersRes = await api(`/api/pm/projects/${project.id}/semesters`);
            const semesters = semestersRes.data || [];

            for (const semester of semesters) {
              try {
                // Get monthlies
                const monthliesRes = await api(`/api/pm/semesters/${semester.id}/monthlies`);
                const monthlies = monthliesRes.data || [];

                for (const monthly of monthlies) {
                  try {
                    // Get tasks
                    const tasksRes = await api(`/api/pm/monthlies/${monthly.id}/tasks`);
                    const tasks = tasksRes.data || [];

                    // Filter tasks where I'm assigned
                    const myTasks = tasks.filter(task =>
                      task.assignees.some(assignee => assignee.employee_id === employeeId)
                    );

                    // Add context info
                    myTasks.forEach(task => {
                      task.project_title = project.title;
                      task.semester_title = semester.title;
                      task.monthly_title = monthly.title;
                      task.monthly_id = monthly.id;
                      task.project_id = project.id;
                      task.semester_id = semester.id;
                    });

                    allMyTasks = [...allMyTasks, ...myTasks];
                  } catch (err) {
                    console.error(`Error fetching tasks for monthly ${monthly.id}:`, err);
                  }
                }
              } catch (err) {
                console.error(`Error fetching monthlies for semester ${semester.id}:`, err);
              }
            }
          } catch (err) {
            console.error(`Error fetching semesters for project ${project.id}:`, err);
          }
        }

        setTasks(allMyTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyTasks();
  }, [employeeId]);

  const getFilteredTasks = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return tasks.filter(task => {
      if (!task.enddate) return filter === "upcoming"; // No deadline = upcoming

      const endDate = new Date(task.enddate);
      const taskDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

      if (filter === "today") {
        return taskDate.getTime() === today.getTime();
      } else if (filter === "overdue") {
        return taskDate < today && task.status !== "done";
      } else { // upcoming
        return taskDate >= today && task.status !== "done";
      }
    }).sort((a, b) => {
      if (!a.enddate) return 1;
      if (!b.enddate) return -1;
      return new Date(a.enddate) - new Date(b.enddate);
    }).slice(0, 5); // Limit to 5 tasks
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No deadline";
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return "Hari Ini";
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return "Besok";
    } else {
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getTaskTypeInfo = (task) => {
    if (!task.enddate) return { type: "upcoming", color: "blue" };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(task.enddate);
    const taskDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (taskDate.getTime() === today.getTime()) {
      return { type: "today", color: "rose" };
    } else if (taskDate < today && task.status !== "done") {
      return { type: "overdue", color: "red" };
    } else {
      return { type: "upcoming", color: "blue" };
    }
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      critical: { color: "bg-red-100 text-red-700 border-red-200", label: "Critical" },
      medium: { color: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium" },
      low: { color: "bg-green-100 text-green-700 border-green-200", label: "Low" }
    };
    return badges[priority] || badges.medium;
  };

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };

  const filteredTasks = getFilteredTasks(); // semua hasil filter (tidak di-slice)
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PER_PAGE));
  const pagedTasks = filteredTasks.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="p-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/50 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-slate-800">Task Pribadi</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200">
            {filteredTasks.length} tasks
          </span>
        </div>

        {/* Filter Tabs — ganti setFilter → handleFilterChange */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleFilterChange("upcoming")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filter === "upcoming"
                ? "bg-white text-blue-600 border border-blue-200 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
          >
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Upcoming
            </span>
          </button>
          <button
            onClick={() => handleFilterChange("today")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filter === "today"
                ? "bg-white text-rose-600 border border-rose-200 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
          >
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Today
            </span>
          </button>
          <button
            onClick={() => handleFilterChange("overdue")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${filter === "overdue"
                ? "bg-white text-red-600 border border-red-200 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
          >
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Overdue
            </span>
          </button>
        </div>
      </div>

      {/* Task List — ganti filteredTasks → pagedTasks */}
      <div className="p-4 space-y-2 flex-1">
        {pagedTasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-3">
              <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500 font-medium">Tidak ada task {filter}</p>
            <p className="text-xs text-slate-400 mt-1">Semua task sudah selesai 🎉</p>
          </div>
        ) : (
          pagedTasks.map((task) => {
            const typeInfo = getTaskTypeInfo(task);
            const priorityBadge = getPriorityBadge(task.priority);
            const myRole = task.assignees.find(a => a.employee_id === employeeId)?.role || "assignee";

            return (
              <a
                key={task.id}
                href={`/projectmanagement/month/${task.monthly_id}?task=${task.id}`}
                className="group flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${typeInfo.color === "rose"
                      ? "bg-rose-100 text-rose-600 border border-rose-200"
                      : typeInfo.color === "red"
                        ? "bg-red-100 text-red-600 border border-red-200"
                        : "bg-blue-100 text-blue-600 border border-blue-200"
                    }`}
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-purple-600 transition">
                      {task.title}
                    </h4>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full border ${priorityBadge.color}`}>
                      {priorityBadge.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-2 line-clamp-1">
                    📁 {task.project_title} → {task.monthly_title}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`flex items-center gap-1 ${typeInfo.type === "overdue" ? "text-red-600 font-semibold" : "text-slate-600"
                        }`}>
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(task.enddate)}
                      </span>
                      {task.enddate && (
                        <span className="text-slate-400">
                          {formatTime(task.enddate)}
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${myRole === "pic"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                      {myRole === "pic" ? "PIC" : "CO-PIC"}
                    </span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Footer — ganti dengan pagination */}
      {filteredTasks.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
          {/* Info */}
          <p className="text-[10px] text-slate-400">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredTasks.length)} dari {filteredTasks.length} task
          </p>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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

            {/* Next */}
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
  );
}