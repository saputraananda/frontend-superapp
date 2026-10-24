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
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import { MultiSelect } from "../HrisOutletRoleFilter";
import { FilterScroll, FilterPill } from "../HRIS/hrisShared";
import { FILTER_SECTION } from "../../utils/hrisUtils";


import { fmtEmployeeName } from "../../utils/hrisUtils";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(v) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(v) || 0
  );
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ShiftTransactions({ shift }) {
  const [open, setOpen] = useState(false);
  const txns = shift.transactions;
  const done = txns.filter((t) => t.isVerified).length;
  const all = done === txns.length;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center gap-2 px-4 py-3 mb-2 rounded-xl border border-[#5f1340]/20 bg-[#5f1340]/5 hover:bg-[#5f1340]/10"
      >
        <span className="flex flex-wrap items-center gap-2 text-xs font-black text-[#5f1340]">
          Nota dibayar di shift ini
          <span className="px-2 py-0.5 rounded-full bg-[#5f1340] text-white text-[10px]">{txns.length} nota</span>
          <span className={cn("px-2 py-0.5 rounded-full text-[10px]", all ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800")}>
            {done}/{txns.length} diceklis
          </span>
        </span>
        <HiOutlineChevronDown className={cn("h-4 w-4 text-[#5f1340] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="overflow-auto max-h-80 border border-slate-200 rounded-xl">
          <table className="w-full min-w-[560px] text-xs">
            <thead className="sticky top-0">
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-400 font-extrabold">
                <th className="py-2 px-3 text-left">Jam</th>
                <th className="py-2 px-3 text-left">No Nota</th>
                <th className="py-2 px-3 text-left">Customer</th>
                <th className="py-2 px-3 text-left">Bayar</th>
                <th className="py-2 px-3 text-right">Nominal</th>
                <th className="py-2 px-3 text-center">Cek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {txns.map((v) => (
                <tr key={v.id} className={v.isVerified ? "bg-emerald-50/40" : ""}>
                  <td className="py-2 px-3">
                    {v.lastPaidAt ? new Date(v.lastPaidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </td>
                  <td className="py-2 px-3 font-mono text-[#5f1340]">{v.orderNo}</td>
                  <td className="py-2 px-3 max-w-[16rem]">
                    <p className="break-words">{v.customerName || "—"}</p>
                    {v.customerAddress ? (
                      <p className="mt-0.5 text-[10px] font-medium leading-snug text-slate-500 line-clamp-2 break-words" title={v.customerAddress}>
                        {v.customerAddress}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 px-3">{v.paymentStatus === "DP" ? "DP " : ""}{v.paymentMethod || "—"}</td>
                  <td className="py-2 px-3 text-right">{fmtIDR(v.paidHere)}</td>
                  <td className="py-2 px-3 text-center">
                    {v.isVerified ? <HiOutlineCheck className="h-4 w-4 text-emerald-600 inline" title={fmtDateTime(v.verifiedAt)} /> : <span className="text-slate-300">—</span>}
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
const FILTER_LABEL = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1";
const SHIFT_FILTERS = [["all", "Semua Shift"], ["1", "Pagi"], ["2", "Siang"]];

function wibToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function fmtTime(v) {
  return v ? new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—";
}

function shiftLabel(sn) {
  return Number(sn) === 2 ? "Siang" : "Pagi";
}

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

export default function DailyReport() {
  const [date, setDate] = useState(wibToday);
  const [outletIds, setOutletIds] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [search, setSearch] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [onlyPendingDeposit, setOnlyPendingDeposit] = useState(false);
  const [openOutlet, setOpenOutlet] = useState(null);
  const [outlets, setOutlets] = useState([]);

  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);


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
    if (!silent) setLoading(true);
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
    [outlets]
  );

  const visibleShifts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shifts.filter((s) => {
      if (onlyPendingDeposit && s.deposit?.status !== "pending") return false;
      if (shiftFilter !== "all" && String(s.shiftNumber) !== shiftFilter) return false;
      if (employeeIds.length && !employeeIds.some((id) => [s.cashierEmployeeId, s.closedByEmployeeId].map(String).includes(id))) return false;
      if (!q) return true;
      const hay = [s.outletFullName, s.outletName, s.openerName, s.closedByName,
        ...(s.transactions || []).flatMap((t) => [t.orderNo, t.customerName])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [shifts, onlyPendingDeposit, shiftFilter, employeeIds, search]);

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
        income: g.shifts.reduce((a, s) => a + (s.transactions || []).reduce((b, t) => b + (t.paidHere || 0), 0), 0),
      }))
      .sort((a, b) => b.shifts.length - a.shifts.length || String(a.name).localeCompare(String(b.name)));
  }, [outlets, visibleShifts, outletIds]);
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
    <div className="min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
      <PageHero className="!flex-col !items-stretch gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/20">
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight">
                Daily Report Shift
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-pink-100/90 mt-1 leading-relaxed">
                Pantau & koreksi saldo yang dilaporkan frontliner di POS My Waschen
              </p>
            </div>
          </div>
        </div>
      </PageHero>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Tanggal & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <label className={FILTER_LABEL}>Tanggal</label>
              <input
                type="date"
                value={date}
                max={wibToday()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-[#5f1340]/40"
              />
            </div>
            <div>
              <label className={FILTER_LABEL}>Outlet</label>
              <MultiSelect
                options={outletOptions}
                value={outletIds}
                onChange={setOutletIds}
                allLabel="Semua Outlet"
                unitLabel="outlet"
              />
            </div>
            <div>
              <label className={FILTER_LABEL}>Karyawan</label>
              <MultiSelect
                options={employeeOptions}
                value={employeeIds}
                onChange={setEmployeeIds}
                allLabel="Semua Karyawan"
                unitLabel="karyawan"
              />
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <FilterScroll className="flex-1">
              {SHIFT_FILTERS.map(([k, label]) => (
                <FilterPill key={k} active={shiftFilter === k} onClick={() => setShiftFilter(k)}>{label}</FilterPill>
              ))}
              {pendingDepositCount > 0 && (
                <FilterPill active={onlyPendingDeposit} onClick={() => setOnlyPendingDeposit((v) => !v)}>
                  {pendingDepositCount} belum setoran{lateDepositCount > 0 ? ` (${lateDepositCount} terlambat)` : ""}
                </FilterPill>
              )}
            </FilterScroll>
            <button type="button" onClick={() => load()} className="shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-sm font-bold">
          Memuat laporan shift...
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, idx) => {
            const open = openOutlet === String(g.id);
            const has = g.shifts.length > 0;
            return (
              <div key={g.id} className="min-w-0">
                <button
                  type="button"
                  disabled={!has}
                  onClick={() => setOpenOutlet(open ? null : String(g.id))}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl border text-left transition",
                    has ? "bg-white border-[#5f1340]/20 hover:bg-[#5f1340]/5" : "bg-slate-50 border-slate-200 opacity-70 cursor-default"
                  )}
                >
                  <span className="flex flex-wrap items-center gap-1.5 text-xs font-black min-w-0">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[11px]">{idx + 1}</span>
                    <span className="px-2.5 py-1 rounded-full bg-[#5f1340] text-white">{g.name}</span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">{fmtIDR(g.income)}</span>
                    {has ? g.shifts.map((s) => (
                      <span key={s.id} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                        {shiftLabel(s.shiftNumber)}: {fmtEmployeeName(s.openerName)} · {fmtTime(s.openedAt)}
                        {s.status === "Closed" ? " (tutup)" : ""}
                      </span>
                    )) : <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold">Belum open shift</span>}
                  </span>
                  {has && <HiOutlineChevronDown className={cn("h-4 w-4 shrink-0 text-[#5f1340] transition-transform", open && "rotate-180")} />}
                </button>
                {open && (
                  <div className="space-y-4 mt-3">
                    {g.shifts.map((s) => (          <div key={s.id} className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-4 min-w-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between border-b border-slate-100 pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm sm:text-base font-black text-[#5f1340] leading-snug break-words">
                  {s.outletFullName || s.outletName || `Outlet #${s.outletId}`}
                  <span className="text-slate-500 font-bold"> · </span>
                  Shift {shiftLabel(s.shiftNumber)}
                  <span className="text-slate-500 font-bold"> · </span>
                  {s.id}
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5 leading-relaxed break-words">
                  Status <strong>{s.status}</strong>
                  {s.closeType ? ` · ${s.closeType}` : ""}
                  {" · "}Buka {fmtDateTime(s.openedAt)}
                  {s.closedAt ? ` · Tutup ${fmtDateTime(s.closedAt)}` : ""}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed break-words">
                  Dibuka <strong>{fmtEmployeeName(s.openerName)}</strong>
                  {s.closedByName ? <> · Ditutup <strong>{fmtEmployeeName(s.closedByName)}</strong></> : null}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto shrink-0">
                {s.reportText && (
                  <button
                    type="button"
                    onClick={() => copyReport(s)}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#5f1340]/10 text-[#5f1340] text-[11px] font-black"
                  >
                    <HiOutlineDocumentDuplicate className="h-3.5 w-3.5 shrink-0" />
                    {copiedId === s.id ? "Tersalin" : "Salin Report"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-black hover:bg-amber-100"
                >
                  <HiOutlinePencilSquare className="h-3.5 w-3.5 shrink-0" />
                  Edit Saldo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <StatCard label="Cash Modal Open" value={fmtIDR(s.initialCash)} />
              <StatCard label="Petty Open" value={fmtIDR(s.initialPettyCash)} />
              <StatCard label="Cash Aktual Close" value={s.actualCash != null ? fmtIDR(s.actualCash) : "—"} highlight />
              <StatCard label="Revenue" value={s.declaredRevenue != null ? fmtIDR(s.declaredRevenue) : "—"} accent />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
              <StatCard label="Expected Cash" value={fmtIDR(s.expectedCash)} muted />
              <StatCard label="Selisih (Diff)" value={fmtIDR(s.difference)} muted />
              <StatCard label="Petty Aktual Close" value={s.actualPettyCash != null ? fmtIDR(s.actualPettyCash) : "—"} muted />
              <StatCard label="System Revenue" value={fmtIDR(s.systemCashRevenue)} muted />
            </div>

            {s.openImbalanceReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                <strong>Alasan imbalance open:</strong> {s.openImbalanceReason}
              </div>
            )}

            {s.closingNotes && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700">
                <strong>Catatan closing:</strong> {s.closingNotes}
              </div>
            )}

            {s.deposit && <DepositSection deposit={s.deposit} />}

            {s.transactions?.length > 0 && <ShiftTransactions shift={s} />}

            {s.reportText && (
              <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-2xl p-4 whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
                {s.reportText}
              </pre>
            )}
          </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editRow && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={closeEdit} aria-label="Tutup" />
          <div className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-4 sm:px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#5f1340]">Koreksi Saldo Shift {editRow.id}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">
                  {editRow.outletFullName || editRow.outletName} · Shift {shiftLabel(editRow.shiftNumber)} · {fmtDateTime(editRow.openedAt)}
                </p>
              </div>
              <button type="button" onClick={closeEdit} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Cash Modal Open" value={editForm.initialCash} onChange={(v) => setEditForm((f) => ({ ...f, initialCash: v }))} />
                <Field label="Petty Open" value={editForm.initialPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, initialPettyCash: v }))} />
                <Field label="Cash Aktual Close" value={editForm.actualCash} onChange={(v) => setEditForm((f) => ({ ...f, actualCash: v }))} />
                <Field label="Petty Aktual Close" value={editForm.actualPettyCash} onChange={(v) => setEditForm((f) => ({ ...f, actualPettyCash: v }))} />
                <Field label="Revenue" value={editForm.declaredRevenue} onChange={(v) => setEditForm((f) => ({ ...f, declaredRevenue: v }))} className="sm:col-span-2" />
              </div>

              <TextArea label="Alasan Imbalance Open" value={editForm.openImbalanceReason} onChange={(v) => setEditForm((f) => ({ ...f, openImbalanceReason: v }))} />
              <TextArea label="Catatan Closing" value={editForm.closingNotes} onChange={(v) => setEditForm((f) => ({ ...f, closingNotes: v }))} />
              <TextArea label="Report Text" value={editForm.reportText} onChange={(v) => setEditForm((f) => ({ ...f, reportText: v }))} rows={8} mono />

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#5f1340] text-white text-sm font-black hover:bg-[#4a0d31] disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Koreksi"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div className={cn(
          "fixed z-[300] px-4 py-3 rounded-2xl shadow-lg text-sm font-bold text-white",
          "bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm",
          toast.type === "error" ? "bg-rose-600" : "bg-emerald-600"
        )}>
          {toast.message}
        </div>,
        document.body
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
        "p-3 rounded-xl border text-[11px] space-y-1.5",
        !uploaded && deposit.isLate ? "bg-rose-50 border-rose-200" : uploaded ? "bg-emerald-50/50 border-emerald-200" : "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <HiOutlineBanknotes className="h-3.5 w-3.5" /> Setoran Tunai
        </span>
        <span
          className={cn(
            "rounded-lg px-2 py-0.5 text-[10px] font-black",
            uploaded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
          )}
        >
          {uploaded ? "Sudah diupload" : "Belum diupload"}
        </span>
        {deposit.isLate && (
          <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
            Terlambat {deposit.lateDays} hari
          </span>
        )}
      </div>
      {uploaded && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
          <span>
            Oleh <strong>{fmtEmployeeName(deposit.uploadedByName)}</strong> · {fmtDateTime(deposit.uploadedAt)}
          </span>
          {deposit.proofUrl && (
            <a
              href={deposit.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-black text-[#5f1340] underline"
            >
              Lihat Bukti
            </a>
          )}
          {deposit.notes && <span className="text-slate-600">Catatan: {deposit.notes}</span>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, highlight, muted }) {
  return (
    <div className={cn(
      "p-3 rounded-xl border min-w-0",
      accent ? "bg-[#5f1340]/5 border-[#5f1340]/20" : muted ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200",
      highlight && "ring-1 ring-[#5f1340]/20"
    )}>
      <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase block leading-tight">{label}</span>
      <span className={cn(
        "font-black block mt-1 text-sm sm:text-base leading-tight break-words",
        accent ? "text-[#5f1340]" : "text-slate-800"
      )}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, value, onChange, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold outline-none focus:border-[#5f1340]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, mono = false }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#5f1340] resize-y",
          mono && "font-mono text-xs"
        )}
      />
    </label>
  );
}
