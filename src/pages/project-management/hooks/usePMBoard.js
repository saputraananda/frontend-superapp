import { useState, useEffect, useMemo} from "react";
import { pmApi } from "../pmApi";
import { getEmployeeFromLocal, canSupervisorUp, canDirektur, getJobLevelLabel } from "../role";
import { computeProgress, isOverdue } from "../utils/pmUtils";
import { toast } from "./useToast";
import { customConfirm } from "./useModal";

export function usePMBoard(monthlyId) {
  const employee     = useMemo(() => getEmployeeFromLocal(), []);
  const isDirektur   = useMemo(() => canDirektur(employee), [employee]);
  const isSupervisor = useMemo(() => canSupervisorUp(employee), [employee]);
  const isStaff      = !isSupervisor;
  const roleLabel    = useMemo(() => getJobLevelLabel(employee), [employee]);

  const [loading, setLoading] = useState(true);
  const [monthly, setMonthly] = useState(null);
  const [tasks, setTasks]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [err, setErr]         = useState("");

  const [statusFilter, setStatusFilter]     = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [monthFilter, setMonthFilter]       = useState("all");
  const [query, setQuery]   = useState("");
  const [meOnly, setMeOnly] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [editMode, setEditMode]     = useState(false);

  const [eTitle, setETitle]         = useState("");
  const [eDesc, setEDesc]           = useState("");
  const [eStart, setEStart]         = useState("");
  const [eEnd, setEEnd]             = useState("");
  const [ePriority, setEPriority]   = useState("medium");
  const [eStatus, setEStatus]       = useState("assigned");
  const [eAssignees, setEAssignees] = useState([]);
  const [updating, setUpdating]     = useState(false);

  const [comments, setComments]               = useState([]);
  const [commentText, setCommentText]         = useState("");
  const [sendingComment, setSendingComment]   = useState(false);

  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [monthRes, tasksRes, empRes] = await Promise.all([
        pmApi.getMonthDetail(monthlyId),
        pmApi.listTasks(monthlyId),
        pmApi.listEmployees(),
      ]);
      setMonthly(monthRes?.data || null);
      const t = tasksRes?.data || [];
      setTasks(t);
      setSelectedId((prev) => {
        if (prev && t.find((x) => x.id === prev)) return prev;
        return t[0]?.id || null;
      });
      setEmployees(empRes?.data || []);
    } catch (e) {
      setErr(e?.message || "Gagal load board");
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifCount() {
    try {
      const res = await pmApi.listNotifications();
      setUnreadCount((res?.data || []).filter((n) => !n.is_read).length);
    } catch { /* silent */ }
  }

  async function loadComments(taskId) {
    if (!taskId) return setComments([]);
    try {
      const res = await pmApi.listComments(taskId);
      setComments(res?.data || []);
    } catch { setComments([]); }
  }

  function selectTask(task) {
    setSelectedId(task?.id ?? null);
    setEditMode(false);
    setETitle(task?.title ?? "");
    setEDesc(task?.desc ?? "");
    setEStatus(task?.status ?? "assigned");
    setEPriority(task?.priority ?? "medium");
    setEStart(task?.startdate ? String(task.startdate).slice(0, 10) : "");
    setEEnd(task?.enddate     ? String(task.enddate).slice(0, 10)   : "");
    setEAssignees(task?.assignees?.map((a) => a.employee_id) ?? []);
    // ✅ HAPUS: setComments([]) dan setCommentText("") dari sini
    // Biarkan useEffect [selectedId] yang handle reset komentar
  }

  async function updateTask() {
    if (!selectedId) return;
    if (!eTitle.trim()) { toast.error("Title tidak boleh kosong."); return; }

    // Validasi: staff hanya bisa update task yang di-assign ke mereka
    const currentTask = tasks.find((t) => t.id === selectedId);
    const isAssignedToMe = currentTask?.assignees?.some(
      (a) => a.employee_id === employee?.employee_id
    );
    if (isStaff && !isAssignedToMe) {
      toast.error("Kamu tidak memiliki akses untuk mengedit task ini.");
      return;
    }

    // Staff assigned = akses penuh seperti supervisor
    const payload = {
      title: eTitle.trim(),
      desc: eDesc.replace(/<[^>]*>/g, "").trim() ? eDesc : null,
      startdate: eStart || null,
      enddate: eEnd || null,
      status: eStatus,
      priority: ePriority,
      assignee_ids: eAssignees,
    };

    setUpdating(true);
    try {
      await pmApi.updateTask(selectedId, payload);
      setEditMode(false);
      toast.success("Task berhasil diperbarui");
      await load();
    } catch (e) {
      toast.error(e?.message || "Gagal update task");
    } finally { setUpdating(false); }
  }

  async function deleteTask() {
    if (!selectedId) return;

    // Validasi: staff hanya bisa hapus task yang di-assign ke mereka
    const currentTask = tasks.find((t) => t.id === selectedId);
    const isAssignedToMe = currentTask?.assignees?.some(
      (a) => a.employee_id === employee?.employee_id
    );
    if (isStaff && !isAssignedToMe) {
      toast.error("Kamu tidak memiliki akses untuk menghapus task ini.");
      return;
    }

    const confirmed = await customConfirm(
      "Hapus Task",
      "Task ini akan dihapus permanen beserta semua data terkait.",
      "Hapus Task", true
    );
    if (!confirmed) return;
    try {
      await pmApi.deleteTask(selectedId);
      setEditMode(false);
      setSelectedId(null);
      toast.success("Task berhasil dihapus");
      await load();
    } catch (e) {
      toast.error(e?.message || "Gagal hapus task");
    }
  }

  async function addComment(mentionedIds = []) {
    if (!selectedId || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await pmApi.addComment(selectedId, {
        comment: commentText.trim(),
        mentioned_ids: mentionedIds,  // ← tambah ini
      });
      setCommentText("");
      await loadComments(selectedId);
    } catch (e) {
      toast.error(e?.message || "Gagal kirim comment");
    } finally { setSendingComment(false); }
  }

  useEffect(() => { load(); loadNotifCount(); }, [monthlyId]);
  useEffect(() => { loadComments(selectedId); }, [selectedId]);
  useEffect(() => {
    if (editMode) return;
    const t = tasks.find((x) => x.id === selectedId);
    if (!t) return;
    // sync field edit saja, tanpa ganggu comments
    setETitle(t.title ?? "");
    setEDesc(t.desc ?? "");
    setEStatus(t.status ?? "assigned");
    setEPriority(t.priority ?? "medium");
    setEStart(t.startdate ? String(t.startdate).slice(0, 10) : "");
    setEEnd(t.enddate     ? String(t.enddate).slice(0, 10)   : "");
    setEAssignees(t.assignees?.map((a) => a.employee_id) ?? []);
  }, [tasks, selectedId]); // eslint-disable-line

  const statsTasks = useMemo(() => {
    if (!meOnly) return tasks;
    return tasks.filter((t) => t.assignees?.some((a) => a.employee_id === employee?.employee_id));
  }, [tasks, meOnly, employee]);

  const progress  = useMemo(() => computeProgress(statsTasks), [statsTasks]);
  const taskStats = useMemo(() => ({
    total:      statsTasks.length,
    done:       statsTasks.filter((t) => t.status === "completed").length,
    inProgress: statsTasks.filter((t) => t.status === "in_progress").length,
    critical:   statsTasks.filter((t) => t.priority === "critical").length,
    overdue:    statsTasks.filter((t) => isOverdue(t.enddate, t.status)).length,
  }), [statsTasks]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => statusFilter   === "all" || t.status   === statusFilter)
      .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
      .filter((t) => {
        if (monthFilter === "all") return true;
        const d = t.startdate || t.enddate;
        if (!d) return false;
        const m = new Date(d).getMonth() + 1; // 1-12
        return m === Number(monthFilter);
      })
      .filter((t) => !q     || t.title?.toLowerCase().includes(q))
      .filter((t) => !meOnly || t.assignees?.some((a) => a.employee_id === employee?.employee_id));
  }, [tasks, statusFilter, priorityFilter, monthFilter, query, meOnly, employee]);

  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) || null, [tasks, selectedId]);

  return {
    // state
    loading, monthly, tasks, employees, err, setErr,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    monthFilter, setMonthFilter,
    query, setQuery, meOnly, setMeOnly,
    selectedId, selected, selectTask,
    editMode, setEditMode,
    eTitle, setETitle, eDesc, setEDesc,
    eStart, setEStart, eEnd, setEEnd,
    ePriority, setEPriority, eStatus, setEStatus,
    eAssignees, setEAssignees,
    updating, comments, commentText, setCommentText, sendingComment,
    unreadCount, progress, taskStats, filteredTasks,
    // methods
    load, loadNotifCount, updateTask, deleteTask, addComment,
    // role
    employee, isDirektur, isSupervisor, isStaff, roleLabel,
  };
}