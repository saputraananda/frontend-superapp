import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { api, apiUpload, assetUrl } from "../../../lib/api";

/* ── Icons (inline SVG to avoid extra deps) ─────────────────────── */
const IconPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
);
const IconCheck = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
);
const IconPencil = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
);
const IconX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
);
const IconChevron = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
);
const IconLink = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
);
const IconFile = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
);
const IconUsers = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
);
const IconClipboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" /></svg>
);

/* ── Helper ──────────────────────────────────────────────────────── */
function cn(...c) { return c.filter(Boolean).join(" "); }

function ProgressBar({ percentage }) {
  const color = percentage === 100 ? "bg-emerald-500" : percentage >= 50 ? "bg-blue-500" : "bg-orange-400";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums", percentage === 100 ? "text-emerald-600" : "text-slate-500")}>{percentage}%</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function PersonalTasklistCard() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Filter state
  const [filterCompanyId, setFilterCompanyId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = parsed.user ?? parsed;
        setCurrentUserId(u.id);
      }
    } catch { /* ignore */ }
    // Load companies for filter
    api("/personal-tasklist/companies")
      .then((data) => setCompanies(data))
      .catch(() => {});
  }, []);

  const fetchLists = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCompanyId) params.set("company_id", filterCompanyId);
      if (filterDateFrom) params.set("date_from", filterDateFrom);
      if (filterDateTo) params.set("date_to", filterDateTo);
      const qs = params.toString();
      const data = await api(`/personal-tasklist${qs ? `?${qs}` : ""}`);
      setLists(data);
    } catch (err) {
      console.error("Failed to fetch tasklists:", err);
    } finally {
      setLoading(false);
    }
  }, [filterCompanyId, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleToggle = async (itemId, checked) => {
    try {
      await api(`/personal-tasklist/item/${itemId}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ is_checked: checked }),
      });
      fetchLists();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api(`/personal-tasklist/${confirmDelete}`, { method: "DELETE" });
      setConfirmDelete(null);
      if (expandedId === confirmDelete) setExpandedId(null);
      fetchLists();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const openCreate = () => { setEditingList(null); setModalOpen(true); };
  const openEdit = (list) => { setEditingList(list); setModalOpen(true); };

  const totalAll = lists.reduce((s, l) => s + l.total_items, 0);
  const checkedAll = lists.reduce((s, l) => s + l.checked_items, 0);
  const overallPct = totalAll > 0 ? Math.round((checkedAll / totalAll) * 100) : 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-violet-100">
            <IconClipboard />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Personal Tasklist</h3>
            <p className="text-[10px] text-slate-400">
              {lists.length} list · {checkedAll}/{totalAll} item selesai
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalAll > 0 && (
            <div className="hidden sm:block w-24">
              <ProgressBar percentage={overallPct} />
            </div>
          )}
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition">
            <IconPlus /> Buat
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3 bg-white">
        <select
          value={filterCompanyId}
          onChange={(e) => setFilterCompanyId(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
        >
          <option value="">Semua Perusahaan</option>
          {companies.map((c) => (
            <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold">Dari</span>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-semibold">Sampai</span>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
          />
        </div>
        {(filterCompanyId || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterCompanyId(""); setFilterDateFrom(""); setFilterDateTo(""); }}
            className="text-[10px] text-rose-500 font-semibold hover:underline"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 480 }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">Memuat...</div>
        ) : lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <IconClipboard />
            <p className="text-sm text-slate-400">Belum ada tasklist</p>
            <button onClick={openCreate} className="text-xs text-violet-600 font-semibold hover:underline">+ Buat baru</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {lists.map((list) => (
              <TasklistRow
                key={list.id}
                list={list}
                expanded={expandedId === list.id}
                onToggleExpand={() => setExpandedId(expandedId === list.id ? null : list.id)}
                onToggleItem={handleToggle}
                onEdit={() => openEdit(list)}
                onDelete={() => setConfirmDelete(list.id)}
                isOwner={currentUserId === list.created_by}
                onRefresh={fetchLists}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal — portal to body */}
      {modalOpen && createPortal(
        <TasklistModal
          editingList={editingList}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchLists(); }}
        />,
        document.body
      )}

      {/* Delete Confirm — portal to body */}
      {confirmDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Hapus Tasklist?</h3>
            <p className="text-sm text-slate-500">Semua item dan assignee di dalamnya akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition">Hapus</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TASKLIST ROW (Accordion)
════════════════════════════════════════════════════════════════ */
function TasklistRow({ list, expanded, onToggleExpand, onToggleItem, onEdit, onDelete, isOwner, onRefresh }) {
  return (
    <div>
      {/* Header */}
      <button onClick={onToggleExpand} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50/60 transition group">
        <div className="shrink-0"><IconChevron open={expanded} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 truncate">{list.title}</span>
            {list.company_name && (
              <span className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 border border-blue-100 truncate max-w-[120px]">
                {list.company_name}
              </span>
            )}
            {list.assignees?.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                <IconUsers /> {list.assignees.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {list.description && (
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{list.description}</p>
            )}
            {list.due_date && (
              <span className="text-[10px] text-orange-600 bg-orange-50 rounded-full px-2 py-0.5 border border-orange-100 shrink-0 mt-0.5">
                {new Date(list.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 w-28">
          <ProgressBar percentage={list.percentage} />
        </div>
        {isOwner && (
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <span onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 cursor-pointer"><IconPencil /></span>
            <span onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 cursor-pointer"><IconTrash /></span>
          </div>
        )}
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="px-5 pb-4">
          {/* Assignees bar */}
          {list.assignees?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Assigned:</span>
              {list.assignees.map((a) => (
                <span key={a.employee_id} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-medium rounded-full px-2 py-0.5 border border-violet-100">
                  {a.full_name}
                </span>
              ))}
            </div>
          )}

          {/* Items */}
          {list.items?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada item</p>
          ) : (
            <div className="space-y-1.5">
              {list.items.map((item) => (
                <ChecklistItemRow key={item.id} item={item} onToggle={onToggleItem} onRefresh={onRefresh} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CHECKLIST ITEM ROW
════════════════════════════════════════════════════════════════ */
function ChecklistItemRow({ item, onToggle, onRefresh }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUpload(`/personal-tasklist/item/${item.id}/evidence`, { method: "POST", body: fd });
      onRefresh();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className={cn(
      "flex items-start gap-2.5 p-2.5 rounded-lg border transition",
      item.is_checked ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100 hover:border-slate-200"
    )}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id, !item.is_checked)}
        className={cn(
          "shrink-0 mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center transition",
          item.is_checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-violet-400"
        )}
      >
        {item.is_checked && <IconCheck />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug", item.is_checked ? "line-through text-slate-400" : "text-slate-700")}>
          {item.content}
        </p>

        {/* Evidence badge */}
        {item.evidence_type === "link" && item.evidence_value && (
          <a href={item.evidence_value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10px] text-blue-600 hover:underline bg-blue-50 rounded-full px-2 py-0.5">
            <IconLink /> Link
          </a>
        )}
        {item.evidence_type === "file" && item.evidence_value && (
          <a href={assetUrl(item.evidence_value)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-600 hover:underline bg-emerald-50 rounded-full px-2 py-0.5">
            <IconFile /> File
          </a>
        )}
      </div>

      {/* Upload evidence button (only if no evidence yet) */}
      {item.evidence_type === "none" && (
        <>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition text-[10px]"
            title="Upload evidence"
          >
            {uploading ? <span className="text-[10px]">...</span> : <IconFile />}
          </button>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EVIDENCE FILE INPUT (upload immediately, return path)
════════════════════════════════════════════════════════════════ */
function EvidenceFileInput({ value, fileName, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiUpload("/personal-tasklist/upload-evidence", { method: "POST", body: fd });
      onUploaded(res.evidence_value, res.file_name || file.name);
    } catch (err) {
      console.error("Upload evidence failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input ref={fileRef} type="file" className="hidden" onChange={handlePick} />
      {value ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 truncate max-w-[180px]">
            <IconFile /> {fileName || "File uploaded"}
          </span>
          <button onClick={() => fileRef.current?.click()} className="text-[10px] text-violet-600 hover:underline shrink-0">Ganti</button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-500 hover:border-violet-400 hover:text-violet-600 transition"
        >
          {uploading ? "Mengupload..." : <><IconFile /> Pilih file</>}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CREATE / EDIT MODAL
════════════════════════════════════════════════════════════════ */
function TasklistModal({ editingList, onClose, onSaved }) {
  const [title, setTitle] = useState(editingList?.title || "");
  const [description, setDescription] = useState(editingList?.description || "");
  const [companyId, setCompanyId] = useState(editingList?.company_id || "");
  const [dueDate, setDueDate] = useState(editingList?.due_date ? editingList.due_date.slice(0, 10) : "");
  const [items, setItems] = useState(
    editingList?.items?.map((i) => ({ ...i })) || [{ content: "", is_checked: false, evidence_type: "none", evidence_value: "" }]
  );
  const [assignees, setAssignees] = useState(editingList?.assignees?.map((a) => a.employee_id) || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Companies for dropdown
  const [modalCompanies, setModalCompanies] = useState([]);
  useEffect(() => {
    api("/personal-tasklist/companies")
      .then((data) => setModalCompanies(data))
      .catch(() => {});
  }, []);

  // Employee search
  const [empQuery, setEmpQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);
  const [assigneeNames, setAssigneeNames] = useState(
    editingList?.assignees?.reduce((m, a) => ({ ...m, [a.employee_id]: a.full_name }), {}) || {}
  );
  const empWrapperRef = useRef(null);

  // Load all employees on mount
  useEffect(() => {
    setEmpLoading(true);
    api("/personal-tasklist/employees?q=")
      .then((data) => setAllEmployees(data))
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (empWrapperRef.current && !empWrapperRef.current.contains(e.target)) {
        setEmpDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered employees based on search query (keep selected visible for checkmark toggle)
  const filteredEmployees = allEmployees.filter((emp) => {
    if (!empQuery.trim()) return true;
    return emp.full_name.toLowerCase().includes(empQuery.toLowerCase());
  });

  const toggleAssignee = (emp) => {
    if (assignees.includes(emp.employee_id)) {
      setAssignees((prev) => prev.filter((a) => a !== emp.employee_id));
    } else {
      setAssignees((prev) => [...prev, emp.employee_id]);
      setAssigneeNames((prev) => ({ ...prev, [emp.employee_id]: emp.full_name }));
    }
  };

  const removeAssignee = (id) => {
    setAssignees((prev) => prev.filter((a) => a !== id));
  };

  const addItem = () => setItems((prev) => [...prev, { content: "", is_checked: false, evidence_type: "none", evidence_value: "" }]);

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, key, val) => setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Title wajib diisi";
    const validItems = items.filter((it) => it.content.trim());
    if (validItems.length === 0) e.items = "Minimal 1 item checklist";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const cleanItems = items
        .filter((it) => it.content.trim())
        .map((it) => ({
          content: it.content.trim(),
          is_checked: it.is_checked ? 1 : 0,
          evidence_type: it.evidence_type || "none",
          evidence_value: it.evidence_value?.trim() || null,
        }));

      const body = { title: title.trim(), description: description.trim() || null, company_id: companyId || null, due_date: dueDate || null, items: cleanItems, assignees };

      if (editingList) {
        await api(`/personal-tasklist/${editingList.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/personal-tasklist", { method: "POST", body: JSON.stringify(body) });
      }
      onSaved();
    } catch (err) {
      setErrors({ save: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-300 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-violet-50">
              <IconClipboard />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              {editingList ? "Edit Tasklist" : "Buat Tasklist Baru"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"><IconX /></button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-600">Title <span className="text-rose-500">*</span></label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nama tasklist..." />
            {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-600">Deskripsi</label>
            <textarea className={cn(inputCls, "resize-none")} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi opsional..." />
          </div>

          {/* Company & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Perusahaan</label>
              <select
                className={inputCls}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">-- Pilih Perusahaan --</option>
                {modalCompanies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Tanggal Deadline</label>
              <input
                type="date"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Assign employees */}
          <div>
            <label className="text-xs font-semibold text-slate-600">Assign Karyawan</label>
            <div className="relative mt-1" ref={empWrapperRef}>
              <input
                className={inputCls}
                value={empQuery}
                onChange={(e) => setEmpQuery(e.target.value)}
                onFocus={() => setEmpDropdownOpen(true)}
                placeholder="Cari nama karyawan..."
              />
              {empDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-[99] max-h-48 overflow-y-auto">
                  {empLoading ? (
                    <div className="px-3 py-3 text-xs text-slate-400 text-center">Memuat karyawan...</div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-slate-400 text-center">Tidak ada karyawan ditemukan</div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = assignees.includes(emp.employee_id);
                      return (
                        <button
                          key={emp.employee_id}
                          onClick={() => toggleAssignee(emp)}
                          className={`w-full text-left px-3 py-2 text-sm transition flex items-center gap-2.5 ${isSelected ? "bg-violet-50" : "hover:bg-slate-50"}`}
                        >
                          <span className="shrink-0 h-[18px] w-[18px] flex items-center justify-center">
                            <svg className={`h-4 w-4 transition-colors ${isSelected ? "text-emerald-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                          </span>
                          <span className={`font-medium ${isSelected ? "text-violet-700" : "text-slate-700"}`}>{emp.full_name}</span>
                          <span className="text-[10px] text-slate-400">{emp.employee_code}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {assignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {assignees.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1 border border-violet-100">
                    {assigneeNames[id] || `ID ${id}`}
                    <button onClick={() => removeAssignee(id)} className="p-0.5 rounded-full hover:bg-violet-200 transition">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Checklist Items <span className="text-rose-500">*</span></label>
              <button onClick={addItem} className="text-xs font-semibold text-violet-600 hover:underline flex items-center gap-1"><IconPlus /> Tambah item</button>
            </div>
            {errors.items && <p className="text-xs text-rose-500 mt-1">{errors.items}</p>}
            <div className="space-y-2 mt-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(idx, "is_checked", !item.is_checked)}
                      className={cn(
                        "shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition",
                        item.is_checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-violet-400"
                      )}
                    >
                      {item.is_checked && <IconCheck />}
                    </button>
                    <input
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                      value={item.content}
                      onChange={(e) => updateItem(idx, "content", e.target.value)}
                      placeholder={`Item ${idx + 1}...`}
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="shrink-0 p-1 rounded-lg text-rose-400 hover:bg-rose-50 transition"><IconTrash /></button>
                    )}
                  </div>
                  {/* Evidence */}
                  <div className="flex items-center gap-2 pl-7">
                    <select
                      className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1 outline-none focus:ring-2 focus:ring-violet-500/30"
                      value={item.evidence_type}
                      onChange={(e) => {
                        updateItem(idx, "evidence_type", e.target.value);
                        updateItem(idx, "evidence_value", "");
                        updateItem(idx, "_fileName", "");
                      }}
                    >
                      <option value="none">Tanpa evidence</option>
                      <option value="link">Link URL</option>
                      <option value="file">Upload File</option>
                    </select>
                    {item.evidence_type === "link" && (
                      <input
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-violet-500/30"
                        value={item.evidence_value || ""}
                        onChange={(e) => updateItem(idx, "evidence_value", e.target.value)}
                        placeholder="https://..."
                      />
                    )}
                    {item.evidence_type === "file" && (
                      <EvidenceFileInput
                        value={item.evidence_value}
                        fileName={item._fileName}
                        onUploaded={(path, name) => { updateItem(idx, "evidence_value", path); updateItem(idx, "_fileName", name); }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errors.save && <p className="text-xs text-rose-500">{errors.save}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Batal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition">
            {saving ? "Menyimpan..." : editingList ? "Simpan Perubahan" : "Buat Tasklist"}
          </button>
        </div>
      </div>
    </div>
  );
}
