import { createPortal } from "react-dom";
import {
  HiOutlineArrowsUpDown,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlinePaperClip,
  HiOutlinePhoto,
  HiOutlineXMark,
  HiOutlineArrowDownTray,
  HiOutlineMapPin,
} from "react-icons/hi2";
import {
  cn,
  fmtDateShort,
  fmtIDR,
  capitalizeStatus,
  leaveStatusBadge,
  kasbonStatusBadge,
  calcDuration,
  fmtDateTime,
  leaveDurationLabel,
  leaveTypeLabel,
  leaveTypeBadge,
  attendanceStatusBadge,
  fmtEmployeeName,
} from "../../utils/hrisUtils";

export function FilterScroll({ children, className = "" }) {
  return (
    <div className={cn("-mx-1 overflow-x-auto pb-1 scrollbar-thin", className)}>
      <div className="flex flex-nowrap sm:flex-wrap gap-2 px-1 min-w-0">{children}</div>
    </div>
  );
}

export function FilterPill({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition",
        active ? "bg-[#5f1340] text-white border-[#5f1340]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MobileSkeleton({ count = 4, className = "h-28" }) {
  return (
    <div className="md:hidden p-3 sm:p-4 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("animate-pulse rounded-xl border border-slate-100 bg-slate-50", className)} />
      ))}
    </div>
  );
}

export function SortTh({ col, label, sort, onSort, className = "" }) {
  const active = sort.col === col;
  return (
    <th
      className={cn(
        "px-4 py-3 font-semibold cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100/80",
        active ? "text-[#5f1340] bg-[#5f1340]/5" : "",
        className,
      )}
      onClick={() => onSort(col)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active
          ? sort.dir === "asc"
            ? <HiOutlineChevronUp className="h-3.5 w-3.5" />
            : <HiOutlineChevronDown className="h-3.5 w-3.5" />
          : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}
      </div>
    </th>
  );
}

export function PhotoViewerModal({ open, url, label, onClose }) {
  if (!open || !url) return null;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md">
          <HiOutlineXMark className="h-5 w-5" />
        </button>
        {isImage ? (
          <img src={url} alt={label || "Preview"} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm">
            <HiOutlinePhoto className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-4">{label || "Dokumen"}</p>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#5f1340] px-4 py-2 text-sm font-semibold text-white">
              <HiOutlineArrowDownTray className="h-4 w-4" /> Buka Dokumen
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function PhotoThumb({ url, label = "Foto", onView }) {
  if (!url) return <span className="text-slate-300">—</span>;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  return (
    <button
      type="button"
      onClick={() => onView?.({ url, label })}
      className="group inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-[#5f1340]/40 transition"
    >
      {isImage
        ? <img src={url} alt={label} loading="lazy" className="h-full w-full object-cover" />
        : <HiOutlinePaperClip className="h-4 w-4 text-slate-400" />}
    </button>
  );
}

export function KasbonTypeBadge({ type }) {
  const cls = type === "pinjaman"
    ? "border-violet-200 bg-violet-50 text-violet-700"
    : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize", cls)}>
      {type}
    </span>
  );
}

export function AbsensiMobileCard({ row, onViewPhoto, mapsLink, onEdit, onDelete, submitting }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fmtEmployeeName(row.employee_name)}</p>
          <p className="text-[11px] text-slate-400">{fmtDateShort(row.work_date)}{row.employee_code ? ` · ${row.employee_code}` : ""}</p>
        </div>
        <span className={cn("shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", attendanceStatusBadge(row.status_label))}>
          {row.status_label}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase text-slate-400">Masuk</p>
          <p className="mt-0.5 text-slate-700">{fmtDateTime(row.check_in_time)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <PhotoThumb url={row.check_in_photo_url} label="Foto masuk" onView={onViewPhoto} />
            {mapsLink?.(row.check_in_lat, row.check_in_lng) && (
              <a href={mapsLink(row.check_in_lat, row.check_in_lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600">
                <HiOutlineMapPin className="h-3 w-3" /> Maps
              </a>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase text-slate-400">Keluar</p>
          <p className="mt-0.5 text-slate-700">{fmtDateTime(row.check_out_time)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <PhotoThumb url={row.check_out_photo_url} label="Foto keluar" onView={onViewPhoto} />
            {mapsLink?.(row.check_out_lat, row.check_out_lng) && (
              <a href={mapsLink(row.check_out_lat, row.check_out_lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-sky-600">
                <HiOutlineMapPin className="h-3 w-3" /> Maps
              </a>
            )}
          </div>
        </div>
      </div>
      {calcDuration(row.check_in_time, row.check_out_time) && (
        <p className="text-[11px] text-slate-500">Durasi: <strong className="text-slate-700">{calcDuration(row.check_in_time, row.check_out_time)}</strong></p>
      )}
      {(onEdit || onDelete) && (
        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
          {onEdit && (
            <button type="button" disabled={submitting} onClick={() => onEdit(row)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 disabled:opacity-50">Edit</button>
          )}
          {onDelete && (
            <button type="button" disabled={submitting} onClick={() => onDelete(row)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 disabled:opacity-50">Hapus</button>
          )}
        </div>
      )}
    </div>
  );
}

export function LeaveMobileCard({ row, onApprove, onReject, onViewPhoto, submitting }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fmtEmployeeName(row.employee_name)}</p>
          {row.employee_code && <p className="text-[11px] text-slate-400">{row.employee_code}</p>}
        </div>
        <span className={cn("shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", leaveStatusBadge(row.status))}>
          {capitalizeStatus(row.status)}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", leaveTypeBadge(row.leave_type))}>{leaveTypeLabel(row.leave_type)}</span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-600">{leaveDurationLabel(row.duration_type)}</span>
      </div>
      <p className="text-[11px] text-slate-500">
        {fmtDateShort(row.start_date)} – {fmtDateShort(row.end_date)}
      </p>
      <p className="text-xs text-slate-600 line-clamp-2">{row.reason}</p>
      <div className="flex items-center justify-between gap-2 pt-1">
        <PhotoThumb url={row.doctor_note_url} label="Surat dokter" onView={onViewPhoto} />
        {row.status === "pengajuan" && (
          <div className="flex gap-2">
            <button type="button" disabled={submitting} onClick={() => onApprove(row.leave_id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Setujui</button>
            <button type="button" disabled={submitting} onClick={() => onReject(row)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 disabled:opacity-50">Tolak</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function KasbonMobileCard({ row, onDetail, onProcess, onApprove, onReject, onViewPhoto, submitting, cicilanPct }) {
  const pct = cicilanPct?.(row);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{fmtEmployeeName(row.employee_name)}</p>
          <p className="text-[11px] text-slate-400">{fmtDateShort(row.submission_date)}</p>
        </div>
        <KasbonTypeBadge type={row.type} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div><p className="text-slate-400">Diajukan</p><p className="font-bold text-slate-800">{fmtIDR(row.amount_requested)}</p></div>
        <div><p className="text-slate-400">Disetujui</p><p className="font-bold text-emerald-700">{row.amount_approved != null ? fmtIDR(row.amount_approved) : "—"}</p></div>
      </div>
      {pct != null && (
        <div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Cicilan {pct}% · sisa {fmtIDR(row.remaining)}</p>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold", kasbonStatusBadge(row.status))}>{capitalizeStatus(row.status)}</span>
        <PhotoThumb url={row.proof_url} label="Bukti" onView={onViewPhoto} />
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" onClick={() => onDetail(row.id)} className="rounded-lg border px-3 py-1.5 text-[11px] font-bold text-slate-600">Detail</button>
        {row.status === "pengajuan" && (
          <button type="button" disabled={submitting} onClick={() => onProcess(row.id)} className="rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Proses</button>
        )}
        {(row.status === "pengajuan" || row.status === "proses") && (
          <>
            <button type="button" disabled={submitting} onClick={() => onApprove(row.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Setujui</button>
            <button type="button" disabled={submitting} onClick={() => onReject(row)} className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-rose-600 disabled:opacity-50">Tolak</button>
          </>
        )}
      </div>
    </div>
  );
}
