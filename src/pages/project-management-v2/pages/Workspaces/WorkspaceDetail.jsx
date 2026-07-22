import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../../lib/api";
import {
  HiOutlineQueueList,
  HiOutlineTableCells,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineArrowLeft,
  HiOutlineSquares2X2,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineLink,
  HiOutlineBriefcase,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineCheckBadge,
  HiOutlinePencilSquare
} from "react-icons/hi2";
import AddTaskModal from "../../components/AddTaskModal";
import TaskDetailModal from "../../components/TaskDetailModal";
import EditWorkspaceModal from "../../components/EditWorkspaceModal";

const STATUS_COLUMNS = {
  "To Do":      { label: "To Do",       color: "border-t-slate-400" },
  "In Progress":{ label: "In Progress", color: "border-t-blue-500" },
  "Review":     { label: "Review",      color: "border-t-amber-500" },
  "Completed":  { label: "Completed",   color: "border-t-emerald-500" },
};

const PRIORITY_BADGES = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_BADGE = {
  "To Do":      "bg-slate-100 text-slate-600",
  "In Progress":"bg-blue-100 text-blue-600",
  "Review":     "bg-amber-100 text-amber-700",
  "Completed":  "bg-emerald-100 text-emerald-700",
};

// Capitalize each word helper
const capitalizeEachWord = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Format external URL helper
const formatExternalUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
};

export default function WorkspaceDetail() {
  const { workspaceId, subId } = useParams();
  const navigate = useNavigate();

  const [subWorkspace, setSubWorkspace] = useState(null);
  const [subWorkspaces, setSubWorkspaces] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("board");
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Custom modals state
  const [taskToDeleteId, setTaskToDeleteId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showEditWorkspace, setShowEditWorkspace] = useState(false);
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);

  // Search & Filters states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dueDateType, setDueDateType] = useState(""); // '', 'today', 'this-week', 'overdue', 'custom'
  const [customDueDate, setCustomDueDate] = useState("");
  const [filterSubWorkspace, setFilterSubWorkspace] = useState("");

  // Dynamic Month & Year options from task data
  const availableMonths = Array.from(
    new Set(
      tasks
        .map((t) => t.enddate || t.startdate)
        .filter(Boolean)
        .map((d) => new Date(d).getMonth() + 1)
    )
  ).sort((a, b) => a - b);

  const availableYears = Array.from(
    new Set(
      tasks
        .map((t) => t.enddate || t.startdate)
        .filter(Boolean)
        .map((d) => new Date(d).getFullYear())
    )
  ).sort((a, b) => a - b);

  const availablePositions = Array.from(
    new Set(
      tasks
        .map((t) => t.position_name)
        .filter(Boolean)
    )
  ).sort();

  const MONTH_NAMES = {
    1: "Januari",
    2: "Februari",
    3: "Maret",
    4: "April",
    5: "Mei",
    6: "Juni",
    7: "Juli",
    8: "Agustus",
    9: "September",
    10: "Oktober",
    11: "November",
    12: "Desember",
  };

  const loadSubWorkspace = async () => {
    try {
      const data = await api(`/api/pm2/workspaces/${workspaceId}/sub`);
      setSubWorkspaces(data?.data || []);
      if (subId) {
        const sub = (data?.data || []).find((s) => String(s.id) === String(subId));
        setSubWorkspace(sub || null);
      } else {
        const workspacesData = await api(`/api/pm2/workspaces`);
        const ws = (workspacesData?.data || []).find((w) => String(w.id) === String(workspaceId));
        setSubWorkspace(ws ? { ...ws, isFullWorkspace: true } : null);
      }
    } catch (err) {
      console.error("Gagal memuat sub-workspace:", err);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const url = subId
        ? `/api/pm2/sub-workspaces/${subId}/tasks`
        : `/api/pm2/workspaces/${workspaceId}/tasks`;
      const data = await api(url);
      setTasks(data?.data || []);
    } catch (err) {
      console.error("Gagal memuat tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      await api(`/api/pm2/workspaces/${workspaceId}`, { method: "DELETE" });
      window.dispatchEvent(new Event("pm2_workspaces_updated"));
      navigate("/project-management-v2/workspaces");
    } catch (err) {
      console.error("Gagal menghapus workspace:", err);
    }
  };

  useEffect(() => {
    loadSubWorkspace();
    loadTasks();
  }, [workspaceId, subId]);

  const filteredTasks = tasks.filter((task) => {
    // 1. Search term match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = task.title?.toLowerCase().includes(q);
      const matchDesc = task.desc?.toLowerCase().includes(q);
      const matchPic = task.pic_name?.toLowerCase().includes(q);
      const matchOwner = task.owner_name?.toLowerCase().includes(q);
      const matchPosition = task.position_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchPic && !matchOwner && !matchPosition) return false;
    }

    // 2. Priority match
    if (filterPriority && task.priority !== filterPriority) return false;

    // 3. Status match
    if (filterStatus && task.status !== filterStatus) return false;

    // 3b. Position match
    if (filterPosition && task.position_name !== filterPosition) return false;

    // 4. Date Range match
    if (startDate) {
      const taskStart = task.startdate ? new Date(task.startdate) : null;
      const filterStart = new Date(startDate);
      if (!taskStart || taskStart < filterStart) return false;
    }
    if (endDate) {
      const taskEnd = task.enddate ? new Date(task.enddate) : null;
      const filterEnd = new Date(endDate);
      if (!taskEnd || taskEnd > filterEnd) return false;
    }

    // 5. Month & Year match
    const taskDateStr = task.enddate || task.startdate;
    if (taskDateStr) {
      const d = new Date(taskDateStr);
      if (filterMonth && String(d.getMonth() + 1) !== String(filterMonth)) return false;
      if (filterYear && String(d.getFullYear()) !== String(filterYear)) return false;
    } else {
      if (filterMonth || filterYear) return false;
    }

    // 6. Due Date (Deadline) Filter
    if (dueDateType) {
      if (!task.enddate) return false;
      const deadline = new Date(task.enddate);
      deadline.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDateType === "today") {
        if (deadline.getTime() !== today.getTime()) return false;
      } else if (dueDateType === "this-week") {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        if (deadline < startOfWeek || deadline > endOfWeek) return false;
      } else if (dueDateType === "overdue") {
        if (deadline >= today || task.status === "Completed") return false;
      } else if (dueDateType === "custom") {
        if (customDueDate) {
          const customDate = new Date(customDueDate);
          customDate.setHours(0, 0, 0, 0);
          if (deadline.getTime() !== customDate.getTime()) return false;
        }
      }
    }

    // 7. Sub-Workspace match (only applies if we are in main Workspace detail page where subId is missing)
    if (!subId && filterSubWorkspace) {
      if (filterSubWorkspace === "none") {
        if (task.id_pm_detail !== null) return false;
      } else {
        if (String(task.id_pm_detail) !== String(filterSubWorkspace)) return false;
      }
    }

    return true;
  });

  const getColumnTasks = (statusKey) => filteredTasks.filter((t) => t.status === statusKey);

  const handleMoveStatus = async (taskId, newStatus) => {
    try {
      await api(`/api/pm2/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadTasks();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteTask = (taskId) => {
    setTaskToDeleteId(taskId);
  };

  const confirmDeleteTask = async (taskId) => {
    try {
      await api(`/api/pm2/tasks/${taskId}`, { method: "DELETE" });
      loadTasks();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Strip HTML tags for card preview
  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(subId ? `/project-management-v2/workspaces/${workspaceId}` : `/project-management-v2/workspaces`)}
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <HiOutlineArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow">
                <HiOutlineSquares2X2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-800 leading-snug">
                    {subWorkspace?.title || (subId ? "Sub-Workspace" : "Workspace")}
                  </h1>
                  {!subId && subWorkspace && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setShowEditWorkspace(true)}
                        title="Edit Workspace"
                        className="rounded-lg p-1 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteWorkspaceModal(true)}
                        title="Hapus Workspace"
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {subWorkspace?.desc || "Tidak ada deskripsi"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Progress */}
              <div className="hidden md:flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-slate-500">{completedCount}/{tasks.length} Selesai</span>
                <div className="w-28 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{progress}% progress</span>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode("board")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "board" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  <HiOutlineQueueList className="h-4 w-4" /> Board
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                  <HiOutlineTableCells className="h-4 w-4" /> List
                </button>
              </div>

              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20"
              >
                <HiOutlinePlus className="h-4 w-4" />
                Tambah Task
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar & Filter Toggle Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:flex-1">
            <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari berdasarkan judul, deskripsi, PIC, owner, position..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <HiOutlineXMark className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Toggle Filter Panel Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full md:w-auto flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition shadow-sm h-[38px] ${
              showFilters
                ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <HiOutlineFunnel className="h-4 w-4 text-slate-450" />
            Filter {showFilters ? "Tutup" : "Buka"}
            {(filterPriority || filterStatus || filterPosition || filterMonth || filterYear || startDate || endDate || dueDateType || filterSubWorkspace) && (
              <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block animate-pulse" />
            )}
          </button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
            {/* Priority */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Prioritas</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Prioritas</option>
                <option value="critical">Critical</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Status</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            {/* Position */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Position</label>
              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Position</option>
                {availablePositions.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Bulan */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bulan</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Bulan</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{MONTH_NAMES[m] || `Bulan ${m}`}</option>
                ))}
              </select>
            </div>

            {/* Tahun */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tahun</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Tahun</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Date Range Start (Dari) */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mulai Dari</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              />
            </div>

            {/* Date Range End (Sampai) */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mulai Sampai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              />
            </div>

            {/* Sub-Workspace Filter (Only visible on main Workspace page) */}
            {!subId && (
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sub-Workspace</label>
                <select
                  value={filterSubWorkspace}
                  onChange={(e) => setFilterSubWorkspace(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition text-slate-800"
                >
                  <option value="">Semua Sub-Workspace &amp; Tanpa Sub</option>
                  <option value="none">Hanya Tanpa Sub-Workspace</option>
                  {subWorkspaces.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Due Date Filter */}
            <div>
              <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Due Date (Deadline)</label>
              <select
                value={dueDateType}
                onChange={(e) => setDueDateType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
              >
                <option value="">Semua Deadline</option>
                <option value="today">Hari Ini</option>
                <option value="this-week">Minggu Ini</option>
                <option value="overdue">Overdue (Terlewat)</option>
                <option value="custom">Tanggal Tertentu</option>
              </select>
            </div>

            {/* Custom Due Date Input */}
            {dueDateType === "custom" ? (
              <div>
                <label className="block mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pilih Tanggal Deadline</label>
                <input
                  type="date"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs outline-none focus:bg-white focus:border-indigo-400 transition"
                />
              </div>
            ) : <div />}

            {/* Reset Filter Button */}
            <div className="sm:col-span-2 md:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFilterPriority("");
                  setFilterStatus("");
                  setFilterPosition("");
                  setFilterMonth("");
                  setFilterYear("");
                  setStartDate("");
                  setEndDate("");
                  setDueDateType("");
                  setCustomDueDate("");
                  setSearchTerm("");
                  setFilterSubWorkspace("");
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition shadow-sm"
              >
                Reset Semua Filter
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs">Memuat daftar task...</p>
          </div>
        ) : viewMode === "board" ? (

          /* ── Kanban Board ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Object.entries(STATUS_COLUMNS).map(([statusKey, col]) => (
              <div key={statusKey}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const tId = e.dataTransfer.getData("taskId");
                  if (tId) handleMoveStatus(tId, statusKey);
                }}
                className={`rounded-2xl border-t-4 border-x border-b border-slate-200 bg-white p-4 shadow-sm flex flex-col min-h-[320px] ${col.color}`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800">{col.label}</h3>
                  <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {getColumnTasks(statusKey).length}
                  </span>
                </div>

                <div className="flex-1 py-3 space-y-3 overflow-y-auto">
                  {getColumnTasks(statusKey).length === 0 ? (
                    <p className="text-center text-[11px] text-slate-300 italic pt-6">Tidak ada task</p>
                  ) : (
                    getColumnTasks(statusKey).map((task) => (
                      <div key={task.id}
                        draggable="true"
                        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className="group cursor-pointer rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition active:cursor-grabbing">
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 flex-1">
                            {task.title}
                          </h4>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            className="opacity-0 group-hover:opacity-100 shrink-0 text-rose-400 hover:text-rose-600 transition"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {task.desc && (
                          <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {stripHtml(task.desc)}
                          </p>
                        )}

                        <div className="mt-3 space-y-1.5">
                          {task.enddate && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <HiOutlineClock className="h-3 w-3 shrink-0" />
                              {new Date(task.enddate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
                          {task.pic_name && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <HiOutlineUser className="h-3 w-3 shrink-0" />
                              {capitalizeEachWord(task.pic_name)}
                            </div>
                          )}
                          {task.position_name && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              <HiOutlineBriefcase className="h-3 w-3 shrink-0" />
                              {task.position_name}
                            </div>
                          )}
                          {task.sub_workspace_title && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 rounded px-1 w-fit">
                              <HiOutlineSquares2X2 className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[120px]">{task.sub_workspace_title}</span>
                            </div>
                          )}
                          {task.link && (
                            <a href={formatExternalUrl(task.link)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                              className="flex items-center gap-1 text-[10px] text-indigo-500 hover:underline">
                              <HiOutlineLink className="h-3 w-3 shrink-0" />
                              {task.evidance || "Link Referensi"}
                            </a>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                          <span
                            title={task.priority}
                            className={`inline-block h-3 w-3 rounded-full ${
                              task.priority === "critical" ? "bg-rose-500" :
                              task.priority === "low"      ? "bg-emerald-500" :
                              "bg-amber-400"
                            }`}
                          />
                          <select
                            value={task.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleMoveStatus(task.id, e.target.value)}
                            className="text-[10px] rounded-lg border border-slate-200 px-1.5 py-1 outline-none bg-white"
                          >
                            {Object.keys(STATUS_COLUMNS).map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

        ) : (

          /* ── List Table ── */
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3.5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800">Semua Task</h3>
              <span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {filteredTasks.length} / {tasks.length} Task
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 font-bold border-b border-slate-100 whitespace-nowrap">
                    <th className="py-3 px-4 w-10 text-center">No</th>
                    <th className="py-3 px-4 min-w-[280px]">Judul Task</th>
                    {!subId && <th className="py-3 px-4 text-center">Sub Workspace</th>}
                    <th className="py-3 px-2 text-center w-8" title="Prioritas">P</th>
                    <th className="py-3 px-4 text-center">PIC</th>
                    <th className="py-3 px-4 text-center">Position</th>
                    <th className="py-3 px-4 text-center">Start Date</th>
                    <th className="py-3 px-4 text-center">Deadline</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={subId ? 9 : 10} className="py-12 text-center text-slate-400 italic">
                        Belum ada task yang sesuai dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task, idx) => (
                      <tr key={task.id} className="hover:bg-slate-50/30 transition">
                        <td className="py-3 px-4 text-slate-400 font-medium cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>{idx + 1}</td>
                        <td className="py-3 px-4 cursor-pointer min-w-[280px]" onClick={() => setSelectedTaskId(task.id)}>
                          <p className="font-bold text-slate-800 hover:text-indigo-600 transition">
                            {task.title}
                          </p>
                        </td>
                        {!subId && (
                          <td className="py-3 px-4 font-semibold text-slate-500 text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                            {task.sub_workspace_title || "—"}
                          </td>
                        )}
                        <td className="py-3 px-2 text-center cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                          <span
                            title={task.priority}
                            className={`inline-block h-3 w-3 rounded-full ${
                              task.priority === "critical" ? "bg-rose-500" :
                              task.priority === "low"      ? "bg-emerald-500" :
                              "bg-amber-400"
                            }`}
                          />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600 text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                          {capitalizeEachWord((task.pic_name || "").split(" ")[0]) || "—"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-500 text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                          {task.position_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                          {task.startdate
                            ? new Date(task.startdate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                          {task.enddate
                            ? new Date(task.enddate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-center cursor-pointer whitespace-nowrap" onClick={() => setSelectedTaskId(task.id)}>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGE[task.status] || "bg-slate-100 text-slate-600"}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <select
                              value={task.status}
                              onChange={(e) => handleMoveStatus(task.id, e.target.value)}
                              className="text-[10px] rounded-lg border border-slate-200 px-2 py-1 outline-none bg-white"
                            >
                              {Object.keys(STATUS_COLUMNS).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                              <HiOutlineTrash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* AddTaskModal — modular component */}
      <AddTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        onSuccess={loadTasks}
        subWorkspaceId={subId}
        workspaceId={workspaceId}
      />

      {/* TaskDetailModal — modular component */}
      <TaskDetailModal
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        taskId={selectedTaskId}
        onSuccess={loadTasks}
      />

      {/* Custom Delete Task Confirmation Modal */}
      {taskToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-inner">
              <HiOutlineTrash className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Hapus Task?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Task yang dihapus tidak bisa dikembalikan. Apakah Anda yakin ingin melanjutkan?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDeleteTask(taskToDeleteId);
                  setTaskToDeleteId(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition active:scale-95 shadow-md shadow-rose-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Error Alert Modal */}
      {errorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-inner">
              <HiOutlineXMark className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">Gagal</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white hover:bg-slate-900 transition active:scale-95 shadow-md shadow-slate-800/20"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Custom Edit Workspace Modal */}
      <EditWorkspaceModal
        open={showEditWorkspace}
        onClose={() => setShowEditWorkspace(false)}
        onSuccess={() => {
          loadSubWorkspace();
        }}
        workspace={subWorkspace ? { 
          id: workspaceId, 
          title: subWorkspace.title, 
          desc: subWorkspace.desc,
          company_id: subWorkspace.company_id,
          employee_ids: subWorkspace.employee_ids,
          position_ids: subWorkspace.position_ids
        } : null}
      />

      {/* Custom Delete Workspace Modal Overlay */}
      {showDeleteWorkspaceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center space-y-4 animate-scaleUp">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shadow-inner">
              <HiOutlineTrash className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Hapus Workspace?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Workspace "{subWorkspace?.title}" dan semua sub-workspace-nya akan dihapus secara permanen. Apakah Anda yakin?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteWorkspaceModal(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteWorkspace();
                  setShowDeleteWorkspaceModal(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition active:scale-95 shadow-md shadow-rose-600/20"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
