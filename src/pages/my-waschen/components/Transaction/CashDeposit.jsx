import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  HiOutlineBanknotes,
  HiOutlineMagnifyingGlass,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowPath,
  HiOutlineChevronDown,
  HiOutlineBuildingStorefront,
  HiOutlineXMark,
  HiOutlinePhoto,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import { exportTableExcel, periodLabel } from "../../utils/exportTableExcel";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import { MultiSelect } from "../HrisOutletRoleFilter";
import { FilterScroll, FilterPill, PhotoViewerModal } from "../HRIS/hrisShared";
import { FILTER_SECTION, TABLE_SECTION, cn, fmtEmployeeName, fmtIDR } from "../../utils/hrisUtils";

const FILTER_LABEL = "block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1";
const STATUS_FILTERS = [
  ["all", "Semua"],
  ["pending", "Belum setoran"],
  ["late", "Terlambat"],
  ["done", "Sudah lengkap"],
];

const DAY_MS = 86400000;
const MAX_DAYS = 400;

function wibToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function dateRange(from, to) {
  if (!from || !to) return [];
  const out = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= end && out.length < MAX_DAYS; t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

function fmtDay(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short" });
}

function fmtDayLong(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function shiftLabel(sn) {
  return Number(sn) === 2 ? "Siang" : "Pagi";
}

/** Status satu hari: pending menang atas uploaded bila ada lebih dari satu closing Final. */
function dayState(shifts) {
  if (!shifts?.length) return "none";
  // Semua closing hari itu tanpa pembayaran tunai → Tidak Perlu Setor (sama dengan POS)
  if (shifts.every((s) => s.deposit?.status === "none")) return "nocash";
  const pending = shifts.filter((s) => s.deposit?.status === "pending");
  if (pending.length) return pending.some((s) => s.deposit.isLate) ? "late" : "pending";
  return "done";
}

const DAY_UI = {
  done: { tone: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100", label: "Sudah setoran" },
  pending: { tone: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100", label: "Belum setoran" },
  late: { tone: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100", label: "Terlambat" },
  nocash: { tone: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100", label: "Tidak perlu setor" },
};

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
        "min-w-0 rounded-2xl border p-3 text-left shadow-sm sm:p-4",
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

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-800">{children}</span>
    </div>
  );
}

/** Detail satu closing Final: ringkasan kas + status/bukti setoran. */
function DepositDetail({ s, onViewProof }) {
  const d = s.deposit;
  const uploaded = d?.status === "uploaded";
  const noCash = d?.status === "none";
  const isImage = d?.proofUrl && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(d.proofUrl);
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-[#5f1340]">Shift {shiftLabel(s.shiftNumber)}</span>
        <span className={cn("rounded-lg px-2 py-0.5 text-[10px] font-black", uploaded ? "bg-emerald-100 text-emerald-700" : noCash ? "bg-sky-100 text-sky-700" : d?.isLate ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800")}>
          {uploaded ? "Sudah diupload" : noCash ? "Tidak perlu setor · tidak ada tunai" : d?.isLate ? `Belum diupload · terlambat ${d.lateDays} hari` : "Belum diupload"}
        </span>
        {s.autoClosed && (
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">Ditutup otomatis (ganti hari)</span>
        )}
        {uploaded && d.isLate && (
          <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">Terlambat {d.lateDays} hari</span>
        )}
      </div>
      <div className="space-y-1.5">
        <Row label="Ditutup oleh">{fmtEmployeeName(s.closedByName)} · {fmtDateTime(s.closedAt)}</Row>
        <Row label="Tunai disetor">{fmtIDR(d?.cashAmount ?? s.revenueTunai)}</Row>
        {d?.cashReported != null && d?.cashAmount != null && Math.round(d.cashReported) !== Math.round(d.cashAmount) && (
          <Row label="Laporan kasir (tunai)"><span className="text-amber-700">{fmtIDR(d.cashReported)}</span></Row>
        )}
        <Row label="Cash seharusnya">{fmtIDR(s.expectedCash)}</Row>
        <Row label="Cash aktual saat close">{s.actualCash != null ? fmtIDR(s.actualCash) : "—"}</Row>
        {uploaded && <Row label="Diupload oleh">{fmtEmployeeName(d.uploadedByName)} · {fmtDateTime(d.uploadedAt)}</Row>}
        {uploaded && d.notes && <Row label="Catatan">{d.notes}</Row>}
      </div>
      {uploaded && (
        d.proofUrl ? (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Bukti setoran</p>
            {isImage ? (
              <button type="button" onClick={() => onViewProof({ url: d.proofUrl, label: "Bukti setoran tunai" })} className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img src={d.proofUrl} alt="Bukti setoran tunai" loading="lazy" className="max-h-72 w-full object-contain" />
              </button>
            ) : (
              <a href={d.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-[#5f1340] hover:bg-slate-50">
                <HiOutlinePhoto className="h-4 w-4" /> Buka bukti
              </a>
            )}
          </div>
        ) : null
      )}
    </div>
  );
}

export default function CashDeposit() {
  const cutoff = useCutoffPeriod();
  const { dateFrom, dateTo } = cutoff;

  const [outletIds, setOutletIds] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openOutlets, setOpenOutlets] = useState(() => new Set());
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null); // { outletName, date, shifts }
  const [proof, setProof] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    api("/waschen/outlets").then((res) => setOutlets(res.data || [])).catch(() => setOutlets([]));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!dateFrom || !dateTo) return;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({ dateFrom, dateTo });
      if (outletIds.length) q.set("outletId", outletIds.join(","));
      const res = await api(`/waschen/daily-report/cash-deposits?${q}`);
      setShifts(res.data || []);
      setError("");
    } catch (err) {
      if (silent) return;
      setShifts([]);
      setError(err.message || "Gagal memuat setoran tunai");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [dateFrom, dateTo, outletIds]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(() => load(true));

  const outletOptions = useMemo(
    () => outlets.map((o) => ({ value: String(o.id), label: o.full_name || o.name })),
    [outlets],
  );

  const days = useMemo(() => dateRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const today = wibToday();

  const groups = useMemo(() => {
    const m = new Map();
    outlets.forEach((o) => {
      if (!outletIds.length || outletIds.includes(String(o.id))) {
        m.set(String(o.id), { id: o.id, name: o.full_name || o.name, byDate: new Map() });
      }
    });
    shifts.forEach((s) => {
      const k = String(s.outletId);
      if (!m.has(k)) m.set(k, { id: s.outletId, name: s.outletFullName || s.outletName || `Outlet #${k}`, byDate: new Map() });
      const g = m.get(k);
      if (!g.byDate.has(s.closeDate)) g.byDate.set(s.closeDate, []);
      g.byDate.get(s.closeDate).push(s);
    });
    return [...m.values()].map((g) => {
      const states = [...g.byDate.values()].map(dayState);
      return {
        ...g,
        total: states.length,
        done: states.filter((x) => x === "done" || x === "nocash").length,
        pending: states.filter((x) => x === "pending" || x === "late").length,
        late: states.filter((x) => x === "late").length,
      };
    });
  }, [outlets, outletIds, shifts]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .filter((g) => {
        if (statusFilter === "pending" && g.pending === 0) return false;
        if (statusFilter === "late" && g.late === 0) return false;
        if (statusFilter === "done" && !(g.total > 0 && g.pending === 0)) return false;
        if (!q) return true;
        const hay = [g.name, ...[...g.byDate.values()].flat().flatMap((s) => [s.closedByName, s.deposit?.uploadedByName, s.deposit?.notes])]
          .filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.late - a.late || b.pending - a.pending || String(a.name).localeCompare(String(b.name)));
  }, [groups, search, statusFilter]);

  const summary = useMemo(() => ({
    outlets: groups.filter((g) => g.total > 0).length,
    total: groups.reduce((a, g) => a + g.total, 0),
    done: groups.reduce((a, g) => a + g.done, 0),
    pending: groups.reduce((a, g) => a + g.pending, 0),
    late: groups.reduce((a, g) => a + g.late, 0),
  }), [groups]);

  /** Download Excel: satu baris per closing Final, sesuai filter periode/outlet/status/cari. */
  const downloadExcel = async () => {
    setExportError("");
    const q = search.trim().toLowerCase();
    const depositLabel = (s) => {
      const d = s.deposit;
      if (!d) return "—";
      if (d.status === "uploaded") return d.isLate ? `Sudah upload (telat ${d.lateDays} hari)` : "Sudah upload";
      if (d.status === "none") return "Tidak perlu setor (tanpa tunai)";
      return d.isLate ? `Belum upload (telat ${d.lateDays} hari)` : "Belum upload";
    };
    const list = shifts
      .filter((s) => {
        const d = s.deposit;
        if (statusFilter === "pending" && d?.status !== "pending") return false;
        if (statusFilter === "late" && !(d?.status === "pending" && d?.isLate)) return false;
        if (statusFilter === "done" && !["uploaded", "none"].includes(d?.status)) return false;
        if (!q) return true;
        const hay = [s.outletFullName, s.outletName, s.closedByName, s.openerName, d?.uploadedByName, d?.notes]
          .filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => String(a.closeDate).localeCompare(String(b.closeDate))
        || String(a.outletFullName || a.outletName).localeCompare(String(b.outletFullName || b.outletName)));
    if (!list.length) {
      setExportError("Tidak ada data setoran untuk diunduh dengan filter ini");
      return;
    }
    setExporting(true);
    try {
      const outletLabel = outletIds.length
        ? outletOptions.filter((o) => outletIds.includes(o.value)).map((o) => o.label).join(", ")
        : "Semua outlet";
      const statusLabel = Object.fromEntries(STATUS_FILTERS)[statusFilter] || "Semua";
      const cashOf = (s) => (s.deposit?.cashAmount ?? s.revenueTunai ?? 0);
      await exportTableExcel({
        title: "Setoran Tunai",
        sheetName: "Setoran Tunai",
        fileName: `SetoranTunai_${dateFrom}_${dateTo}`,
        filters: [
          ["Periode", periodLabel(dateFrom, dateTo)],
          ["Outlet", outletLabel],
          ["Status", statusLabel],
          ...(search.trim() ? [["Pencarian", search.trim()]] : []),
        ],
        columns: [
          { header: "Tanggal Closing", key: "closeDate", type: "date", width: 15 },
          { header: "Jam Close", key: "closedAt", type: "datetime", width: 18 },
          { header: "Outlet", value: (s) => s.outletFullName || s.outletName, width: 28 },
          { header: "Shift", value: (s) => shiftLabel(s.shiftNumber), width: 8, align: "center" },
          { header: "Dibuka Oleh", value: (s) => fmtEmployeeName(s.openerName) || "", width: 22 },
          { header: "Ditutup Oleh", value: (s) => fmtEmployeeName(s.closedByName) || "", width: 24 },
          { header: "Revenue Total", key: "revenueTotal", type: "money", width: 15 },
          { header: "Tunai Disetor", key: "cash", value: cashOf, type: "money", width: 15 },
          { header: "Laporan Kasir (Tunai)", value: (s) => s.deposit?.cashReported ?? null, type: "money", width: 17 },
          { header: "Status Setoran", value: depositLabel, width: 28 },
          { header: "Diupload Oleh", value: (s) => fmtEmployeeName(s.deposit?.uploadedByName) || "", width: 22 },
          { header: "Tgl Upload", value: (s) => s.deposit?.uploadedAt || null, type: "datetime", width: 18 },
          { header: "Catatan", value: (s) => s.deposit?.notes || "", width: 28, wrap: true },
          { header: "Bukti Setoran", value: (s) => s.deposit?.proofUrl || "", width: 40 },
        ],
        rows: list,
        totals: {
          revenueTotal: list.reduce((a, s) => a + (Number(s.revenueTotal) || 0), 0),
          cash: list.reduce((a, s) => a + (Number(cashOf(s)) || 0), 0),
        },
      });
    } catch (err) {
      setExportError(err.message || "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
    }
  };

  const toggleOutlet = (id) => setOpenOutlets((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOpen = visibleGroups.length > 0 && visibleGroups.every((g) => openOutlets.has(String(g.id)));

  return (
    <div className="min-w-0 w-full max-w-full space-y-4 overflow-x-hidden p-3 sm:space-y-5 sm:p-6 lg:p-8 2xl:px-12">
      <PageHero className="!flex-col !items-stretch gap-4">
        <div className="min-w-0 w-full">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 sm:h-11 sm:w-11">
              <HiOutlineBanknotes className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight tracking-tight sm:text-xl md:text-2xl">Setoran Tunai</h1>
              <p className="mt-1 text-[11px] leading-relaxed text-pink-100/90 sm:text-xs md:text-sm">
                Pantau bukti setoran tunai closing Final per outlet di POS My Waschen
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
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">Filter Periode & Data</h2>
            <p className="text-[11px] text-slate-500 sm:text-xs">Batas upload bukti setoran: H+1 dari tanggal closing.</p>
          </div>
          <button type="button" onClick={() => load()} title="Muat ulang" className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            type="button"
            onClick={downloadExcel}
            disabled={exporting || loading}
            title="Download Excel sesuai filter"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#5f1340] px-3 py-2 text-xs font-bold text-white hover:bg-[#4d0f33] disabled:opacity-60"
          >
            <HiOutlineArrowDownTray className="h-4 w-4" />
            <span className="hidden sm:inline">{exporting ? "Mengunduh..." : "Download Excel"}</span>
          </button>
        </div>
        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} showToday />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className={FILTER_LABEL}>Outlet</label>
              <MultiSelect options={outletOptions} value={outletIds} onChange={setOutletIds} allLabel="Semua Outlet" unitLabel="outlet" />
            </div>
            <div>
              <label className={FILTER_LABEL}>Cari</label>
              <div className="relative">
                <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari outlet, karyawan, catatan..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#5f1340]/40"
                />
              </div>
            </div>
          </div>
          <FilterScroll>
            {STATUS_FILTERS.map(([k, label]) => (
              <FilterPill key={k} active={statusFilter === k} onClick={() => setStatusFilter(k)}>{label}</FilterPill>
            ))}
          </FilterScroll>
        </div>
      </section>

      {(error || exportError) && (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{error || exportError}</div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm font-bold text-slate-400">
          Memuat setoran tunai...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <Kpi label="Closing Final" value={summary.total} hint={`dari ${summary.outlets} outlet`} />
            <Kpi label="Sudah setoran" value={summary.done} hint={summary.total ? `${Math.round((summary.done / summary.total) * 100)}% terupload` : "—"} tone="emerald" />
            <Kpi
              label="Belum setoran"
              value={summary.pending}
              hint={summary.pending === 0 ? "Semua sudah upload" : "menunggu bukti"}
              tone={summary.pending === 0 ? "slate" : "amber"}
              onClick={summary.pending > 0 ? () => setStatusFilter((v) => (v === "pending" ? "all" : "pending")) : undefined}
              active={statusFilter === "pending"}
            />
            <Kpi
              label="Terlambat"
              value={summary.late}
              hint={summary.late === 0 ? "Tidak ada" : "lewat H+1"}
              tone={summary.late === 0 ? "slate" : "rose"}
              onClick={summary.late > 0 ? () => setStatusFilter((v) => (v === "late" ? "all" : "late")) : undefined}
              active={statusFilter === "late"}
            />
          </div>

          {visibleGroups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-14 text-center text-slate-400">
              <HiOutlineBuildingStorefront className="mx-auto mb-2 h-9 w-9 opacity-50" />
              <p className="text-sm font-bold text-slate-500">Tidak ada outlet yang sesuai</p>
              <p className="mt-1 text-xs">Coba ganti periode atau longgarkan filter di atas.</p>
            </div>
          ) : (
            <section className={TABLE_SECTION}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800">Rekap Setoran per Outlet</h2>
                  <p className="text-[11px] text-slate-500">Klik outlet untuk melihat kalender cutoff. Klik tanggal untuk detail dan bukti.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenOutlets(allOpen ? new Set() : new Set(visibleGroups.map((g) => String(g.id))))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-[#5f1340] hover:bg-[#5f1340]/5"
                >
                  {allOpen ? "Tutup semua" : "Buka semua"}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 px-4 py-2 text-[10px] font-semibold text-slate-500 sm:px-5">
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-100" />Sudah setoran</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />Belum setoran</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-rose-300 bg-rose-100" />Terlambat</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-sky-300 bg-sky-100" />Tidak perlu setor (tanpa tunai)</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100" />Tidak ada closing Final</span>
              </div>

              <div className="divide-y divide-slate-100">
                {visibleGroups.map((g) => {
                  const key = String(g.id);
                  const open = openOutlets.has(key);
                  const pct = g.total ? Math.round((g.done / g.total) * 100) : 0;
                  return (
                    <div key={key}>
                      <button type="button" onClick={() => toggleOutlet(key)} className={cn("w-full px-4 py-3 text-left hover:bg-slate-50/80 sm:px-5", open && "bg-slate-50/80")}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">{g.name}</p>
                            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Sudah {g.done}</span>
                              {g.pending - g.late > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-800">Belum {g.pending - g.late}</span>}
                              {g.late > 0 && <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700">Terlambat {g.late}</span>}
                              {g.total === 0 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">Belum ada closing Final</span>}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {g.total > 0 && (
                              <div className="hidden items-center gap-2 sm:flex">
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                  <div className={cn("h-full rounded-full", g.late > 0 ? "bg-rose-500" : g.pending > 0 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-9 text-right text-xs font-bold tabular-nums text-slate-700">{pct}%</span>
                              </div>
                            )}
                            <HiOutlineChevronDown className={cn("h-4 w-4 text-[#5f1340] transition-transform", open && "rotate-180")} />
                          </div>
                        </div>
                      </button>
                      {open && (
                        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status setoran harian</p>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                            {days.map((date) => {
                              const dayShifts = g.byDate.get(date);
                              const state = dayState(dayShifts);
                              if (state === "none") {
                                return (
                                  <div key={date} className={cn("rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-slate-400", date > today ? "opacity-40" : "opacity-70")}>
                                    <p className="text-[10px] font-semibold">{fmtDay(date)}</p>
                                    <p className="text-sm font-bold">—</p>
                                    <p className="text-[10px] font-semibold">{date > today ? "Belum berjalan" : "Tanpa closing"}</p>
                                  </div>
                                );
                              }
                              const ui = DAY_UI[state];
                              return (
                                <button
                                  key={date}
                                  type="button"
                                  onClick={() => setDetail({ outletName: g.name, date, shifts: dayShifts })}
                                  className={cn("rounded-lg border px-2 py-1.5 text-left transition", ui.tone)}
                                >
                                  <p className="text-[10px] font-semibold text-slate-500">{fmtDay(date)}</p>
                                  <p className="text-sm font-bold">{state === "done" ? "Selesai" : state === "nocash" ? "Tanpa tunai" : state === "late" ? "Telat" : "Belum"}</p>
                                  <p className="text-[10px] font-semibold">
                                    {state === "done" ? "Lihat bukti" : ui.label}
                                    {dayShifts.length > 1 ? ` · ${dayShifts.length} closing` : ""}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {detail && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setDetail(null)} aria-label="Tutup" />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-[#5f1340]">Setoran Tunai</h3>
                <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-500">
                  {detail.outletName} · Closing {fmtDayLong(detail.date)}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              {detail.shifts.map((s) => <DepositDetail key={s.id} s={s} onViewProof={setProof} />)}
            </div>
          </div>
        </div>,
        document.body,
      )}

      <PhotoViewerModal open={!!proof} url={proof?.url} label={proof?.label} onClose={() => setProof(null)} />
    </div>
  );
}
