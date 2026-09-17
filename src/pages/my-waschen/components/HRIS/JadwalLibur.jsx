import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineArrowPath,
  HiOutlineSun,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlinePlus,
  HiOutlineExclamationTriangle,
  HiOutlineMagnifyingGlass,
  HiOutlineClock,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPathRoundedSquare,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import HrisOutletRoleFilter from "../HrisOutletRoleFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import useHrisOutletRoleFilters from "../../hooks/useHrisOutletRoleFilters";
import {
  PAGE_WRAP,
  SUMMARY_GRID,
  FILTER_SECTION,
  TABLE_SECTION,
  cn,
  fmtDateShort,
  dayOffStatusBadge,
  capitalizeStatus,
  fmtEmployeeName,
} from "../../utils/hrisUtils";
import { toDateInput } from "../../utils/cutoffPeriod";
import { FilterScroll, FilterPill } from "./hrisShared";
import DayOffCalendar from "./DayOffCalendar";

const STATUS_FILTERS = [
  { key: "Semua", label: "Semua" },
  { key: "pengajuan", label: "Pengajuan" },
  { key: "disetujui", label: "Disetujui" },
  { key: "ditolak", label: "Ditolak" },
];

const INPUT_CLS = "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-[#5f1340]/40";
const LABEL_CLS = "block text-[10px] font-bold uppercase tracking-wider text-slate-400";

export default function JadwalLibur() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate, selectedYear, selectedMonth } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters } = hrisFilters;

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pengajuan: 0, disetujui: 0, ditolak: 0 });
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pengajuan");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [rescheduleRow, setRescheduleRow] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [rejectRow, setRejectRow] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [pickedEmployees, setPickedEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api("/waschen/employees").then((r) => setEmployees(r.data || [])).catch(() => setEmployees([]));
  }, []);

  const shiftCutoffPeriod = useCallback((delta) => {
    if (cutoff.isCustomDate) return;
    let m = selectedMonth + delta;
    let y = selectedYear;
    if (m < 1) { m = 12; y -= 1; }
    else if (m > 12) { m = 1; y += 1; }
    cutoff.handleYearChange(y);
    cutoff.setSelectedMonth(m);
  }, [cutoff, selectedMonth, selectedYear]);

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      if (statusFilter !== "Semua") q.set("status", statusFilter);
      if (search.trim()) q.set("search", search.trim());
      const res = await api(`/waschen/hris/day-offs?${q}`);
      setRows(res.data || []);
      setSummary(res.summary || { total: 0, pengajuan: 0, disetujui: 0, ditolak: 0 });
    } catch (err) {
      showToast("error", err.message || "Gagal memuat jadwal libur");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, search, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const dayRows = useMemo(() => {
    if (!selectedDay) return [];
    return rows.filter((r) => r.off_date === selectedDay);
  }, [rows, selectedDay]);

  const takenEmployeeIds = useMemo(
    () => new Set(dayRows.map((r) => String(r.employee_id))),
    [dayRows],
  );

  const availableEmployees = useMemo(() => {
    const kw = empSearch.trim().toLowerCase();
    return employees.filter((e) => {
      if (takenEmployeeIds.has(String(e.employee_id))) return false;
      if (!kw) return true;
      return (
        e.full_name?.toLowerCase().includes(kw) ||
        e.employee_code?.toLowerCase().includes(kw)
      );
    });
  }, [employees, takenEmployeeIds, empSearch]);

  const openDay = (dateStr) => {
    setSelectedDay(dateStr);
    setPickedEmployees([]);
    setAssignReason("");
    setEmpSearch("");
  };

  const closeDay = () => {
    setSelectedDay(null);
    setPickedEmployees([]);
    setAssignReason("");
    setEmpSearch("");
  };

  const toggleEmployee = (id) => {
    const key = String(id);
    setPickedEmployees((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  const approve = async (id) => {
    setSubmitting(true);
    try {
      await api(`/waschen/hris/day-offs/${id}/approve`, { method: "PATCH" });
      showToast("success", "Jadwal libur disetujui");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!rejectRow) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/day-offs/${rejectRow.day_off_id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ rejection_note: rejectNote }),
      });
      showToast("success", "Permintaan libur ditolak");
      setRejectRow(null);
      setRejectNote("");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reschedule = async () => {
    if (!rescheduleRow || !newDate) return;
    setSubmitting(true);
    try {
      await api(`/waschen/hris/day-offs/${rescheduleRow.day_off_id}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ new_off_date: newDate }),
      });
      showToast("success", "Jadwal libur dipindahkan");
      setRescheduleRow(null);
      setNewDate("");
      load();
    } catch (err) {
      showToast("error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignSelected = async (e) => {
    e.preventDefault();
    if (!selectedDay || pickedEmployees.length === 0 || !assignReason.trim()) return;
    setSubmitting(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const empId of pickedEmployees) {
        try {
          await api("/waschen/hris/day-offs", {
            method: "POST",
            body: JSON.stringify({
              employee_id: Number(empId),
              off_date: selectedDay,
              reason: assignReason.trim(),
            }),
          });
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      if (ok > 0) {
        showToast("success", `${ok} karyawan ditetapkan libur`);
        setPickedEmployees([]);
        setAssignReason("");
        load();
      }
      if (fail > 0) showToast("error", `${fail} karyawan gagal ditetapkan (mungkin sudah ada jadwal)`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Jadwal Libur</h1>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm leading-6 text-white/75">
            Kalender libur karyawan — klik tanggal untuk tetapkan atau kelola permintaan
          </p>
        </div>
        <button
          type="button"
          onClick={() => openDay(toDateInput(new Date()))}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
        >
          <HiOutlinePlus className="h-4 w-4" />
          Tetapkan Libur
        </button>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          {toast.type === "error" ? <HiOutlineExclamationTriangle className="h-4 w-4" /> : <HiOutlineCheckCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <div className={SUMMARY_GRID.replace("lg:grid-cols-5", "lg:grid-cols-4")}>
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Periode</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700"><HiOutlineClock className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-wider">Menunggu</p></div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-800">{summary.pengajuan}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center gap-2 text-violet-700"><HiOutlineSun className="h-4 w-4" /><p className="text-[10px] font-bold uppercase tracking-wider">Disetujui</p></div>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-violet-800">{summary.disetujui}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Ditolak</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-800">{summary.ditolak}</p>
        </div>
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">Filter diterapkan otomatis saat pilihan diubah.</p>
          </div>
        </div>

        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} />
          <HrisOutletRoleFilter
            outlets={hrisFilters.outlets}
            outletId={hrisFilters.outletId}
            onOutletChange={hrisFilters.setOutletId}
            role={hrisFilters.role}
            onRoleChange={hrisFilters.setRole}
          />
          <div className="relative w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari karyawan, alasan..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <FilterScroll className="flex-1">
              {STATUS_FILTERS.map((f) => (
                <FilterPill key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>{f.label}</FilterPill>
              ))}
            </FilterScroll>
            <button type="button" onClick={load} className="shrink-0 self-end sm:self-auto rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      <section className={TABLE_SECTION}>
        <DayOffCalendar
          rows={rows}
          rangeFrom={startDate}
          rangeTo={endDate}
          cutoffMonth={selectedMonth}
          cutoffYear={selectedYear}
          periodLabel={cutoff.periodLabel}
          onPeriodChange={shiftCutoffPeriod}
          canNavigate={!cutoff.isCustomDate}
          onDayClick={openDay}
          loading={loading}
        />
      </section>

      {selectedDay && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4 backdrop-blur-sm" onClick={closeDay}>
          <div
            className="flex max-h-[92vh] w-full sm:max-w-lg flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-800">Jadwal Libur</h3>
                <p className="text-xs text-slate-500 mt-0.5">{fmtDateShort(selectedDay)}</p>
              </div>
              <button type="button" onClick={closeDay}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              <div>
                <p className={LABEL_CLS}>Karyawan libur ({dayRows.length})</p>
                {dayRows.length === 0 ? (
                  <p className="mt-2 text-slate-400 text-center py-4 rounded-xl border border-dashed border-slate-200">Belum ada karyawan libur</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {dayRows.map((r) => (
                      <li key={r.day_off_id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{fmtEmployeeName(r.employee_name)}</p>
                            {r.employee_code && <p className="text-[10px] text-slate-400">{r.employee_code}</p>}
                            {r.reason && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{r.reason}</p>}
                          </div>
                          <span className={cn("shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", dayOffStatusBadge(r.status))}>
                            {capitalizeStatus(r.status)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {r.status === "pengajuan" && (
                            <>
                              <button type="button" disabled={submitting} onClick={() => approve(r.day_off_id)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white disabled:opacity-50">Setujui</button>
                              <button type="button" disabled={submitting} onClick={() => setRejectRow(r)} className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-bold text-rose-600 disabled:opacity-50">Tolak</button>
                            </>
                          )}
                          {r.status === "disetujui" && (
                            <button type="button" onClick={() => { setRescheduleRow(r); setNewDate(r.off_date); }} className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1 text-[10px] font-bold text-violet-700">
                              <HiOutlineArrowPathRoundedSquare className="h-3.5 w-3.5" /> Pindah
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={assignSelected} className="border-t border-slate-100 pt-4 space-y-3">
                <p className={LABEL_CLS}>Tambah karyawan libur</p>
                <div className="relative">
                  <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    placeholder="Cari karyawan..."
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 outline-none focus:border-[#5f1340]/40"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {availableEmployees.length === 0 ? (
                    <p className="p-3 text-center text-slate-400">Tidak ada karyawan tersedia</p>
                  ) : (
                    availableEmployees.map((e) => {
                      const id = String(e.employee_id);
                      const checked = pickedEmployees.includes(id);
                      return (
                        <label key={id} className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50", checked && "bg-[#5f1340]/5")}>
                          <input type="checkbox" checked={checked} onChange={() => toggleEmployee(id)} className="rounded border-slate-300 text-[#5f1340] focus:ring-[#5f1340]/30" />
                          <span className="font-semibold text-slate-800">{fmtEmployeeName(e.full_name)}</span>
                          {e.employee_code && <span className="text-[10px] text-slate-400">{e.employee_code}</span>}
                        </label>
                      );
                    })
                  )}
                </div>
                {pickedEmployees.length > 0 && (
                  <p className="text-[10px] text-slate-500">{pickedEmployees.length} karyawan dipilih</p>
                )}
                <label className="block">
                  <span className={LABEL_CLS}>Alasan</span>
                  <textarea required value={assignReason} onChange={(e) => setAssignReason(e.target.value)} rows={2} placeholder="Alasan libur..." className={INPUT_CLS} />
                </label>
                <button
                  type="submit"
                  disabled={submitting || pickedEmployees.length === 0 || !assignReason.trim()}
                  className="w-full rounded-xl bg-[#5f1340] py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  Simpan {pickedEmployees.length > 0 ? `(${pickedEmployees.length})` : ""}
                </button>
              </form>
            </div>
          </div>
        </div>, document.body)}

      {rescheduleRow && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRescheduleRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Pindah Jadwal Libur</h3>
              <button type="button" onClick={() => setRescheduleRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong className="text-slate-800">{fmtEmployeeName(rescheduleRow.employee_name)}</strong></p>
              <label className="block">
                <span className={LABEL_CLS}>Tanggal Baru</span>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={INPUT_CLS} />
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRescheduleRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={reschedule} className="rounded-xl bg-[#5f1340] px-4 py-2 font-semibold text-white disabled:opacity-50">Simpan</button>
              </div>
            </div>
          </div>
        </div>, document.body)}

      {rejectRow && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setRejectRow(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 bg-slate-50/50">
              <h3 className="font-bold text-sm">Tolak Permintaan Libur</h3>
              <button type="button" onClick={() => setRejectRow(null)}><HiOutlineXMark className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">Karyawan: <strong className="text-slate-800">{fmtEmployeeName(rejectRow.employee_name)}</strong> · {fmtDateShort(rejectRow.off_date)}</p>
              <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder="Alasan penolakan..." className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#5f1340]" />
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setRejectRow(null)} className="rounded-xl border px-4 py-2 font-semibold text-slate-600">Batal</button>
                <button type="button" disabled={submitting} onClick={reject} className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Tolak</button>
              </div>
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
