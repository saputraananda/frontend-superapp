import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlinePlus,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineFunnel,
  HiOutlineXMark,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineArrowsUpDown,
  HiOutlineMagnifyingGlass,
  HiOutlineExclamationTriangle,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineInformationCircle,
  HiOutlinePaperClip,
  HiOutlineArrowDownTray,
  HiOutlinePhoto,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCreditCard,
  HiOutlinePrinter,
  HiOutlineUserGroup,
  HiOutlineDocumentText,
} from "react-icons/hi2";
import { api, apiUpload, BASE_URL } from "../../../lib/api";
import { exportKasbonExcel } from "../utils/exportKasbonExcel";

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

function fmtDateTime(v) {
  if (!v) return "-";
  // MySQL datetime "YYYY-MM-DD HH:MM:SS" has no timezone info.
  // The server stores UTC, so we append "Z" to force UTC interpretation
  // so the browser auto-converts to local time (WIB = UTC+7).
  const normalized = typeof v === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v)
    ? v.replace(" ", "T") + "Z"
    : v;
  const d = new Date(normalized);
  if (isNaN(d)) return v;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtRupiah(v) {
  if (v === null || v === undefined || v === "") return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Cutoff: tgl 26 bulan lalu s/d tgl 25 bulan ini.
// Jika hari ini sudah > 25, aktifkan cutoff bulan depan.
function getDefaultCutoff() {
  const now = new Date();
  const CUTOFF_END_DAY = 25;
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  if (now.getDate() > CUTOFF_END_DAY) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  const pad = (n) => String(n).padStart(2, "0");
  const start = new Date(year, month - 2, 26);
  const end   = new Date(year, month - 1, CUTOFF_END_DAY);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: fmt(start), end: fmt(end) };
}

const DEFAULT_CUTOFF = getDefaultCutoff();

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return { id: 0, name: "Admin" };
    const p = JSON.parse(raw);
    const u = p?.user ?? p;
    return { id: u?.employee?.employee_id || 0, name: u?.employee?.full_name || u?.name || "Admin" };
  } catch { return { id: 0, name: "Admin" }; }
}

// ── RupiahInput ───────────────────────────────────────────────────────────────
// Menampilkan angka dengan separator ribuan saat mengetik + preview Rp di bawah
function RupiahInput({ value, onChange, placeholder = "Contoh: 1.500.000", className = "", min = "1" }) {
  // value = raw numeric string (tanpa separator), e.g. "1500000"
  const formatted = value ? Number(value).toLocaleString("id-ID") : "";
  const preview = value && Number(value) > 0
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value))
    : null;

  function handleChange(e) {
    // hapus semua non-digit, kirim ke parent sebagai raw number string
    const raw = e.target.value.replace(/\D/g, "");
    onChange(raw);
  }

  return (
    <div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 select-none">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          min={min}
          value={formatted}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
        />
      </div>
      {preview && (
        <p className="mt-1 text-xs text-emerald-600 font-medium">{preview}</p>
      )}
    </div>
  );
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

// ── Status meta ───────────────────────────────────────────────────────────────
const STATUS_META = {
  pengajuan: { label: "Pengajuan", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  proses: { label: "Proses", cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  disetujui: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  ditolak: { label: "Ditolak", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-400" },
};

const TYPE_META = {
  kasbon: { label: "Kasbon", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  pinjaman: { label: "Pinjaman", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
};

const PAYMENT_METHOD_LABEL = {
  tunai: "Tunai",
  potong_gaji: "Potong Gaji",
  transfer: "Transfer",
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl",
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

// ── SortTh ────────────────────────────────────────────────────────────────────
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
        {active
          ? sort.dir === "asc"
            ? <HiOutlineChevronUp className="h-3.5 w-3.5" />
            : <HiOutlineChevronDown className="h-3.5 w-3.5" />
          : <HiOutlineArrowsUpDown className="h-3.5 w-3.5 opacity-30" />}
      </div>
    </th>
  );
}

// ── SkeletonRow ───────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 9 }) {
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

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

// ── Type Badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }) {
  const m = TYPE_META[type] || { label: type, cls: "bg-slate-50 text-slate-600 border-slate-200" };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.cls)}>
      {m.label}
    </span>
  );
}

// ── Photo Thumbnail ───────────────────────────────────────────────────────────
function PhotoThumb({ url, label = "Bukti" }) {
  const [open, setOpen] = useState(false);
  if (!url) return <span className="text-xs text-slate-300">-</span>;
  const isImage = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-400 hover:shadow transition"
      >
        {isImage
          ? <img src={url} alt={label} className="h-full w-full object-cover group-hover:opacity-80 transition" />
          : <HiOutlinePaperClip className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition" />}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative inline-flex max-w-[94vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md hover:bg-white"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            {isImage
              ? <img src={url} alt={label} className="max-h-[84vh] w-auto max-w-[94vw] rounded-2xl object-contain shadow-2xl" />
              : (
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-sm">
                  <HiOutlinePhoto className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 mb-4">{label}</p>
                  <a href={url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
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

// ── Progress Timeline ─────────────────────────────────────────────────────────
function ProgressTimeline({ row }) {
  const steps = [
    {
      key: "pengajuan",
      label: "Pengajuan",
      icon: HiOutlineClipboardDocumentCheck,
      done: true,
      date: row.created_at,
      by: row.employee_name,
      note: row.notes,
    },
    {
      key: "proses",
      label: "Diproses Admin",
      icon: HiOutlineClock,
      done: ["proses", "disetujui", "ditolak"].includes(row.status),
      date: row.process_at,
      by: row.process_by_name,
      note: row.process_note,
    },
    {
      key: "disetujui",
      label: row.status === "ditolak" ? "Ditolak" : "Disetujui",
      icon: row.status === "ditolak" ? HiOutlineExclamationTriangle : HiOutlineCheckCircle,
      done: ["disetujui", "ditolak"].includes(row.status),
      date: row.status === "ditolak" ? row.updated_at : row.approved_at,
      by: row.status === "ditolak" ? null : row.approved_by_name,
      note: row.status === "ditolak" ? row.rejection_note : row.approved_note,
      isReject: row.status === "ditolak",
    },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.key} className="flex gap-3">
            {/* Connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                step.done
                  ? step.isReject
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-emerald-300 bg-emerald-50 text-emerald-600"
                  : "border-slate-200 bg-white text-slate-300",
              )}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className={cn("w-0.5 flex-1 my-1", step.done ? "bg-emerald-200" : "bg-slate-100")} style={{ minHeight: "1.5rem" }} />
              )}
            </div>
            {/* Content */}
            <div className={cn("pb-4 min-w-0 flex-1", isLast && "pb-0")}>
              <p className={cn("text-sm font-semibold", step.done ? step.isReject ? "text-rose-700" : "text-slate-800" : "text-slate-400")}>
                {step.label}
              </p>
              {step.done && (
                <>
                  {step.date && <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(step.date)}</p>}
                  {step.by && <p className="text-xs text-slate-500 mt-0.5">Oleh: <span className="font-medium">{toTitleCase(step.by)}</span></p>}
                  {step.note && (
                    <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">{step.note}</p>
                  )}
                  {step.key === "disetujui" && !step.isReject && row.amount_approved && (
                    <p className="mt-1 text-sm font-bold text-emerald-700">{fmtRupiah(row.amount_approved)}</p>
                  )}
                </>
              )}
              {!step.done && <p className="text-xs text-slate-300 mt-0.5">Menunggu...</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Payment Progress Bar ──────────────────────────────────────────────────────
function PaymentProgressBar({ totalPaid, amountApproved }) {
  const pct = amountApproved > 0 ? Math.min(100, (totalPaid / amountApproved) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">Terbayar</span>
        <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-blue-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-emerald-600 font-medium">{fmtRupiah(totalPaid)}</span>
        <span className="text-slate-400">dari {fmtRupiah(amountApproved)}</span>
      </div>
    </div>
  );
}

// ── Confirm Delete ────────────────────────────────────────────────────────────
function ConfirmDeleteModal({ open, onClose, onConfirm, loading, title, desc }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
            <HiOutlineExclamationTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800">{title}</p>
            <p className="text-sm text-slate-500">{desc}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition">
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Selector ─────────────────────────────────────────────────────────
function EmployeeSelector({ employees, value, onChange, disabled }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = employees.find((e) => e.employee_id === Number(value));
  const filtered = useMemo(() => {
    if (!q) return employees;
    const lq = q.toLowerCase();
    return employees.filter(
      (e) => e.full_name.toLowerCase().includes(lq) || (e.employee_code || "").toLowerCase().includes(lq)
    );
  }, [employees, q]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition",
          disabled ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100" : "bg-white border-slate-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200",
          open && "border-blue-400 ring-2 ring-blue-200",
        )}
      >
        <span className={selected ? "text-slate-800 font-medium" : "text-slate-400"}>
          {selected ? `${toTitleCase(selected.full_name)} (${selected.employee_code || selected.employee_id})` : "Pilih karyawan..."}
        </span>
        <HiOutlineChevronDown className={cn("h-4 w-4 text-slate-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-400">Tidak ditemukan</li>
            )}
            {filtered.map((e) => (
              <li key={e.employee_id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(e.employee_id, e.full_name);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-blue-50 transition",
                    Number(value) === e.employee_id && "bg-blue-50 font-semibold text-blue-700",
                  )}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                    {e.full_name[0]}
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{toTitleCase(e.full_name)}</p>
                    {e.employee_code && <p className="text-xs text-slate-400">{e.employee_code}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Form Modal (Create / Edit) ────────────────────────────────────────────────
const EMPTY_FORM = {
  employee_id: "",
  employee_name: "",
  type: "kasbon",
  submission_date: todayISO(),
  amount_requested: "",
  purpose: "",
  notes: "",
};

function FormModal({ open, onClose, onSaved, employees, editData }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [removeProof, setRemoveProof] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);
  const isEdit = !!editData;

  useEffect(() => {
    if (open) {
      if (editData) {
        setForm({
          employee_id: editData.employee_id || "",
          employee_name: editData.employee_name || "",
          type: editData.type || "kasbon",
          submission_date: editData.submission_date || todayISO(),
          amount_requested: editData.amount_requested || "",
          purpose: editData.purpose || "",
          notes: editData.notes || "",
        });
      } else {
        setForm(EMPTY_FORM);
      }
      setFile(null);
      setRemoveProof(false);
      setErr("");
    }
  }, [open, editData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id || !form.employee_name) { setErr("Pilih karyawan terlebih dahulu"); return; }
    if (!form.submission_date) { setErr("Tanggal pengajuan wajib diisi"); return; }
    if (!form.amount_requested || Number(form.amount_requested) <= 0) { setErr("Jumlah pengajuan harus lebih dari 0"); return; }
    if (!form.purpose.trim()) { setErr("Keperluan wajib diisi"); return; }

    setSaving(true);
    setErr("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("proof_file", file);
      if (removeProof) fd.append("remove_proof", "true");

      if (isEdit) {
        await apiUpload(`/ikm/kasbon/${editData.id}`, { method: "PUT", body: fd });
      } else {
        await apiUpload("/ikm/kasbon", { method: "POST", body: fd });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="font-bold text-slate-800">{isEdit ? "Edit Pengajuan" : "Tambah Pengajuan"}</p>
            <p className="text-xs text-slate-400">Kasbon & Pinjaman Karyawan</p>
          </div>
          <button type="button" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
              {err}
            </div>
          )}

          {/* Karyawan */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Karyawan <span className="text-rose-500">*</span></label>
            <EmployeeSelector
              employees={employees}
              value={form.employee_id}
              onChange={(id, name) => setForm((f) => ({ ...f, employee_id: id, employee_name: name }))}
            />
          </div>

          {/* Tipe & Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tipe <span className="text-rose-500">*</span></label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="kasbon">Kasbon</option>
                <option value="pinjaman">Pinjaman (cicilan)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tanggal Pengajuan <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={form.submission_date}
                onChange={(e) => setForm((f) => ({ ...f, submission_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Jumlah */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Jumlah Pengajuan (Rp) <span className="text-rose-500">*</span></label>
            <RupiahInput
              value={form.amount_requested}
              onChange={(raw) => setForm((f) => ({ ...f, amount_requested: raw }))}
              placeholder="Contoh: 1.500.000"
            />
          </div>

          {/* Keperluan */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Keperluan / Tujuan <span className="text-rose-500">*</span></label>
            <textarea
              rows={3}
              value={form.purpose}
              onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              placeholder="Jelaskan keperluan pengajuan..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan Tambahan</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Opsional..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {/* Bukti */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Foto / Dokumen Bukti (Opsional)</label>
            {isEdit && editData?.proof_url && !removeProof && (
              <div className="flex items-center gap-2 mb-2">
                <PhotoThumb url={editData.proof_url} label="Bukti saat ini" />
                <span className="text-xs text-slate-500">Bukti saat ini</span>
                <button type="button" onClick={() => setRemoveProof(true)}
                  className="text-xs text-rose-500 underline hover:text-rose-700">
                  Hapus
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => { setFile(e.target.files[0] || null); setRemoveProof(false); }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <HiOutlinePaperClip className="h-4 w-4" />
              {file ? file.name : "Pilih file..."}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Pengajuan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status Update Modal ────────────────────────────────────────────────────────
function StatusModal({ open, onClose, onSaved, row }) {
  const [targetStatus, setTargetStatus] = useState("");
  const [processNote, setProcessNote] = useState("");
  const [approvedNote, setApprovedNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [amountApproved, setAmountApproved] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open && row) {
      setTargetStatus("");
      setProcessNote(row.process_note || "");
      setApprovedNote(row.approved_note || "");
      setRejectionNote(row.rejection_note || "");
      setAmountApproved(row.amount_approved || row.amount_requested || "");
      setErr("");
    }
  }, [open, row]);

  const availableStatuses = useMemo(() => {
    if (!row) return [];
    if (row.status === "pengajuan") return ["proses", "disetujui", "ditolak"];
    if (row.status === "proses") return ["disetujui", "ditolak"];
    return [];
  }, [row]);

  const handleSave = async () => {
    if (!targetStatus) { setErr("Pilih status baru"); return; }
    if (targetStatus === "disetujui" && (!amountApproved || Number(amountApproved) <= 0)) {
      setErr("Jumlah yang disetujui wajib diisi"); return;
    }
    setSaving(true);
    setErr("");
    try {
      const actor = getCurrentUser();
      await api(`/ikm/kasbon/${row.id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          status: targetStatus,
          process_note: processNote || undefined,
          approved_note: approvedNote || undefined,
          rejection_note: rejectionNote || undefined,
          amount_approved: targetStatus === "disetujui" ? amountApproved : undefined,
          actor_id: actor.id,
          actor_name: actor.name,
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !row) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="font-bold text-slate-800">Update Status</p>
            <p className="text-xs text-slate-400">{toTitleCase(row.employee_name)} — {row.type === "pinjaman" ? "Pinjaman" : "Kasbon"}</p>
          </div>
          <button type="button" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />{err}
            </div>
          )}

          {/* Current status info */}
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
            <span className="text-xs text-slate-500">Status saat ini:</span>
            <StatusBadge status={row.status} />
            <span className="text-xs text-slate-400 ml-auto">{fmtRupiah(row.amount_requested)}</span>
          </div>

          {/* Target status */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ubah ke Status <span className="text-rose-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {availableStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTargetStatus(s)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition",
                    targetStatus === s
                      ? s === "ditolak"
                        ? "bg-rose-600 border-rose-600 text-white"
                        : s === "disetujui"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", STATUS_META[s]?.dot)} />
                  {STATUS_META[s]?.label || s}
                </button>
              ))}
              {availableStatuses.length === 0 && (
                <p className="text-sm text-slate-400">Status ini sudah final</p>
              )}
            </div>
          </div>

          {/* Conditional fields */}
          {targetStatus === "proses" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan Proses</label>
              <textarea rows={2} value={processNote} onChange={(e) => setProcessNote(e.target.value)}
                placeholder="Catatan proses (opsional)..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
          )}

          {targetStatus === "disetujui" && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Jumlah Disetujui (Rp) <span className="text-rose-500">*</span></label>
                <RupiahInput value={amountApproved} onChange={(raw) => setAmountApproved(raw)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Catatan Persetujuan</label>
                <textarea rows={2} value={approvedNote} onChange={(e) => setApprovedNote(e.target.value)}
                  placeholder="Catatan persetujuan (opsional)..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
            </>
          )}

          {targetStatus === "ditolak" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Alasan Penolakan</label>
              <textarea rows={2} value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Alasan penolakan (opsional)..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={saving || availableStatuses.length === 0}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
            {saving ? "Menyimpan..." : "Simpan Status"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail & Payment Modal ────────────────────────────────────────────────────
function DetailModal({ open, onClose, rowId, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("tracking");
  // Payment form
  const [payForm, setPayForm] = useState({ payment_date: todayISO(), amount: "", payment_method: "potong_gaji", notes: "" });
  const [payErr, setPayErr] = useState("");
  const [paySaving, setPaySaving] = useState(false);
  const [deletePayId, setDeletePayId] = useState(null);
  const [deletingPay, setDeletingPay] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!rowId) return;
    setLoading(true);
    try {
      const res = await api(`/ikm/kasbon/${rowId}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rowId]);

  useEffect(() => {
    if (open && rowId) {
      setTab("tracking");
      setPayForm({ payment_date: todayISO(), amount: "", payment_method: "potong_gaji", notes: "" });
      setPayErr("");
      fetchDetail();
    }
  }, [open, rowId, fetchDetail]);

  const handleAddPayment = async () => {
    if (!payForm.payment_date || !payForm.amount || Number(payForm.amount) <= 0) {
      setPayErr("Tanggal dan jumlah wajib diisi"); return;
    }
    setPaySaving(true);
    setPayErr("");
    try {
      await api(`/ikm/kasbon/${rowId}/payment`, {
        method: "POST",
        body: JSON.stringify(payForm),
      });
      setPayForm({ payment_date: todayISO(), amount: "", payment_method: "potong_gaji", notes: "" });
      await fetchDetail();
      onRefresh();
    } catch (e) {
      setPayErr(e.message);
    } finally {
      setPaySaving(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deletePayId) return;
    setDeletingPay(true);
    try {
      await api(`/ikm/kasbon/${rowId}/payment/${deletePayId}`, { method: "DELETE" });
      setDeletePayId(null);
      await fetchDetail();
      onRefresh();
    } catch (e) {
      setPayErr(e.message);
    } finally {
      setDeletingPay(false);
    }
  };

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <p className="font-bold text-slate-800">{loading ? "Memuat..." : toTitleCase(data?.employee_name) || "Detail"}</p>
              {data && (
                <div className="flex items-center gap-2 mt-0.5">
                  <TypeBadge type={data.type} />
                  <StatusBadge status={data.status} />
                </div>
              )}
            </div>
            <button type="button" onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>

          {loading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div>
                  <p className="text-xs text-slate-400">Tanggal Pengajuan</p>
                  <p className="text-sm font-semibold text-slate-800">{fmtDate(data.submission_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Jumlah Diajukan</p>
                  <p className="text-sm font-semibold text-slate-800">{fmtRupiah(data.amount_requested)}</p>
                </div>
                {data.amount_approved && (
                  <div>
                    <p className="text-xs text-slate-400">Jumlah Disetujui</p>
                    <p className="text-sm font-bold text-emerald-700">{fmtRupiah(data.amount_approved)}</p>
                  </div>
                )}
                {data.proof_url && (
                  <div>
                    <p className="text-xs text-slate-400">Bukti</p>
                    <PhotoThumb url={data.proof_url} label="Bukti pengajuan" />
                  </div>
                )}
              </div>

              {/* Purpose */}
              <div className="px-6 pt-4 pb-2">
                <p className="text-xs text-slate-400 mb-1">Keperluan</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">{data.purpose}</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-6 pb-2">
                {["tracking", ...(data.type === "pinjaman" && data.status === "disetujui" ? ["pembayaran"] : [])].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-xs font-semibold transition capitalize",
                      tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {t === "tracking" ? "Tracking Status" : "Riwayat Pembayaran"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {tab === "tracking" && (
                  <div className="pt-2">
                    <ProgressTimeline row={data} />
                  </div>
                )}

                {tab === "pembayaran" && data.type === "pinjaman" && (
                  <div className="pt-2 space-y-4">
                    {/* Progress bar */}
                    <PaymentProgressBar totalPaid={data.total_paid || 0} amountApproved={Number(data.amount_approved)} />

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Disetujui", val: fmtRupiah(data.amount_approved), cls: "text-slate-700" },
                        { label: "Terbayar", val: fmtRupiah(data.total_paid), cls: "text-emerald-700" },
                        { label: "Sisa", val: fmtRupiah(data.remaining), cls: data.remaining <= 0 ? "text-emerald-600" : "text-amber-700" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-400">{s.label}</p>
                          <p className={cn("text-sm font-bold mt-0.5", s.cls)}>{s.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Payment list */}
                    {data.payments?.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Riwayat Pembayaran</p>
                        {data.payments.map((p) => (
                          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                              <HiOutlineCreditCard className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{fmtRupiah(p.amount)}</p>
                              <p className="text-xs text-slate-400">{fmtDate(p.payment_date)} · {PAYMENT_METHOD_LABEL[p.payment_method] || p.payment_method}</p>
                              {p.notes && <p className="text-xs text-slate-500 truncate">{p.notes}</p>}
                            </div>
                            {p.recorded_by_name && <p className="text-xs text-slate-400 shrink-0">{toTitleCase(p.recorded_by_name)}</p>}
                            <button type="button" onClick={() => setDeletePayId(p.id)}
                              className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500 transition">
                              <HiOutlineTrash className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-slate-400 py-2">Belum ada pembayaran tercatat</p>
                    )}

                    {/* Add payment form */}
                    {(data.remaining === null || data.remaining > 0) && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-600">Catat Pembayaran Baru</p>
                        {payErr && (
                          <p className="text-xs text-rose-600 font-medium">{payErr}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Tanggal</label>
                            <input type="date" value={payForm.payment_date}
                              onChange={(e) => setPayForm((f) => ({ ...f, payment_date: e.target.value }))}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-slate-500">Jumlah (Rp)</label>
                            <RupiahInput
                              value={payForm.amount}
                              onChange={(raw) => setPayForm((f) => ({ ...f, amount: raw }))}
                              placeholder="Jumlah..."
                              className="py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Metode</label>
                          <select value={payForm.payment_method}
                            onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                            <option value="potong_gaji">Potong Gaji</option>
                            <option value="tunai">Tunai</option>
                            <option value="transfer">Transfer</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-slate-500">Catatan</label>
                          <input type="text" value={payForm.notes}
                            onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder="Opsional..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <button type="button" onClick={handleAddPayment} disabled={paySaving}
                          className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                          {paySaving ? "Menyimpan..." : "Catat Pembayaran"}
                        </button>
                      </div>
                    )}
                    {data.remaining !== null && data.remaining <= 0 && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                        <p className="text-sm font-semibold text-emerald-700">Pinjaman telah lunas!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete payment confirm */}
      <ConfirmDeleteModal
        open={!!deletePayId}
        onClose={() => setDeletePayId(null)}
        onConfirm={handleDeletePayment}
        loading={deletingPay}
        title="Hapus Pembayaran"
        desc="Data pembayaran ini akan dihapus permanen."
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE REPORT MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function generatePrintHTML(employee, entries, startDate, endDate) {
  const fmtR = (v) => v == null || v === "" ? "Rp 0" :
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(v));
  const fmtD = (v) => v ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)) : "-";

  const STATUS_LABEL = { pengajuan: "Pengajuan", proses: "Proses", disetujui: "Disetujui", ditolak: "Ditolak" };
  const TYPE_LABEL   = { kasbon: "Kasbon", pinjaman: "Pinjaman" };

  const kasbonEntries   = entries.filter((e) => e.type === "kasbon");
  const pinjamanEntries = entries.filter((e) => e.type === "pinjaman");

  const kasbonApproved   = kasbonEntries.filter((e) => e.status === "disetujui");
  const pinjamanApproved = pinjamanEntries.filter((e) => e.status === "disetujui");
  const kasbonTotal   = kasbonApproved.reduce((s, r)   => s + Number(r.amount_approved || 0), 0);
  const pinjamanTotal = pinjamanApproved.reduce((s, r) => s + Number(r.amount_approved || 0), 0);
  const totalAll      = kasbonTotal + pinjamanTotal;
  const totalPaid     = pinjamanApproved.reduce((s, r) => s + Number(r.total_paid || 0), 0);
  const sisa          = Math.max(0, pinjamanTotal - totalPaid);

  const rowStyle = "border:1px solid #e2e8f0; padding:7px 10px; font-size:12px;";
  const thStyle  = "border:1px solid #cbd5e1; padding:7px 10px; font-size:11px; background:#f1f5f9; font-weight:600; text-transform:uppercase; letter-spacing:.05em;";

  const buildTable = (list, type) => {
    if (!list.length) return `<p style="font-size:12px;color:#94a3b8;margin:6px 0;">Tidak ada data ${type}.</p>`;
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead><tr>
          <th style="${thStyle}">Tgl Pengajuan</th>
          <th style="${thStyle}">Jumlah Diajukan</th>
          <th style="${thStyle}">Disetujui</th>
          ${ type === "pinjaman" ? `<th style="${thStyle}">Terbayar</th><th style="${thStyle}">Sisa</th>` : "" }
          <th style="${thStyle}">Status</th>
          <th style="${thStyle}">Keperluan</th>
        </tr></thead>
        <tbody>
          ${ list.map((r) => `<tr>
            <td style="${rowStyle}">${fmtD(r.submission_date)}</td>
            <td style="${rowStyle}">${fmtR(r.amount_requested)}</td>
            <td style="${rowStyle};font-weight:600;color:${r.amount_approved ? "#047857" : "#94a3b8"}">${r.amount_approved ? fmtR(r.amount_approved) : "-"}</td>
            ${ type === "pinjaman" ? `
              <td style="${rowStyle}">${r.total_paid != null ? fmtR(r.total_paid) : "-"}</td>
              <td style="${rowStyle};font-weight:600;color:${(r.remaining ?? 1) > 0 ? "#b45309" : "#047857"}">${
                r.status === "disetujui" ? ((r.remaining ?? 1) <= 0 ? "LUNAS" : fmtR(r.remaining)) : "-"
              }</td>` : "" }
            <td style="${rowStyle}">${STATUS_LABEL[r.status] || r.status}</td>
            <td style="${rowStyle}">${r.purpose || "-"}</td>
          </tr>`).join("") }
        </tbody>
      </table>`;
  };

  return `<!DOCTYPE html><html lang="id"><head>
    <meta charset="UTF-8">
    <title>Laporan Kasbon & Pinjaman — ${toTitleCase(employee.employee_name)}</title>
    <style>body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:24px;color:#1e293b}
    @media print{@page{size:A4 landscape;margin:15mm}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #0f172a;padding-bottom:10px;">
      <div>
        <h1 style="margin:0;font-size:18px;font-weight:700;">PT Waschen Alora Indonesia</h1>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Laporan Kasbon &amp; Pinjaman Karyawan</p>
      </div>
      <div style="text-align:right;font-size:11px;color:#64748b;">
        <p style="margin:0;">Periode: ${fmtD(startDate)} – ${fmtD(endDate)}</p>
        <p style="margin:2px 0 0;">Dicetak: ${new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(new Date())}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;"><strong>Nama Karyawan</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: ${toTitleCase(employee.employee_name)}</td>
        <td style="padding:4px 0;font-size:13px;"><strong>Total Kasbon (disetujui)</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: ${fmtR(kasbonTotal)}</td>
      </tr><tr>
        <td style="padding:4px 0;font-size:13px;"><strong>Jumlah Pengajuan Kasbon</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: ${kasbonEntries.length}x</td>
        <td style="padding:4px 0;font-size:13px;"><strong>Total Pinjaman (disetujui)</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: ${fmtR(pinjamanTotal)}</td>
      </tr><tr>
        <td style="padding:4px 0;font-size:13px;"><strong>Jumlah Pengajuan Pinjaman</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: ${pinjamanEntries.length}x</td>
        <td style="padding:4px 0;font-size:13px;"><strong>Total Keseluruhan</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: <strong style="color:#0f172a">${fmtR(totalAll)}</strong></td>
      </tr><tr>
        <td></td><td></td>
        <td style="padding:4px 0;font-size:13px;"><strong>Sisa Pinjaman</strong></td>
        <td style="padding:4px 8px;font-size:13px;">: <strong style="color:${sisa > 0 ? "#b45309" : "#047857"}">${sisa > 0 ? fmtR(sisa) : "Nihil / Lunas"}</strong></td>
      </tr>
    </table>

    <h3 style="margin:0 0 6px;font-size:13px;border-left:3px solid #7c3aed;padding-left:8px;">Detail Kasbon (${kasbonEntries.length} pengajuan)</h3>
    ${buildTable(kasbonEntries, "kasbon")}

    <h3 style="margin:12px 0 6px;font-size:13px;border-left:3px solid #0891b2;padding-left:8px;">Detail Pinjaman (${pinjamanEntries.length} pengajuan)</h3>
    ${buildTable(pinjamanEntries, "pinjaman")}

    <p style="margin-top:24px;font-size:10px;color:#94a3b8;text-align:center;">Dokumen ini dicetak secara otomatis oleh sistem Alora App.</p>
  </body></html>`;
}

function EmployeeReportModal({ open, onClose, employee, startDate, endDate }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!employee) return;
    setLoading(true);
    const params = new URLSearchParams({ employeeId: employee.employee_id, limit: 9999 });
    if (startDate) params.set("startDate", startDate);
    if (endDate)   params.set("endDate",   endDate);
    try {
      const d = await api(`/ikm/kasbon?${params}`);
      setEntries(d.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [employee, startDate, endDate]);

  useEffect(() => {
    if (!open || !employee) return;
    fetchEntries();
  }, [open, employee, fetchEntries]);

  const handlePrint = () => {
    const html = generatePrintHTML(employee, entries, startDate, endDate);
    const win = window.open("", "_blank", "width=1000,height=700");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  if (!open || !employee) return null;

  const kasbonEntries   = entries.filter((e) => e.type === "kasbon");
  const pinjamanEntries = entries.filter((e) => e.type === "pinjaman");
  const kasbonApproved  = kasbonEntries.filter((e)   => e.status === "disetujui");
  const pinjamanApproved = pinjamanEntries.filter((e) => e.status === "disetujui");
  const kasbonTotal   = kasbonApproved.reduce((s, r)   => s + Number(r.amount_approved || 0), 0);
  const pinjamanTotal = pinjamanApproved.reduce((s, r) => s + Number(r.amount_approved || 0), 0);
  const totalAll      = kasbonTotal + pinjamanTotal;
  const totalPaid     = pinjamanApproved.reduce((s, r) => s + Number(r.total_paid || 0), 0);
  const sisa          = Math.max(0, pinjamanTotal - totalPaid);

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100">
              <HiOutlineDocumentText className="h-5 w-5 text-violet-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{toTitleCase(employee.employee_name)}</h3>
              <p className="text-xs text-slate-400">
                Periode: {fmtDate(startDate)} – {fmtDate(endDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || entries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition"
            >
              <HiOutlinePrinter className="h-4 w-4" /> Cetak / Unduh PDF
            </button>
            <button type="button" onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-6 border-b border-slate-100">
          {[
            { label: "Kasbon",            value: `${kasbonEntries.length}x`,  sub: fmtRupiah(kasbonTotal),   cls: "bg-violet-50 text-violet-700" },
            { label: "Pinjaman",          value: `${pinjamanEntries.length}x`, sub: fmtRupiah(pinjamanTotal), cls: "bg-cyan-50 text-cyan-700" },
            { label: "Total Keseluruhan", value: fmtRupiah(totalAll),          sub: "kasbon + pinjaman",       cls: "bg-slate-50 text-slate-700" },
            { label: "Terbayar",          value: fmtRupiah(totalPaid),         sub: "cicilan pinjaman",        cls: "bg-emerald-50 text-emerald-700" },
            { label: "Sisa Pinjaman",     value: sisa > 0 ? fmtRupiah(sisa) : "Nihil", sub: "belum terbayar", cls: sisa > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700" },
          ].map((c) => (
            <div key={c.label} className={cn("rounded-xl border px-3 py-2.5 col-span-1", c.cls.replace("text-", "border-").replace("700","200").replace("50","100"), c.cls)}>
              <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{c.label}</p>
              <p className="mt-0.5 text-sm font-bold leading-tight">{c.value}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Entry tables */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
            </div>
          )}

          {!loading && (
            <>
              {/* Kasbon table */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-violet-700">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold">{kasbonEntries.length}</span>
                  Pengajuan Kasbon
                </h4>
                {kasbonEntries.length === 0 ? (
                  <p className="text-sm text-slate-400">Tidak ada pengajuan kasbon pada periode ini.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Tgl Pengajuan","Jumlah Diajukan","Disetujui","Status","Keperluan","Catatan"].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {kasbonEntries.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDate(r.submission_date)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{fmtRupiah(r.amount_requested)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-emerald-700">{r.amount_approved ? fmtRupiah(r.amount_approved) : <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                            <td className="px-3 py-2.5 text-slate-600">{r.purpose || "-"}</td>
                            <td className="px-3 py-2.5 text-slate-400">{r.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pinjaman table */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-700">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold">{pinjamanEntries.length}</span>
                  Pengajuan Pinjaman
                </h4>
                {pinjamanEntries.length === 0 ? (
                  <p className="text-sm text-slate-400">Tidak ada pengajuan pinjaman pada periode ini.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full border-collapse text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {["Tgl Pengajuan","Diajukan","Disetujui","Terbayar","Sisa","Status","Keperluan"].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pinjamanEntries.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{fmtDate(r.submission_date)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{fmtRupiah(r.amount_requested)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-emerald-700">{r.amount_approved ? fmtRupiah(r.amount_approved) : <span className="text-slate-300">-</span>}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{r.total_paid != null ? fmtRupiah(r.total_paid) : "-"}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {r.status === "disetujui" ? (
                                (r.remaining ?? 1) <= 0
                                  ? <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">LUNAS</span>
                                  : <span className="font-semibold text-amber-700">{fmtRupiah(r.remaining)}</span>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                            <td className="px-3 py-2.5 text-slate-600">{r.purpose || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function KasbonPinjaman() {
  // ── Data state ─────────────────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterStart, setFilterStart] = useState(DEFAULT_CUTOFF.start);
  const [filterEnd, setFilterEnd] = useState(DEFAULT_CUTOFF.end);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState({ col: "submission_date", dir: "desc" });

  // ── Modal state ────────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, row: null });
  const [detailModal, setDetailModal] = useState({ open: false, rowId: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── Employee summary state ──────────────────────────────────────────────────
  const [summary, setSummary] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [employeeReport, setEmployeeReport] = useState({ open: false, employee: null });
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryLimit, setSummaryLimit] = useState("5");

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    document.title = "Kasbon & Pinjaman IKM | Alora Group Indonesia";
  }, []);

  // ── Fetch employees once ───────────────────────────────────────────────────
  useEffect(() => {
    api("/ikm/kasbon/employee-options")
      .then((d) => setEmployees(d.data || []))
      .catch(() => setEmployees([]));
  }, []);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSummaryPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── Fetch list ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (filterType) params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (filterStart) params.set("startDate", filterStart);
      if (filterEnd) params.set("endDate", filterEnd);
      if (search) params.set("search", search);

      const res = await api(`/ikm/kasbon?${params.toString()}`);
      setRows(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, filterStart, filterEnd, search, limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Fetch employee summary ─────────────────────────────────────────────────
  useEffect(() => {
    setSummaryLoading(true);
    const params = new URLSearchParams();
    if (filterStart) params.set("startDate", filterStart);
    if (filterEnd)   params.set("endDate",   filterEnd);
    api(`/ikm/kasbon/employee-summary?${params}`)
      .then((d) => setSummary(d.data || []))
      .catch(() => setSummary([]))
      .finally(() => setSummaryLoading(false));
  }, [filterStart, filterEnd]);

  // ── Client-side sort ───────────────────────────────────────────────────────
  const sortedRows = useMemo(() => {
    const { col, dir } = sort;
    return [...rows].sort((a, b) => {
      let av = a[col] ?? "", bv = b[col] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sort]);

  const handleSort = (col) => {
    setSort((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  };

  const resetFilter = () => {
    setFilterType(""); setFilterStatus("");
    setFilterStart(DEFAULT_CUTOFF.start); setFilterEnd(DEFAULT_CUTOFF.end);
    setSearch("");
    setPage(1);
    setLimit(25);
    setSummaryPage(1);
    setSummaryLimit("5");
  };

  const hasFilter = filterType || filterStatus || search ||
    filterStart !== DEFAULT_CUTOFF.start || filterEnd !== DEFAULT_CUTOFF.end;

  // ── Export Excel ──────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 9999 });
      if (filterType)   params.set("type",      filterType);
      if (filterStatus) params.set("status",    filterStatus);
      if (filterStart)  params.set("startDate", filterStart);
      if (filterEnd)    params.set("endDate",   filterEnd);
      if (search)       params.set("search",    search);

      const [listRes, summaryRes] = await Promise.all([
        api(`/ikm/kasbon?${params.toString()}`),
        api(`/ikm/kasbon/employee-summary?${new URLSearchParams(
          Object.fromEntries([
            filterStart && ["startDate", filterStart],
            filterEnd   && ["endDate",   filterEnd],
          ].filter(Boolean))
        ).toString()}`),
      ]);

      exportKasbonExcel({
        rows:      listRes.data || [],
        summary:   summaryRes.data || [],
        startDate: filterStart,
        endDate:   filterEnd,
        filters:   { type: filterType, status: filterStatus, search },
      });
    } catch (e) {
      showToast(e.message || "Gagal mengekspor Excel", "error");
    } finally {
      setExporting(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/ikm/kasbon/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Data berhasil dihapus");
      setDeleteTarget(null);
      fetchData();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalKasbon = rows.filter((r) => r.type === "kasbon").length;
    const totalPinjaman = rows.filter((r) => r.type === "pinjaman").length;
    const pending = rows.filter((r) => ["pengajuan", "proses"].includes(r.status)).length;
    const approved = rows.filter((r) => r.status === "disetujui").length;
    return { totalKasbon, totalPinjaman, pending, approved };
  }, [rows]);

  // ── Employee summary: client-side search + paginate ─────────────────────────
  const filteredSummary = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return summary;
    return summary.filter((e) => (e.employee_name || "").toLowerCase().includes(kw));
  }, [summary, search]);

  const summaryPerPage = useMemo(() => {
    if (summaryLimit === "all") return Math.max(filteredSummary.length, 1);
    const n = Number(summaryLimit);
    return Number.isFinite(n) && n > 0 ? n : 5;
  }, [summaryLimit, filteredSummary.length]);

  const summaryTotalPages = useMemo(() => {
    if (filteredSummary.length === 0) return 1;
    if (summaryLimit === "all") return 1;
    return Math.max(1, Math.ceil(filteredSummary.length / summaryPerPage));
  }, [filteredSummary.length, summaryLimit, summaryPerPage]);

  const paginatedSummary = useMemo(() => {
    if (summaryLimit === "all") return filteredSummary;
    const start = (summaryPage - 1) * summaryPerPage;
    return filteredSummary.slice(start, start + summaryPerPage);
  }, [filteredSummary, summaryLimit, summaryPage, summaryPerPage]);

  useEffect(() => {
    setSummaryPage((p) => Math.max(1, Math.min(p, summaryTotalPages)));
  }, [summaryTotalPages]);

  const summaryFrom = filteredSummary.length === 0 ? 0 : (summaryPage - 1) * summaryPerPage + 1;
  const summaryTo   = filteredSummary.length === 0 ? 0 : summaryLimit === "all"
    ? filteredSummary.length
    : Math.min(summaryPage * summaryPerPage, filteredSummary.length);

  return (
    <>
      <Toast toast={toast} />

      <main className="min-h-screen bg-indigo-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-emerald-900 to-green-700 p-5 shadow-sm sm:p-6">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                  <HiOutlineBanknotes className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white sm:text-2xl">Kasbon &amp; Pinjaman</h1>
                  <p className="text-sm text-white/70">Pengajuan kasbon dan pinjaman karyawan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditData(null); setFormOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0"
              >
                <HiOutlinePlus className="h-4 w-4" /> Tambah Pengajuan
              </button>
            </div>
          </section>

          {/* ── Filter ──────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HiOutlineFunnel className="h-4 w-4 text-slate-400" /> Filter
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Tipe</span>
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Semua Tipe</option>
                  <option value="kasbon">Kasbon</option>
                  <option value="pinjaman">Pinjaman</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Semua Status</option>
                  <option value="pengajuan">Pengajuan</option>
                  <option value="proses">Proses</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Dari Tanggal</span>
                <input type="date" value={filterStart}
                  onChange={(e) => { setFilterStart(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
              </label>
              <label className="text-sm text-slate-600">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Sampai Tanggal</span>
                <input type="date" value={filterEnd}
                  onChange={(e) => { setFilterEnd(e.target.value); setPage(1); }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
              </label>
            </div>
            <div className="mt-3 flex gap-2 flex-1">
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari karyawan, keperluan..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200" />
                </div>
              </div>
              {hasFilter && (
                <button type="button" onClick={resetFilter}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition">
                  <HiOutlineXMark className="h-4 w-4" /> Reset
                </button>
              )}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">Per halaman:</span>
                <select value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400">
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value={9999}>Semua</option>
                </select>
              </div>
            </div>
          </section>

          {/* ── Stats ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Kasbon", value: stats.totalKasbon, icon: HiOutlineBanknotes, cls: "text-violet-600 bg-violet-50" },
              { label: "Pinjaman", value: stats.totalPinjaman, icon: HiOutlineCreditCard, cls: "text-cyan-600 bg-cyan-50" },
              { label: "Menunggu", value: stats.pending, icon: HiOutlineClock, cls: "text-amber-600 bg-amber-50" },
              { label: "Disetujui", value: stats.approved, icon: HiOutlineCheckCircle, cls: "text-emerald-600 bg-emerald-50" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", s.cls)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{s.label}</p>
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Ringkasan Per Karyawan ──────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineUserGroup className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-bold text-slate-800">Ringkasan Per Karyawan</h2>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                {filteredSummary.length.toLocaleString("id-ID")} karyawan
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Karyawan</th>
                    <th className="px-4 py-3 text-center">Kasbon</th>
                    <th className="px-4 py-3">Total Kasbon</th>
                    <th className="px-4 py-3 text-center">Pinjaman</th>
                    <th className="px-4 py-3">Total Pinjaman</th>
                    <th className="px-4 py-3">Total Keseluruhan</th>
                    <th className="px-4 py-3">Sisa Hutang</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryLoading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                          Memuat data...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!summaryLoading && filteredSummary.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">
                        {search ? `Tidak ada karyawan yang cocok dengan pencarian "${search}".` : "Tidak ada data pada periode ini."}
                      </td>
                    </tr>
                  )}
                  {!summaryLoading && paginatedSummary.map((emp) => (
                    <tr key={emp.employee_id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{toTitleCase(emp.employee_name)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{emp.kasbon_count}x</td>
                      <td className="px-4 py-3 text-violet-700 font-medium">{fmtRupiah(emp.kasbon_total)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{emp.pinjaman_count}x</td>
                      <td className="px-4 py-3 text-cyan-700 font-medium">{fmtRupiah(emp.pinjaman_total)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{fmtRupiah(emp.total_all)}</td>
                      <td className="px-4 py-3">
                        {emp.sisa > 0 ? (
                          <span className="font-semibold text-amber-700">{fmtRupiah(emp.sisa)}</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            Nihil
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setEmployeeReport({ open: true, employee: emp })}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition"
                        >
                          <HiOutlinePrinter className="h-3.5 w-3.5" /> Laporan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {!summaryLoading && filteredSummary.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-500">
                    Menampilkan <strong className="text-slate-700">{summaryFrom}–{summaryTo}</strong> dari{" "}
                    <strong className="text-slate-700">{filteredSummary.length}</strong> karyawan
                    {search && summary.length !== filteredSummary.length && (
                      <span className="ml-1 text-slate-400">(difilter dari {summary.length})</span>
                    )}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400">
                    Tampil:
                    <select
                      value={summaryLimit}
                      onChange={(e) => { setSummaryLimit(e.target.value); setSummaryPage(1); }}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-400"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="all">Semua</option>
                    </select>
                  </label>
                </div>

                {summaryTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={summaryPage <= 1}
                      onClick={() => setSummaryPage((p) => p - 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition">
                      <HiOutlineChevronLeft className="h-4 w-4" />
                    </button>
                    {generatePages(summaryPage, summaryTotalPages).map((p, i) =>
                      p === "..." ? (
                        <span key={`se-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                      ) : (
                        <button key={p} type="button" onClick={() => setSummaryPage(p)}
                          className={cn(
                            "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold transition",
                            p === summaryPage ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                          )}>{p}</button>
                      )
                    )}
                    <button type="button" disabled={summaryPage >= summaryTotalPages}
                      onClick={() => setSummaryPage((p) => p + 1)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition">
                      <HiOutlineChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Table ───────────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <HiOutlineBanknotes className="h-5 w-5 text-violet-500" />
                <h2 className="text-base font-bold text-slate-800">Daftar Kasbon &amp; Pinjaman</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs font-semibold text-slate-500">
                  {pagination.total.toLocaleString("id-ID")} data
                </span>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
                >
                  {exporting
                    ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300 border-t-emerald-700" />
                    : <HiOutlineArrowDownTray className="h-3.5 w-3.5" />}
                  {exporting ? "Memproses..." : "Export Excel"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <SortTh col="submission_date" label="Tanggal" sort={sort} onSort={handleSort} />
                    <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={handleSort} />
                    <SortTh col="type" label="Tipe" sort={sort} onSort={handleSort} />
                    <SortTh col="amount_requested" label="Jumlah Diajukan" sort={sort} onSort={handleSort} />
                    <SortTh col="amount_approved" label="Disetujui" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Cicilan</th>
                    <SortTh col="status" label="Status" sort={sort} onSort={handleSort} />
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Bukti</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={9} />)}
                  {!loading && sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-400">
                        Belum ada data pengajuan
                      </td>
                    </tr>
                  )}
                  {!loading && sortedRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{fmtDate(row.submission_date)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">{toTitleCase(row.employee_name)}</td>
                      <td className="px-4 py-3.5"><TypeBadge type={row.type} /></td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-slate-700">{fmtRupiah(row.amount_requested)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-emerald-700">
                        {row.amount_approved ? fmtRupiah(row.amount_approved) : <span className="text-slate-300 font-normal">-</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.type === "pinjaman" && row.status === "disetujui" ? (
                          (row.remaining ?? 1) <= 0 ? (
                            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 tracking-wide">
                              LUNAS
                            </span>
                          ) : (
                          <div className="min-w-[120px]">
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-blue-400"
                                style={{ width: `${Math.min(100, ((row.total_paid || 0) / Number(row.amount_approved)) * 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">Sisa {fmtRupiah(row.remaining)}</p>
                          </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3.5"><PhotoThumb url={row.proof_url} /></td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailModal({ open: true, rowId: row.id })}
                            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition bg-blue-50/50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-100"
                          >
                            <HiOutlineInformationCircle className="h-3.5 w-3.5" /> Detail
                          </button>
                          {!["disetujui", "ditolak"].includes(row.status) && (
                            <button
                              type="button"
                              onClick={() => setStatusModal({ open: true, row })}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition"
                            >
                              <HiOutlineClipboardDocumentCheck className="h-3.5 w-3.5" /> Proses
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setEditData(row); setFormOpen(true); }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                          >
                            <HiOutlinePencilSquare className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-300 hover:text-rose-600 transition"
                          >
                            <HiOutlineTrash className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ────────────────────────────────────────────── */}
            {!loading && pagination.totalPages > 0 && (
              <div className="border-t border-slate-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  {pagination.total === 0 ? "0" : (page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} dari {pagination.total.toLocaleString("id-ID")} data
                </p>
                {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition">
                    <HiOutlineChevronLeft className="h-4 w-4" />
                  </button>
                  {generatePages(page, pagination.totalPages).map((p, i) =>
                    p === "..." ? (
                      <span key={`e-${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
                    ) : (
                      <button key={p} type="button" onClick={() => setPage(p)}
                        className={cn(
                          "inline-flex h-8 min-w-8 px-2 items-center justify-center rounded-lg border text-xs font-semibold transition",
                          p === page ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        )}>{p}</button>
                    )
                  )}
                  <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-slate-50 transition">
                    <HiOutlineChevronRight className="h-4 w-4" />
                  </button>
                </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <FormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { fetchData(); showToast(editData ? "Data berhasil diperbarui" : "Pengajuan berhasil dibuat"); }}
        employees={employees}
        editData={editData}
      />

      <StatusModal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, row: null })}
        onSaved={() => { fetchData(); showToast("Status berhasil diperbarui"); }}
        row={statusModal.row}
      />

      <DetailModal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, rowId: null })}
        rowId={detailModal.rowId}
        onRefresh={fetchData}
      />

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Hapus Pengajuan"
        desc={deleteTarget ? `${toTitleCase(deleteTarget.employee_name)} — ${fmtRupiah(deleteTarget.amount_requested)}` : ""}
      />

      <EmployeeReportModal
        open={employeeReport.open}
        onClose={() => setEmployeeReport({ open: false, employee: null })}
        employee={employeeReport.employee}
        startDate={filterStart}
        endDate={filterEnd}
      />

      </>
  );
}
