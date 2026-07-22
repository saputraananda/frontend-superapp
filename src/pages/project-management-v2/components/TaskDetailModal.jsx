import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api, apiUpload, BASE_URL } from "../../../lib/api";
import RichTextEditor from "../../../components/RichTextEditor";
import {
  HiOutlineXMark,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineCalendarDays,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineLink,
  HiOutlinePaperClip,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlinePencilSquare,
  HiOutlinePaperAirplane,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineMinus,
  HiOutlineBriefcase,
  HiOutlineArrowUpTray,
  HiOutlinePhoto,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical", icon: HiOutlineExclamationTriangle, cls: "border-rose-400 bg-rose-50/50 text-rose-600", activeCls: "bg-rose-500 text-white border-rose-500 shadow-rose-200" },
  { value: "medium",   label: "Medium",   icon: HiOutlineMinus,                cls: "border-amber-400 bg-amber-50/50 text-amber-600", activeCls: "bg-amber-500 text-white border-amber-500 shadow-amber-200" },
  { value: "low",      label: "Low",      icon: HiOutlineCheckCircle,          cls: "border-emerald-400 bg-emerald-50/50 text-emerald-600", activeCls: "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200" },
];

const PRIORITY_BADGES = {
  critical: "bg-rose-100 text-rose-700 border-rose-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-emerald-100 text-emerald-700 border-emerald-200"
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

// ─── Searchable Employee Select ───────────────────────────────────────────────
function EmployeeSelect({ label, placeholder, value, onChange, employees, disabled, required, icon: Icon = HiOutlineUser }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? employees.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()))
    : employees;

  const selected = employees.find(e => String(e.id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1 text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <button type="button" onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          "w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition bg-slate-50",
          disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-70" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-400",
          open && "border-indigo-400 bg-white"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
        <span className={cn("flex-1 truncate text-xs", selected ? "text-slate-800 font-medium" : "text-slate-400")}>
          {selected ? capitalizeEachWord(selected.full_name) : placeholder}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada karyawan</p>
            ) : (
              filtered.map(emp => (
                <button key={emp.id} type="button"
                  onClick={() => { onChange(emp.id); setOpen(false); setQuery(""); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-indigo-50 transition text-xs",
                    String(value) === String(emp.id) && "bg-indigo-50 text-indigo-700"
                  )}>
                  <p className="font-semibold text-slate-800">{capitalizeEachWord(emp.full_name)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Searchable Position Select ───────────────────────────────────────────────
function PositionSelect({ label, placeholder, value, onChange, positions, disabled, required, icon: Icon = HiOutlineBriefcase }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? positions.filter(p => p.position_name.toLowerCase().includes(query.toLowerCase()))
    : positions;

  const selected = positions.find(p => String(p.position_id) === String(value));

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1 text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <button type="button" onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={cn(
          "w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-left transition bg-slate-50",
          disabled ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-70" : "border-slate-200 hover:border-indigo-300 focus:border-indigo-400",
          open && "border-indigo-400 bg-white"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0" />
        <span className={cn("flex-1 truncate text-xs", selected ? "text-slate-800 font-medium" : "text-slate-400")}>
          {selected ? selected.position_name : placeholder}
        </span>
        {selected && !disabled && (
          <span onClick={(e) => { e.stopPropagation(); onChange(""); }} className="text-slate-400 hover:text-rose-500 transition">
            <HiOutlineXMark className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari position..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada position ditemukan</p>
            ) : (
              filtered.map(pos => (
                <button key={pos.position_id} type="button"
                  onClick={() => { onChange(pos.position_id); setOpen(false); setQuery(""); }}
                  className={cn("w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-indigo-50 transition text-xs",
                    String(value) === String(pos.position_id) && "bg-indigo-50 text-indigo-700"
                  )}>
                  <p className="font-semibold text-slate-800">{pos.position_name}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Multi Employee Select ────────────────────────────────────────────────────
function MultiEmployeeSelect({ label, placeholder, values = [], onChange, employees, icon: Icon = HiOutlineUserGroup }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.trim()
    ? employees.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()))
    : employees;

  const selectedEmps = employees.filter(e => values.includes(String(e.id)));

  const toggle = (id) => {
    const sid = String(id);
    onChange(values.includes(sid) ? values.filter(v => v !== sid) : [...values, sid]);
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block mb-1 text-xs font-bold text-slate-700">{label}</label>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full flex items-start gap-2 rounded-xl border px-3 py-2 text-sm text-left transition min-h-[36px] bg-slate-50",
          "border-slate-200 hover:border-indigo-300",
          open && "border-indigo-400 bg-white"
        )}>
        <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        {selectedEmps.length === 0 ? (
          <span className="text-slate-400 text-xs">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedEmps.map(emp => (
              <span key={emp.id} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
                {capitalizeEachWord(emp.full_name.split(" ")[0])}
                <button type="button" onClick={e => { e.stopPropagation(); toggle(emp.id); }} className="hover:text-rose-500 transition">
                  <HiOutlineXMark className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs outline-none focus:border-indigo-400" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400 italic">Tidak ada karyawan</p>
            ) : (
              filtered.map(emp => {
                const checked = values.includes(String(emp.id));
                return (
                  <button key={emp.id} type="button" onClick={() => toggle(emp.id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-indigo-50 transition text-xs",
                      checked && "bg-indigo-50"
                    )}>
                    <div className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] transition",
                      checked ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"
                    )}>
                      {checked && "✓"}
                    </div>
                    <p className="font-semibold text-slate-850">{capitalizeEachWord(emp.full_name)}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───
export default function TaskDetailModal({ open, onClose, taskId, onSuccess }) {
  const [activeTab, setActiveTab] = useState("detail");
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [me, setMe] = useState(null);

  // Edit form states
  const [form, setForm] = useState({
    title: "",
    startdate: "",
    enddate: "",
    pic_employee_id: "",
    position_id: "",
    priority: "",
    status: "",
    link: "",
    link_title: "",
    id_pm_detail: "",
  });
  const [desc, setDesc] = useState("");
  const [coPics, setCoPics] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [subWorkspaces, setSubWorkspaces] = useState([]);

  // Comments states
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Evidence states
  const [evidences, setEvidences] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState("");
  const evidenceInputRef = useRef(null);

  const commentsEndRef = useRef(null);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [taskRes, meRes, empRes, posRes] = await Promise.all([
        api(`/api/pm2/tasks/${taskId}`),
        api("/api/pm2/me"),
        api("/api/pm2/employees"),
        api("/positions"),
      ]);
      const t = taskRes.data;
      setTask(t);
      setMe(meRes);
      setEmployees(empRes.data || []);
      setPositions(posRes.positions || []);

      // Load sub workspaces for the workspace
      if (t.id_pm) {
        api(`/api/pm2/workspaces/${t.id_pm}/sub`)
          .then((d) => setSubWorkspaces(d?.data || []))
          .catch(() => setSubWorkspaces([]));
      } else {
        setSubWorkspaces([]);
      }

      // Populate form
      setForm({
        title: t.title || "",
        startdate: t.startdate ? t.startdate.slice(0, 10) : "",
        enddate: t.enddate ? t.enddate.slice(0, 10) : "",
        pic_employee_id: t.pic_employee_id || "",
        position_id: t.position_id || "",
        priority: t.priority || "",
        status: t.status || "",
        link: t.link || "",
        link_title: t.link_title || "",
        id_pm_detail: t.id_pm_detail || "",
      });
      setDesc(t.desc || "");
      setCoPics(t.co_pics || []);
      setReviewers(t.reviewers || []);
      setEvidences(t.evidences || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await api(`/api/pm2/tasks/${taskId}/comments`);
      setComments(res.data || []);
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      loadDetails();
      loadComments();
      setEditing(false);
      setActiveTab("detail");
    }
  }, [open, taskId]);

  useEffect(() => {
    if (open && taskId && activeTab === "discuss") {
      // Re-load comments for active check if needed or handle scroll
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [open, taskId, activeTab]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await api(`/api/pm2/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          desc,
          co_pics: coPics,
          reviewers,
          id_pm_detail: form.id_pm_detail ? Number(form.id_pm_detail) : null,
        }),
      });
      setEditing(false);
      loadDetails();
      onSuccess?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEvidence(true);
    setEvidenceError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiUpload(`/api/pm2/tasks/${taskId}/evidence`, {
        method: "POST",
        body: formData,
      });
      // Reload to get real data from DB including new evidence id
      await loadDetails();
    } catch (err) {
      setEvidenceError("Gagal mengunggah file. Pastikan ukuran file < 20MB.");
      console.error(err);
    } finally {
      setUploadingEvidence(false);
      if (evidenceInputRef.current) evidenceInputRef.current.value = "";
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm("Yakin ingin menghapus file lampiran ini?")) return;
    try {
      await api(`/api/pm2/tasks/${taskId}/evidence/${evidenceId}`, { method: "DELETE" });
      setEvidences(prev => prev.filter(ev => ev.id !== evidenceId));
    } catch (err) {
      console.error("Gagal menghapus evidence:", err);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await api(`/api/pm2/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment: newComment }),
      });
      setNewComment("");
      loadComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!open) return null;

  const isOwner = me && task && me.id === task.owner_employee_id;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "85vh", maxHeight: "800px" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
              <HiOutlineDocumentText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 truncate max-w-[400px]">
                {task?.title || "Detail Task"}
              </h2>
              <p className="text-[10px] text-slate-400">Diskusi & detail pengerjaan task</p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* ── Tabs bar ── */}
        <div className="flex border-b border-slate-100 px-6 shrink-0 bg-slate-50/50">
          <button onClick={() => setActiveTab("detail")}
            className={cn("px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
              activeTab === "detail" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}>
            <HiOutlineDocumentText className="h-4 w-4" />
            Detail &amp; Edit
          </button>
          <button onClick={() => setActiveTab("discuss")}
            className={cn("px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2",
              activeTab === "discuss" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            )}>
            <HiOutlineChatBubbleLeftRight className="h-4 w-4" />
            Diskusi ({comments.length})
          </button>
        </div>

        {/* ── Main Scroll Area ── */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <p className="text-xs">Memuat detail task...</p>
            </div>
          ) : activeTab === "detail" ? (

            /* ── DETAIL TAB ── */
            <div className="p-6">
              {editing ? (
                /* Edit Mode (Owner only) */
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Judul Task *</label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white transition" required />
                  </div>

                  {subWorkspaces.length > 0 && (
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Sub-Workspace <span className="text-slate-400 font-normal text-[10px]">(opsional)</span></label>
                      <select value={form.id_pm_detail} onChange={e => setForm({ ...form, id_pm_detail: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white text-slate-800">
                        <option value="">-- Tanpa Sub-Workspace (Langsung di Workspace) --</option>
                        {subWorkspaces.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block mb-1 text-xs font-bold text-slate-700">Deskripsi</label>
                    <RichTextEditor value={desc} onChange={setDesc} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Prioritas</label>
                      <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white">
                        <option value="critical">Critical</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Status</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white">
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-xs font-bold text-slate-700">Deadline</label>
                      <input type="date" value={form.enddate} onChange={e => setForm({ ...form, enddate: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:bg-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <EmployeeSelect label="PIC" value={form.pic_employee_id} onChange={v => setForm({ ...form, pic_employee_id: v })} employees={employees} required />
                    <MultiEmployeeSelect label="Co-PIC" values={coPics} onChange={setCoPics} employees={employees} />
                  </div>

                  <PositionSelect
                    label="Position"
                    placeholder="Pilih Position..."
                    value={form.position_id}
                    onChange={v => setForm({ ...form, position_id: v })}
                    positions={positions}
                  />

                  <MultiEmployeeSelect label="Reviewer (Pengawas / CC)" values={reviewers} onChange={setReviewers} employees={employees} />

                  {/* ── Evidence / Lampiran Section ── */}
                  <div>
                    <label className="block mb-2 text-xs font-bold text-slate-700">
                      Lampiran / Evidence
                      <span className="ml-1 text-slate-400 font-normal text-[10px]">(opsional)</span>
                    </label>

                    {/* Daftar file evidence yang sudah ada */}
                    {evidences.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {evidences.map((ev) => {
                          const isImage = ev.file_type?.startsWith("image/");
                          return (
                            <div key={ev.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                                {isImage
                                  ? <HiOutlinePhoto className="h-4 w-4" />
                                  : <HiOutlinePaperClip className="h-4 w-4" />}
                              </div>
                              <a
                                href={`${BASE_URL}${ev.file_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 truncate text-xs font-medium text-indigo-700 hover:underline"
                              >
                                {ev.file_name}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteEvidence(ev.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                                title="Hapus lampiran ini"
                              >
                                <HiOutlineTrash className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pilihan tipe lampiran baru */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
                      {/* Tab selector */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { key: "none",   label: "Tidak Ada",    icon: HiOutlineXMark },
                          { key: "link",   label: "Link URL",     icon: HiOutlineLink },
                          { key: "file",   label: "Upload File",  icon: HiOutlineArrowUpTray },
                        ].map(({ key, label, icon: Icon }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, _lampType: key }))}
                            className={cn(
                              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold transition",
                              (form._lampType ?? (form.link ? "link" : "none")) === key
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Panel: Link URL */}
                      {(form._lampType ?? (form.link ? "link" : "none")) === "link" && (
                        <div className="space-y-2">
                          <div>
                            <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wide">URL Referensi *</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <HiOutlineLink className="h-3.5 w-3.5" />
                              </span>
                              <input
                                type="url"
                                placeholder="https://contoh.com/referensi"
                                value={form.link || ""}
                                onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs outline-none focus:border-indigo-400 focus:bg-white transition"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Label / Judul Link</label>
                            <input
                              type="text"
                              placeholder="Contoh: Lihat Referensi Desain"
                              value={form.link_title || ""}
                              onChange={e => setForm(f => ({ ...f, link_title: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-400 transition"
                            />
                          </div>
                          {form.link && (
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, link: "", link_title: "", _lampType: "none" }))}
                              className="flex items-center gap-1 text-[10px] text-rose-500 hover:text-rose-600 font-semibold transition"
                            >
                              <HiOutlineTrash className="h-3 w-3" /> Hapus Link
                            </button>
                          )}
                        </div>
                      )}

                      {/* Panel: Upload File */}
                      {(form._lampType ?? (form.link ? "link" : "none")) === "file" && (
                        <div>
                          <input
                            ref={evidenceInputRef}
                            type="file"
                            id="evidence-upload-edit"
                            className="hidden"
                            onChange={handleUploadEvidence}
                            disabled={uploadingEvidence}
                          />
                          <label
                            htmlFor="evidence-upload-edit"
                            className={cn(
                              "flex items-center gap-2 w-fit cursor-pointer rounded-xl border border-dashed px-4 py-2 text-xs font-bold transition",
                              uploadingEvidence
                                ? "border-slate-200 text-slate-400 cursor-not-allowed"
                                : "border-indigo-300 text-indigo-600 hover:bg-indigo-50 bg-white"
                            )}
                          >
                            <HiOutlineArrowUpTray className="h-4 w-4" />
                            {uploadingEvidence ? "Mengunggah..." : "Pilih File untuk Diunggah"}
                          </label>
                          {evidenceError && (
                            <p className="mt-1 text-[10px] text-rose-500 font-medium">{evidenceError}</p>
                          )}
                          <p className="mt-1.5 text-[10px] text-slate-400">Maks. 20MB · PDF, Gambar, Word, Excel, dll.</p>
                        </div>
                      )}

                      {/* Panel: Tidak Ada — tampilkan info jika ada link existing */}
                      {(form._lampType ?? (form.link ? "link" : "none")) === "none" && form.link && (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                          <HiOutlineExclamationTriangle className="h-3.5 w-3.5" />
                          Link yang ada akan tetap tersimpan. Pilih &quot;Link URL&quot; untuk menghapusnya.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setEditing(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
                      Batal
                    </button>
                    <button type="submit"
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition">
                      <HiOutlineCheck className="h-4 w-4" />
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              ) : (
                /* Read-Only Mode */
                <div className="space-y-6">
                  {/* Title & Edit Trigger */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-850 leading-tight">{task.title}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-semibold text-slate-600">Owner: {capitalizeEachWord(task.owner_name)}</span>
                        <span>&bull;</span>
                        <span>Dibuat pada {new Date(task.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                    {isOwner && (
                      <button onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-indigo-400 hover:text-indigo-600 shadow-sm transition">
                        <HiOutlinePencilSquare className="h-4 w-4" />
                        Edit Detail
                      </button>
                    )}
                  </div>

                  {/* Attributes Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prioritas</p>
                      <span className={cn("mt-1.5 inline-block rounded px-2 py-0.5 text-xs font-bold uppercase border", PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium)}>
                        {task.priority || "medium"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</p>
                      <span className="mt-1.5 inline-block rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-xs font-bold uppercase border border-indigo-200">
                        {task.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tanggal Mulai</p>
                      <p className="mt-1.5 text-xs font-bold text-slate-700 flex items-center gap-1">
                        <HiOutlineCalendarDays className="h-4 w-4 text-slate-400" />
                        {task.startdate ? new Date(task.startdate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</p>
                      <p className="mt-1.5 text-xs font-bold text-slate-700 flex items-center gap-1">
                        <HiOutlineCalendarDays className="h-4 w-4 text-slate-400" />
                        {task.enddate ? new Date(task.enddate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Deskripsi</h3>
                    <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50/20 p-4 min-h-[100px] text-sm text-slate-800 leading-relaxed prose prose-indigo max-w-none"
                      dangerouslySetInnerHTML={{ __html: task.desc || '<p className="text-slate-450 italic text-xs">Tidak ada deskripsi</p>' }}
                    />
                  </div>

                  {/* Stakeholders list */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">PIC Penanggung Jawab</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                          {task.pic_name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold text-slate-750">{capitalizeEachWord(task.pic_name) || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Position</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          <HiOutlineBriefcase className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-750">{task.position_name || "—"}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Co-PIC</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {task.co_pics?.length === 0 ? <span className="text-xs text-slate-400">—</span> : (
                          employees.filter(e => task.co_pics.includes(String(e.id))).map(emp => (
                            <span key={emp.id} className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs text-indigo-700 font-semibold">
                              {capitalizeEachWord(emp.full_name)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Reviewers</h4>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {task.reviewers?.length === 0 ? <span className="text-xs text-slate-400">—</span> : (
                          employees.filter(e => task.reviewers.includes(String(e.id))).map(emp => (
                            <span key={emp.id} className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-2.5 py-0.5 text-xs text-violet-755 font-semibold">
                              {capitalizeEachWord(emp.full_name)}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Evidence / Attachments */}
                  {(task.link || task.evidance_path) && (
                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Lampiran &amp; Referensi</h3>
                      <div className="mt-2.5 flex flex-wrap gap-3">
                        {task.link && (
                          <a href={formatExternalUrl(task.link)} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition">
                            <HiOutlineLink className="h-4 w-4" />
                            {task.link_title || "Buka Link Referensi"}
                          </a>
                        )}
                        {task.evidance_path && (
                          <a href={`${BASE_URL}${task.evidance_path}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition">
                            <HiOutlinePaperClip className="h-4 w-4 text-slate-400" />
                            {task.link_title || "Buka File Lampiran"}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          ) : (

            /* ── DISCUSS TAB (Diskusi & Komentar) ── */
            <div className="flex flex-col h-full bg-slate-50/30">
              {/* List comments */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingComments ? (
                  <p className="text-center text-xs text-slate-455 italic py-6">Memuat komentar...</p>
                ) : comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <HiOutlineChatBubbleLeftRight className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-xs font-semibold">Belum ada diskusi untuk task ini</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Tulis komentar pertama Anda untuk memulai obrolan</p>
                  </div>
                ) : (
                  comments.map((comm) => {
                    const isMe = me && String(comm.employee_id) === String(me.id);
                    const nameColors = [
                      "text-indigo-600",
                      "text-emerald-600",
                      "text-rose-500",
                      "text-amber-600",
                      "text-sky-600",
                      "text-violet-600",
                      "text-fuchsia-600",
                      "text-teal-650"
                    ];
                    const nameColorClass = nameColors[Number(comm.employee_id) % nameColors.length];

                    return (
                      <div key={comm.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-white font-extrabold text-[10px] shrink-0 shadow-inner",
                          isMe ? "bg-indigo-600" : "bg-slate-300 text-slate-700"
                        )}>
                          {comm.employee_name.charAt(0).toUpperCase()}
                        </div>
                        <div className={cn("flex-1 rounded-2xl border px-4 py-3 shadow-sm max-w-[80%]",
                          isMe ? "bg-indigo-50/70 border-indigo-100/80" : "bg-white border-slate-150"
                        )}>
                          <div className="flex items-baseline justify-between gap-4">
                            <p className={cn("text-[11px] font-bold", isMe ? "text-indigo-700" : nameColorClass)}>
                              {isMe ? "Anda" : capitalizeEachWord(comm.employee_name)}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {new Date(comm.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} &middot;{" "}
                              {new Date(comm.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <p className={cn("mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap",
                            isMe ? "text-slate-800" : "text-slate-750"
                          )}>
                            {comm.comment}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Input section */}
              <form onSubmit={handlePostComment} className="border-t border-slate-150 bg-white p-4 shrink-0 flex gap-2 items-center">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Tulis pesan diskusi di sini..."
                  rows={1}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-indigo-400 focus:bg-white resize-none"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePostComment(e);
                    }
                  }}
                />
                <button type="submit" disabled={!newComment.trim() || submittingComment}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                  <HiOutlinePaperAirplane className="h-4 w-4 rotate-45" />
                </button>
              </form>
            </div>

          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
