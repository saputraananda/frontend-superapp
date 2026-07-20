import { useState, useEffect, useCallback, useRef } from "react";
import { api, apiUpload, assetUrl } from "../../../../lib/api";
import { 
  HiOutlineClipboardDocumentList, 
  HiOutlinePlus, 
  HiOutlineTrash, 
  HiOutlinePencilSquare, 
  HiOutlineXMark, 
  HiOutlineChevronDown, 
  HiOutlineLink, 
  HiOutlineDocument, 
  HiOutlineUsers,
  HiOutlineCheck,
  HiOutlineCalendar,
  HiOutlineBuildingOffice,
  HiOutlineMagnifyingGlass
} from "react-icons/hi2";

import AddPersonalTaskModal from "../../components/AddPersonalTaskModal";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function ProgressBar({ percentage }) {
  const color = percentage === 100 ? "bg-emerald-500" : percentage >= 50 ? "bg-indigo-500" : "bg-orange-400";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className={cn("text-xs font-bold tabular-nums shrink-0", percentage === 100 ? "text-emerald-600" : "text-slate-500")}>
        {percentage}%
      </span>
    </div>
  );
}

export default function PersonalTaskList() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
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
    api("/personal-tasklist/companies")
      .then((data) => setCompanies(data))
      .catch(() => { });
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

  useEffect(() => { 
    fetchLists(); 
  }, [fetchLists]);

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
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* ── HEADER CARD ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
                <HiOutlineClipboardDocumentList className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Daftar Checklist Personal</h1>
                <p className="text-xs text-slate-400">
                  Kelola tugas mandiri dan tim Anda secara terperinci
                </p>
              </div>
            </div>
            
            <button
              onClick={openCreate}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition active:scale-95 shrink-0"
            >
              <HiOutlinePlus className="h-4 w-4" /> Buat Checklist
            </button>
          </div>

          {/* Overall Progress Stats */}
          {totalAll > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Progress Keseluruhan</span>
                <span className="font-bold text-slate-700">{checkedAll} dari {totalAll} item selesai ({overallPct}%)</span>
              </div>
              <ProgressBar percentage={overallPct} />
            </div>
          )}
        </div>

        {/* ── FILTER & SEARCH PANEL ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          {/* Row 1: Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <HiOutlineMagnifyingGlass className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari checklist berdasarkan judul, deskripsi, atau detail item tugas..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 font-semibold"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-650 transition"
              >
                <HiOutlineXMark className="h-4.5 w-4.5" />
              </button>
            )}
          </div>

          {/* Row 2: Additional Filters */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <HiOutlineBuildingOffice className="h-4 w-4" />
                </span>
                <select
                  value={filterCompanyId}
                  onChange={(e) => setFilterCompanyId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  <option value="">Semua Unit Bisnis / Perusahaan</option>
                  {companies.map((c) => (
                    <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <HiOutlineCalendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  placeholder="Dari Tanggal"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                  <HiOutlineCalendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  placeholder="Sampai Tanggal"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                />
              </div>
            </div>

            {(filterCompanyId || filterDateFrom || filterDateTo || searchQuery) && (
              <button
                type="button"
                onClick={() => { 
                  setFilterCompanyId(""); 
                  setFilterDateFrom(""); 
                  setFilterDateTo(""); 
                  setSearchQuery("");
                }}
                className="text-xs font-bold text-rose-650 hover:text-rose-750 transition px-2 py-2 shrink-0"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* ── CHECKLIST LIST AREA ── */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs">Memuat data checklist...</p>
          </div>
        ) : lists.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-20 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 shadow-inner">
              <HiOutlineClipboardDocumentList className="h-8 w-8 stroke-1" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-700">Belum Ada Checklist</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Mulai dengan membuat checklist tugas pribadi baru atau hubungkan dengan unit bisnis.
              </p>
            </div>
            <button 
              onClick={openCreate} 
              className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              + Buat Checklist Baru
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const filteredLists = lists.filter((list) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const matchesTitle = list.title?.toLowerCase().includes(query);
                const matchesDesc = list.description?.toLowerCase().includes(query);
                const matchesCompany = list.company_name?.toLowerCase().includes(query);
                const matchesItems = list.items?.some(item => item.content?.toLowerCase().includes(query));
                return matchesTitle || matchesDesc || matchesCompany || matchesItems;
              });

              if (filteredLists.length === 0) {
                return (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-16 text-center text-slate-450 gap-2 flex flex-col items-center justify-center">
                    <HiOutlineMagnifyingGlass className="h-8 w-8 text-slate-350 stroke-1" />
                    <p className="text-xs font-bold text-slate-700 mt-1">Checklist tidak ditemukan</p>
                    <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian Anda.</p>
                  </div>
                );
              }

              return filteredLists.map((list) => (
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
              ));
            })()}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <AddPersonalTaskModal
          editingList={editingList}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchLists(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Hapus Checklist?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Semua item tugas dan data terkait di dalamnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)} 
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-bold text-white transition active:scale-95"
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

/* ── TASKLIST ROW COMPONENT ── */
function TasklistRow({ list, expanded, onToggleExpand, onToggleItem, onEdit, onDelete, isOwner, onRefresh }) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
      expanded && "ring-1 ring-indigo-500/20 border-indigo-300/80 bg-indigo-50/5"
    )}>
      {/* Top Clickable Area */}
      <div
        onClick={onToggleExpand}
        className="cursor-pointer p-5 space-y-4 hover:bg-slate-50/40 transition-colors"
      >
        {/* Title + Badges + Actions Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-850 tracking-tight" title={list.title}>
                {list.title}
              </h3>
              {list.company_name && (
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5 truncate max-w-[200px]" title={list.company_name}>
                  🏢 {list.company_name}
                </span>
              )}
              {list.assignees?.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-550 bg-slate-100 border border-slate-200/60 rounded-full px-2.5 py-0.5">
                  <HiOutlineUsers className="h-3.5 w-3.5 text-slate-450" /> {list.assignees.length} Tim
                </span>
              )}
            </div>
            {list.description && (
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl font-medium" title={list.description}>
                {list.description}
              </p>
            )}
          </div>

          {/* Action buttons + Expand chevron */}
          <div className="flex items-center gap-1 shrink-0">
            {isOwner && (
              <div className="flex items-center gap-0.5 mr-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  title="Edit checklist"
                >
                  <HiOutlinePencilSquare className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                  title="Hapus checklist"
                >
                  <HiOutlineTrash className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 shadow-sm transition-all duration-300",
              expanded ? "rotate-180 border-indigo-250 text-indigo-600 bg-indigo-50/30" : "hover:text-slate-650 hover:border-slate-350"
            )}>
              <HiOutlineChevronDown className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        {/* Footer line: due date + progress bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {list.due_date ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-0.5">
                📅 Batas: {new Date(list.due_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/50 rounded-full px-2.5 py-0.5">
                Tanpa Tanggal Tenggat
              </span>
            )}
          </div>
          <div className="w-full sm:max-w-xs">
            <ProgressBar percentage={list.percentage} />
          </div>
        </div>
      </div>

      {/* Expanded Content Panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/20 px-5 py-5 space-y-4">
          {list.assignees?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Penerima Tugas:</span>
              {list.assignees.map((a) => (
                <span
                  key={a.employee_id}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full px-3 py-0.5 border border-indigo-100/80 shadow-sm"
                >
                  {a.full_name}
                </span>
              ))}
            </div>
          )}

          {list.items?.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada item tugas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

/* ── CHECKLIST ITEM COMPONENT ── */
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
      "flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150",
      item.is_checked ? "bg-emerald-50/20 border-emerald-100" : "bg-white border-slate-200/70 hover:border-indigo-100 hover:shadow-sm"
    )}>
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={() => onToggle(item.id, !item.is_checked)}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition active:scale-90",
            item.is_checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-indigo-400 bg-white"
          )}
        >
          {Boolean(item.is_checked) && <HiOutlineCheck className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        <div className="min-w-0">
          <p className={cn("text-xs leading-relaxed font-semibold", item.is_checked ? "line-through text-slate-400 font-normal" : "text-slate-700")}>
            {item.content}
          </p>
          
          <div className="flex items-center gap-1.5 mt-1.5">
            {item.evidence_type === "link" && item.evidence_value && (
              <a 
                href={item.evidence_value} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5"
              >
                <HiOutlineLink className="h-3 w-3" /> Link Lampiran
              </a>
            )}
            {item.evidence_type === "file" && item.evidence_value && (
              <a 
                href={assetUrl(item.evidence_value)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5"
              >
                <HiOutlineDocument className="h-3 w-3" /> File Bukti
              </a>
            )}
          </div>
        </div>
      </div>

      {item.evidence_type === "none" && (
        <div className="shrink-0">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 transition"
            title="Upload bukti file"
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            ) : (
              <HiOutlineDocument className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
