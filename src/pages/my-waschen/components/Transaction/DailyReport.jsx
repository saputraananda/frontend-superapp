import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineClipboardDocumentList,
  HiOutlinePencilSquare,
  HiOutlineXMark,
  HiOutlineDocumentDuplicate,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineChevronDown,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBuildingStorefront,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import { MultiSelect } from "../HrisOutletRoleFilter";
import { FilterScroll, FilterPill, ExportExcelButton } from "../HRIS/hrisShared";
import { FILTER_SECTION, fmtEmployeeName } from "../../utils/hrisUtils";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const n = (v) => Number(v) || 0;

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n(v));
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtTime(v) {
  return v ? new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function wibToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function shiftLabel(sn) {
  return Number(sn) === 2 ? "Siang" : "Pagi";
}

const FILTER_LABEL = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1";
const SHIFT_FILTERS = [["all", "Semua Shift"], ["1", "Pagi"], ["2", "Siang"]];

const EMPTY_EDIT = {
  initialCash: "",
  initialPettyCash: "",
  actualCash: "",
  actualPettyCash: "",
  declaredRevenue: "",
  openImbalanceReason: "",
  closingNotes: "",
  reportText: "",
};

function toInput(v) {
  if (v == null || v === "") return "";
  return String(v);
}

/** Hal yang perlu ditindaklanjuti pada satu shift (hanya shift yang sudah ditutup). */
function issuesOf(s) {
  const out = [];
  const closed = s.status === "Closed";
  const diff = n(s.difference);
  if (closed && diff !== 0) {
    out.push({ key: "selisih", tone: "rose", label: `Selisih kas ${diff > 0 ? "+" : "−"}${fmtIDR(Math.abs(diff))}` });
  }
  if (s.deposit?.status === "pending") {
    out.push({
      key: "setoran",
      tone: s.deposit.isLate ? "rose" : "amber",
      label: s.deposit.isLate ? `Setoran terlambat ${s.deposit.lateDays} hari` : "Belum setoran",
    });
  }
  const unchecked = (s.transactions || []).filter((t) => !t.isVerified).length;
  if (closed && unchecked > 0) out.push({ key: "cek", tone: "amber", label: `${unchecked} nota belum dicek` });
  return out;
}

const BADGE_TONE = {
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

function Badge({ tone = "slate", children, className = "" }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", BADGE_TONE[tone], className)}>
      {children}
    </span>
  );
}

/* ───────────────────────── ringkasan atas ───────────────────────── */

function Kpi({ label, value, hint, tone = "slate", onClick, active }) {
  const t = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/50",
    rose: "border-rose-200 bg-rose-50/60",
    amber: "border-amber-200 bg-amber-50/60",
  }[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-2xl border p-3 sm:p-4 text-left shadow-sm",
        t,
        onClick && "transition hover:-translate-y-0.5 hover:shadow-md",
        active && "ring-2 ring-[#5f1340]/40",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-800 sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] font-medium text-slate-500">{hint}</p>}
    </Tag>
  );
}

/* ───────────────────────── kartu shift ───────────────────────── */

function Tile({ label, value, hint, tone = "slate", big = false }) {
  const t = {
    slate: "border-slate-200 bg-white",
    soft: "border-slate-100 bg-slate-50/70",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    rose: "border-rose-200 bg-rose-50/70 text-rose-700",
    brand: "border-[#5f1340]/20 bg-[#5f1340]/5 text-[#5f1340]",
  }[tone];
  return (
    <div className={cn("min-w-0 rounded-xl border p-3", t)}>
      <span className="block text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400">{label}</span>
      <span className={cn("mt-1 block break-words font-black leading-tight", big ? "text-base sm:text-lg" : "text-sm", tone === "slate" || tone === "soft" ? "text-slate-800" : "")}>
        {value}
      </span>
      {hint && <span className="mt-0.5 block text-[10px] font-medium text-slate-500">{hint}</span>}
    </div>
  );
}

function ShiftTransactions({ shift }) {
  const txns = shift.transactions;
  const [open, setOpen] = useState(txns.length <= 10);
  const done = txns.filter((t) => t.isVerified).length;
  const total = txns.reduce((a, t) => a + n(t.paidHere), 0);
  const all = done === txns.length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-[#5f1340]/20 bg-[#5f1340]/5 px-4 py-3 hover:bg-[#5f1340]/10"
      >
        <span className="flex flex-wrap items-center gap-2 text-xs font-black text-[#5f1340]">
          Nota dibayar di shift ini
          <span className="rounded-full bg-[#5f1340] px-2 py-0.5 text-[10px] text-white">{txns.length} nota</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">{fmtIDR(total)}</span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px]", all ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800")}>
            {done}/{txns.length} dicek
          </span>
        </span>
        <HiOutlineChevronDown className={cn("h-4 w-4 text-[#5f1340] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400">
                <th className="px-3 py-2 text-left">Jam</th>
                <th className="px-3 py-2 text-left">No Nota</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Bayar</th>
                <th className="px-3 py-2 text-right">Nominal</th>
                <th className="px-3 py-2 text-center">Cek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {txns.map((v) => (
                <tr key={v.id} className={v.isVerified ? "bg-emerald-50/40" : ""}>
                  <td className="px-3 py-2">{fmtTime(v.lastPaidAt)}</td>
                  <td className="px-3 py-2 font-mono text-[#5f1340]">{v.orderNo}</td>
                  <td className="max-w-[16rem] px-3 py-2">
                    <p className="break-words">{v.customerName || "—"}</p>
                    {v.customerAddress ? (
                      <p className="mt-0.5 line-clamp-2 break-words text-[10px] font-medium leading-snug text-slate-500" title={v.customerAddress}>
                        {v.customerAddress}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{v.paymentStatus === "DP" ? "DP " : ""}{v.paymentMethod || "—"}</td>
                  <td className="px-3 py-2 text-right">{fmtIDR(v.paidHere)}</td>
                  <td className="px-3 py-2 text-center">
                    {v.isVerified ? <HiOutlineCheck className="inline h-4 w-4 text-emerald-600" title={fmtDateTime(v.verifiedAt)} /> : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Setoran tunai closing Final: sudah/belum upload, siapa & jam, serta penanda terlambat. */
function DepositSection({ deposit }) {
  const uploaded = deposit.status === "uploaded";
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-xl border p-3 text-[11px]",
        !uploaded && deposit.isLate ? "border-rose-200 bg-rose-50" : uploaded ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <HiOutlineBanknotes className="h-3.5 w-3.5" /> Setoran Tunai
        </span>
        <span className={cn("rounded-lg px-2 py-0.5 text-[10px] font-black", uploaded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>
          {uploaded ? "Sudah diupload" : "Belum diupload"}
        </span>
        {deposit.isLate && (
          <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">Terlambat {deposit.lateDays} hari</span>
        )}
      </div>
      {uploaded && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
          <span>
            Oleh <strong>{fmtEmployeeName(deposit.uploadedByName)}</strong> · {fmtDateTime(deposit.uploadedAt)}
          </span>
          {deposit.proofUrl && (
            <a href={deposit.proofUrl} target="_blank" rel="noopener noreferrer" className="font-black text-[#5f1340] underline">
              Lihat Bukti
            </a>
          )}
          {deposit.notes && <span className="text-slate-600">Catatan: {deposit.notes}</span>}
        </div>
      )}
    </div>
  );
}

function ReportText({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#5f1340]">
        <HiOutlineChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        {open ? "Sembunyikan teks laporan" : "Lihat teks laporan frontliner"}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] text-slate-700">
          {text}
        </pre>
      )}
    </div>
  );
}

function ShiftCard({ s, copied, onCopy, onEdit }) {
  const closed = s.status === "Closed";
  const issues = issuesOf(s);
  const diff = n(s.difference);
  const actualKnown = s.actualCash != null;

  const diffTile = !closed || !actualKnown
    ? { value: "—", hint: "Menunggu shift ditutup", tone: "soft" }
    : diff === 0
      ? { value: "Pas", hint: "Kas sesuai", tone: "emerald" }
      : { value: `${diff > 0 ? "+" : "−"}${fmtIDR(Math.abs(diff))}`, hint: diff > 0 ? "Kas lebih dari seharusnya" : "Kas kurang dari seharusnya", tone: "rose" };

  return (
    <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
      {/* Kepala: siapa, kapan, status */}
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-black leading-snug text-[#5f1340] sm:text-base">
              Shift {shiftLabel(s.shiftNumber)}
            </h2>
            <Badge tone={closed ? "slate" : "emerald"}>{closed ? `Ditutup${s.closeType ? ` · ${s.closeType}` : ""}` : "Sedang berjalan"}</Badge>
          </div>
          <p className="break-words text-[11px] leading-relaxed text-slate-600 sm:text-xs">
            Dibuka <strong>{fmtEmployeeName(s.openerName)}</strong> · {fmtDateTime(s.openedAt)}
            {s.closedAt ? <> &nbsp;→&nbsp; Ditutup <strong>{fmtEmployeeName(s.closedByName)}</strong> · {fmtTime(s.closedAt)}</> : null}
          </p>
          {issues.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <HiOutlineExclamationTriangle className="h-3.5 w-3.5 text-amber-600" />
              {issues.map((i) => <Badge key={i.key} tone={i.tone}>{i.label}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto">
          {s.reportText && (
            <button type="button" onClick={onCopy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#5f1340]/10 px-3 py-2 text-[11px] font-black text-[#5f1340] sm:w-auto">
              <HiOutlineDocumentDuplicate className="h-3.5 w-3.5 shrink-0" />
              {copied ? "Tersalin" : "Salin Report"}
            </button>
          )}
          <button type="button" onClick={onEdit} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800 hover:bg-amber-100 sm:w-auto">
            <HiOutlinePencilSquare className="h-3.5 w-3.5 shrink-0" />
            Edit Saldo
          </button>
        </div>
      </div>

      {/* Kas di laci */}
      <section>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Kas di laci</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <Tile label="Modal awal" value={fmtIDR(s.initialCash)} big />
          <Tile label="Kas seharusnya" value={fmtIDR(s.expectedCash)} big />
          <Tile label="Kas aktual saat close" value={actualKnown ? fmtIDR(s.actualCash) : "Belum closing"} tone={actualKnown ? "brand" : "soft"} big />
          <Tile label="Selisih" value={diffTile.value} hint={diffTile.hint} tone={diffTile.tone} big />
        </div>
      </section>

      {/* Pendapatan & petty cash */}
      <section>
        <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500">Pendapatan & petty cash</h3>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <Tile label="Revenue (dilaporkan)" value={s.declaredRevenue != null ? fmtIDR(s.declaredRevenue) : "—"} tone="soft" />
          <Tile label="Revenue sistem (semua metode)" value={fmtIDR(s.systemCashRevenue)} tone="soft" />
          <Tile label="Petty cash awal" value={fmtIDR(s.initialPettyCash)} tone="soft" />
          <Tile label="Petty cash akhir" value={s.actualPettyCash != null ? fmtIDR(s.actualPettyCash) : "—"} tone="soft" />
        </div>
      </section>

      {s.openImbalanceReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
          <strong>Alasan imbalance open:</strong> {s.openImbalanceReason}
        </div>
      )}
      {s.closingNotes && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
          <strong>Catatan closing:</strong> {s.closingNotes}
        </div>
      )}

      {s.deposit && <DepositSection deposit={s.deposit} />}
      {s.transactions?.length > 0 && <ShiftTransactions shift={s} />}
      {s.reportText && <ReportText text={s.reportText} />}
    </div>
  );
}

/* ───────────────────────── halaman ───────────────────────── */

export default function DailyReport() {
  const [date, setDate] = useState(wibToday);
  const [outletIds, setOutletIds] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [onlyPendingDeposit, setOnlyPendingDeposit] = useState(false);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [openOutlets, setOpenOutlets] = useState(() => new Set());
  const [showEmpty, setShowEmpty] = useState(false);
  const [outlets, setOutlets] = useState([]);

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const loadOutlets = useCallback(async () => {
    try {
      const res = await api("/waschen/outlets");
      setOutlets(res.data || []);
    } catch {
      setOutlets([]);
    }
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setOpenOutlets(new Set()); // semua card outlet tertutup setiap kali data dimuat ulang
    }
    try {
      const q = new URLSearchParams();
      q.set("dateFrom", date);
      q.set("dateTo", date);
      if (outletIds.length) q.set("outletId", outletIds.join(","));
      const res = await api(`/waschen/daily-report?${q}`);
      setShifts(res.data || []);
    } catch (err) {
      if (silent) return;
      showToast("error", err.message || "Gagal memuat daily report");
      setShifts([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [date, outletIds]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  useEffect(() => {
    load();
  }, [load]);
  useLiveRefresh(() => load(true));

  const pendingDepositCount = useMemo(() => shifts.filter((s) => s.deposit?.status === "pending").length, [shifts]);
  const lateDepositCount = useMemo(() => shifts.filter((s) => s.deposit?.isLate).length, [shifts]);
  const attentionCount = useMemo(() => shifts.filter((s) => issuesOf(s).length > 0).length, [shifts]);

  const employeeOptions = useMemo(() => {
    const m = new Map();
    shifts.forEach((s) => {
      [[s.cashierEmployeeId, s.openerName], [s.closedByEmployeeId, s.closedByName]].forEach(([id, name]) => {
        if (id && !m.has(String(id))) m.set(String(id), fmtEmployeeName(name) || `Karyawan #${id}`);
      });
    });
    return [...m].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [shifts]);

  const outletOptions = useMemo(
    () => outlets.map((o) => ({ value: String(o.id), label: o.full_name || o.name })),
    [outlets],
  );

  const visibleShifts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shifts.filter((s) => {
      if (onlyPendingDeposit && s.deposit?.status !== "pending") return false;
      if (onlyAttention && issuesOf(s).length === 0) return false;
      if (shiftFilter !== "all" && String(s.shiftNumber) !== shiftFilter) return false;
      if (employeeIds.length && !employeeIds.some((id) => [s.cashierEmployeeId, s.closedByEmployeeId].map(String).includes(id))) return false;
      if (!q) return true;
      const hay = [s.outletFullName, s.outletName, s.openerName, s.closedByName,
        ...(s.transactions || []).flatMap((t) => [t.orderNo, t.customerName])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [shifts, onlyPendingDeposit, onlyAttention, shiftFilter, employeeIds, search]);

  const groups = useMemo(() => {
    const m = new Map();
    outlets.forEach((o) => {
      if (!outletIds.length || outletIds.includes(String(o.id))) m.set(String(o.id), { id: o.id, name: o.full_name || o.name, shifts: [] });
    });
    visibleShifts.forEach((s) => {
      const k = String(s.outletId);
      if (!m.has(k)) m.set(k, { id: s.outletId, name: s.outletFullName || s.outletName || `Outlet #${k}`, shifts: [] });
      m.get(k).shifts.push(s);
    });
    return [...m.values()]
      .map((g) => ({
        ...g,
        income: g.shifts.reduce((a, s) => a + (s.transactions || []).reduce((b, t) => b + n(t.paidHere), 0), 0),
        issueCount: g.shifts.reduce((a, s) => a + issuesOf(s).length, 0),
      }))
      .sort((a, b) => b.shifts.length - a.shifts.length || String(a.name).localeCompare(String(b.name)));
  }, [outlets, visibleShifts, outletIds]);

  const groupsWithShift = useMemo(() => groups.filter((g) => g.shifts.length > 0), [groups]);
  const emptyGroups = groups.length - groupsWithShift.length;
  const shownGroups = showEmpty ? groups : groupsWithShift;

  const toggleOutlet = (id) => setOpenOutlets((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOpen = groupsWithShift.length > 0 && groupsWithShift.every((g) => openOutlets.has(String(g.id)));

  const summary = useMemo(() => {
    const open = visibleShifts.filter((s) => s.status !== "Closed").length;
    const txns = visibleShifts.flatMap((s) => s.transactions || []);
    const income = txns.reduce((a, t) => a + n(t.paidHere), 0);
    const closed = visibleShifts.filter((s) => s.status === "Closed");
    const diffShifts = closed.filter((s) => n(s.difference) !== 0).length;
    const diffTotal = closed.reduce((a, s) => a + n(s.difference), 0);
    return {
      total: visibleShifts.length,
      open,
      closed: closed.length,
      notaCount: txns.length,
      income,
      diffShifts,
      diffTotal,
      attention: visibleShifts.filter((s) => issuesOf(s).length > 0).length,
    };
  }, [visibleShifts]);

  // Export mengikuti filter yang sedang aktif (tanggal, outlet, karyawan, shift, pencarian)
  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportDailyReportWaschenExcel } = await import("../HRIS/utils/exportDailyReport");
      const labelOf = (opts, ids) => opts.filter((o) => ids.includes(o.value)).map((o) => o.label).join(", ");
      exportDailyReportWaschenExcel({
        shifts: visibleShifts,
        date,
        filters: {
          outlet: labelOf(outletOptions, outletIds),
          employee: labelOf(employeeOptions, employeeIds),
          shift: shiftFilter === "all" ? "" : (SHIFT_FILTERS.find(([k]) => k === shiftFilter)?.[1] || ""),
          search: search.trim(),
          onlyPendingDeposit,
          onlyAttention,
        },
      });
      showToast("success", "Export Excel berhasil");
    } catch (err) {
      showToast("error", err.message || "Gagal export Excel");
    } finally {
      setExporting(false);
    }
  };

  const openEdit = (shift) => {
    setEditRow(shift);
    setEditForm({
      initialCash: toInput(shift.initialCash),
      initialPettyCash: toInput(shift.initialPettyCash),
      actualCash: toInput(shift.actualCash),
      actualPettyCash: toInput(shift.actualPettyCash),
      declaredRevenue: toInput(shift.declaredRevenue),
      openImbalanceReason: shift.openImbalanceReason || "",
      closingNotes: shift.closingNotes || "",
      reportText: shift.reportText || "",
    });
  };

  const closeEdit = () => {
    setEditRow(null);
    setEditForm(EMPTY_EDIT);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const res = await api(`/waschen/daily-report/${editRow.id}`, {
        method: "PUT",
        body: JSON.stringify({
          initialCash: Number(editForm.initialCash) || 0,
          initialPettyCash: Number(editForm.initialPettyCash) || 0,
          actualCash: editForm.actualCash === "" ? null : Number(editForm.actualCash),
          actualPettyCash: editForm.actualPettyCash === "" ? null : Number(editForm.actualPettyCash),
          declaredRevenue: editForm.declaredRevenue === "" ? null : Number(editForm.declaredRevenue),
          openImbalanceReason: editForm.openImbalanceReason,
          closingNotes: editForm.closingNotes,
          reportText: editForm.reportText,
        }),
      });
      showToast("success", res.message || "Laporan diperbarui");
      closeEdit();
      await load();
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  };

  const copyReport = async (shift) => {
    if (!shift.reportText) return;
    try {
      await navigator.clipboard.writeText(shift.reportText);
      setCopiedId(shift.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast("error", "Gagal menyalin teks laporan");
    }
  };

  return (
    <div className="min-w-0 w-full max-w-full space-y-4 overflow-x-hidden p-3 sm:space-y-5 sm:p-6 lg:p-8 2xl:px-12">
      <PageHero className="!flex-col !items-stretch gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 sm:h-11 sm:w-11">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight tracking-tight sm:text-xl md:text-2xl">Daily Report Shift</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-pink-100/90 sm:text-xs md:text-sm">
                Pantau & koreksi saldo yang dilaporkan frontliner di POS My Waschen
              </p>
            </div>
          </div>
        </div>
      </PageHero>

      <section className={FILTER_SECTION}>
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">Filter Tanggal & Data</h2>
            <p className="text-[11px] text-slate-500 sm:text-xs">Filter diterapkan otomatis saat pilihan diubah.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={FILTER_LABEL}>Tanggal</label>
              <input
                type="date"
                value={date}
                max={wibToday()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-[#5f1340]/40"
              />
            </div>
            <div>
              <label className={FILTER_LABEL}>Outlet</label>
              <MultiSelect options={outletOptions} value={outletIds} onChange={setOutletIds} allLabel="Semua Outlet" unitLabel="outlet" />
            </div>
            <div>
              <label className={FILTER_LABEL}>Karyawan</label>
              <MultiSelect options={employeeOptions} value={employeeIds} onChange={setEmployeeIds} allLabel="Semua Karyawan" unitLabel="karyawan" />
            </div>
          </div>
          <div className="relative w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari outlet, karyawan, no nota, customer..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <FilterScroll className="flex-1">
              {SHIFT_FILTERS.map(([k, label]) => (
                <FilterPill key={k} active={shiftFilter === k} onClick={() => setShiftFilter(k)}>{label}</FilterPill>
              ))}
              {attentionCount > 0 && (
                <FilterPill active={onlyAttention} onClick={() => setOnlyAttention((v) => !v)}>
                  Perlu perhatian ({attentionCount})
                </FilterPill>
              )}
              {pendingDepositCount > 0 && (
                <FilterPill active={onlyPendingDeposit} onClick={() => setOnlyPendingDeposit((v) => !v)}>
                  {pendingDepositCount} belum setoran{lateDepositCount > 0 ? ` (${lateDepositCount} terlambat)` : ""}
                </FilterPill>
              )}
            </FilterScroll>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <ExportExcelButton onClick={handleExport} loading={exporting} disabled={loading || visibleShifts.length === 0} className="py-2" />
              <button type="button" onClick={() => load()} title="Muat ulang" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-400">
          Memuat laporan shift...
        </div>
      ) : (
        <>
          {/* Ringkasan: jawab dulu "hari ini aman atau tidak" */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Kpi
              label="Shift"
              value={summary.total}
              hint={`${summary.open} berjalan · ${summary.closed} ditutup`}
            />
            <Kpi
              label="Uang masuk"
              value={fmtIDR(summary.income)}
              hint={`dari ${summary.notaCount} nota dibayar`}
              tone="emerald"
            />
            <Kpi
              label="Selisih kas"
              value={summary.diffShifts === 0 ? "Aman" : `${summary.diffTotal > 0 ? "+" : summary.diffTotal < 0 ? "−" : ""}${fmtIDR(Math.abs(summary.diffTotal))}`}
              hint={summary.diffShifts === 0 ? "Semua shift tutup sesuai" : `${summary.diffShifts} shift tidak pas`}
              tone={summary.diffShifts === 0 ? "slate" : "rose"}
            />
            <Kpi
              label="Perlu perhatian"
              value={summary.attention}
              hint={summary.attention === 0 ? "Tidak ada yang tertunda" : "selisih, setoran, atau nota belum dicek"}
              tone={summary.attention === 0 ? "slate" : "amber"}
              onClick={attentionCount > 0 ? () => setOnlyAttention((v) => !v) : undefined}
              active={onlyAttention}
            />
          </div>

          {visibleShifts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400">
              <HiOutlineBuildingStorefront className="mx-auto mb-2 h-9 w-9 opacity-50" />
              <p className="text-sm font-bold text-slate-500">Tidak ada shift yang sesuai</p>
              <p className="mt-1 text-xs">Coba ganti tanggal atau longgarkan filter di atas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Kontrol daftar */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-500">
                  {groupsWithShift.length} outlet · {visibleShifts.length} shift
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {emptyGroups > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowEmpty((v) => !v)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
                    >
                      {showEmpty ? "Sembunyikan" : "Tampilkan"} {emptyGroups} outlet tanpa shift
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenOutlets(allOpen ? new Set() : new Set(groupsWithShift.map((g) => String(g.id))))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5f1340] hover:bg-[#5f1340]/5"
                  >
                    {allOpen ? "Tutup semua" : "Buka semua"}
                  </button>
                </div>
              </div>

              {shownGroups.map((g) => {
                const key = String(g.id);
                const open = openOutlets.has(key);
                const has = g.shifts.length > 0;
                return (
                  <div key={key} className="min-w-0">
                    <button
                      type="button"
                      disabled={!has}
                      onClick={() => toggleOutlet(key)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                        has ? "border-[#5f1340]/20 bg-white hover:bg-[#5f1340]/5" : "cursor-default border-slate-200 bg-slate-50 opacity-70",
                        open && "border-[#5f1340]/40 bg-[#5f1340]/[0.03]",
                      )}
                    >
                      <span className="min-w-0 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-slate-800">{g.name}</span>
                          {has ? (
                            <Badge tone="slate">{g.shifts.length} shift</Badge>
                          ) : (
                            <Badge tone="slate">Belum open shift</Badge>
                          )}
                          {g.issueCount > 0 && <Badge tone="amber">{g.issueCount} perlu perhatian</Badge>}
                        </span>
                        {has && (
                          <span className="block truncate text-[11px] font-medium text-slate-500">
                            {g.shifts.map((s) => `${shiftLabel(s.shiftNumber)}: ${fmtEmployeeName(s.openerName)} · ${fmtTime(s.openedAt)}${s.status === "Closed" ? " (tutup)" : ""}`).join("   |   ")}
                          </span>
                        )}
                      </span>
                      {has && (
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-right">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Uang masuk</span>
                            <span className="block text-sm font-black text-emerald-700">{fmtIDR(g.income)}</span>
                          </span>
                          <HiOutlineChevronDown className={cn("h-4 w-4 text-[#5f1340] transition-transform", open && "rotate-180")} />
                        </span>
                      )}
                    </button>
                    {open && has && (
                      <div className="mt-3 space-y-4">
                        {g.shifts.map((s) => (
                          <ShiftCard key={s.id} s={s} copied={copiedId === s.id} onCopy={() => copyReport(s)} onEdit={() => openEdit(s)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {editRow && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={closeEdit} aria-label="Tutup" />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#5f1340]">Koreksi Saldo Shift {editRow.id}</h3>
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-500">
                  {editRow.outletFullName || editRow.outletName} · Shift {shiftLabel(editRow.shiftNumber)} · {fmtDateTime(editRow.openedAt)}
                </p>
              </div>
              <button type="button" onClick={closeEdit} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Cash Modal Open" value={editForm.initialCash} onChange={(v) => setEditForm((f) => ({ ...f, initialCash: v }))} />
                <Field label="Petty Open" value={editForm.initialPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, initialPettyCash: v }))} />
                <Field label="Cash Aktual Close" value={editForm.actualCash} onChange={(v) => setEditForm((f) => ({ ...f, actualCash: v }))} />
                <Field label="Petty Aktual Close" value={editForm.actualPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, actualPettyCash: v }))} />
                <Field label="Revenue" value={editForm.declaredRevenue} onChange={(v) => setEditForm((f) => ({ ...f, declaredRevenue: v }))} className="sm:col-span-2" />
              </div>

              <TextArea label="Alasan Imbalance Open" value={editForm.openImbalanceReason} onChange={(v) => setEditForm((f) => ({ ...f, openImbalanceReason: v }))} />
              <TextArea label="Catatan Closing" value={editForm.closingNotes} onChange={(v) => setEditForm((f) => ({ ...f, closingNotes: v }))} />
              <TextArea label="Report Text" value={editForm.reportText} onChange={(v) => setEditForm((f) => ({ ...f, reportText: v }))} rows={8} mono />

              <div className="sticky bottom-0 flex flex-col-reverse gap-2 bg-white pb-1 pt-2 sm:flex-row">
                <button type="button" onClick={closeEdit} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Batal
                </button>
                <button type="button" onClick={saveEdit} disabled={saving} className="flex-1 rounded-xl bg-[#5f1340] px-4 py-2.5 text-sm font-black text-white hover:bg-[#4a0d31] disabled:opacity-60">
                  {saving ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {toast && createPortal(
        <div className={cn(
          "fixed z-[300] rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg",
          "bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm",
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600",
        )}>
          {toast.message}
        </div>,
        document.body,
      )}
    </div>
  );
}

function Field({ label, value, onChange, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-[#5f1340]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, mono = false }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#5f1340]",
          mono && "font-mono text-xs",
        )}
      />
    </label>
  );
}
