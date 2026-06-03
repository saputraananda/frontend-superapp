import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
  HiOutlineFunnel, HiOutlinePaperClip, HiOutlineXMark,
  HiOutlineChevronLeft, HiOutlineChevronRight,
  HiOutlineExclamationTriangle, HiOutlineClipboardDocumentList,
  HiOutlineArrowDownTray, HiOutlinePhoto,
  HiOutlineArrowsUpDown, HiOutlineChevronUp, HiOutlineChevronDown,
  HiOutlineMagnifyingGlass, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineEye, HiOutlinePrinter,
} from "react-icons/hi2";
import { api, apiUpload } from "../../../lib/api";

function cn(...c) { return c.filter(Boolean).join(" "); }

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const p = JSON.parse(raw);
    const u = p?.user ?? p;
    return { name: u?.employee?.full_name || u?.name || "", id: u?.employee?.employee_id };
  } catch { return {}; }
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtDateTime(v) {
  if (!v) return { date: "-", time: null };
  const d = new Date(v);
  if (isNaN(d)) return { date: v, time: null };
  const date = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { date, time };
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDateInput(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const CUTOFF_START_DAY = 26;

const PERIOD_MONTHS = [
  { value: 1, label: "Januari" }, { value: 2, label: "Februari" },
  { value: 3, label: "Maret" }, { value: 4, label: "April" },
  { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
  { value: 7, label: "Juli" }, { value: 8, label: "Agustus" },
  { value: 9, label: "September" }, { value: 10, label: "Oktober" },
  { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

function getDefaultCutoffSelection(now = new Date()) {
  const startDay = CUTOFF_START_DAY;
  const endDay = startDay - 1;
  let cutoffMonth = now.getMonth() + 1;
  let cutoffYear = now.getFullYear();
  if (now.getDate() > endDay) {
    cutoffMonth += 1;
    if (cutoffMonth > 12) { cutoffMonth = 1; cutoffYear += 1; }
  }
  const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
  const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
  return {
    cutoffMonth, cutoffYear,
    startDate: toDateInput(start),
    endDate: toDateInput(end),
  };
}

function generatePages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

const FINDING_LOCATIONS = ["Rumah Sakit", "IKM"];
const EMPTY_FORM = {
  reporter_name: "", report_date: todayISO(), area_id: "",
  hospital_id: "", finding_location: "IKM", linen_type: "",
  ownership_type: "", finding_type: "", finding_qty: 1, sending_note: "",
};

const LOCATION_META = {
  "Rumah Sakit": { cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "IKM": { cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const STATUS_META = {
  terkirim: { label: "Terkirim", cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  proses: { label: "Diproses", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  selesai: { label: "Selesai", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl transition",
        toast.type === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {toast.type === "error"
        ? <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
        : <HiOutlineCheckCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
    </div>
  );
}

// ─── SortTh ───────────────────────────────────────────────────────────────────
function SortTh({ col, label, sort, onSort, className = "" }) {
  const active = sort.col === col;
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100",
        active ? "text-blue-600 bg-blue-50/60" : "text-slate-500",
        className,
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active ? (
          sort.dir === "asc" ? <HiOutlineChevronUp className="h-3.5 w-3.5" /> : <HiOutlineChevronDown className="h-3.5 w-3.5" />
        ) : (
          <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />
        )}
      </div>
    </th>
  );
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 11 }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className={cn("h-3.5 rounded-md bg-slate-200", i <= 1 ? "w-28" : i <= 3 ? "w-20" : "w-14")} />
        </td>
      ))}
    </tr>
  );
}

// ─── Photo Thumbnail + Viewer ─────────────────────────────────────────────────
function PhotoThumb({ url, label = "Foto" }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-xs text-slate-300">-</span>;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Lihat foto"
        className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-400 hover:shadow-md transition"
      >
        {isImage ? (
          <img src={url} alt={label} className="h-full w-full object-cover group-hover:opacity-80 transition" />
        ) : (
          <HiOutlinePaperClip className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition" />
        )}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition hover:bg-white hover:text-slate-800"
              aria-label="Tutup foto"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            {isImage ? (
              <img src={url} alt={label} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm">
                <HiOutlinePhoto className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-4">{label}</p>
                <a
                  href={url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  <HiOutlineArrowDownTray className="h-4 w-4" /> Buka Dokumen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal Form ───────────────────────────────────────────────────────────────
function FormModal({ open, onClose, onSaved, editData, areas, hospitals }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusFile, setStatusFile] = useState(null);
  const [statusFilePreview, setStatusFilePreview] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [photoViewer, setPhotoViewer] = useState(null); // { url, label }

  useEffect(() => {
    if (!open) return;
    if (editData) {
      setForm({
        reporter_name: editData.reporter_name || "",
        report_date: editData.report_date?.slice(0, 10) || todayISO(),
        area_id: String(editData.area_id || ""),
        hospital_id: String(editData.hospital_id || ""),
        finding_location: editData.finding_location || "IKM",
        linen_type: editData.linen_type || "",
        ownership_type: editData.ownership_type || "",
        finding_type: editData.finding_type || "",
        finding_qty: editData.finding_qty ?? 1,
        sending_note: editData.sending_note || "",
      });
    } else {
      const user = getCurrentUser();
      setForm({ ...EMPTY_FORM, reporter_name: user.name || "" });
    }
    setError("");
    setStatusNote("");
    setStatusFile(null);
    setStatusFilePreview(null);
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (editData) {
        await api(`/ikm/linen-report/${editData.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await api("/ikm/linen-report", { method: "POST", body: JSON.stringify(form) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (nextStatus) => {
    if (!editData || !nextStatus) return;
    setUpdatingStatus(true);
    try {
      const fd = new FormData();
      fd.append("status", nextStatus);
      fd.append("note", statusNote);
      fd.append("by_name", getCurrentUser().name);
      if (statusFile) fd.append("attachment", statusFile);
      await apiUpload(`/ikm/linen-report/${editData.id}/status`, { method: "PUT", body: fd });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!open) return null;

  const labelClass = "block text-xs font-semibold text-slate-500 mb-1";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50";

  const steps = editData ? [
    {
      key: "terkirim",
      label: "Laporan Terkirim",
      photoLabel: "Lihat Foto Laporan",
      icon: HiOutlineClipboardDocumentList,
      active: true,
      date: editData.created_at,
      by: editData.reporter_name,
      note: editData.sending_note,
      photoUrl: editData.attachment_url,
    },
    {
      key: "proses",
      label: "Sedang Diproses",
      photoLabel: "Lihat Foto Proses",
      icon: HiOutlineClock,
      active: ["proses", "selesai"].includes(editData.status),
      date: editData.process_at,
      by: editData.process_by_name,
      note: editData.process_note,
      photoUrl: editData.process_path_url,
    },
    {
      key: "selesai",
      label: "Selesai",
      photoLabel: "Lihat Foto Selesai",
      icon: HiOutlineCheckCircle,
      active: editData.status === "selesai",
      date: editData.completed_at,
      by: editData.completed_by_name,
      note: editData.completed_note,
      photoUrl: editData.completed_path_url,
    },
  ] : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white/95 backdrop-blur z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {editData ? "Detail & Edit Laporan" : "Tambah Laporan Linen"}
              </h2>
              {editData && (
                <p className="text-xs text-slate-500">{editData.linen_type} — {editData.finding_type}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Tracking */}
              <div className="lg:col-span-2 space-y-5">
                {editData ? (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <HiOutlineClipboardDocumentList className="h-4 w-4 text-blue-500" />
                      Riwayat Tracking
                    </div>
                    <div className="relative pl-1">
                      {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isLast = idx === steps.length - 1;
                        return (
                          <div key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                            {!isLast && (
                              <div className={cn("absolute left-[15px] top-7 w-0.5 h-[calc(100%-20px)]", step.active ? "bg-blue-200" : "bg-slate-100")} />
                            )}
                            <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", step.active ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-300")}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm font-bold", step.active ? "text-slate-800" : "text-slate-300")}>{step.label}</p>
                              {step.active && step.date && (
                                <p className="text-xs text-slate-400 mt-0.5">{fmtDate(step.date)} {step.by ? `· ${step.by}` : ""}</p>
                              )}
                              {step.active && step.note && (
                                <div className="mt-1.5 rounded-lg border border-slate-100 bg-white px-3 py-2">
                                  <p className="text-xs text-slate-500 font-semibold">Catatan:</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{step.note}</p>
                                </div>
                              )}
                              {step.active && step.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoViewer({ url: step.photoUrl, label: step.photoLabel })}
                                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 active:scale-95"
                                >
                                  <HiOutlinePhoto className="h-3.5 w-3.5 shrink-0" />
                                  {step.photoLabel}
                                </button>
                              )}
                              {!step.active && <p className="text-xs text-slate-300 mt-0.5">Belum ada aktivitas</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
                    <HiOutlineClipboardDocumentList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-500">Laporan Baru</p>
                    <p className="text-xs text-slate-400 mt-1">Lengkapi form di samping untuk menambahkan laporan linen.</p>
                  </div>
                )}

                {editData && editData.status !== "selesai" && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        {editData.status === "terkirim" ? <HiOutlineClock className="h-4 w-4 text-amber-500" /> : <HiOutlineCheckCircle className="h-4 w-4 text-emerald-500" />}
                        Update Status
                      </div>
                      <span className="text-xs text-slate-500">Oleh: <strong className="text-slate-700">{getCurrentUser().name || "-"}</strong></span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Catatan Tindak Lanjut</label>
                      <textarea
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 min-h-[60px] resize-y"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder={editData.status === "terkirim" ? "Contoh: Baik, coba selesaikan ke Pak Heru untuk dijahit" : "Contoh: Baik sudah selesai dan sudah diberikan ke RS kembali"}
                        disabled={updatingStatus}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Foto Bukti <span className="font-normal text-slate-400">(opsional)</span>
                      </label>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition ${
                        statusFile ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50"
                      } ${updatingStatus ? "pointer-events-none opacity-50" : ""}`}>
                        <HiOutlinePhoto className="h-5 w-5 shrink-0 text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">
                          {statusFile ? statusFile.name : "Klik untuk upload foto bukti..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={updatingStatus}
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setStatusFile(f);
                            setStatusFilePreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
                          }}
                        />
                      </label>
                      {statusFilePreview && (
                        <div className="mt-2 relative inline-block">
                          <img src={statusFilePreview} alt="preview" className="h-20 w-20 rounded-xl border border-slate-200 object-cover" />
                          <button
                            type="button"
                            onClick={() => { setStatusFile(null); setStatusFilePreview(null); }}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
                          >
                            <HiOutlineXMark className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {editData.status === "terkirim" && (
                        <button type="button" onClick={() => handleUpdateStatus("proses")} disabled={updatingStatus}
                          className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
                          {updatingStatus && <HiOutlineClock className="h-4 w-4 animate-spin" />}
                          <HiOutlineClock className="h-4 w-4" /> Tandai Diproses
                        </button>
                      )}
                      {editData.status === "proses" && (
                        <button type="button" onClick={() => handleUpdateStatus("selesai")} disabled={updatingStatus}
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:opacity-50">
                          {updatingStatus && <HiOutlineClock className="h-4 w-4 animate-spin" />}
                          <HiOutlineCheckCircle className="h-4 w-4" /> Tandai Selesai
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {editData && editData.status === "selesai" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <HiOutlineCheckCircle className="h-5 w-5" />
                    Laporan ini sudah selesai ditangani.
                  </div>
                )}
              </div>

              {/* Right: Form */}
              <div className="lg:col-span-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <HiOutlinePencilSquare className="h-4 w-4 text-blue-500" />
                    {editData ? "Detail Laporan" : "Form Laporan"}
                  </h3>
                  <form onSubmit={handleSubmit} id="linen-form" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className={labelClass}>Nama Pelapor <span className="text-rose-500">*</span></label>
                        <input className={inputClass} value={form.reporter_name} onChange={(e) => setForm({ ...form, reporter_name: e.target.value })} placeholder="Nama pelapor" required disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Tanggal Laporan <span className="text-rose-500">*</span></label>
                        <input type="date" className={inputClass} value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Lokasi Temuan <span className="text-rose-500">*</span></label>
                        <select className={inputClass} value={form.finding_location} onChange={(e) => setForm({ ...form, finding_location: e.target.value })} disabled={saving}>
                          {FINDING_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Area <span className="text-rose-500">*</span></label>
                        <select className={inputClass} value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })} required disabled={saving}>
                          <option value="">-- Pilih Area --</option>
                          {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Rumah Sakit <span className="text-rose-500">*</span></label>
                        <select className={inputClass} value={form.hospital_id} onChange={(e) => setForm({ ...form, hospital_id: e.target.value })} required disabled={saving}>
                          <option value="">-- Pilih RS --</option>
                          {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Jenis Linen <span className="text-rose-500">*</span></label>
                        <input className={inputClass} value={form.linen_type} onChange={(e) => setForm({ ...form, linen_type: e.target.value })} placeholder="Contoh: Sprei, Handuk..." required disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Kepemilikan Linen</label>
                        <select className={inputClass} value={form.ownership_type} onChange={(e) => setForm({ ...form, ownership_type: e.target.value })} disabled={saving}>
                          <option value="">-- Pilih --</option>
                          <option value="rental">Sewa</option>
                          <option value="hospital">Rumah Sakit</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Jenis Temuan <span className="text-rose-500">*</span></label>
                        <input className={inputClass} value={form.finding_type} onChange={(e) => setForm({ ...form, finding_type: e.target.value })} placeholder="Contoh: Robek, Kotor, Hilang..." required disabled={saving} />
                      </div>
                      <div>
                        <label className={labelClass}>Jumlah <span className="text-rose-500">*</span></label>
                        <input type="number" min="1" className={inputClass} value={form.finding_qty} onChange={(e) => setForm({ ...form, finding_qty: e.target.value })} required disabled={saving} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Catatan Dari Pelapor</label>
                      <textarea className={cn(inputClass, "min-h-[80px] resize-y")} value={form.sending_note} onChange={(e) => setForm({ ...form, sending_note: e.target.value })} placeholder="Contoh: Kain robek, perlu dijahit ulang..." disabled={saving} />
                    </div>

                    {editData?.attachment_url && (
                      <div>
                        <label className={labelClass}>Lampiran</label>
                        <PhotoThumb url={editData.attachment_url} label={`Linen ${editData.linen_type || ""}`} />
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur px-6 py-4 z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-end gap-4 w-full">
            <div className="flex gap-2 shrink-0 self-end sm:self-auto">
              <button type="button" onClick={onClose} disabled={saving || updatingStatus}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
                Tutup
              </button>
              <button type="submit" form="linen-form" disabled={saving || updatingStatus}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2">
                {saving && <HiOutlineClock className="h-4 w-4 animate-spin" />}
                {editData ? "Simpan Perubahan" : "Tambah Laporan"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Lightbox — rendered inside the modal backdrop stack */}
      {photoViewer && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPhotoViewer(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[94vw] flex-col overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox header */}
            <div className="flex items-center justify-between bg-slate-900/90 px-4 py-2.5">
              <span className="text-sm font-semibold text-white">{photoViewer.label}</span>
              <button
                type="button"
                onClick={() => setPhotoViewer(null)}
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
                aria-label="Tutup foto"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            {/* Image or PDF */}
            {/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(photoViewer.url) ? (
              <img
                src={photoViewer.url}
                alt={photoViewer.label}
                className="max-h-[80vh] w-auto max-w-[94vw] object-contain bg-black"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 bg-white px-8 py-10">
                <HiOutlinePhoto className="h-14 w-14 text-slate-300" />
                <p className="text-sm text-slate-600">{photoViewer.label}</p>
                <a
                  href={photoViewer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  <HiOutlineArrowDownTray className="h-4 w-4" /> Buka Dokumen
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function DeleteModal({ open, onClose, onConfirm, target, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4">
          <HiOutlineTrash className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Hapus Laporan?</h3>
        <p className="mt-1 text-sm text-slate-500 mb-5">
          Laporan linen <span className="font-semibold text-slate-700">{target?.linen_type}</span> tanggal{" "}
          <span className="font-semibold text-slate-700">{fmtDate(target?.report_date)}</span> akan dihapus permanen.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition disabled:opacity-50 flex items-center gap-2">
            {loading && <HiOutlineClock className="h-4 w-4 animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Print/PDF Linen Report ───────────────────────────────────────────────────
function printLinenReport(row) {
  const logoUrl = `${window.location.origin}/ikm.png`;
  const reportNo = `LR-${String(row.id).padStart(5, "0")}`;

  const fmt = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (isNaN(d)) return v;
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" }).format(d);
  };

  const today = fmt(new Date().toISOString());

  const reporterName = (row.reporter_name || "")
    .replace(/\s*\(.*?\)\s*/g, "").trim()
    .toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || "_______________";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Temuan Linen — ${reportNo}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
    .page { padding: 20mm 18mm; min-height: 297mm; page-break-after: always; }
    .page:last-of-type { page-break-after: auto; }

    /* --- HEADER --- */
    .doc-header { display: flex; align-items: flex-start; gap: 14px; padding-bottom: 10px; border-bottom: 3px double #1e3a5f; margin-bottom: 14px; }
    .doc-header img { height: 60px; width: auto; }
    .doc-header-info { flex: 1; }
    .doc-header-info .co-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; color: #1e3a5f; letter-spacing: 0.4px; }
    .doc-header-info .co-sub { font-size: 9pt; color: #555; margin-top: 2px; }
    .doc-header-badge { text-align: right; }
    .doc-no-box { font-size: 9pt; font-weight: bold; color: #1e3a5f; border: 1.5px solid #1e3a5f; padding: 4px 12px; display: inline-block; }
    .print-date { font-size: 8pt; color: #777; margin-top: 4px; }

    /* --- TITLE --- */
    .doc-title { text-align: center; margin: 14px 0 12px; }
    .doc-title h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1e3a5f; text-decoration: underline; }

    /* --- SECTION --- */
    .sec-title { font-size: 10.5pt; font-weight: bold; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid #1e3a5f; padding-bottom: 3px; margin-bottom: 7px; }

    /* --- INFO TABLE --- */
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 13px; }
    .info-table td { padding: 5px 8px; font-size: 10.5pt; border: 1px solid #c8d0db; vertical-align: top; }
    .info-table .lbl { font-weight: bold; background: #eef2f7; color: #1e3a5f; width: 28%; }
    .info-table .col { background: #eef2f7; width: 2%; text-align: center; font-weight: bold; }
    .info-table .val { background: #fff; }
    .badge-terkirim { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 3px; padding: 1px 8px; font-weight: bold; }
    .badge-proses   { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; border-radius: 3px; padding: 1px 8px; font-weight: bold; }
    .badge-selesai  { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; border-radius: 3px; padding: 1px 8px; font-weight: bold; }

    /* --- PROCESS TABLE --- */
    .proc-table { width: 100%; border-collapse: collapse; margin-bottom: 13px; font-size: 10pt; }
    .proc-table th { background: #eef2f7; border: 1px solid #c8d0db; padding: 5px 8px; font-weight: bold; color: #1e3a5f; text-align: left; }
    .proc-table td { border: 1px solid #c8d0db; padding: 5px 8px; }

    /* --- SIGNATURE --- */
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 22px; }
    .sig-box { text-align: center; }
    .sig-label { font-size: 9.5pt; font-weight: bold; color: #1e3a5f; }
    .sig-line { height: 58px; border-bottom: 1px solid #555; margin: 8px 4px 4px; }
    .sig-name { font-size: 9pt; color: #333; }

    /* --- FOOTER --- */
    .doc-footer { margin-top: 18px; padding-top: 7px; border-top: 1px solid #c8d0db; font-size: 8pt; color: #888; text-align: center; }

    /* --- ATTACHMENT PAGE --- */
    .att-title { text-align: center; margin-bottom: 14px; }
    .att-title h2 { font-size: 13pt; font-weight: bold; color: #1e3a5f; text-transform: uppercase; }
    .att-title p { font-size: 10pt; color: #555; margin-top: 5px; }
    .att-img-wrap { text-align: center; margin: 16px 0; }
    .att-img-wrap img { max-width: 100%; max-height: 480px; object-fit: contain; border: 1px solid #e5e7eb; padding: 4px; }
    .att-caption { font-size: 9pt; color: #888; font-style: italic; text-align: center; margin-top: 6px; }

    /* --- PRINT BUTTON --- */
    .print-btn { display: block; margin: 20px auto 30px; padding: 10px 28px; background: #1e3a5f; color: #fff; border: none; border-radius: 8px; font-size: 12pt; cursor: pointer; font-family: sans-serif; }
    .print-btn:hover { background: #162d4c; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>

  <!-- PAGE 1 -->
  <div class="page">
  <div class="doc-header">
    <img src="${logoUrl}" alt="Logo IKM" onerror="this.style.display='none'" />
    <div class="doc-header-info">
      <div class="co-name">PT Intersolusi Karya Mandiri</div>
      <div class="co-sub">Alora Group Indonesia</div>
      <div class="co-sub">Unit Layanan Linen Rumah Sakit</div>
    </div>
    <div class="doc-header-badge">
      <div class="doc-no-box">${reportNo}</div>
      <div class="print-date">Dicetak: ${today}</div>
    </div>
  </div>

  <div class="doc-title"><h1>Laporan Temuan Linen</h1></div>

  <!-- Informasi Umum -->
  <div class="sec-title">A. Informasi Laporan</div>
  <table class="info-table">
    <tr>
      <td class="lbl">Nomor Laporan</td><td class="col">:</td><td class="val"><strong>${reportNo}</strong></td>
      <td class="lbl">Tanggal Laporan</td><td class="col">:</td><td class="val">${fmt(row.report_date)}</td>
    </tr>
    <tr>
      <td class="lbl">Nama Pelapor</td><td class="col">:</td><td class="val">${row.reporter_name || "-"}</td>
      <td class="lbl">Tanggal Dicatat</td><td class="col">:</td><td class="val">${fmt(row.created_at)}</td>
    </tr>
    <tr>
      <td class="lbl">Area</td><td class="col">:</td><td class="val">${row.area_name || "-"}</td>
      <td class="lbl">Rumah Sakit</td><td class="col">:</td><td class="val">${row.hospital_name || "-"}</td>
    </tr>
    <tr>
      <td class="lbl">Lokasi Temuan</td><td class="col">:</td><td class="val" colspan="4">${row.finding_location || "-"}</td>
    </tr>
  </table>

  <!-- Detail Linen -->
  <div class="sec-title">B. Detail Temuan Linen</div>
  <table class="info-table">
    <tr><td class="lbl">Jenis Linen</td><td class="col">:</td><td class="val" colspan="3">${row.linen_type || "-"}</td></tr>
    <tr><td class="lbl">Kepemilikan</td><td class="col">:</td><td class="val" colspan="3">${row.ownership_type ? (row.ownership_type === "rental" ? "Sewa" : "Rumah Sakit") : "-"}</td></tr>
    <tr><td class="lbl">Jenis Temuan</td><td class="col">:</td><td class="val" colspan="3">${row.finding_type || "-"}</td></tr>
    <tr><td class="lbl">Jumlah Temuan</td><td class="col">:</td><td class="val" colspan="3"><strong>${row.finding_qty || 0} pcs</strong></td></tr>
    ${row.sending_note ? `<tr><td class="lbl">Catatan Pengiriman</td><td class="col">:</td><td class="val" colspan="3">${row.sending_note}</td></tr>` : ""}
  </table>

  <!-- Tanda Tangan -->
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-label">Pelapor</div>
      <div class="sig-line"></div>
      <div class="sig-name" style="text-transform:capitalize;">${reporterName}</div>
      <div class="sig-name" style="font-size:8.5pt;color:#555;">Staff Operational</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Diketahui Oleh</div>
      <div class="sig-line"></div>
      <div class="sig-name">Siswati</div>
      <div class="sig-name" style="font-size:8.5pt;color:#555;">Supervisor Marketing &amp; Public Relations</div>
    </div>
    <div class="sig-box">
      <div class="sig-label">Disetujui Oleh</div>
      <div class="sig-line"></div>
      <div class="sig-name">Rahmi Solehah</div>
      <div class="sig-name" style="font-size:8.5pt;color:#555;">Direktur</div>
    </div>
  </div>

  <div class="doc-footer">
    Dokumen resmi PT Intersolusi Karya Mandiri &nbsp;·&nbsp; ${reportNo} &nbsp;·&nbsp; Dicetak: ${today} &nbsp;·&nbsp; Halaman 1 ${row.attachment_url ? "dari 2" : "dari 1"}
  </div>
  </div><!-- end page 1 -->

  ${row.attachment_url ? `
  <!-- PAGE 2 — LAMPIRAN -->
  <div class="page">
  <div class="doc-header">
    <img src="${logoUrl}" alt="Logo PT Intersolusi Karya Mandiri" onerror="this.style.display='none'" />
    <div class="doc-header-info">
      <div class="co-name">PT Intersolusi Karya Mandiri</div>
      <div class="co-sub">Alora Group Indonesia</div>
      <div class="co-sub">Unit Layanan Linen Rumah Sakit</div>
    </div>
    <div class="doc-header-badge">
      <div class="doc-no-box">${reportNo}</div>
      <div class="print-date">Lampiran — Halaman 2</div>
    </div>
  </div>

  <div class="att-title">
    <h2>Lampiran — Dokumentasi Temuan Linen</h2>
    <p>Ref: ${reportNo} &nbsp;·&nbsp; ${row.linen_type} &nbsp;·&nbsp; ${row.finding_type} &nbsp;·&nbsp; ${row.finding_qty} pcs</p>
  </div>

  <div class="att-img-wrap">
    <img src="${row.attachment_url}" alt="Foto temuan linen"
         onerror="this.parentElement.innerHTML='<p style=color:#999;text-align:center;padding:40px>Lampiran tidak dapat dimuat.</p>'" />
  </div>
  <p class="att-caption">Gambar: Dokumentasi temuan linen — ${row.linen_type} (${row.finding_type})</p>

  <div class="doc-footer">
    Dokumen resmi PT Intersolusi Karya Mandiri &nbsp;·&nbsp; ${reportNo} &nbsp;·&nbsp; Lampiran &nbsp;·&nbsp; Halaman 2 dari 2
  </div>
  </div><!-- end page 2 -->
  ` : ""}
</body>
</html>`;

  const win = window.open("", "_blank", "width=860,height=1100");
  if (!win) { alert("Popup diblokir browser. Izinkan popup untuk halaman ini."); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

export default function LinenReport() {
  const [records, setRecords] = useState([]);
  const [areas, setAreas] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [floors, setFloors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const todayStr = useMemo(() => toDateInput(new Date()), []);
  const defaultCutoff = useMemo(() => getDefaultCutoffSelection(new Date()), []);

  const [periodMode, setPeriodMode] = useState("cutoff");
  const [cutoffMonth, setCutoffMonth] = useState(defaultCutoff.cutoffMonth);
  const [cutoffYear, setCutoffYear] = useState(defaultCutoff.cutoffYear);
  const [customStartDate, setCustomStartDate] = useState(defaultCutoff.startDate);
  const [customEndDate, setCustomEndDate] = useState(defaultCutoff.endDate);

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, idx) => base - 3 + idx);
  }, []);

  const activePeriod = useMemo(() => {
    if (periodMode === "today") return { startDate: todayStr, endDate: todayStr };
    if (periodMode === "custom") return { startDate: customStartDate || todayStr, endDate: customEndDate || customStartDate || todayStr };
    const startDay = CUTOFF_START_DAY;
    const endDay = startDay - 1;
    const start = new Date(cutoffYear, cutoffMonth - 2, startDay);
    const end = new Date(cutoffYear, cutoffMonth - 1, endDay);
    return { startDate: toDateInput(start), endDate: toDateInput(end) };
  }, [periodMode, todayStr, customStartDate, customEndDate, cutoffMonth, cutoffYear]);

  const [filters, setFilters] = useState({
    area_id: "", hospital_id: "", finding_location: "", floor: "",
  });
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState({ col: "report_date", dir: "desc" });
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchData = useCallback(async (pg = pagination.page) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(pg), limit: String(pagination.limit) });
      if (activePeriod.startDate) qs.set("startDate", activePeriod.startDate);
      if (activePeriod.endDate) qs.set("endDate", activePeriod.endDate);
      if (filters.area_id) qs.set("area_id", filters.area_id);
      if (filters.hospital_id) qs.set("hospital_id", filters.hospital_id);
      if (filters.finding_location) qs.set("finding_location", filters.finding_location);
      if (filters.floor) qs.set("floor", filters.floor);
      if (search) qs.set("search", search);

      const res = await api(`/ikm/linen-report?${qs}`);
      setRecords(res.data || []);
      setPagination((p) => ({ ...p, page: pg, total: res.pagination?.total || 0, totalPages: res.pagination?.totalPages || 0 }));
      if (res.areas?.length) setAreas(res.areas);
      if (res.hospitals?.length) setHospitals(res.hospitals);
      if (res.floors?.length) setFloors(res.floors);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [activePeriod.startDate, activePeriod.endDate, filters, pagination.limit, search, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api("/ikm/linen-report/meta").then((r) => {
      if (r.areas?.length) setAreas(r.areas);
      if (r.hospitals?.length) setHospitals(r.hospitals);
      if (r.floors?.length) setFloors(r.floors);
    }).catch(() => { });
  }, []);

  useEffect(() => { fetchData(1); }, [activePeriod.startDate, activePeriod.endDate, filters, search, pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (formOpen || Boolean(deleteTarget)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [formOpen, deleteTarget]);

  useEffect(() => {
    document.title = "Laporan Linen IKM | Alora Group Indonesia";
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/linen-report/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Laporan berhasil dihapus");
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (col) =>
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

  const handlePage = (p) => fetchData(Math.max(1, Math.min(p, pagination.totalPages)));

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const sortedRecords = useMemo(() => {
    if (!sort.col) return records;
    return [...records].sort((a, b) => {
      let va = a[sort.col] ?? "";
      let vb = b[sort.col] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sort.dir === "asc" ? -1 : 1;
      if (va > vb) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [records, sort]);

  const pages = generatePages(pagination.page, pagination.totalPages);
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <Toast toast={toast} />

      <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* Page Header */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-blue-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <HiOutlineClipboardDocumentList className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Linen Report</h1>
                  <p className="text-sm text-white/70">Catatan temuan &amp; kondisi linen</p>
                </div>
              </div>
              <button
                onClick={() => { setEditData(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Laporan
              </button>
            </div>
          </section>

          {/* Filters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" />
              Filter
            </div>
            {/* ── Baris 1: Mode Periode + Bulan/Tahun/Custom ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Kolom 1: Mode Periode */}
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Mode Periode</span>
                <select
                  value={periodMode}
                  onChange={(e) => { setPeriodMode(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="cutoff">Periode Cutoff</option>
                  <option value="today">Hari Ini</option>
                  <option value="custom">Custom Tanggal</option>
                </select>
              </label>

              {/* Kolom 2 */}
              {periodMode === "cutoff" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Bulan Periode Cutoff</span>
                  <select
                    value={cutoffMonth}
                    onChange={(e) => { setCutoffMonth(Number(e.target.value)); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {PERIOD_MONTHS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                  </select>
                </label>
              )}
              {periodMode === "custom" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Mulai</span>
                  <input type="date"
                    value={customStartDate}
                    onChange={(e) => { setCustomStartDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                </label>
              )}
              {periodMode === "today" && <div />}

              {/* Kolom 3 */}
              {periodMode === "cutoff" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tahun</span>
                  <select
                    value={cutoffYear}
                    onChange={(e) => { setCutoffYear(Number(e.target.value)); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </label>
              )}
              {periodMode === "custom" && (
                <label className="text-sm text-slate-600">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">Tanggal Akhir</span>
                  <input type="date"
                    value={customEndDate}
                    onChange={(e) => { setCustomEndDate(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                </label>
              )}
              {periodMode === "today" && <div />}
            </div>

            {/* ── Baris 2: Area · RS · Lokasi Temuan · Lantai ── */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Area</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filters.area_id} onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}>
                  <option value="">Semua Area</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.area_name}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Rumah Sakit</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filters.hospital_id} onChange={(e) => setFilters({ ...filters, hospital_id: e.target.value })}>
                  <option value="">Semua RS</option>
                  {hospitals.map((h) => <option key={h.id} value={h.id}>{h.hospital_name}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Lokasi Temuan</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filters.finding_location} onChange={(e) => setFilters({ ...filters, finding_location: e.target.value })}>
                  <option value="">Semua Lokasi</option>
                  {FINDING_LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Lantai</span>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
                  <option value="">Semua Lantai</option>
                  {floors.map((f) => <option key={f.floor} value={f.floor}>{f.floor}</option>)}
                </select>
              </label>
            </div>

            {/* ── Info periode aktif ── */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
              <span className="font-semibold">Periode aktif:</span>
              <span>{fmtDate(activePeriod.startDate)} — {fmtDate(activePeriod.endDate)}</span>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Cari pelapor, area, RS, jenis linen, status..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                <button type="submit"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cari
                </button>
              </form>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Per halaman:</span>
                <select value={pagination.limit}
                  onChange={(e) => setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400">
                  {[25, 40, 50, 100].map((n) => <option key={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineClipboardDocumentList className="h-5 w-5 text-blue-500" />
                <h2 className="text-base font-bold text-slate-800">Daftar Laporan Linen</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                {pagination.total.toLocaleString("id-ID")} data
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">No</th>
                    <SortTh col="report_date" label="Tanggal" sort={sort} onSort={handleSort} />
                    <SortTh col="reporter_name" label="Pelapor" sort={sort} onSort={handleSort} />
                    <SortTh col="area_name" label="Area" sort={sort} onSort={handleSort} />
                    <SortTh col="hospital_name" label="Rumah Sakit" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Lokasi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Kepemilikan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Status</th>
                    <SortTh col="linen_type" label="Jenis Linen" sort={sort} onSort={handleSort} />
                    <SortTh col="finding_type" label="Temuan" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Lampiran</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={13} />)
                    : sortedRecords.length === 0
                      ? (
                        <tr>
                          <td colSpan={13} className="px-4 py-12 text-center text-sm text-slate-400">
                            Tidak ada data laporan linen
                          </td>
                        </tr>
                      )
                      : sortedRecords.map((r, idx) => {
                        const locMeta = LOCATION_META[r.finding_location] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                        const stMeta = STATUS_META[r.status] || STATUS_META.terkirim;
                        return (
                          <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3.5 text-xs font-medium text-slate-400 tabular-nums">
                              {(pagination.page - 1) * pagination.limit + idx + 1}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              {(() => { const { date, time } = fmtDateTime(r.created_at); return (<><p className="text-xs text-slate-700 font-medium">{date}</p>{time && <p className="text-[10px] text-slate-400 tabular-nums mt-0.5">⏰ {time}</p>}</>); })()}
                            </td>
                            <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                              {r.reporter_name}
                              {r.floor && (
                                <span className="block mt-0.5 text-[10px] text-slate-400 font-normal">
                                  Lantai: {r.floor}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-600">{r.area_name || "-"}</td>
                            <td className="px-4 py-3.5 text-xs text-slate-600">{r.hospital_name || "-"}</td>
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", locMeta.cls)}>
                                {r.finding_location}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {r.ownership_type ? (
                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider",
                                  r.ownership_type === "rental"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-teal-50 text-teal-700 border-teal-200"
                                )}>
                                  {r.ownership_type === "rental" ? "Sewa" : "RS"}
                                </span>
                              ) : <span className="text-xs text-slate-300">-</span>}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", stMeta.cls)}>
                                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", stMeta.dot)} />
                                {stMeta.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-slate-700">{r.linen_type}</td>
                            <td className="px-4 py-3.5 text-xs text-slate-700">{r.finding_type}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700 tabular-nums">
                                {r.finding_qty}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <PhotoThumb url={r.attachment_url} label={`Linen ${r.linen_type}`} />
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button onClick={() => { setEditData(r); setFormOpen(true); }}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                                  title="Detail & Edit">
                                  <HiOutlineEye className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => printLinenReport(r)}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition"
                                  title="Cetak / Download PDF">
                                  <HiOutlinePrinter className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setDeleteTarget(r)}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-rose-300 hover:text-rose-600 transition"
                                  title="Hapus">
                                  <HiOutlineTrash className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded-md w-1/2" />
                    <div className="h-3 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                  </div>
                ))
                : sortedRecords.length === 0
                  ? <div className="p-8 text-center text-sm text-slate-400">Tidak ada data</div>
                  : sortedRecords.map((r) => {
                    const locMeta = LOCATION_META[r.finding_location] ?? { cls: "bg-slate-50 text-slate-600 border-slate-200" };
                    const stMeta = STATUS_META[r.status] || STATUS_META.terkirim;
                    return (
                      <div key={r.id} className="p-4 space-y-2.5 cursor-pointer hover:bg-slate-50 hover:border-blue-100 transition rounded-xl mx-2 my-1 border border-transparent">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-800">{r.linen_type} — {r.finding_type}</p>
                            <p className="text-xs text-slate-500">
                              {(() => { const { date, time } = fmtDateTime(r.created_at); return <>{date}{time && <span className="text-slate-400"> · ⏰{time}</span>}</>; })()}
                              {" · "}{r.reporter_name}
                              {r.floor && ` (${r.floor})`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", locMeta.cls)}>
                              {r.finding_location}
                            </span>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", stMeta.cls)}>
                              <span className={cn("mr-1 h-1 w-1 rounded-full", stMeta.dot)} />
                              {stMeta.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>📍 {r.area_name || "-"}</span>
                          <span>🏥 {r.hospital_name || "-"}</span>
                          {r.ownership_type && <span>🏷️ {r.ownership_type === "rental" ? "Sewa" : "RS"}</span>}
                          {r.floor && <span>🏢 {r.floor}</span>}
                          <span>📦 Qty: <strong>{r.finding_qty}</strong></span>
                        </div>
                        {r.attachment_url && <PhotoThumb url={r.attachment_url} label={`Linen ${r.linen_type}`} />}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button onClick={() => { setEditData(r); setFormOpen(true); }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition">
                            <HiOutlineEye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => printLinenReport(r)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition">
                            <HiOutlinePrinter className="h-3.5 w-3.5" /> Print
                          </button>
                          <button onClick={() => setDeleteTarget(r)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition">
                            <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {from}–{to} dari {pagination.total.toLocaleString("id-ID")} data
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronLeft className="h-4 w-4" />
                  </button>
                  {pages.map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button key={p} onClick={() => handlePage(p)}
                        className={cn(
                          "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          p === pagination.page
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition">
                    <HiOutlineChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          showToast(editData ? "Laporan diperbarui" : "Laporan ditambahkan");
          fetchData(pagination.page);
        }}
        editData={editData}
        areas={areas}
        hospitals={hospitals}
      />

      <DeleteModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        target={deleteTarget}
        loading={deleting}
      />
    </>
  );
}