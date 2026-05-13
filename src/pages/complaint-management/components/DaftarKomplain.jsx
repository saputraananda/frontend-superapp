import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { api, apiUpload, assetUrl } from "../../../lib/api";
import {
  HiOutlineArrowPath,
  HiOutlineArrowsUpDown,
  HiOutlineChartBarSquare,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentArrowDown,
  HiOutlineExclamationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperClip,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineUser,
  HiOutlineXMark,
} from "react-icons/hi2";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

// ── Default cutoff period ─────────────────────────────────────────────────────

function getDefaultCutoff() {
  const now = new Date();
  const day = now.getDate();
  let endYear = now.getFullYear();
  let endMonth = now.getMonth(); // 0-indexed
  if (day > 25) {
    endMonth += 1;
    if (endMonth > 11) { endMonth = 0; endYear++; }
  }
  let startYear = endYear;
  let startMonth = endMonth - 1;
  if (startMonth < 0) { startMonth = 11; startYear--; }
  return {
    start: `${startYear}-${String(startMonth + 1).padStart(2, "0")}-26`,
    end:   `${endYear}-${String(endMonth + 1).padStart(2, "0")}-25`,
  };
}

const DEFAULT_CUTOFF = getDefaultCutoff();

// ── Constants ──────────────────────────────────────────────────────────────────

const PROGRESS_OPTIONS = ["Open", "On Progress", "Waiting Customer", "Resolved", "Closed"];
const DEDUCTION_OPTIONS = ["None", "Company", "Management"];

const PROGRESS_BADGE = {
  Open:              "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
  "On Progress":     "bg-amber-100 text-amber-700 border-amber-200",
  "Waiting Customer":"bg-sky-100 text-sky-700 border-sky-200",
  Resolved:          "bg-emerald-100 text-emerald-700 border-emerald-200",
  Closed:            "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const PROGRESS_DOT = {
  Open:              "bg-fuchsia-600",
  "On Progress":     "bg-amber-400",
  "Waiting Customer":"bg-sky-400",
  Resolved:          "bg-emerald-500",
  Closed:            "bg-emerald-500",
};



const EMPTY_PROGRESS_FORM = {
  progress: "",
  note: "",
  pic_employee_id: "",
  pic_name: "",
};

// ── Small helpers ──────────────────────────────────────────────────────────────

function Badge({ progress }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", PROGRESS_BADGE[progress])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", PROGRESS_DOT[progress])} />
      {progress}
    </span>
  );
}

function FileChip({ name, _url, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 transition"
    >
      <HiOutlinePaperClip className="h-3 w-3 shrink-0" />
      <span className="max-w-[140px] truncate">{name || "Dokumen"}</span>
    </button>
  );
}

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({ src, name, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!src) return null;

  const isImg = /\.(jpe?g|png|gif|webp)$/i.test(src);
  const isPdf = /\.pdf$/i.test(src);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white hover:bg-black/60 transition"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        {isImg ? (
          <img src={src} alt={name || "Preview"} className="max-h-[85vh] max-w-[85vw] object-contain rounded-2xl" />
        ) : isPdf ? (
          <iframe src={src} title={name || "PDF"} className="h-[85vh] w-[85vw] rounded-2xl" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-16">
            <HiOutlinePaperClip className="h-14 w-14 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">{name || "Dokumen"}</p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-gradient-to-r from-fuchsia-700 to-fuchsia-700 px-5 py-2 text-sm font-semibold text-white shadow hover:from-fuchsia-800 hover:to-fuchsia-800"
            >
              Download / Buka File
            </a>
          </div>
        )}

        {/* File name footer */}
        {(isImg || isPdf) && name && (
          <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500 truncate">{name}</div>
        )}
      </div>
    </div>,
    document.body
  );
}



// ── Field components ───────────────────────────────────────────────────────────

function SelectField({ label, required, value, onChange, children, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-500">
        {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className={cn(
            "w-full appearance-none rounded-xl border bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-800 outline-none transition",
            "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
            error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-200 hover:border-slate-300",
          )}
        >
          {children}
        </select>
        <HiOutlineChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}

function TextField({ label, required, value, onChange, error, placeholder, type = "text", as: As = "input", hint }) {
  const cls = cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-300",
    "focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20",
    error ? "border-fuchsia-500 bg-fuchsia-50/40" : "border-slate-200 hover:border-slate-300",
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500">
          {label}{required && <span className="ml-0.5 text-fuchsia-600">*</span>}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {As === "textarea"
        ? <textarea rows={4} value={value} onChange={onChange} placeholder={placeholder} className={cn(cls, "resize-none")} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      }
      {error && <p className="flex items-center gap-1 text-xs text-fuchsia-700"><span>⚠</span> {error}</p>}
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, subtitle, icon: Icon, children, wide, full, danger }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const headerBg = danger
    ? "bg-gradient-to-r from-red-600 to-rose-500"
    : "bg-gradient-to-r from-fuchsia-700 to-fuchsia-700";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col",
          full ? "max-w-6xl max-h-[92vh]" : wide ? "max-w-3xl max-h-[90vh]" : "max-w-xl max-h-[90vh]"
        )}
      >
        {/* Gradient header */}
        <div className={cn("shrink-0 flex items-center gap-3 px-6 py-5", headerBg)}>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ── Progress Timeline ──────────────────────────────────────────────────────────

function ProgressTimeline({ logs, onPreviewDoc }) {
  if (!logs?.length) return <p className="py-4 text-center text-sm text-slate-400">Belum ada log progress.</p>;
  return (
    <ol className="relative border-l border-slate-200 pl-6 space-y-6">
      {logs.map((log) => (
        <li key={log.log_id} className="relative">
          <span className={cn(
            "absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-white",
            PROGRESS_DOT[log.progress] || "bg-slate-300",
          )} />
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge progress={log.progress} />
              <span className="text-[11px] text-slate-400">
                {new Date(log.logged_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </span>
              {log.pic_name && (
                <span className="text-[11px] text-slate-500">— PIC: <b>{log.pic_name}</b></span>
              )}
            </div>
            {log.note && <p className="text-sm text-slate-700 whitespace-pre-line">{log.note}</p>}
            {log.documents?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {log.documents.map((d) => {
                  const url = assetUrl(d.file_path);
                  const isImg = /\.(jpe?g|png|gif|webp)$/i.test(d.file_path);
                  return isImg ? (
                    <div
                      key={d.pdoc_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onPreviewDoc?.({ src: url, name: d.original_name })}
                      className="group relative h-16 w-16 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm transition hover:shadow-md"
                    >
                      <img src={url} alt={d.original_name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <HiOutlineMagnifyingGlass className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <FileChip key={d.pdoc_id} name={d.original_name} url={url} onClick={() => onPreviewDoc?.({ src: url, name: d.original_name })} />
                  );
                })}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DaftarKomplain() {
  const navigate = useNavigate();

  // Meta
  const [meta, setMeta] = useState({ types: [], categories: [], topics: [], outlets: [] });

  // List
  const [complaints, setComplaints] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState({ search: "", progress: "", outlet_id: "", type_id: "", startDate: DEFAULT_CUTOFF.start, endDate: DEFAULT_CUTOFF.end });
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [dateOrder, setDateOrder] = useState("desc");

  // Reset to page 1 when filter / pageSize / dateOrder changes
  const filterKey = JSON.stringify(filter);
  useEffect(() => { setPage(1); }, [filterKey, pageSize, dateOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Progress log modal
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressForm, setProgressForm] = useState(EMPTY_PROGRESS_FORM);
  const [progressFiles, setProgressFiles] = useState([]);
  const [savingProgress, setSavingProgress] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Lightbox preview
  const [lightbox, setLightbox] = useState({ src: null, name: null });

  const progressFileRef = useRef(null);

  // ── Fetch meta ────────────────────────────────────────────────────

  useEffect(() => {
    document.title = "Daftar Komplain | Alora App";
    api("/complaints/meta").then((d) => setMeta(d)).catch(() => {});
  }, []);

  // ── Fetch list ────────────────────────────────────────────────────

  const fetchComplaints = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (pageSize === "all") {
        params.set("limit", "all");
        params.set("offset", 0);
      } else {
        params.set("limit", pageSize);
        params.set("offset", (page - 1) * pageSize);
      }
      params.set("order_dir", dateOrder);
      if (filter.search)    params.set("search", filter.search);
      if (filter.progress)  params.set("progress", filter.progress);
      if (filter.outlet_id) params.set("outlet_id", filter.outlet_id);
      if (filter.type_id)   params.set("type_id", filter.type_id);
      if (filter.startDate) params.set("start_date", filter.startDate);
      if (filter.endDate)   params.set("end_date",   filter.endDate);
      const data = await api(`/complaints?${params}`);
      setComplaints(data.complaints);
      setTotal(data.total);
    } catch {
      setComplaints([]);
    } finally {
      setLoadingList(false);
    }
  }, [filter, pageSize, page, dateOrder]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // ── Detail ────────────────────────────────────────────────────────

  const openDetail = async (id) => {
    setDetailOpen(true);
    setLoadingDetail(true);
    setDetailData(null);
    try {
      const data = await api(`/complaints/${id}`);
      setDetailData(data);
    } catch {
      // ignore
    } finally { setLoadingDetail(false); }
  };

  // ── Form helpers ──────────────────────────────────────────────────

  const openAdd = () => {
    navigate("/complaint-form");
  };

  const openEdit = (c) => {
    navigate("/complaint-form", { state: { editTarget: c } });
  };

  // ── Progress log ──────────────────────────────────────────────────

  const openProgressModal = () => {
    setProgressForm(EMPTY_PROGRESS_FORM);
    setProgressFiles([]);
    setProgressOpen(true);
  };

  const handleAddProgress = async (e) => {
    e.preventDefault();
    if (!progressForm.progress) return;
    setSavingProgress(true);
    try {
      const fd = new FormData();
      Object.entries(progressForm).forEach(([k, v]) => fd.append(k, v));
      progressFiles.forEach((f) => fd.append("documents", f));
      await apiUpload(`/complaints/${detailData.complaint.complaint_id}/progress`, { method: "POST", body: fd });
      setProgressOpen(false);
      // Refresh detail
      const data = await api(`/complaints/${detailData.complaint.complaint_id}`);
      setDetailData(data);
      fetchComplaints();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProgress(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/complaints/${deleteTarget.complaint_id}`, { method: "DELETE" });
      setDeleteTarget(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Daftar Komplain</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {total} komplain ditemukan
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-700 to-fuchsia-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-fuchsia-300/40 transition hover:from-fuchsia-800 hover:to-fuchsia-800"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tambah Komplain
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Date range filter */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.startDate}
            onChange={(e) => setFilter((f) => ({ ...f, startDate: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20"
          />
          <span className="text-xs text-slate-400">s/d</span>
          <input
            type="date"
            value={filter.endDate}
            onChange={(e) => setFilter((f) => ({ ...f, endDate: e.target.value }))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20"
          />
        </div>

        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama/nota..."
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-600/20"
          />
        </div>

        {/* Progress filter */}
        <div className="relative">
          <select
            value={filter.progress}
            onChange={(e) => setFilter((f) => ({ ...f, progress: e.target.value }))}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500"
          >
            <option value="">Semua Status</option>
            {PROGRESS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <HiOutlineChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Outlet filter */}
        <div className="relative">
          <select
            value={filter.outlet_id}
            onChange={(e) => setFilter((f) => ({ ...f, outlet_id: e.target.value }))}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-fuchsia-500"
          >
            <option value="">Semua Outlet</option>
            {meta.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <HiOutlineChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          type="button"
          onClick={fetchComplaints}
          disabled={loadingList}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <HiOutlineArrowPath className={cn("h-4 w-4", loadingList && "animate-spin")} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-x-auto">
        {loadingList ? (
          <div className="space-y-0">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-14 animate-pulse border-b border-slate-50 bg-slate-50/50 last:border-0" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm text-slate-400">Tidak ada data komplain</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">
                  <button
                    type="button"
                    onClick={() => setDateOrder((d) => d === "desc" ? "asc" : "desc")}
                    className="inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 transition hover:bg-slate-100"
                  >
                    Tanggal
                    {dateOrder === "desc"
                      ? <HiOutlineChevronDown className="h-3.5 w-3.5 text-fuchsia-500" />
                      : <HiOutlineChevronUp className="h-3.5 w-3.5 text-fuchsia-500" />
                    }
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Nama / Nota</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Outlet</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Topik</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Bahan</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Track Progress</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {complaints.map((c) => (
                <tr key={c.complaint_id} className="hover:bg-slate-50/50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{c.complaint_name}</p>
                    <p className="text-xs text-slate-400">{c.nota_number}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.outlet_name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.topic_name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.category_name || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.type_name}</td>
                  <td className="px-4 py-3"><Badge progress={c.progress} /></td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => openDetail(c.complaint_id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-1.5 text-xs font-semibold text-fuchsia-700 transition hover:bg-fuchsia-100 hover:border-fuchsia-300"
                      title="Track Progress"
                    >
                      <HiOutlineChartBarSquare className="h-4 w-4" />
                      Track Progress
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-700"
                        title="Edit"
                      >
                        <HiOutlinePencilSquare className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Hapus"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer */}
      {!loadingList && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Tampilkan:</span>
            {[25, 50, 100, "all"].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setPageSize(sz)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                  pageSize === sz
                    ? "bg-fuchsia-700 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {sz === "all" ? "ALL" : sz}
              </button>
            ))}
          </div>

          {/* Info + nav */}
          {pageSize !== "all" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} dari <b>{total}</b>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  <HiOutlineChevronLeft className="h-4 w-4" />
                </button>
                {/* Page numbers */}
                {(() => {
                  const totalPages = Math.ceil(total / pageSize);
                  const pages = [];
                  pages.push(1);
                  if (page > 3) pages.push("...");
                  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                  if (page < totalPages - 2) pages.push("...");
                  if (totalPages > 1) pages.push(totalPages);
                  return [...new Set(pages)].map((pg, idx) =>
                    pg === "..." ? (
                      <span key={`e${idx}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPage(pg)}
                        className={cn(
                          "min-w-[28px] rounded-lg px-2 py-1 text-xs font-semibold transition",
                          pg === page ? "bg-fuchsia-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {pg}
                      </button>
                    )
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(Math.ceil(total / pageSize), p + 1))}
                  disabled={page >= Math.ceil(total / pageSize)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                >
                  <HiOutlineChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {pageSize === "all" && (
            <span className="text-xs text-slate-500">Menampilkan semua <b>{total}</b> data</span>
          )}
        </div>
      )}

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detail Komplain" subtitle="Informasi lengkap & tracking progress" icon={HiOutlineDocumentArrowDown} full>
        {loadingDetail ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          </div>
        ) : detailData ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* ── LEFT: Info ── */}
            <div className="space-y-4">

              {/* Status banner */}
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4 shadow-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status Komplain</p>
                  <Badge progress={detailData.complaint.progress} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tanggal</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {new Date(detailData.complaint.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              {/* Key fields grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Informasi Komplain</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    ["Outlet",    detailData.complaint.outlet_name],
                    ["Tipe",      detailData.complaint.type_name],
                    ["Kategori",  detailData.complaint.category_name],
                    ["Topik",     detailData.complaint.topic_name],
                    ["Nota",      detailData.complaint.nota_number],
                    ["Qty",       detailData.complaint.qty],
                    ["Deduction", detailData.complaint.deduction],
                    ["PIC",       detailData.complaint.pic_name || "—"],
                  ].map(([lbl, val]) => (
                    <div key={lbl} className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{lbl}</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reporter + Description */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pelapor</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-100 text-fuchsia-700">
                      <HiOutlineUser className="h-4 w-4" />
                    </span>
                    {detailData.complaint.complaint_name}
                  </p>
                </div>
                {detailData.complaint.description && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Deskripsi</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{detailData.complaint.description}</p>
                  </div>
                )}
              </div>

              {/* Initial documents */}
              {detailData.documents?.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Dokumentasi Awal</p>
                  <div className="flex flex-wrap gap-2.5">
                    {detailData.documents.map((d) => {
                      const url = assetUrl(d.file_path);
                      const isImg = /\.(jpe?g|png|gif|webp)$/i.test(d.file_path);
                      return (
                        <div
                          key={d.doc_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setLightbox({ src: url, name: d.original_name })}
                          className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:shadow-md"
                        >
                          {isImg ? (
                            <img src={url} alt={d.original_name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                              <HiOutlinePaperClip className="h-5 w-5 text-slate-400" />
                              <span className="text-[9px] text-slate-500 line-clamp-2">{d.original_name}</span>
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 rounded-xl">
                            <HiOutlineMagnifyingGlass className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT: Progress Tracking ── */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <HiOutlineChartBarSquare className="h-4 w-4 text-fuchsia-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Tracking Progress</p>
                </div>
                <button
                  type="button"
                  onClick={openProgressModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-700 to-fuchsia-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-fuchsia-800 hover:to-fuchsia-800"
                >
                  <HiOutlinePlus className="h-3.5 w-3.5" />
                  Update Progress
                </button>
              </div>
              {/* Timeline scrollable */}
              <div className="flex-1 overflow-y-auto p-5">
                <ProgressTimeline logs={detailData.progressLogs} onPreviewDoc={setLightbox} />
              </div>
            </div>

          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">Gagal memuat data.</p>
        )}
      </Modal>

      {/* ── Progress Log Modal ── */}
      <Modal open={progressOpen} onClose={() => setProgressOpen(false)} title="Update Progress Komplain" subtitle="Catat tindak lanjut dan ubah status komplain" icon={HiOutlineClipboardDocumentList}>
        <form onSubmit={handleAddProgress} className="space-y-4">
          <SelectField
            label="Progress Baru"
            required
            value={progressForm.progress}
            onChange={(e) => setProgressForm((f) => ({ ...f, progress: e.target.value }))}
          >
            <option value="">— Pilih Progress —</option>
            {PROGRESS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </SelectField>

          <TextField
            label="Catatan"
            as="textarea"
            value={progressForm.note}
            onChange={(e) => setProgressForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Tambahkan catatan tindak lanjut..."
          />

          <TextField
            label="Nama PIC"
            value={progressForm.pic_name}
            onChange={(e) => setProgressForm((f) => ({ ...f, pic_name: e.target.value }))}
            placeholder="Penanggungjawab progress ini"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Dokumentasi Progress</label>
            <input
              ref={progressFileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setProgressFiles(Array.from(e.target.files))}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => progressFileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && progressFileRef.current?.click()}
              className={cn(
                "cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition",
                progressFiles.length > 0
                  ? "border-fuchsia-400 bg-fuchsia-100/60"
                  : "border-slate-200 bg-slate-50 hover:border-fuchsia-400 hover:bg-fuchsia-100/30",
              )}
            >
              <HiOutlinePaperClip className={cn("mx-auto mb-1.5 h-6 w-6", progressFiles.length > 0 ? "text-fuchsia-500" : "text-slate-300")} />
              {progressFiles.length > 0 ? (
                <p className="text-sm font-semibold text-fuchsia-800">{progressFiles.length} file dipilih</p>
              ) : (
                <p className="text-sm text-slate-500">Klik untuk upload bukti</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setProgressOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
              Batal
            </button>
            <button type="submit" disabled={savingProgress || !progressForm.progress} className="rounded-xl bg-gradient-to-r from-fuchsia-700 to-fuchsia-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-fuchsia-300/50 transition hover:from-fuchsia-800 hover:to-fuchsia-800 disabled:opacity-50">
              {savingProgress ? "Menyimpan..." : "Simpan Progress"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Hapus Komplain" subtitle="Tindakan ini tidak dapat dibatalkan" icon={HiOutlineTrash} danger>
        <p className="mb-6 text-sm text-slate-600">
          Yakin ingin menghapus komplain dari <b>{deleteTarget?.complaint_name}</b> dengan nota{" "}
          <b>{deleteTarget?.nota_number}</b>? Seluruh data termasuk dokumen dan log progress akan ikut terhapus.
        </p>
        <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Batal
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-xl bg-gradient-to-r from-red-600 to-rose-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-red-700 hover:to-rose-600 disabled:opacity-50">
            {deleting ? "Menghapus..." : "Ya, Hapus"}
          </button>
        </div>
      </Modal>

      {/* ── Lightbox Preview ── */}
      <Lightbox src={lightbox.src} name={lightbox.name} onClose={() => setLightbox({ src: null, name: null })} />
    </div>
  );
}
