import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineChevronRight,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineMagnifyingGlass,
  HiOutlineMapPin,
  HiOutlineTableCells,
  HiOutlineUserGroup,
  HiOutlineXMark,
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
  fmtEmployeeName,
  fmtIDR,
  useSort,
  leaveStatusBadge,
  leaveTypeBadge,
  kasbonStatusBadge,
  capitalizeStatus,
  dayOffStatusLabel,
  dayOffStatusBadge,
} from "../../utils/hrisUtils";
import { SortTh, MobileSkeleton, ExportExcelButton } from "./hrisShared";

/**
 * Payroll Waschen — rekap per karyawan per periode cutoff (26–25):
 * hadir, off, durasi kerja, lokasi, backup, lembur, perizinan, terlambat, kasbon, pinjaman.
 * Klik karyawan → modal detail (absensi harian, lembur, perizinan & libur, kasbon & pinjaman,
 * backup & lokasi) + export Excel per karyawan.
 */

const DAY_UI = {
  hadir: { label: "Hadir", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  off: { label: "Libur", cls: "border-sky-200 bg-sky-50 text-sky-700", row: "bg-sky-50/40" },
  izin: { label: "Izin", cls: "border-amber-200 bg-amber-50 text-amber-800", row: "bg-amber-50/40" },
  sakit: { label: "Sakit", cls: "border-rose-200 bg-rose-50 text-rose-700", row: "bg-rose-50/30" },
  cuti: { label: "Cuti", cls: "border-violet-200 bg-violet-50 text-violet-700", row: "bg-violet-50/30" },
  tanpa_keterangan: { label: "Tanpa Ket.", cls: "border-orange-200 bg-orange-50 text-orange-700", row: "bg-orange-50/40" },
  belum_berjalan: { label: "Belum berjalan", cls: "border-slate-200 bg-white text-slate-400", row: "text-slate-400" },
  belum_bergabung: { label: "Belum bergabung", cls: "border-slate-200 bg-slate-50 text-slate-400", row: "text-slate-400" },
  sudah_keluar: { label: "Sudah keluar", cls: "border-slate-200 bg-slate-50 text-slate-400", row: "text-slate-400" },
};

const LEAVE_LABEL = { izin: "Izin", sakit: "Sakit", cuti: "Cuti" };
const LEAVE_DURATION = { full_day: "Full day", half_day_morning: "½ hari pagi", half_day_afternoon: "½ hari sore" };
const PAY_METHOD = { potong_gaji: "Potong gaji", langsung: "Bayar langsung" };

/** Menit → "152j 30m" */
function fmtDur(min) {
  const m = Math.round(Number(min) || 0);
  if (m <= 0) return "0j";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? (r ? `${h}j ${r}m` : `${h}j`) : `${r}m`;
}
const fmtDays = (n) => (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });
const placeLabel = (p) => (p ? (p.code ? `${p.code} · ${p.name}` : p.name) : "—");
const dayName = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short" });

// Kunci scroll halaman (body + konten My Waschen) selama modal terbuka
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const els = [document.body, document.getElementById("mw-content")].filter(Boolean);
    const saved = els.map((el) => el.style.overflow);
    els.forEach((el) => { el.style.overflow = "hidden"; });
    return () => els.forEach((el, i) => { el.style.overflow = saved[i]; });
  }, [active]);
}

/* ───────────────────────── sel tabel rekap ───────────────────────── */

function Sub({ children, tone = "slate" }) {
  const cls = {
    slate: "text-slate-400",
    orange: "text-orange-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
    sky: "text-sky-600",
  }[tone];
  return <p className={cn("mt-0.5 text-[10px] font-semibold leading-tight", cls)}>{children}</p>;
}

function LeaveChips({ leave }) {
  const items = ["izin", "sakit", "cuti"].filter((k) => leave[k] > 0);
  if (!items.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((k) => (
        <span key={k} className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold", leaveTypeBadge(k))}>
          {LEAVE_LABEL[k]} {fmtDays(leave[k])}
        </span>
      ))}
    </div>
  );
}

function LocationChips({ row }) {
  if (!row.locations.length) return <span className="text-slate-300">—</span>;
  const shown = row.locations.slice(0, 2);
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {shown.map((l) => (
          <span key={l.id ?? l.name} title={`${placeLabel(l)} · ${l.count}x`}
            className={cn("inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-bold",
              l.is_home ? "border-slate-200 bg-slate-50 text-slate-700" : "border-sky-200 bg-sky-50 text-sky-700")}>
            {l.code || l.name} {l.count}
          </span>
        ))}
        {row.locations.length > 2 && <span className="text-[10px] font-semibold text-slate-400">+{row.locations.length - 2}</span>}
      </div>
      {row.outside_home > 0 && <Sub tone="sky">{row.outside_home}x di luar outlet asal</Sub>}
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, tone = "slate" }) {
  const t = {
    slate: "border-slate-200 bg-white text-slate-800",
    emerald: "border-emerald-200 bg-emerald-50/50 text-emerald-800",
    sky: "border-sky-200 bg-sky-50/50 text-sky-800",
    rose: "border-rose-200 bg-rose-50/50 text-rose-800",
    brand: "border-[#5f1340]/20 bg-[#5f1340]/5 text-[#5f1340]",
  }[tone];
  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 shadow-sm", t)}>
      <div className="flex items-center gap-1.5 opacity-80">
        {Icon && <Icon className="h-4 w-4" />}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] font-semibold opacity-70">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── modal detail ───────────────────────── */

const TABS = [
  { id: "harian", label: "Absensi Harian" },
  { id: "lembur", label: "Lembur" },
  { id: "izin", label: "Perizinan & Libur" },
  { id: "kasbon", label: "Kasbon & Pinjaman" },
  { id: "backup", label: "Backup & Lokasi" },
];

function Stat({ label, value, sub, tone }) {
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", tone || "border-slate-200 bg-white")}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-800 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] font-semibold text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ children }) {
  return <p className="py-10 text-center text-xs font-semibold text-slate-400">{children}</p>;
}

function DailyTab({ d }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2">Tanggal</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-center">Masuk</th>
            <th className="px-3 py-2 text-center">Pulang</th>
            <th className="px-3 py-2 text-center">Durasi</th>
            <th className="px-3 py-2 text-center">Terlambat</th>
            <th className="px-3 py-2">Lokasi</th>
            <th className="px-3 py-2 text-center">Lembur</th>
            <th className="px-3 py-2">Keterangan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {d.days.map((x) => {
            const ui = DAY_UI[x.status] || DAY_UI.belum_berjalan;
            const notes = [
              x.backup_for.length ? `Backup untuk ${x.backup_for.map((n) => fmtEmployeeName(n)).join(", ")}` : "",
              x.half_day_leave ? `${LEAVE_LABEL[x.half_day_leave]} ½ hari` : "",
              x.late_excused ? "Masuk siang (izin ½ hari pagi), tidak dihitung terlambat" : "",
              x.off_but_present ? "Masuk di hari libur" : "",
              x.no_checkout ? "Belum check-out" : "",
              x.note || "",
            ].filter(Boolean);
            return (
              <tr key={x.date} className={ui.row}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold text-slate-700">{fmtDateShort(x.date)}</span>
                  <span className="ml-1.5 text-[10px] text-slate-400">{dayName(x.date)}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", ui.cls)}>{ui.label}</span>
                </td>
                <td className="px-3 py-2 text-center font-semibold text-slate-700">{x.check_in || "—"}</td>
                <td className={cn("px-3 py-2 text-center font-semibold", x.no_checkout ? "text-amber-600" : "text-slate-700")}>
                  {x.check_out || (x.no_checkout ? "Belum" : "—")}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">{x.work_minutes ? fmtDur(x.work_minutes) : "—"}</td>
                <td className="px-3 py-2 text-center">
                  {x.late_minutes > 0
                    ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">+{fmtDur(x.late_minutes)}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2">
                  {x.location ? (
                    <span className={cn("text-slate-600", x.outside_home && "font-semibold text-sky-700")}>
                      {placeLabel(x.location)}
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center text-slate-600">{x.overtime_minutes ? fmtDur(x.overtime_minutes) : "—"}</td>
                <td className="px-3 py-2 text-[11px] text-slate-500">{notes.join(" · ") || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OvertimeTab({ d }) {
  if (!d.overtime_list.length) return <Empty>Tidak ada lembur di periode ini</Empty>;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-3 py-2">Tanggal</th>
            <th className="px-3 py-2 text-center">Jam</th>
            <th className="px-3 py-2 text-center">Durasi</th>
            <th className="px-3 py-2">Lokasi</th>
            <th className="px-3 py-2">Alasan / Catatan</th>
            <th className="px-3 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {d.overtime_list.map((o) => (
            <tr key={o.id}>
              <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-700">
                {fmtDateShort(o.date)} <span className="ml-1 text-[10px] font-normal text-slate-400">{dayName(o.date)}</span>
              </td>
              <td className="px-3 py-2 text-center text-slate-600">{o.start || "—"}–{o.end || (o.status === "berlangsung" ? "aktif" : "—")}</td>
              <td className="px-3 py-2 text-center font-semibold text-slate-700">{o.minutes ? fmtDur(o.minutes) : "—"}</td>
              <td className="px-3 py-2 text-slate-600">{o.location ? placeLabel(o.location) : "—"}</td>
              <td className="max-w-xs px-3 py-2">
                <p className="text-slate-700">{o.reason || "—"}</p>
                {(o.work_note || o.review_note) && (
                  <p className="mt-0.5 text-[10px] text-slate-400">{[o.work_note, o.review_note && `Review: ${o.review_note}`].filter(Boolean).join(" · ")}</p>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", leaveStatusBadge(o.status))}>{capitalizeStatus(o.status)}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700">
          <tr>
            <td className="px-3 py-2" colSpan={2}>Total disetujui</td>
            <td className="px-3 py-2 text-center">{fmtDur(d.overtime.approved_minutes)}</td>
            <td className="px-3 py-2" colSpan={3}>{d.overtime.approved_count} kali</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function LeaveTab({ d }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-bold text-slate-700">Izin / Sakit / Cuti</h4>
        {!d.leave_list.length ? <Empty>Tidak ada perizinan di periode ini</Empty> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Jenis</th>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2 text-center">Hari di Periode</th>
                  <th className="px-3 py-2">Alasan</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.leave_list.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", leaveTypeBadge(l.type))}>{LEAVE_LABEL[l.type] || l.type}</span>
                      <p className="mt-0.5 text-[10px] text-slate-400">{LEAVE_DURATION[l.duration_type] || l.duration_type}</p>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {fmtDateShort(l.start_date)}{l.end_date !== l.start_date && <> – {fmtDateShort(l.end_date)}</>}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-700">{fmtDays(l.days_in_period)}</td>
                    <td className="max-w-xs px-3 py-2 text-slate-600">
                      {l.reason || "—"}
                      {l.rejection_note && <p className="mt-0.5 text-[10px] text-rose-500">Ditolak: {l.rejection_note}</p>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", leaveStatusBadge(l.status))}>{capitalizeStatus(l.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-bold text-slate-700">Jadwal Libur (Off)</h4>
        {!d.off_list.length ? <Empty>Tidak ada jadwal libur di periode ini</Empty> : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Tanggal</th>
                  <th className="px-3 py-2">Alasan</th>
                  <th className="px-3 py-2">Digantikan Oleh</th>
                  <th className="px-3 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d.off_list.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-700">
                      {fmtDateShort(o.date)} <span className="ml-1 text-[10px] font-normal text-slate-400">{dayName(o.date)}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{o.reason || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{o.backup_name ? fmtEmployeeName(o.backup_name) : "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", dayOffStatusBadge(o.status))}>{dayOffStatusLabel(o.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanCard({ k }) {
  const isLoan = k.type === "pinjaman";
  const direct = k.payment_method === "langsung";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800">
            {isLoan ? "Pinjaman" : "Kasbon"} · {fmtIDR(k.amount_approved || k.amount_requested)}
            {isLoan && <span className="ml-1.5 font-semibold text-slate-400">({k.tenor_count}x cicilan {fmtIDR(k.installment_amount)})</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {[
              `Diajukan ${fmtDateShort(k.submission_date)}`,
              k.payment_method && PAY_METHOD[k.payment_method],
              k.purpose,
              k.is_opening_balance && "Saldo awal",
              k.approved_by_name && `Disetujui ${k.approved_by_name}`,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", kasbonStatusBadge(k.status))}>{capitalizeStatus(k.status)}</span>
      </div>
      {k.status === "disetujui" && (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div>
            <p className="text-slate-400">{direct ? "Bayar langsung periode ini" : "Potong gaji periode ini"}</p>
            <p className={cn("font-bold", direct ? "text-sky-700" : "text-[#5f1340]")}>{fmtIDR(direct ? k.direct : k.deduction)}</p>
            {k.deduction_arrears > 0 && <p className="text-[10px] font-semibold text-rose-600">termasuk tunggakan {fmtIDR(k.deduction_arrears)}</p>}
          </div>
          <div><p className="text-slate-400">Sudah dibayar</p><p className="font-bold text-emerald-700">{fmtIDR(k.total_paid)}</p></div>
          <div><p className="text-slate-400">Sisa</p><p className={cn("font-bold", k.remaining > 0 ? "text-rose-700" : "text-slate-700")}>{fmtIDR(k.remaining)}</p></div>
          <div><p className="text-slate-400">Termin dibebankan</p><p className="font-bold text-slate-700">{k.deduction_installments.length ? k.deduction_installments.map((n) => `#${n}`).join(", ") : k.legacy ? "Tanpa jadwal" : "—"}</p></div>
        </div>
      )}
      {k.legacy && (
        <p className="mt-1.5 text-[11px] font-semibold text-amber-700">Belum punya jadwal termin (data lama) — dibebankan ke periode ini.</p>
      )}
      {k.payments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {k.payments.map((p) => (
            <span key={p.id}
              title={[`Jatuh tempo ${fmtDateShort(p.due_date)}`, fmtIDR(p.amount), PAY_METHOD[p.method], p.recorded_by_name && `Dicatat ${p.recorded_by_name}`, p.notes].filter(Boolean).join(" · ")}
              className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                p.status === "terbayar" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : p.arrears ? "border-rose-200 bg-rose-50 text-rose-700"
                    : p.in_period ? "border-[#5f1340]/30 bg-[#5f1340]/5 text-[#5f1340]"
                      : "border-slate-200 bg-slate-50 text-slate-500")}>
              #{p.installment_no} · {fmtDateShort(p.due_date)} · {fmtIDR(p.amount)} ·{" "}
              {p.status === "terbayar" ? "lunas" : p.arrears ? "tunggakan" : p.in_period ? "periode ini" : "belum"}
            </span>
          ))}
        </div>
      )}
      {k.rejection_note && <p className="mt-1.5 text-[11px] text-rose-500">Ditolak: {k.rejection_note}</p>}
    </div>
  );
}

function LoanTab({ d }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Potongan Kasbon" value={fmtIDR(d.kasbon.deduction)}
          sub={d.kasbon.arrears ? `termasuk tunggakan ${fmtIDR(d.kasbon.arrears)}` : `${d.kasbon.count} kasbon diajukan di periode`} />
        <Stat label="Potongan Pinjaman" value={fmtIDR(d.pinjaman.deduction)}
          sub={d.pinjaman.arrears ? `termasuk tunggakan ${fmtIDR(d.pinjaman.arrears)}` : `${d.pinjaman.active} pinjaman aktif`} />
        <Stat label="Bayar Langsung" value={fmtIDR(d.direct_total)} sub="Tidak memotong gaji"
          tone="border-sky-200 bg-sky-50/50" />
        <Stat label="Total Potong Gaji" value={fmtIDR(d.deduction_total)} sub={`Sisa pinjaman ${fmtIDR(d.pinjaman.outstanding)}`}
          tone="border-[#5f1340]/20 bg-[#5f1340]/5" />
      </div>
      {(d.kasbon.pending > 0 || d.pinjaman.pending > 0) && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          Masih ada pengajuan menunggu persetujuan:
          {d.kasbon.pending > 0 && ` ${d.kasbon.pending} kasbon (${fmtIDR(d.kasbon.pending_amount)})`}
          {d.kasbon.pending > 0 && d.pinjaman.pending > 0 && " ·"}
          {d.pinjaman.pending > 0 && ` ${d.pinjaman.pending} pinjaman (${fmtIDR(d.pinjaman.pending_amount)})`}
          {" "}— belum masuk potongan.
        </p>
      )}
      {[["Kasbon", d.kasbon_list], ["Pinjaman", d.pinjaman_list]].map(([title, list]) => (
        <div key={title}>
          <h4 className="mb-2 text-xs font-bold text-slate-700">{title}</h4>
          {!list.length ? <Empty>Tidak ada {title.toLowerCase()} yang terkait periode ini</Empty> : (
            <div className="space-y-2">{list.map((k) => <LoanCard key={k.id} k={k} />)}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function BackupTab({ d }) {
  const max = Math.max(1, ...d.locations.map((l) => l.count));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div>
        <h4 className="mb-2 text-xs font-bold text-slate-700">Backup — Menggantikan Rekan Libur ({d.backup}x)</h4>
        {!d.backup_list.length ? <Empty>Tidak ada tugas backup di periode ini</Empty> : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {d.backup_list.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700">{fmtEmployeeName(b.replaced_name)}</p>
                  {b.reason && <p className="truncate text-[10px] text-slate-400">{b.reason}</p>}
                </div>
                <span className="shrink-0 text-slate-500">{fmtDateShort(b.date)} · {dayName(b.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-bold text-slate-700">Lokasi Absen</h4>
        {!d.locations.length ? <Empty>Belum ada absensi</Empty> : (
          <ul className="space-y-2.5 rounded-xl border border-slate-200 p-3">
            {d.locations.map((l) => (
              <li key={l.id ?? l.name}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    {placeLabel(l)}
                    {l.is_home && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">Outlet asal</span>}
                    {!l.is_outlet && <span className="ml-1.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">Non-outlet</span>}
                  </span>
                  <span className="font-bold tabular-nums text-slate-700">{l.count}x</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", l.is_home ? "bg-[#5f1340]" : "bg-sky-500")} style={{ width: `${(l.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PayrollDetailModal({ employee, startDate, endDate, periodLabel, onClose }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("harian");
  const [exporting, setExporting] = useState(false);

  useScrollLock(true);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ startDate, endDate });
    api(`/waschen/hris/payroll/${employee.employee_id}?${q}`)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .catch((err) => { if (!cancelled) setError(err.message || "Gagal memuat detail"); });
    return () => { cancelled = true; };
  }, [employee.employee_id, startDate, endDate]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportPayrollEmployeeExcel } = await import("./utils/payrollWaschen");
      exportPayrollEmployeeExcel({ detail, startDate, endDate, periodLabel });
    } catch (err) {
      setError(err.message || "Gagal export Excel");
    } finally {
      setExporting(false);
    }
  };

  const d = detail || employee;
  const counts = detail ? {
    lembur: detail.overtime_list.length,
    izin: detail.leave_list.length + detail.off_list.length,
    kasbon: detail.kasbon_list.length + detail.pinjaman_list.length,
    backup: detail.backup_list.length,
  } : {};

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-2 sm:p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="payroll-detail-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5f1340]">Detail Payroll · {periodLabel || `${fmtDateShort(startDate)} – ${fmtDateShort(endDate)}`}</p>
            <h3 id="payroll-detail-title" className="mt-0.5 text-lg font-bold text-slate-900">{fmtEmployeeName(d.employee_name)}</h3>
            <p className="text-xs text-slate-500">
              {[d.employee_code, d.role && `${d.role}${d.is_leader ? " (Leader)" : ""}`, d.home_outlet && `Outlet asal ${placeLabel(d.home_outlet)}`]
                .filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportExcelButton onClick={handleExport} loading={exporting} disabled={!detail} label="Export Karyawan Ini" />
            <button type="button" onClick={onClose} aria-label="Tutup"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Stat label="Hadir" value={`${d.hadir} hari`}
              sub={d.no_info_days ? `${d.no_info_days} hari tanpa keterangan` : "Lengkap"}
              tone={d.no_info_days ? "border-orange-200 bg-orange-50/50" : undefined} />
            <Stat label="Off" value={`${d.off} hari`} sub={d.off_pending ? `${d.off_pending} menunggu persetujuan` : `${d.backup}x jadi backup`} />
            <Stat label="Durasi Kerja" value={fmtDur(d.work_minutes)}
              sub={`Rata-rata ${fmtDur(d.avg_work_minutes)}/hari${d.incomplete_checkout ? ` · ${d.incomplete_checkout} belum check-out` : ""}`} />
            <Stat label="Terlambat" value={`${d.late.count}x`}
              sub={[
                d.late.count ? `Total ${fmtDur(d.late.minutes)} · terlama ${fmtDur(d.late.max)}` : "Tepat waktu",
                d.late.excused ? `${d.late.excused}x dikecualikan (izin ½ hari)` : "",
              ].filter(Boolean).join(" · ")}
              tone={d.late.count ? "border-rose-200 bg-rose-50/50" : undefined} />
            <Stat label="Lembur" value={fmtDur(d.overtime.approved_minutes)}
              sub={`${d.overtime.approved_count}x disetujui${d.overtime.pending_count ? ` · ${d.overtime.pending_count} menunggu` : ""}`} />
            <Stat label="Potong Gaji" value={fmtIDR(d.deduction_total)}
              sub={d.direct_total ? `+ bayar langsung ${fmtIDR(d.direct_total)}` : `Izin ${fmtDays(d.leave.izin)} · Sakit ${fmtDays(d.leave.sakit)} · Cuti ${fmtDays(d.leave.cuti)}`}
              tone="border-[#5f1340]/20 bg-[#5f1340]/5" />
          </div>

          {/* Tab */}
          <div className="-mx-1 overflow-x-auto">
            <div className="flex gap-1 px-1 border-b border-slate-200 min-w-max">
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id}
                  className={cn("-mb-px border-b-2 px-3 py-2 text-xs font-bold transition whitespace-nowrap",
                    tab === t.id ? "border-[#5f1340] text-[#5f1340]" : "border-transparent text-slate-400 hover:text-slate-700")}>
                  {t.label}{counts[t.id] ? <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-500">{counts[t.id]}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="py-10 text-center text-sm text-rose-600">{error}</p>
          ) : !detail ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#5f1340] border-t-transparent" />
            </div>
          ) : (
            <>
              {tab === "harian" && <DailyTab d={detail} />}
              {tab === "lembur" && <OvertimeTab d={detail} />}
              {tab === "izin" && <LeaveTab d={detail} />}
              {tab === "kasbon" && <LoanTab d={detail} />}
              {tab === "backup" && <BackupTab d={detail} />}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ───────────────────────── halaman ───────────────────────── */

export default function Payroll() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters();
  const { appendFilters } = hrisFilters;
  const { sort, toggle: toggleSort, apply: applySort } = useSort({ col: "employee_name", dir: "asc" });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [showRules, setShowRules] = useState(false);

  const periodLabel = cutoff.todayOnly || cutoff.isCustomDate ? "" : cutoff.periodLabel;

  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      const res = await api(`/waschen/hris/payroll?${q}`);
      setRows(res.data || []);
    } catch (err) {
      showToast("error", err.message || "Gagal memuat payroll");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, appendFilters]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.employee_name.toLowerCase().includes(q) || String(r.employee_code || "").toLowerCase().includes(q));
  }, [rows, search]);

  const sorted = useMemo(() => applySort(filtered, {
    employee_name: (r) => fmtEmployeeName(r.employee_name),
    hadir: (r) => r.hadir,
    off: (r) => r.off,
    work_minutes: (r) => r.work_minutes,
    backup: (r) => r.backup,
    overtime: (r) => r.overtime.approved_minutes,
    leave: (r) => r.leave.total_days,
    late: (r) => r.late.count,
    kasbon: (r) => r.kasbon.deduction,
    pinjaman: (r) => r.pinjaman.deduction,
  }), [filtered, applySort]);

  const totals = useMemo(() => filtered.reduce((t, r) => ({
    hadir: t.hadir + r.hadir,
    noInfo: t.noInfo + r.no_info_days,
    off: t.off + r.off,
    work: t.work + r.work_minutes,
    backup: t.backup + r.backup,
    otMin: t.otMin + r.overtime.approved_minutes,
    otCount: t.otCount + r.overtime.approved_count,
    leave: t.leave + r.leave.total_days,
    late: t.late + r.late.count,
    lateMin: t.lateMin + r.late.minutes,
    kasbon: t.kasbon + r.kasbon.deduction,
    pinjaman: t.pinjaman + r.pinjaman.deduction,
    outstanding: t.outstanding + r.pinjaman.outstanding,
    direct: t.direct + r.direct_total,
    // jumlah karyawan per kondisi: total gabungan semua orang tidak bermakna, jumlah orangnya yang bermakna
    noInfoEmp: t.noInfoEmp + (r.no_info_days > 0 ? 1 : 0),
    otEmp: t.otEmp + (r.overtime.approved_count > 0 ? 1 : 0),
    lateEmp: t.lateEmp + (r.late.count > 0 ? 1 : 0),
    deductEmp: t.deductEmp + (r.deduction_total > 0 ? 1 : 0),
  }), { hadir: 0, noInfo: 0, off: 0, work: 0, backup: 0, otMin: 0, otCount: 0, leave: 0, late: 0, lateMin: 0, kasbon: 0, pinjaman: 0, outstanding: 0, direct: 0, noInfoEmp: 0, otEmp: 0, lateEmp: 0, deductEmp: 0 }), [filtered]);
  const nEmp = filtered.length;
  const avgHadir = nEmp ? Math.round((totals.hadir / nEmp) * 10) / 10 : 0;
  const avgLateMin = totals.late ? Math.round(totals.lateMin / totals.late) : 0;

  // Export satu karyawan langsung dari tabel (tanpa membuka detail)
  const handleExportOne = async (row) => {
    setExportingId(row.employee_id);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      const [res, { exportPayrollEmployeeExcel }] = await Promise.all([
        api(`/waschen/hris/payroll/${row.employee_id}?${q}`),
        import("./utils/payrollWaschen"),
      ]);
      exportPayrollEmployeeExcel({ detail: res.data, startDate, endDate, periodLabel });
    } catch (err) {
      showToast("error", err.message || "Gagal export Excel");
    } finally {
      setExportingId(null);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams({ startDate, endDate });
      appendFilters(q);
      if (search.trim()) q.set("search", search.trim());
      const [res, { exportPayrollAllExcel }, { outletFilterName }] = await Promise.all([
        api(`/waschen/hris/payroll/details?${q}`),
        import("./utils/payrollWaschen"),
        import("./utils/excelShared"),
      ]);
      const order = new Map(sorted.map((r, i) => [r.employee_id, i]));
      const details = [...(res.data || [])].sort((a, b) => (order.get(a.employee_id) ?? 0) - (order.get(b.employee_id) ?? 0));
      exportPayrollAllExcel({
        details,
        startDate,
        endDate,
        periodLabel,
        filters: {
          outlet: outletFilterName(hrisFilters.outlets, hrisFilters.outletId),
          role: hrisFilters.role,
          search: search.trim(),
        },
      });
    } catch (err) {
      showToast("error", err.message || "Gagal export Excel");
    } finally {
      setExporting(false);
    }
  };

  const closeDetail = useCallback(() => setSelected(null), []);

  return (
    <div className={PAGE_WRAP}>
      <PageHero>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Payroll</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Rekap kehadiran, lembur, perizinan, keterlambatan, kasbon &amp; pinjaman per karyawan untuk penggajian
          </p>
        </div>
      </PageHero>

      {toast && (
        <div className={cn("rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-2", toast.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
          <HiOutlineExclamationTriangle className="h-4 w-4" />
          {toast.message}
        </div>
      )}

      <div className={SUMMARY_GRID}>
        <Kpi icon={HiOutlineUserGroup} label="Karyawan" value={filtered.length} hint={periodLabel || "Periode custom"} />
        <Kpi icon={HiOutlineCalendarDays} label="Rata-rata Hadir" value={`${avgHadir.toLocaleString("id-ID")} hari`} tone="emerald"
          hint={totals.noInfoEmp ? `per karyawan · ${totals.noInfoEmp} karyawan ada hari tanpa keterangan` : "per karyawan · semua keterangan lengkap"} />
        <Kpi icon={HiOutlineClock} label="Lembur Disetujui" value={`${totals.otEmp} karyawan`} tone="sky"
          hint={`${totals.otCount} kali · total ${fmtDur(totals.otMin)}`} />
        <Kpi icon={HiOutlineExclamationTriangle} label="Terlambat" value={`${totals.lateEmp} karyawan`} tone="rose"
          hint={totals.late ? `${totals.late}x · rata-rata ${fmtDur(avgLateMin)}/kejadian` : "Tidak ada yang terlambat"} />
        <Kpi icon={HiOutlineBanknotes} label="Total Potong Gaji" value={fmtIDR(totals.kasbon + totals.pinjaman)} tone="brand"
          hint={`${totals.deductEmp} karyawan · Kasbon ${fmtIDR(totals.kasbon)} · Pinjaman ${fmtIDR(totals.pinjaman)}${totals.direct ? ` · Bayar langsung ${fmtIDR(totals.direct)}` : ""}`} />
      </div>

      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">Default periode cutoff berjalan (26–25). Filter diterapkan otomatis.</p>
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
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau kode karyawan..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40" />
            </div>
            <button type="button" onClick={load} title="Muat ulang" className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50">
              <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </section>

      <section className={TABLE_SECTION}>
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[#5f1340]">
              <HiOutlineTableCells className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Rekap Payroll Karyawan</h2>
              <button type="button" onClick={() => setShowRules((v) => !v)}
                className="mt-0.5 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-[#5f1340]">
                <HiOutlineInformationCircle className="h-3.5 w-3.5" /> Klik karyawan untuk detail · {showRules ? "sembunyikan" : "lihat"} aturan hitung
              </button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!loading && <span className="text-xs font-semibold text-slate-500">{sorted.length} karyawan</span>}
            <ExportExcelButton onClick={handleExportAll} loading={exporting} disabled={loading || sorted.length === 0} label="Export Semua" />
          </div>
        </div>

        {showRules && (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-600 md:grid-cols-2">
            <li><b>Hadir</b>: tanggal dengan check-in. <b>Tanpa ket.</b>: hari s/d kemarin tanpa absen, libur, atau izin yang disetujui.</li>
            <li><b>Off</b>: jadwal libur yang sudah disetujui HRD.</li>
            <li><b>Durasi kerja</b>: check-out − check-in; absen tanpa check-out tidak dihitung.</li>
            <li><b>Backup</b>: menggantikan rekan yang libur (ditunjuk di Jadwal Libur).</li>
            <li><b>Lembur</b>: yang disetujui; pengajuan/berlangsung tampil di detail.</li>
            <li><b>Perizinan</b>: hari izin/sakit/cuti disetujui di periode (½ hari = 0,5).</li>
            <li><b>Terlambat</b>: check-in setelah 08:00; tidak dihitung bila ada izin ½ hari pagi yang disetujui.</li>
            <li><b>Kasbon / Pinjaman</b>: potong gaji = termin jatuh tempo di periode + tunggakan termin sebelumnya yang belum lunas.
              Metode <i>bayar langsung</i> ditampilkan terpisah, tidak memotong gaji.</li>
          </ul>
        )}

        {loading ? (
          <>
            <MobileSkeleton count={4} />
            <div className="hidden md:block space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-50" />)}
            </div>
          </>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <HiOutlineUserGroup className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Tidak ada karyawan untuk filter ini</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden p-3 space-y-3">
              {sorted.map((r) => (
                <button key={r.employee_id} type="button" onClick={() => setSelected(r)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{fmtEmployeeName(r.employee_name)}</p>
                      <p className="text-[10px] text-slate-400">{[r.employee_code, r.role, r.home_outlet?.code].filter(Boolean).join(" · ")}</p>
                    </div>
                    <HiOutlineChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px]">
                    {[
                      ["Hadir", r.hadir], ["Off", r.off], ["Telat", r.late.count], ["Backup", r.backup],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-slate-50 py-1.5">
                        <p className="text-sm font-bold text-slate-800">{v}</p>
                        <p className="text-slate-400">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    <span>Kerja {fmtDur(r.work_minutes)}</span>
                    <span>Lembur {fmtDur(r.overtime.approved_minutes)}</span>
                    <span>Izin {fmtDays(r.leave.total_days)} hari</span>
                    <span className="font-semibold text-[#5f1340]">Potong gaji {fmtIDR(r.deduction_total)}</span>
                    {r.direct_total > 0 && <span className="font-semibold text-sky-700">Langsung {fmtIDR(r.direct_total)}</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1280px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-12 text-center">No</th>
                    <SortTh col="employee_name" label="Nama" sort={sort} onSort={toggleSort} />
                    <SortTh col="hadir" label="Jumlah Hadir" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="off" label="Jumlah Off" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="work_minutes" label="Durasi Kerja" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold">Lokasi</th>
                    <SortTh col="backup" label="Jumlah Backup" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="overtime" label="Lembur" sort={sort} onSort={toggleSort} />
                    <SortTh col="leave" label="Perizinan" sort={sort} onSort={toggleSort} />
                    <SortTh col="late" label="Terlambat" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="kasbon" label="Kasbon" sort={sort} onSort={toggleSort} />
                    <SortTh col="pinjaman" label="Pinjaman" sort={sort} onSort={toggleSort} />
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r, idx) => (
                    <tr key={r.employee_id} tabIndex={0} onClick={() => setSelected(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") setSelected(r); }}
                      className="group cursor-pointer align-top transition hover:bg-[#5f1340]/[0.03] focus:bg-[#5f1340]/[0.04] focus:outline-none">
                      <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 group-hover:text-[#5f1340]">{fmtEmployeeName(r.employee_name)}</p>
                        <p className="text-[10px] text-slate-400">
                          {[r.employee_code, r.role && `${r.role}${r.is_leader ? " ★" : ""}`, r.home_outlet?.code].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{r.hadir}</p>
                        {r.no_info_days > 0 && <Sub tone="orange">{r.no_info_days} tanpa ket.</Sub>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-sm font-bold text-slate-800 tabular-nums">{r.off}</p>
                        {r.off_pending > 0 && <Sub tone="amber">+{r.off_pending} menunggu</Sub>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">{fmtDur(r.work_minutes)}</p>
                        <Sub>rata² {fmtDur(r.avg_work_minutes)}/hari</Sub>
                        {r.incomplete_checkout > 0 && <Sub tone="amber">{r.incomplete_checkout} belum check-out</Sub>}
                      </td>
                      <td className="px-4 py-3"><LocationChips row={r} /></td>
                      <td className="px-4 py-3 text-center">
                        <p className={cn("text-sm font-bold tabular-nums", r.backup ? "text-slate-800" : "text-slate-300")}>{r.backup}</p>
                      </td>
                      <td className="px-4 py-3">
                        {r.overtime.approved_count ? (
                          <>
                            <p className="font-semibold text-slate-700">{fmtDur(r.overtime.approved_minutes)}</p>
                            <Sub>{r.overtime.approved_count}x disetujui</Sub>
                          </>
                        ) : <span className="text-slate-300">—</span>}
                        {r.overtime.pending_count > 0 && <Sub tone="amber">{r.overtime.pending_count} menunggu</Sub>}
                      </td>
                      <td className="px-4 py-3">
                        <LeaveChips leave={r.leave} />
                        {r.leave.pending > 0 && <Sub tone="amber">{r.leave.pending} menunggu</Sub>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.late.count ? (
                          <>
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">{r.late.count}x</span>
                            <Sub>total {fmtDur(r.late.minutes)}</Sub>
                          </>
                        ) : <span className="text-slate-300">0</span>}
                        {r.late.excused > 0 && <Sub>{r.late.excused}x izin ½ hari</Sub>}
                      </td>
                      <td className="px-4 py-3">
                        {r.kasbon.deduction || r.kasbon.direct || r.kasbon.count ? (
                          <>
                            <p className="font-semibold text-slate-700">{fmtIDR(r.kasbon.deduction)}</p>
                            <Sub>{r.kasbon.count} pengajuan</Sub>
                          </>
                        ) : <span className="text-slate-300">—</span>}
                        {r.kasbon.arrears > 0 && <Sub tone="rose">tunggakan {fmtIDR(r.kasbon.arrears)}</Sub>}
                        {r.kasbon.direct > 0 && <Sub tone="sky">langsung {fmtIDR(r.kasbon.direct)}</Sub>}
                        {r.kasbon.pending > 0 && <Sub tone="amber">{r.kasbon.pending} menunggu</Sub>}
                      </td>
                      <td className="px-4 py-3">
                        {r.pinjaman.deduction || r.pinjaman.direct || r.pinjaman.outstanding ? (
                          <>
                            <p className="font-semibold text-slate-700">{fmtIDR(r.pinjaman.deduction)}</p>
                            <Sub tone={r.pinjaman.outstanding ? "rose" : "slate"}>sisa {fmtIDR(r.pinjaman.outstanding)}</Sub>
                          </>
                        ) : <span className="text-slate-300">—</span>}
                        {r.pinjaman.arrears > 0 && <Sub tone="rose">tunggakan {fmtIDR(r.pinjaman.arrears)}</Sub>}
                        {r.pinjaman.direct > 0 && <Sub tone="sky">langsung {fmtIDR(r.pinjaman.direct)}</Sub>}
                        {r.pinjaman.pending > 0 && <Sub tone="amber">{r.pinjaman.pending} menunggu</Sub>}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1">
                          <button type="button" title="Export Excel karyawan ini" aria-label={`Export payroll ${fmtEmployeeName(r.employee_name)}`}
                            disabled={exportingId != null}
                            onClick={(e) => { e.stopPropagation(); handleExportOne(r); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40">
                            {exportingId === r.employee_id
                              ? <HiOutlineArrowPath className="h-4 w-4 animate-spin" />
                              : <HiOutlineArrowDownTray className="h-4 w-4" />}
                          </button>
                          <HiOutlineChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#5f1340]" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700">
                  <tr>
                    <td className="px-4 py-3" colSpan={2}>Total {sorted.length} karyawan</td>
                    <td className="px-4 py-3 text-center">{totals.hadir}</td>
                    <td className="px-4 py-3 text-center">{totals.off}</td>
                    <td className="px-4 py-3">{fmtDur(totals.work)}</td>
                    <td className="px-4 py-3"><HiOutlineMapPin className="inline h-3.5 w-3.5 text-slate-400" /></td>
                    <td className="px-4 py-3 text-center">{totals.backup}</td>
                    <td className="px-4 py-3">{fmtDur(totals.otMin)}</td>
                    <td className="px-4 py-3">{fmtDays(totals.leave)} hari</td>
                    <td className="px-4 py-3 text-center">{totals.late}x</td>
                    <td className="px-4 py-3">{fmtIDR(totals.kasbon)}</td>
                    <td className="px-4 py-3">{fmtIDR(totals.pinjaman)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {selected && (
        <PayrollDetailModal
          employee={selected}
          startDate={startDate}
          endDate={endDate}
          periodLabel={periodLabel}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
