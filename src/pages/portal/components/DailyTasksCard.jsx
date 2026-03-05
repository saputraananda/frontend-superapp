import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import DailyTaskModal from "./DailyTaskModal";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const PER_PAGE = 3; // ← jumlah task per halaman

const recurLabel = (task) => {
  if (!task.is_recurring) return null;
  if (task.recur_type === "daily") return "🔁 Setiap Hari";
  if (task.recur_type === "weekly")
    return `🔁 Setiap ${DAYS[task.recur_day] ?? ""}`;
  if (task.recur_type === "monthly") return "🔁 Setiap Bulan";
  return null;
};

function TaskItem({ task, onClick }) {
  const recur = recurLabel(task);
  const date = new Date(task.created_at);
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onClick(task)}
      className="w-full text-left p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition group"
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center">
          {task.is_recurring ? (
            <span className="text-sm">🔁</span>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-blue-700 line-clamp-1">
              {task.title}
            </h4>
            <span className="flex-shrink-0 text-[10px] text-slate-400 whitespace-nowrap">{dateStr}</span>
          </div>

          {/* Department badge di TaskItem */}
          {task.department_name && (
            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 text-violet-700 rounded">
              {task.department_name}
            </span>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {recur && (
              <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                {recur}
              </span>
            )}
            {task.link_url && (
              <a
                href={task.link_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
              >
                🔗 Link
              </a>
            )}
            {task.evidences?.length > 0 && (
              <span className="text-[10px] text-slate-500">
                📎 {task.evidences.length} file
              </span>
            )}
          </div>

          {/* Creator */}
          <p className="text-[10px] text-slate-400 mt-1">
            oleh <span className="font-medium text-slate-500">{task.creator_name}</span>
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
  const [page, setPage]                 = useState(1); // ← tambah state page

  const loadTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const d = await api("/daily-tasks");
      setTasks(d.tasks || []);
      setPage(1); // reset ke halaman 1 setiap reload
    } catch {
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

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
      setPage(1); // kembali ke halaman 1 saat ada task baru
    } else if (mode === "edit") {
      setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)));
    } else if (mode === "delete") {
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== savedTask.id);
        // Kalau hapus task terakhir di halaman > 1, mundur 1 halaman
        const maxPage = Math.max(1, Math.ceil(next.length / PER_PAGE));
        if (page > maxPage) setPage(maxPage);
        return next;
      });
    }
  };

  // Hitung data paginasi
  const totalPages   = Math.max(1, Math.ceil(tasks.length / PER_PAGE));
  const pagedTasks   = tasks.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">📋 Report Daily Routine</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Harian, rutin, atau dadakan</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah Report
          </button>
        </div>

        {/* Body — hapus max-h & overflow-y, biar tidak scroll */}
        <div className="p-4 space-y-2">
          {loadingTasks ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl">📭</span>
              <p className="text-sm text-slate-500 mt-2 font-medium">Belum ada task</p>
              <p className="text-xs text-slate-400">Klik "Tambah Report" untuk mulai mencatat</p>
            </div>
          ) : (
            pagedTasks.map((task) => (
              <TaskItem key={task.id} task={task} onClick={openEdit} />
            ))
          )}
        </div>

        {/* Footer Pagination */}
        {tasks.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] text-slate-400">
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, tasks.length)} dari {tasks.length} task
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
                  className={`h-6 w-6 flex items-center justify-center rounded border text-[10px] font-semibold transition ${
                    p === page
                      ? "bg-blue-600 border-blue-600 text-white"
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

      {/* Modal */}
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