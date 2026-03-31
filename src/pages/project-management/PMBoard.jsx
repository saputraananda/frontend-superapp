import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineHome } from "react-icons/hi2";
import { api } from "../../lib/api";

import { usePMBoard } from "./hooks/usePMBoard";
import { ToastContainer } from "./components/ui/ToastContainer";
import { ModalDialog } from "./components/ui/ModalDialog";
import { ProgressBar } from "./components/ui/ProgressBar";
import { TaskListPanel } from "./components/pm/TaskListPanel";
import { TaskDetailPanel } from "./components/pm/TaskDetailPanel";
import { AddTaskModal } from "./components/pm/AddTaskModal";
import { NotifPanel } from "./components/pm/NotifPanel";
import { EvidencePanel } from "./components/pm/EvidencePanel";
import { initials } from "./utils/pmUtils";

export default function PMBoard() {
  const { monthlyId } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const from = location.state || {};

  const [openAdd, setOpenAdd] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const board = usePMBoard(monthlyId);

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  function capitalizeEachWord(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ← Set title saat data monthly berhasil dimuat
  useEffect(() => {
    if (board.monthly?.title) {
      document.title = `${board.monthly.title} — Task Board | Project Management Alora`;
    } else {
      document.title = "Task Board | Project Management Alora";
    }
  }, [board.monthly?.title]);

  const handleBack = () => {
    if (from?.projectId && from?.semesterId)
      return nav(`/projectmanagement/${from.projectId}/semester/${from.semesterId}`);
    nav("/projectmanagement");
  };

  // Setelah board selesai load, auto-select task dari URL:
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && board.tasks.length > 0) {
      const numId = Number(taskId);
      const found = board.tasks.find(t => t.id === numId);
      if (found) board.selectTask(found);
    }
  }, [board.tasks, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastContainer />
      <ModalDialog />

      {/* Topbar */}
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 sm:h-18 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => nav("/apps")}
              title="Kembali ke Portal Alora"
              className="flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition">
              <HiOutlineHome className="h-5 w-5" />
            </button>
            <button type="button" onClick={handleBack}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition">
              <HiOutlineArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Sub Division</span>
            </button>
          </div>

          <div className="flex-1 min-w-0 text-center">
            <div className="text-sm font-bold text-slate-900 truncate">{board.monthly?.title || "Task Board"}</div>
            <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">
              {board.taskStats.done}/{board.taskStats.total} selesai · {board.progress}% progress
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button type="button" onClick={() => setShowNotifs(true)}
              className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition">
              <span className="text-sm">🔔</span>
              {board.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center px-1">
                  {board.unreadCount > 9 ? "9+" : board.unreadCount}
                </span>
              )}
            </button>
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-slate-800">
                  {capitalizeEachWord(board.employee?.full_name || "User")}
                </div>
                <div className="text-xs text-slate-400">
                  {board.isDirektur ? "Direktur" : board.isSupervisor ? "Supervisor" : "Staff"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDropdown(v => !v)}
                className="h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white text-xs font-bold shadow-sm transition"
              >
                {initials(board.employee?.full_name)}
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
        </div>
      </header>

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
              { label: "Total Tasks", value: board.taskStats.total, cls: "border-slate-200" },
              { label: "In Progress", value: board.taskStats.inProgress, cls: "border-amber-200 bg-amber-50" },
              { label: "Completed", value: board.taskStats.done, cls: "border-emerald-200 bg-emerald-50" },
              { label: "Critical", value: board.taskStats.critical, cls: "border-rose-200 bg-rose-50" },
              { label: "Overdue", value: board.taskStats.overdue, cls: "border-orange-200 bg-orange-50" },
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
            statusFilter={board.statusFilter} setStatusFilter={board.setStatusFilter}
            priorityFilter={board.priorityFilter} setPriorityFilter={board.setPriorityFilter}
            monthFilter={board.monthFilter} setMonthFilter={board.setMonthFilter}
            query={board.query} setQuery={board.setQuery}
            meOnly={board.meOnly} setMeOnly={board.setMeOnly}
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