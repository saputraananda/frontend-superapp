import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { usePMBoard }      from "./hooks/usePMBoard";
import { ToastContainer }  from "./components/ui/ToastContainer";
import { ModalDialog }     from "./components/ui/ModalDialog";
import { ProgressBar }     from "./components/ui/ProgressBar";
import { TaskListPanel }   from "./components/pm/TaskListPanel";
import { TaskDetailPanel } from "./components/pm/TaskDetailPanel";
import { AddTaskModal }    from "./components/pm/AddTaskModal";
import { NotifPanel }      from "./components/pm/NotifPanel";
import { EvidencePanel }   from "./components/pm/EvidencePanel";
import { initials }        from "./utils/pmUtils";

export default function PMBoard() {
  const { monthlyId } = useParams();
  const nav           = useNavigate();
  const location      = useLocation();
  const from          = location.state || {};

  const [openAdd, setOpenAdd]     = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const board = usePMBoard(monthlyId);

  const handleBack = () => {
    if (from?.projectId && from?.semesterId)
      return nav(`/projectmanagement/${from.projectId}/semester/${from.semesterId}`);
    nav("/projectmanagement");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />
      <ModalDialog />

      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <button type="button" onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0">
              <span className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 text-sm transition">←</span>
              <span className="hidden sm:inline text-slate-600">Monthly</span>
            </button>
            <div className="flex-1 min-w-0 text-center">
              <div className="text-sm font-bold text-slate-900 truncate">{board.monthly?.title || "Task Board"}</div>
              <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {board.taskStats.done}/{board.taskStats.total} selesai · {board.progress}% progress
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button type="button" onClick={() => setShowNotifs(true)}
                className="relative h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition">
                <span className="text-sm">🔔</span>
                {board.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center px-1">
                    {board.unreadCount > 9 ? "9+" : board.unreadCount}
                  </span>
                )}
              </button>
              <div className="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                {initials(board.employee?.full_name)}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-800">{board.employee?.full_name || "User"}</div>
                <div className="text-[10px] text-slate-400">
                  {board.isDirektur ? "Direktur" : board.isSupervisor ? "Supervisor" : "Staff"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
        {board.err && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-rose-500 font-bold text-sm">!</span>
            <span className="text-rose-700 text-sm">{board.err}</span>
            <button className="ml-auto text-rose-400 hover:text-rose-600 font-bold" onClick={() => board.setErr("")}>✕</button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{board.monthly?.title || "—"}</h1>
              {board.monthly?.desc && <p className="text-slate-500 text-sm mt-1">{board.monthly.desc}</p>}
            </div>
            <button type="button" onClick={() => setOpenAdd(true)}
              className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all border border-slate-800">
              + Add Task
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Total Tasks", value: board.taskStats.total,      cls: "border-slate-200" },
              { label: "In Progress", value: board.taskStats.inProgress,  cls: "border-amber-200 bg-amber-50" },
              { label: "Completed",   value: board.taskStats.done,        cls: "border-emerald-200 bg-emerald-50" },
              { label: "Critical",    value: board.taskStats.critical,    cls: "border-rose-200 bg-rose-50" },
              { label: "Overdue",     value: board.taskStats.overdue,     cls: "border-orange-200 bg-orange-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border px-4 py-3 bg-white ${s.cls}`}>
                <div className="text-xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1"><ProgressBar value={board.progress} /></div>
            <div className="text-sm font-bold text-slate-700 w-12 text-right shrink-0">{board.progress}%</div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Progress dihitung berdasarkan bobot status setiap task</div>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <TaskListPanel
            filteredTasks={board.filteredTasks}
            selectedId={board.selectedId}
            onSelect={board.selectTask}
            load={board.load}
            statusFilter={board.statusFilter}   setStatusFilter={board.setStatusFilter}
            priorityFilter={board.priorityFilter} setPriorityFilter={board.setPriorityFilter}
            query={board.query}                 setQuery={board.setQuery}
            meOnly={board.meOnly}               setMeOnly={board.setMeOnly}
            employee={board.employee}
            loading={board.loading}
          />
          <TaskDetailPanel board={board} EvidencePanel={EvidencePanel} />
        </div>
      </div>

      {openAdd && (
        <AddTaskModal
          monthlyId={monthlyId}
          employees={board.employees}
          employee={board.employee}
          isStaff={board.isStaff}
          onClose={() => setOpenAdd(false)}
          onAdded={board.load}
        />
      )}

      <NotifPanel open={showNotifs} onClose={() => { setShowNotifs(false); board.loadNotifCount(); }} />
    </div>
  );
}