// src/pages/project-management/PMBoard.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { pmApi } from "./pmApi";
import { getEmployeeFromLocal, canHoD } from "./role";
import { useParams, useNavigate, useLocation } from "react-router-dom";

// ─── Constants ────────────────────────────────────────
const STATUS_LIST = [
  { key: "assigned",             label: "Assigned",    dot: "bg-slate-400",   pill: "bg-slate-100 text-slate-700 ring-1 ring-slate-300" },
  { key: "in_progress",          label: "In Progress", dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-300" },
  { key: "on_hold",              label: "On Hold",     dot: "bg-zinc-400",    pill: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-300" },
  { key: "submitted_for_review", label: "For Review",  dot: "bg-indigo-500",  pill: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-300" },
  { key: "revision_required",    label: "Revision",    dot: "bg-rose-500",    pill: "bg-rose-50 text-rose-800 ring-1 ring-rose-300" },
  { key: "approved",             label: "Approved",    dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300" },
  { key: "completed",            label: "Completed",   dot: "bg-emerald-700", pill: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-400" },
];

const STATUS_WEIGHT = {
  assigned: 0, on_hold: 0, in_progress: 0.3,
  submitted_for_review: 0.6, revision_required: 0.5,
  approved: 0.9, completed: 1,
};

const PRIORITY_LIST = [
  { key: "critical", label: "Critical", pill: "bg-rose-600 text-white",    dot: "bg-rose-600" },
  { key: "medium",   label: "Medium",   pill: "bg-amber-500 text-white",   dot: "bg-amber-500" },
  { key: "low",      label: "Low",      pill: "bg-emerald-600 text-white", dot: "bg-emerald-600" },
];

const statusOf   = (key) => STATUS_LIST.find((s) => s.key === key)   || STATUS_LIST[0];
const priorityOf = (key) => PRIORITY_LIST.find((p) => p.key === key) || PRIORITY_LIST[1];

// ─── Helpers ──────────────────────────────────────────
function computeProgress(tasks) {
  if (!tasks?.length) return 0;
  const sum = tasks.reduce((acc, t) => acc + (STATUS_WEIGHT[t.status] ?? 0), 0);
  return Math.round((sum / tasks.length) * 100);
}

function fmtDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(enddate, status) {
  if (!enddate || status === "completed" || status === "approved") return false;
  return new Date(enddate) < new Date();
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isImage(fileType, fileName) {
  if (fileType?.startsWith("image/")) return true;
  const ext = fileName?.split(".").pop()?.toLowerCase();
  return ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext);
}

function isPdf(fileType, fileName) {
  if (fileType === "application/pdf") return true;
  return fileName?.toLowerCase().endsWith(".pdf");
}

function fileIcon(fileType, fileName) {
  if (isImage(fileType, fileName))         return "IMG";
  if (isPdf(fileType, fileName))           return "PDF";
  if (fileType?.includes("spreadsheet") || fileName?.match(/\.xlsx?$/i)) return "XLS";
  if (fileType?.includes("word")         || fileName?.match(/\.docx?$/i)) return "DOC";
  if (fileType?.includes("zip")          || fileName?.match(/\.(zip|rar|7z)$/i)) return "ZIP";
  return "FILE";
}

// ─── Micro UI ─────────────────────────────────────────
const EmployeeChip = ({ id, name, email, label, colorClass = "bg-slate-700" }) => {
  if (!id) return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400 italic">
      Tidak ada {label}.
    </div>
  );
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className={`h-8 w-8 rounded-md ${colorClass} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
        {initials(name)}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 truncate">{name || `Emp #${id}`}</div>
        {email && <div className="text-xs text-slate-400 truncate">{email}</div>}
      </div>
    </div>
  );
};

const Card = ({ children, className = "", ...props }) => (
  <div {...props} className={["rounded-xl bg-white border border-slate-200 shadow-sm", className].join(" ")}>
    {children}
  </div>
);

const Tag = ({ children, className = "" }) => (
  <span className={["inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", className].join(" ")}>
    {children}
  </span>
);

const SectionLabel = ({ children }) => (
  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{children}</div>
);

const ProgressBar = ({ value = 0 }) => {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const color = v >= 80 ? "bg-emerald-600" : v >= 50 ? "bg-blue-600" : v >= 25 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="h-2 w-full rounded-sm bg-slate-100 border border-slate-200 overflow-hidden">
      <div className={`h-full rounded-sm transition-all duration-700 ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
};

const QuickStatusButton = ({ taskId, currentStatus, onUpdated }) => {
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [pos,    setPos]    = useState({ top: 0, left: 0 });
  const btnRef              = useRef(null);

  function openMenu(e) {
    e.stopPropagation();
    if (saving) return;
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top:  rect.bottom + window.scrollY + 4,
        left: rect.left   + window.scrollX,
      });
    }
    setOpen((v) => !v);
  }

  async function pick(key) {
    if (key === currentStatus) { setOpen(false); return; }
    setSaving(true);
    try {
      await pmApi.updateTask(taskId, { status: key });
      onUpdated();
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  const st = statusOf(currentStatus);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        disabled={saving}
        className={[
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition hover:opacity-80",
          st.pill,
        ].join(" ")}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
        {saving ? "Saving..." : st.label}
        <span className="opacity-50 ml-0.5">▾</span>
      </button>

      {open && typeof document !== "undefined" && ReactDOM.createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />
          <div
            className="absolute w-48 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden py-1"
            style={{ top: pos.top, left: pos.left, zIndex: 9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {STATUS_LIST.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => pick(s.key)}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition hover:bg-slate-50",
                  s.key === currentStatus ? "bg-slate-50 text-slate-900 font-semibold" : "text-slate-600",
                ].join(" ")}
              >
                <span className={`h-2 w-2 rounded-full ${s.dot} shrink-0`} />
                {s.label}
                {s.key === currentStatus && <span className="ml-auto text-emerald-600 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

// ─── Evidence Panel ────────────────────────────────────
const EvidencePanel = ({ taskId, initialFiles = [], onChanged }) => {
  const [files,     setFiles]     = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [err,       setErr]       = useState("");
  const [preview,   setPreview]   = useState(null);
  const inputRef                  = useRef(null);

  useEffect(() => { setFiles(initialFiles); }, [taskId, initialFiles.length]);

  async function handleUpload(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setErr("");
    setUploading(true);
    try {
      const res = await pmApi.uploadEvidence(taskId, selected);
      setFiles((prev) => [...prev, ...(res.data || [])]);
      onChanged?.();
    } catch (ex) {
      setErr(ex.message || "Upload gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(ev) {
    if (!window.confirm(`Hapus file "${ev.file_name}"?`)) return;
    setDeleting(ev.id);
    try {
      await pmApi.deleteEvidence(taskId, ev.id);
      setFiles((prev) => prev.filter((f) => f.id !== ev.id));
      onChanged?.();
    } catch (ex) {
      setErr(ex.message || "Hapus gagal");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <SectionLabel>Attachments ({files.length})</SectionLabel>

      {err && (
        <div className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-xs flex items-center gap-2">
          <span>{err}</span>
          <button className="ml-auto text-rose-400 hover:text-rose-600 font-bold" onClick={() => setErr("")}>✕</button>
        </div>
      )}

      {/* Upload button */}
      <label className={[
        "flex items-center gap-2 rounded-lg px-3 py-2.5 border cursor-pointer transition mb-3 text-sm font-medium",
        uploading
          ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400",
      ].join(" ")}>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading
          ? <><span className="h-3.5 w-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /><span>Uploading...</span></>
          : <><span>Upload Attachment</span><span className="ml-auto text-xs text-slate-400">max 20 MB</span></>
        }
      </label>

      {/* File list */}
      {files.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-400 italic text-center">
          Belum ada attachment.
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((ev) => {
            const img     = isImage(ev.file_type, ev.file_name);
            const baseUrl = import.meta.env.VITE_API_URL || "";
            const fullUrl = `${baseUrl}${ev.file_path}`;

            return (
              <div key={ev.id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                {img && (
                  <button
                    type="button"
                    className="w-full block"
                    onClick={() => setPreview({ url: fullUrl, name: ev.file_name, type: ev.file_type })}
                  >
                    <img
                      src={fullUrl}
                      alt={ev.file_name}
                      className="w-full max-h-36 object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </button>
                )}

                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  {/* File type badge */}
                  <div className="h-8 w-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                    {fileIcon(ev.file_type, ev.file_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">{ev.file_name}</div>
                    {ev.file_size && (
                      <div className="text-[10px] text-slate-400">{formatBytes(ev.file_size)}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {(img || isPdf(ev.file_type, ev.file_name)) && (
                      <button
                        type="button"
                        title="Preview"
                        onClick={() => setPreview({ url: fullUrl, name: ev.file_name, type: ev.file_type })}
                        className="h-7 px-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                      >View</button>
                    )}
                    <a
                      href={fullUrl}
                      download={ev.file_name}
                      title="Download"
                      className="h-7 px-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition flex items-center"
                    >Save</a>
                    <button
                      type="button"
                      title="Hapus"
                      onClick={() => handleDelete(ev)}
                      disabled={deleting === ev.id}
                      className="h-7 px-2 rounded-md border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium transition disabled:opacity-40"
                    >
                      {deleting === ev.id
                        ? <span className="h-3 w-3 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin block" />
                        : "Del"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center p-4"
          style={{ zIndex: 99999 }}
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] rounded-xl overflow-hidden bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
              <div className="text-white text-sm font-semibold truncate max-w-[calc(100%-8rem)]">{preview.name}</div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={preview.url} download={preview.name}
                  className="h-8 px-3 rounded-lg bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 transition"
                >Download</a>
                <button type="button" onClick={() => setPreview(null)}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition"
                >✕</button>
              </div>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-56px)] bg-slate-50 flex items-center justify-center">
              {isImage(preview.type, preview.name) ? (
                <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain p-2" />
              ) : isPdf(preview.type, preview.name) ? (
                <iframe src={preview.url} title={preview.name} className="w-full" style={{ height: "calc(90vh - 56px)" }} />
              ) : (
                <div className="p-10 text-center">
                  <div className="text-4xl font-bold text-slate-300 mb-4">{fileIcon(preview.type, preview.name)}</div>
                  <div className="text-slate-700 font-semibold mb-1">{preview.name}</div>
                  <div className="text-slate-400 text-sm mb-4">Preview tidak tersedia.</div>
                  <a href={preview.url} download={preview.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition"
                  >Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────
export default function PMBoard() {
  const { monthlyId } = useParams();
  const nav           = useNavigate();
  const location      = useLocation();
  const from          = location.state || {};

  const employee = useMemo(() => getEmployeeFromLocal(), []);
  const isHoD    = useMemo(() => canHoD(employee), [employee]);

  const [loading,  setLoading]  = useState(true);
  const [monthly,  setMonthly]  = useState(null);
  const [tasks,    setTasks]    = useState([]);
  const [err,      setErr]      = useState("");

  const [statusFilter,   setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [query,          setQuery]          = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const [editMode,   setEditMode]   = useState(false);

  const [eTitle,    setETitle]    = useState("");
  const [eDesc,     setEDesc]     = useState("");
  const [eStart,    setEStart]    = useState("");
  const [eEnd,      setEEnd]      = useState("");
  const [ePriority, setEPriority] = useState("medium");
  const [eStatus,   setEStatus]   = useState("assigned");
  const [ePic,      setEPic]      = useState("");
  const [updating,  setUpdating]  = useState(false);

  const [comments,       setComments]       = useState([]);
  const [commentText,    setCommentText]    = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [openAdd,     setOpenAdd]     = useState(false);
  const [tTitle,      setTTitle]      = useState("");
  const [tDesc,       setTDesc]       = useState("");
  const [tStart,      setTStart]      = useState("");
  const [tEnd,        setTEnd]        = useState("");
  const [tPriority,   setTPriority]   = useState("medium");
  const [tStatus,     setTStatus]     = useState("assigned");
  const [tPic,        setTPic]        = useState("");
  const [tSubmitting, setTSubmitting] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await pmApi.getMonthDetail(monthlyId);
      setMonthly(res?.monthly || null);
      const t = res?.tasks || [];
      setTasks(t);
      setSelectedId((prev) => prev || t[0]?.id || null);
    } catch (e) {
      setErr(e?.message || "Gagal load board");
    } finally {
      setLoading(false);
    }
  }

  async function loadComments(taskId) {
    if (!taskId) return setComments([]);
    try {
      const res = await pmApi.listComments(taskId);
      setComments(res?.data || []);
    } catch { setComments([]); }
  }

  const selectTask = useCallback((t) => {
    setSelectedId(t.id);
    setEditMode(false);
    setETitle(t.title || "");
    setEDesc(t.desc || "");
    setEStart(t.startdate ? t.startdate.slice(0, 10) : "");
    setEEnd(t.enddate ? t.enddate.slice(0, 10) : "");
    setEPriority(t.priority || "medium");
    setEStatus(t.status || "assigned");
    setEPic(t.pic_employee_id || "");
  }, []);

  async function updateTask() {
    if (!selectedId) return;
    setErr("");
    if (!eTitle.trim()) return setErr("Title tidak boleh kosong.");
    setUpdating(true);
    try {
      await pmApi.updateTask(selectedId, {
        title:           eTitle.trim(),
        desc:            eDesc.trim() || null,
        startdate:       eStart || null,
        enddate:         eEnd || null,
        status:          eStatus,
        priority:        ePriority,
        pic_employee_id: isHoD ? (ePic ? Number(ePic) : null) : undefined,
      });
      setEditMode(false);
      await load();
    } catch (e) {
      setErr(e?.message || "Gagal update task");
    } finally {
      setUpdating(false);
    }
  }

  async function addComment() {
    if (!selectedId || !commentText.trim()) return;
    setSendingComment(true);
    try {
      await pmApi.addComment(selectedId, { comment: commentText.trim() });
      setCommentText("");
      await loadComments(selectedId);
    } catch (e) {
      setErr(e?.message || "Gagal kirim comment");
    } finally {
      setSendingComment(false);
    }
  }

  async function addTask() {
    setErr("");
    if (!tTitle.trim()) return setErr("Title task wajib diisi.");
    setTSubmitting(true);
    try {
      await pmApi.createTask(monthlyId, {
        title: tTitle.trim(), desc: tDesc.trim() || null,
        startdate: tStart || null, enddate: tEnd || null,
        status: tStatus, priority: tPriority,
        pic_employee_id: isHoD ? (tPic ? Number(tPic) : null) : null,
      });
      setOpenAdd(false);
      setTTitle(""); setTDesc(""); setTStart(""); setTEnd("");
      setTPriority("medium"); setTStatus("assigned"); setTPic("");
      await load();
    } catch (e) {
      setErr(e?.message || "Gagal tambah task");
    } finally {
      setTSubmitting(false);
    }
  }

  useEffect(() => { load(); }, [monthlyId]);
  useEffect(() => { loadComments(selectedId); }, [selectedId]);
  useEffect(() => {
    const t = tasks.find((x) => x.id === selectedId);
    if (t && !editMode) selectTask(t);
  }, [tasks]);

  const progress  = useMemo(() => computeProgress(tasks), [tasks]);
  const taskStats = useMemo(() => ({
    total:      tasks.length,
    done:       tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    critical:   tasks.filter((t) => t.priority === "critical").length,
    overdue:    tasks.filter((t) => isOverdue(t.enddate, t.status)).length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks
      .filter((t) => statusFilter   === "all" || t.status   === statusFilter)
      .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
      .filter((t) => !q || t.title?.toLowerCase().includes(q));
  }, [tasks, statusFilter, priorityFilter, query]);

  const selected = useMemo(() => tasks.find((t) => t.id === selectedId) || null, [tasks, selectedId]);

  const handleBack = () => {
    if (from?.projectId && from?.semesterId)
      return nav(`/projectmanagement/${from.projectId}/semester/${from.semesterId}`);
    nav("/projectmanagement");
  };

  // ─── RENDER ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* Topbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            <button type="button" onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            >
              <span className="h-7 w-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 text-sm transition">←</span>
              <span className="hidden sm:inline text-slate-600">Monthly</span>
            </button>

            <div className="flex-1 min-w-0 text-center">
              <div className="text-sm font-bold text-slate-900 truncate">{monthly?.title || "Task Board"}</div>
              <div className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {taskStats.done}/{taskStats.total} selesai &middot; {progress}% progress
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                {initials(employee?.full_name || employee?.name)}
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-semibold text-slate-800">{employee?.full_name || "User"}</div>
                <div className="text-[10px] text-slate-400">{isHoD ? "Head of Dept." : "Staff"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
        {err && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
            <span className="text-rose-500 font-bold text-sm">!</span>
            <span className="text-rose-700 text-sm">{err}</span>
            <button className="ml-auto text-rose-400 hover:text-rose-600 font-bold" onClick={() => setErr("")}>✕</button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {monthly?.title || "—"}
              </h1>
              {monthly?.desc && <p className="text-slate-500 text-sm mt-1">{monthly.desc}</p>}
            </div>
            <button type="button" onClick={() => setOpenAdd(true)}
              className="shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 active:scale-95 transition-all border border-slate-800"
            >+ Add Task</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: "Total Tasks",  value: taskStats.total,      cls: "border-slate-200" },
              { label: "In Progress",  value: taskStats.inProgress,  cls: "border-amber-200 bg-amber-50" },
              { label: "Completed",    value: taskStats.done,        cls: "border-emerald-200 bg-emerald-50" },
              { label: "Critical",     value: taskStats.critical,    cls: "border-rose-200 bg-rose-50" },
              { label: "Overdue",      value: taskStats.overdue,     cls: "border-orange-200 bg-orange-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border px-4 py-3 bg-white ${s.cls}`}>
                <div className="text-xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1"><ProgressBar value={progress} /></div>
            <div className="text-sm font-bold text-slate-700 w-12 text-right shrink-0">{progress}%</div>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Progress dihitung berdasarkan bobot status setiap task
          </div>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ── LEFT ── */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="p-4">
              {/* Status filter */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <button type="button" onClick={() => setStatusFilter("all")}
                  className={["px-3 py-1 rounded-md text-xs font-semibold border transition",
                    statusFilter === "all"
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  ].join(" ")}
                >All</button>
                {STATUS_LIST.map((s) => (
                  <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
                    className={["px-3 py-1 rounded-md text-xs font-semibold border transition",
                      statusFilter === s.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    ].join(" ")}
                  >{s.label}</button>
                ))}
              </div>
              {/* Search + priority */}
              <div className="flex items-center gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search task..."
                  className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 transition"
                />
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none"
                  value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priority</option>
                  {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>
            </Card>

            {loading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-24 rounded-lg bg-slate-100 animate-pulse" />)}
              </div>
            ) : filteredTasks.length ? (
              <div className="space-y-2">
                {filteredTasks.map((t) => {
                  const pr   = priorityOf(t.priority);
                  const over = isOverdue(t.enddate, t.status);
                  return (
                    <div key={t.id} role="button" tabIndex={0}
                      onClick={() => selectTask(t)}
                      onKeyDown={(e) => e.key === "Enter" && selectTask(t)}
                      className="w-full text-left cursor-pointer"
                    >
                      <Card className={[
                        "p-4 hover:shadow-md hover:border-slate-300 transition-all",
                        t.id === selectedId ? "border-slate-900 shadow-md ring-1 ring-slate-900" : "",
                      ].join(" ")}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${statusOf(t.status).dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="font-semibold text-slate-900 text-sm leading-snug">{t.title}</div>
                              <Tag className={`${pr.pill} shrink-0`}>{pr.label}</Tag>
                            </div>
                            {t.desc && <div className="text-xs text-slate-500 line-clamp-1 mb-2">{t.desc}</div>}

                            {t.pic_name && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="h-5 w-5 rounded-md bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                  {initials(t.pic_name)}
                                </div>
                                <span className="text-xs text-slate-500 truncate">{t.pic_name}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <QuickStatusButton
                                taskId={t.id}
                                currentStatus={t.status}
                                onUpdated={load}
                              />
                              <div className={["text-xs", over ? "text-rose-500 font-medium" : "text-slate-400"].join(" ")}>
                                {over ? "Overdue · " : ""}{t.enddate ? fmtDate(t.enddate) : "No due date"}
                              </div>
                            </div>

                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-sm bg-slate-100 border border-slate-200 overflow-hidden">
                                <div
                                  className={`h-full ${statusOf(t.status).dot}`}
                                  style={{ width: `${(STATUS_WEIGHT[t.status] || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold w-7 text-right">
                                {Math.round((STATUS_WEIGHT[t.status] || 0) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="p-10 text-center">
                <div className="text-slate-700 font-semibold">Tidak ada task</div>
                <div className="text-slate-400 text-xs mt-1">Ubah filter atau tambah task baru.</div>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Detail panel ── */}
          <div className="lg:col-span-7">
            <Card className="sticky top-20 overflow-hidden max-h-[calc(100vh-6rem)] flex flex-col">
              {!selected ? (
                <div className="p-10 text-center m-auto">
                  <div className="text-slate-300 text-4xl font-thin mb-4">—</div>
                  <div className="text-slate-600 font-semibold text-sm">Pilih task untuk lihat detail</div>
                  <div className="text-slate-400 text-xs mt-1">Klik salah satu task di sebelah kiri</div>
                </div>
              ) : (
                <>
                  {/* Detail header */}
                  <div className={`shrink-0 p-5 border-b ${editMode ? "bg-blue-700" : "bg-slate-900"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {editMode ? (
                          <input
                            className="w-full bg-white/20 text-white font-bold text-sm placeholder-white/50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-white/40 border border-white/20"
                            value={eTitle} onChange={(e) => setETitle(e.target.value)}
                          />
                        ) : (
                          <div className="text-white font-bold text-sm leading-snug">{selected.title}</div>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <Tag className={`${priorityOf(editMode ? ePriority : selected.priority).pill} text-xs`}>
                            {priorityOf(editMode ? ePriority : selected.priority).label}
                          </Tag>
                          <Tag className="bg-white/15 text-white text-xs border border-white/20">
                            {statusOf(editMode ? eStatus : selected.status).label}
                          </Tag>
                          {isOverdue(selected.enddate, selected.status) && (
                            <Tag className="bg-rose-500 text-white text-xs">Overdue</Tag>
                          )}
                          {editMode && <span className="text-blue-200 text-xs font-medium">Edit mode</span>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {editMode ? (
                          <>
                            <button type="button" onClick={() => { setEditMode(false); selectTask(selected); }}
                              className="h-8 px-3 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
                              disabled={updating}
                            >Batal</button>
                            <button type="button" onClick={updateTask}
                              className="h-8 px-4 rounded-lg bg-white text-blue-700 text-xs font-bold hover:bg-blue-50 transition disabled:opacity-50 flex items-center gap-1.5"
                              disabled={updating}
                            >
                              {updating
                                ? <><span className="h-3 w-3 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" />Saving...</>
                                : "Save"}
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => setEditMode(true)}
                            className="h-8 px-4 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
                          >Edit</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detail body */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {editMode && (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <SectionLabel>Status</SectionLabel>
                          <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={eStatus} onChange={(e) => setEStatus(e.target.value)} disabled={updating}
                          >
                            {STATUS_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </label>
                        <label className="block">
                          <SectionLabel>Priority</SectionLabel>
                          <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={ePriority} onChange={(e) => setEPriority(e.target.value)} disabled={updating}
                          >
                            {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                          </select>
                        </label>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <SectionLabel>Description</SectionLabel>
                      {editMode ? (
                        <textarea
                          className="min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                          value={eDesc} onChange={(e) => setEDesc(e.target.value)} disabled={updating}
                        />
                      ) : (
                        <div className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-3 border border-slate-200 leading-relaxed min-h-[44px]">
                          {selected.desc || <span className="text-slate-400 italic">Tidak ada deskripsi.</span>}
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <SectionLabel>Start Date</SectionLabel>
                        {editMode ? (
                          <input type="date"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                            value={eStart} onChange={(e) => setEStart(e.target.value)} disabled={updating}
                          />
                        ) : (
                          <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
                            <div className="text-sm font-medium text-slate-800">{fmtDate(selected.startdate)}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        <SectionLabel>Due Date</SectionLabel>
                        {editMode ? (
                          <input type="date"
                            className={["h-9 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition",
                              isOverdue(eEnd, eStatus) ? "border-rose-300" : "border-slate-200"
                            ].join(" ")}
                            value={eEnd} onChange={(e) => setEEnd(e.target.value)} disabled={updating}
                          />
                        ) : (
                          <div className={["rounded-lg px-3 py-2.5 border",
                            isOverdue(selected.enddate, selected.status) ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"
                          ].join(" ")}>
                            <div className={["text-sm font-medium",
                              isOverdue(selected.enddate, selected.status) ? "text-rose-600" : "text-slate-800"
                            ].join(" ")}>
                              {fmtDate(selected.enddate)}
                              {isOverdue(selected.enddate, selected.status) && (
                                <span className="ml-1.5 text-xs font-semibold">· Overdue</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Owner & PIC */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <SectionLabel>Owner</SectionLabel>
                        <EmployeeChip
                          id={selected.owner_employee_id}
                          name={selected.owner_name}
                          email={selected.owner_email}
                          label="owner"
                          colorClass="bg-slate-700"
                        />
                      </div>
                      <div>
                        <SectionLabel>PIC / Assigned To</SectionLabel>
                        {editMode && isHoD ? (
                          <input
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 transition"
                            value={ePic}
                            onChange={(e) => setEPic(e.target.value)}
                            placeholder="Employee ID"
                            disabled={updating}
                          />
                        ) : (
                          <EmployeeChip
                            id={selected.pic_employee_id}
                            name={selected.pic_name}
                            email={selected.pic_email}
                            label="PIC"
                            colorClass="bg-blue-700"
                          />
                        )}
                      </div>
                    </div>

                    {/* Task Progress */}
                    <div>
                      <SectionLabel>Task Progress</SectionLabel>
                      <div className="bg-slate-50 rounded-lg px-3 py-3 border border-slate-200">
                        <div className="flex items-center gap-3 mb-3">
                          <ProgressBar value={(STATUS_WEIGHT[editMode ? eStatus : selected.status] || 0) * 100} />
                          <span className="text-sm font-bold text-slate-700 shrink-0 w-10 text-right">
                            {Math.round((STATUS_WEIGHT[editMode ? eStatus : selected.status] || 0) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 flex-wrap">
                          {STATUS_LIST.map((s, i) => {
                            const cur    = editMode ? eStatus : selected.status;
                            const curIdx = STATUS_LIST.findIndex((x) => x.key === cur);
                            const past   = i < curIdx;
                            const active = s.key === cur;
                            return (
                              <React.Fragment key={s.key}>
                                <div className={["text-[9px] px-2 py-0.5 rounded font-semibold transition",
                                  active ? "bg-slate-900 text-white" :
                                  past   ? "bg-slate-300 text-slate-600" : "bg-slate-100 text-slate-400"
                                ].join(" ")}>
                                  {s.label}
                                </div>
                                {i < STATUS_LIST.length - 1 && (
                                  <div className={["h-px w-2", past || active ? "bg-slate-400" : "bg-slate-200"].join(" ")} />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Evidence */}
                    <EvidencePanel
                      taskId={selected.id}
                      initialFiles={selected.evidence_files || []}
                      onChanged={load}
                    />

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Created</div>
                        <div className="text-xs text-slate-600">{fmtDate(selected.created_at)}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                        <div className="text-[10px] font-semibold text-slate-400 mb-0.5 uppercase tracking-wide">Last Updated</div>
                        <div className="text-xs text-slate-600">{fmtDate(selected.updated_at)}</div>
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <SectionLabel>Comments ({comments.length})</SectionLabel>
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-0.5 mb-3">
                        {comments.length ? comments.map((c) => (
                          <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {initials(c.employee_name)}
                                </div>
                                <div className="text-xs font-semibold text-slate-900">
                                  {c.employee_name || `Emp #${c.employee_id || "?"}`}
                                </div>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {c.created_at ? new Date(c.created_at).toLocaleString("id-ID", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                }) : "—"}
                              </div>
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed">{c.comment}</div>
                          </div>
                        )) : (
                          <div className="text-sm text-center text-slate-400 py-5 border border-slate-200 rounded-lg bg-slate-50">
                            Belum ada comment.
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-slate-300">
                        <input
                          className="flex-1 h-8 bg-transparent outline-none text-sm text-slate-700 placeholder-slate-400"
                          placeholder="Tulis comment... (Enter untuk kirim)"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                          disabled={sendingComment}
                        />
                        <button type="button" onClick={addComment}
                          disabled={sendingComment || !commentText.trim()}
                          className="h-7 px-3 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 transition"
                        >{sendingComment ? "..." : "Send"}</button>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal Add Task */}
      {openAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => { if (!tSubmitting) setOpenAdd(false); }}
        >
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div>
                <div className="text-white font-bold">Add Task</div>
                <div className="text-slate-400 text-xs mt-0.5">Tambah task ke monthly board ini</div>
              </div>
              <button type="button" onClick={() => { if (!tSubmitting) setOpenAdd(false); }}
                className="h-8 w-8 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition font-bold"
              >✕</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {err && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">{err}</div>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title <span className="text-rose-500">*</span></span>
                <input
                  className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition"
                  value={tTitle} onChange={(e) => setTTitle(e.target.value)}
                  placeholder="Nama task..."
                  disabled={tSubmitting}
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Description</span>
                <textarea
                  className="mt-1.5 min-h-[72px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition resize-none"
                  value={tDesc} onChange={(e) => setTDesc(e.target.value)}
                  disabled={tSubmitting}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Start Date</span>
                  <input type="date"
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                    value={tStart} onChange={(e) => setTStart(e.target.value)} disabled={tSubmitting}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Due Date</span>
                  <input type="date"
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                    value={tEnd} onChange={(e) => setTEnd(e.target.value)} disabled={tSubmitting}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Priority</span>
                  <select
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                    value={tPriority} onChange={(e) => setTPriority(e.target.value)} disabled={tSubmitting}
                  >
                    {PRIORITY_LIST.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</span>
                  <select
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-slate-400"
                    value={tStatus} onChange={(e) => setTStatus(e.target.value)} disabled={tSubmitting}
                  >
                    {STATUS_LIST.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </label>
              </div>

              {isHoD && (
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">PIC Employee ID</span>
                  <input
                    className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-400 transition"
                    value={tPic}
                    onChange={(e) => setTPic(e.target.value)}
                    placeholder="contoh: 123"
                    disabled={tSubmitting}
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button"
                  onClick={() => { if (!tSubmitting) setOpenAdd(false); }}
                  className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                  disabled={tSubmitting}
                >Batal</button>
                <button type="button" onClick={addTask}
                  className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition border border-slate-800"
                  disabled={tSubmitting}
                >
                  {tSubmitting
                    ? <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Creating...
                      </span>
                    : "Add Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}