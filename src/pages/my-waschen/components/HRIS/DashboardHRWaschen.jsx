import { Fragment, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineArrowDownTray,
  HiOutlineArrowPath,
  HiOutlineBuildingStorefront,
  HiOutlineCalendarDays,
  HiOutlineCheckBadge,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineFire,
  HiOutlineMagnifyingGlass,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from "react-icons/hi2";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";
import useHrisOutletRoleFilters from "../../hooks/useHrisOutletRoleFilters";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import HrisOutletRoleFilter from "../HrisOutletRoleFilter";
import { FILTER_SECTION, TABLE_SECTION, cn, fmtDateShort, fmtEmployeeName } from "../../utils/hrisUtils";
import { FilterPill, FilterScroll, SortTh } from "./hrisShared";

// Jam masuk Waschen. Check-in setelah 08:00 (mulai 08:01) dihitung terlambat.
const JAM_MASUK_MIN = 8 * 60;
const FETCH_LIMIT = 10000;

const C_ONTIME = "#10b981";
const C_LATE = "#f43f5e";
const C_BRAND = "#5f1340";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const BUCKETS = [
  { id: "b1", label: "< 07:30", test: (m) => m < 450, late: false },
  { id: "b2", label: "07:30–08:00", test: (m) => m >= 450 && m <= JAM_MASUK_MIN, late: false },
  { id: "b3", label: "08:01–08:15", test: (m) => m > JAM_MASUK_MIN && m <= 495, late: true },
  { id: "b4", label: "08:16–08:30", test: (m) => m > 495 && m <= 510, late: true },
  { id: "b5", label: "08:31–09:00", test: (m) => m > 510 && m <= 540, late: true },
  { id: "b6", label: "> 09:00", test: (m) => m > 540, late: true },
];

const EMP_FILTERS = [
  { id: "semua", label: "Semua" },
  { id: "pernah_telat", label: "Pernah terlambat" },
  { id: "sering_telat", label: "Sering terlambat (≥3x)" },
  { id: "sempurna", label: "100% tepat waktu" },
  { id: "belum_out", label: "Ada belum check-out" },
];

/* ───────────────────────── helpers ───────────────────────── */

// check_in_time dari server berformat "YYYY-MM-DD HH:mm:ss" (WIB, dateStrings).
// Ambil jam langsung dari string supaya tidak tergeser zona waktu browser.
function toMinutes(v) {
  if (!v) return null;
  const s = String(v);
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
  if (!hasZone) {
    const m = s.match(/(?:T|\s)(\d{1,2}):(\d{2})/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getHours() * 60 + d.getMinutes();
}

function fmtClock(min) {
  if (min == null || Number.isNaN(min)) return "—";
  const m = Math.round(min);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function fmtLate(min) {
  if (!min) return "0 mnt";
  const m = Math.round(min);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} j ${r} mnt` : `${h} jam`;
}

function pct(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

function todayIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function datesInRange(from, to) {
  if (!from || !to) return [];
  const cur = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || cur > end) return [];
  const out = [];
  const p = (n) => String(n).padStart(2, "0");
  while (cur <= end) {
    out.push(`${cur.getFullYear()}-${p(cur.getMonth() + 1)}-${p(cur.getDate())}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function dayOfWeek(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getDay();
}

function fmtDayShort(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function fmtDayLong(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function complianceTone(p) {
  if (p >= 90) return { text: "text-emerald-700", bar: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (p >= 75) return { text: "text-amber-700", bar: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-800" };
  return { text: "text-rose-700", bar: "bg-rose-500", chip: "border-rose-200 bg-rose-50 text-rose-700" };
}


/* ───────────────────────── small UI ───────────────────────── */

function KpiCard({ icon: Icon, label, value, sub, tone = "slate", active, onClick }) {
  const tones = {
    slate: "border-slate-200 bg-white text-slate-800",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    rose: "border-rose-200 bg-rose-50/60 text-rose-800",
    amber: "border-amber-200 bg-amber-50/60 text-amber-900",
    brand: "border-[#5f1340]/20 bg-[#5f1340]/5 text-[#5f1340]",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-3 sm:p-4 text-left shadow-sm transition min-w-0",
        tones[tone],
        onClick && "hover:shadow-md cursor-pointer",
        active && "ring-2 ring-[#5f1340]/40",
      )}
    >
      <div className="flex items-center gap-1.5 opacity-75">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
        <p className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className="mt-1 text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] font-semibold opacity-70 truncate">{sub}</p>}
    </Tag>
  );
}

function SectionHead({ icon: Icon, title, sub, right }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[#5f1340]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-800">{title}</h2>
          {sub && <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function ComplianceRing({ value, size = 132 }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 90 ? C_ONTIME : value >= 75 ? "#f59e0b" : C_LATE;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(Math.min(value, 100) / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 600ms ease" }}
      />
      <text x="50%" y="47%" textAnchor="middle" className="fill-slate-800" style={{ fontSize: 24, fontWeight: 700 }}>
        {value}%
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-slate-400" style={{ fontSize: 10, fontWeight: 600 }}>
        tepat waktu
      </text>
    </svg>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg">
      <p className="font-bold text-slate-800">{fmtDayLong(d.date)}</p>
      {d.hadir === 0 ? (
        <p className="mt-1 text-slate-400">Tidak ada absensi</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          <p className="text-emerald-700">Tepat waktu: <b>{d.tepat}</b></p>
          <p className="text-rose-700">Terlambat: <b>{d.telat}</b></p>
          <p className="text-slate-600">Kepatuhan: <b>{d.kepatuhan}%</b></p>
          {d.telat > 0 && <p className="text-slate-500">Rata-rata telat: {fmtLate(d.avgLate)}</p>}
        </div>
      )}
      <p className="mt-1.5 text-[10px] text-slate-400">Klik untuk lihat detail hari ini</p>
    </div>
  );
}

function SimpleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg">
      <p className="font-bold text-slate-800">{d.label || label}</p>
      <p className="mt-0.5 text-slate-600">{d.count} check-in{d.share != null ? ` · ${d.share}%` : ""}</p>
      {d.lateRate != null && <p className="text-slate-600">Terlambat: <b>{d.lateRate}%</b> ({d.telat}/{d.hadir})</p>}
    </div>
  );
}

/* ───────────────────────── main ───────────────────────── */

export default function DashboardHRWaschen() {
  const cutoff = useCutoffPeriod();
  const { dateFrom: startDate, dateTo: endDate } = cutoff;
  const hrisFilters = useHrisOutletRoleFilters({ multiple: true });
  const { appendFilters, outlets } = hrisFilters;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [empFilter, setEmpFilter] = useState("semua");
  const [focusDate, setFocusDate] = useState(null);
  const [groupBy, setGroupBy] = useState("outlet");
  const [openEmp, setOpenEmp] = useState(null);
  const [sort, setSort] = useState({ col: "telat", dir: "desc" });
  const reqSeq = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!startDate || !endDate) return;
    const seq = ++reqSeq.current;
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams({ startDate, endDate, limit: String(FETCH_LIMIT) });
      appendFilters(q);
      const res = await api(`/waschen/hris/attendance?${q}`);
      if (seq !== reqSeq.current) return;
      setRows(res.data || []);
      setError("");
    } catch (err) {
      if (seq !== reqSeq.current || silent) return;
      setError(err.message || "Gagal memuat dashboard absensi");
      setRows([]);
    } finally {
      if (seq === reqSeq.current && !silent) setLoading(false);
    }
  }, [startDate, endDate, appendFilters]);

  useLiveRefresh(() => load(true));
  useEffect(() => { load(); }, [load]);
  // Tanggal fokus tidak relevan lagi bila periode / filter berubah
  useEffect(() => { setFocusDate(null); }, [startDate, endDate, hrisFilters.outletId, hrisFilters.role]);

  const outletById = useMemo(() => new Map(outlets.map((o) => [String(o.id), o])), [outlets]);
  // Lokasi absen non-outlet (Head Office, IKM, …) dari mst_location_absen, dikirim backend per record
  const absenLocationById = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      if (r.absen_location_name && !map.has(String(r.outlet_id))) {
        map.set(String(r.outlet_id), { code: r.absen_location_code, name: r.absen_location_name });
      }
    });
    return map;
  }, [rows]);
  const outletName = useCallback((id) => {
    if (id == null || id === "") return "Tanpa outlet";
    const o = outletById.get(String(id));
    if (o) return o.outlet_code ? `${o.outlet_code} · ${o.name}` : o.name;
    const loc = absenLocationById.get(String(id));
    if (loc) return loc.code ? `${loc.code} · ${loc.name}` : loc.name;
    return outlets.length ? `Outlet #${id} (tidak terdaftar)` : `Outlet #${id}`;
  }, [outletById, absenLocationById, outlets.length]);
  const outletShort = useCallback((id) => (
    outletById.get(String(id))?.outlet_code
    || outletById.get(String(id))?.name
    || absenLocationById.get(String(id))?.code
    || absenLocationById.get(String(id))?.name
    || `#${id}`
  ), [outletById, absenLocationById]);

  // Satu record per absensi dengan info keterlambatan
  const records = useMemo(() => rows.map((r) => {
    const inMin = toMinutes(r.check_in_time);
    const outMin = toMinutes(r.check_out_time);
    const hasIn = inMin != null;
    const late = hasIn && inMin > JAM_MASUK_MIN;
    return {
      ...r,
      inMin,
      outMin,
      hasIn,
      late,
      lateMin: late ? inMin - JAM_MASUK_MIN : 0,
      noOut: hasIn && !r.check_out_time,
    };
  }), [rows]);

  // Pilihan karyawan untuk filter (diambil dari data absensi periode ini)
  const employeeOptions = useMemo(() => {
    const map = new Map();
    records.forEach((r) => {
      const id = String(r.employee_id);
      if (!map.has(id)) map.set(id, { id, name: fmtEmployeeName(r.employee_name, `#${id}`), code: r.employee_code, role: r.role_code });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [records]);

  // Filter karyawan berlaku untuk seluruh dashboard (KPI, grafik, outlet, rekap)
  const deferredSelected = useDeferredValue(selectedEmpIds);
  const nameFiltered = useMemo(() => {
    if (!deferredSelected.length) return records;
    const ids = new Set(deferredSelected);
    return records.filter((r) => ids.has(String(r.employee_id)));
  }, [records, deferredSelected]);

  const scoped = useMemo(
    () => (focusDate ? nameFiltered.filter((r) => r.work_date === focusDate) : nameFiltered),
    [nameFiltered, focusDate],
  );

  /* ── KPI ── */
  const kpi = useMemo(() => {
    const withIn = scoped.filter((r) => r.hasIn);
    const late = withIn.filter((r) => r.late);
    const totalLate = late.reduce((s, r) => s + r.lateMin, 0);
    const avgIn = withIn.length ? withIn.reduce((s, r) => s + r.inMin, 0) / withIn.length : null;
    const people = new Set(withIn.map((r) => r.employee_id));
    const latePeople = new Set(late.map((r) => r.employee_id));
    return {
      hadir: withIn.length,
      tepat: withIn.length - late.length,
      telat: late.length,
      kepatuhan: pct(withIn.length - late.length, withIn.length),
      totalLate,
      avgLate: late.length ? totalLate / late.length : 0,
      avgIn,
      people: people.size,
      latePeople: latePeople.size,
      noIn: scoped.filter((r) => !r.hasIn).length,
      noOut: scoped.filter((r) => r.noOut).length,
    };
  }, [scoped]);

  /* ── Tren harian (selalu periode penuh) ── */
  const trend = useMemo(() => {
    const today = todayIso();
    const rangeEnd = endDate && endDate > today ? today : endDate;
    const map = new Map(datesInRange(startDate, rangeEnd).map((d) => [d, { date: d, tepat: 0, telat: 0, lateSum: 0 }]));
    nameFiltered.forEach((r) => {
      if (!r.hasIn || !r.work_date) return;
      if (!map.has(r.work_date)) map.set(r.work_date, { date: r.work_date, tepat: 0, telat: 0, lateSum: 0 });
      const d = map.get(r.work_date);
      if (r.late) { d.telat += 1; d.lateSum += r.lateMin; } else d.tepat += 1;
    });
    return [...map.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const hadir = d.tepat + d.telat;
        return {
          ...d,
          hadir,
          label: fmtDayShort(d.date),
          kepatuhan: hadir ? pct(d.tepat, hadir) : null,
          avgLate: d.telat ? d.lateSum / d.telat : 0,
        };
      });
  }, [nameFiltered, startDate, endDate]);

  const worstDay = useMemo(() => {
    const withData = trend.filter((d) => d.hadir > 0);
    if (!withData.length) return null;
    return withData.reduce((w, d) => (d.kepatuhan < w.kepatuhan ? d : w), withData[0]);
  }, [trend]);

  /* ── Distribusi jam masuk ── */
  const distribution = useMemo(() => {
    const withIn = scoped.filter((r) => r.hasIn);
    return BUCKETS.map((b) => {
      const count = withIn.filter((r) => b.test(r.inMin)).length;
      return { ...b, count, share: pct(count, withIn.length) };
    });
  }, [scoped]);

  /* ── Per hari dalam minggu ── */
  const byWeekday = useMemo(() => {
    const agg = new Map(DAY_ORDER.map((d) => [d, { hadir: 0, telat: 0 }]));
    scoped.forEach((r) => {
      if (!r.hasIn) return;
      const dow = dayOfWeek(r.work_date);
      if (dow == null) return;
      const a = agg.get(dow);
      a.hadir += 1;
      if (r.late) a.telat += 1;
    });
    return DAY_ORDER.map((d) => {
      const a = agg.get(d);
      return { label: DAY_NAMES[d], ...a, count: a.hadir, lateRate: pct(a.telat, a.hadir) };
    }).filter((d) => d.hadir > 0);
  }, [scoped]);

  /* ── Per outlet / posisi ── */
  const groups = useMemo(() => {
    const map = new Map();
    scoped.forEach((r) => {
      if (!r.hasIn) return;
      const key = groupBy === "outlet" ? String(r.outlet_id ?? "") : (r.role_code || "Tanpa posisi");
      if (!map.has(key)) map.set(key, { key, hadir: 0, telat: 0, lateSum: 0, people: new Set() });
      const g = map.get(key);
      g.hadir += 1;
      g.people.add(r.employee_id);
      if (r.late) { g.telat += 1; g.lateSum += r.lateMin; }
    });
    return [...map.values()]
      .map((g) => ({
        key: g.key,
        label: groupBy === "outlet" ? outletName(g.key) : g.key,
        hadir: g.hadir,
        telat: g.telat,
        people: g.people.size,
        kepatuhan: pct(g.hadir - g.telat, g.hadir),
        avgLate: g.telat ? g.lateSum / g.telat : 0,
      }))
      .sort((a, b) => a.kepatuhan - b.kepatuhan || b.telat - a.telat);
  }, [scoped, groupBy, outletName]);

  /* ── Rekap per karyawan ── */
  const employees = useMemo(() => {
    const map = new Map();
    scoped.forEach((r) => {
      const id = r.employee_id;
      if (!map.has(id)) {
        map.set(id, {
          employee_id: id,
          employee_name: r.employee_name,
          employee_code: r.employee_code,
          role_code: r.role_code,
          outlets: new Set(),
          hadir: 0, telat: 0, lateSum: 0, maxLate: 0, inSum: 0, noOut: 0, noIn: 0,
          lastLate: null,
          days: [],
        });
      }
      const e = map.get(id);
      if (r.outlet_id != null) e.outlets.add(String(r.outlet_id));
      e.days.push(r);
      if (!r.hasIn) { e.noIn += 1; return; }
      e.hadir += 1;
      e.inSum += r.inMin;
      if (r.noOut) e.noOut += 1;
      if (r.late) {
        e.telat += 1;
        e.lateSum += r.lateMin;
        e.maxLate = Math.max(e.maxLate, r.lateMin);
        if (!e.lastLate || r.work_date > e.lastLate) e.lastLate = r.work_date;
      }
    });
    return [...map.values()].map((e) => ({
      ...e,
      outletLabel: [...e.outlets].map(outletShort).join(", ") || "—",
      tepat: e.hadir - e.telat,
      kepatuhan: pct(e.hadir - e.telat, e.hadir),
      avgLate: e.telat ? e.lateSum / e.telat : 0,
      avgIn: e.hadir ? e.inSum / e.hadir : null,
      days: e.days.sort((a, b) => String(a.work_date).localeCompare(String(b.work_date))),
    }));
  }, [scoped, outletShort]);

  const topLate = useMemo(
    () => employees.filter((e) => e.telat > 0)
      .sort((a, b) => b.telat - a.telat || b.lateSum - a.lateSum)
      .slice(0, 5),
    [employees],
  );

  const visibleEmployees = useMemo(() => {
    const list = employees.filter((e) => {
      if (empFilter === "pernah_telat") return e.telat > 0;
      if (empFilter === "sering_telat") return e.telat >= 3;
      if (empFilter === "sempurna") return e.hadir > 0 && e.telat === 0;
      if (empFilter === "belum_out") return e.noOut > 0;
      return true;
    });
    const getters = {
      employee_name: (e) => (e.employee_name || "").toLowerCase(),
      hadir: (e) => e.hadir,
      telat: (e) => e.telat,
      kepatuhan: (e) => e.kepatuhan,
      lateSum: (e) => e.lateSum,
      avgLate: (e) => e.avgLate,
      avgIn: (e) => e.avgIn ?? -1,
    };
    const g = getters[sort.col] || getters.telat;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = g(a);
      const bv = g(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return (a.employee_name || "").localeCompare(b.employee_name || "", "id");
    });
  }, [employees, empFilter, sort]);

  const toggleSort = (col) => setSort((prev) => ({ col, dir: prev.col === col && prev.dir === "desc" ? "asc" : "desc" }));

  const lateToday = useMemo(
    () => (focusDate ? scoped.filter((r) => r.late).sort((a, b) => b.lateMin - a.lateMin) : []),
    [scoped, focusDate],
  );

  const [exporting, setExporting] = useState(false);
  // Export mengikuti semua filter dashboard: periode/tanggal fokus, outlet, posisi, karyawan, dan pill rekap
  const exportExcel = async () => {
    setExporting(true);
    try {
      const { exportAbsensiWaschenExcel } = await import("./utils/exportAbsensiWaschen");
      const visibleIds = new Set(visibleEmployees.map((e) => String(e.employee_id)));
      const outlet = { name: hrisFilters.outletIds.map((id) => outletById.get(String(id))?.name).filter(Boolean).join(", ") };
      const pill = EMP_FILTERS.find((f) => f.id === empFilter);
      exportAbsensiWaschenExcel({
        records: scoped.filter((r) => visibleIds.has(String(r.employee_id))),
        startDate: focusDate || startDate,
        endDate: focusDate || endDate,
        periodLabel: focusDate || cutoff.todayOnly || cutoff.isCustomDate ? "" : cutoff.periodLabel,
        filters: {
          outlet: outlet ? outlet.name : "",
          role: hrisFilters.role,
          status: empFilter !== "semua" ? pill?.label : "",
          employees: selectedEmpIds.map((id) => employeeOptions.find((o) => o.id === id)?.name || `#${id}`),
        },
        outletName: (id) => {
          const o = outletById.get(String(id));
          return o ? (o.outlet_code ? `${o.outlet_code} · ${o.name}` : o.name) : "";
        },
      });
    } catch (err) {
      setError(err.message || "Gagal export Excel");
    } finally {
      setExporting(false);
    }
  };

  const limitHit = rows.length >= FETCH_LIMIT;
  const kpiTone = complianceTone(kpi.kepatuhan);

  return (
    <div className="space-y-4">
      {/* Filter — sama dengan halaman HRIS lain */}
      <section className={FILTER_SECTION}>
        <div className="mb-3 sm:mb-4 flex items-center gap-2">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">Filter Periode & Data</h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Jam masuk <b>08:00</b>. Check-in setelah 08:00 dihitung terlambat.
            </p>
          </div>
          <button type="button" onClick={() => load()} title="Muat ulang" className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <div className="space-y-3">
          <CutoffPeriodFilter cutoff={cutoff} showToday />
          <HrisOutletRoleFilter
            multiple
            outlets={hrisFilters.outlets}
            outletIds={hrisFilters.outletIds}
            onOutletIdsChange={hrisFilters.setOutletIds}
            roles={hrisFilters.roles}
            onRolesChange={hrisFilters.setRoles}
          />
          <EmployeeMultiSelect
            options={employeeOptions}
            selected={selectedEmpIds}
            onChange={setSelectedEmpIds}
            disabled={loading && !employeeOptions.length}
          />
          {selectedEmpIds.length > 0 && (
            <p className="text-[11px] text-slate-500">
              Seluruh angka dan grafik di bawah hanya untuk <b className="text-slate-700">{selectedEmpIds.length} karyawan</b> terpilih.
            </p>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
          <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {limitHit && (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
          Data mencapai batas {FETCH_LIMIT.toLocaleString("id-ID")} record. Persempit periode atau filter outlet agar angka akurat.
        </div>
      )}

      {focusDate && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#5f1340]/20 bg-[#5f1340]/5 px-4 py-2.5 text-xs">
          <HiOutlineCalendarDays className="h-4 w-4 text-[#5f1340]" />
          <span className="font-semibold text-[#5f1340]">Fokus: {fmtDayLong(focusDate)}</span>
          <span className="text-slate-500">Semua angka di bawah grafik tren hanya untuk tanggal ini.</span>
          <button type="button" onClick={() => setFocusDate(null)} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
            <HiOutlineXMark className="h-3.5 w-3.5" /> Kembali ke periode
          </button>
        </div>
      )}

      {/* KPI */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white border border-slate-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <KpiCard icon={HiOutlineUserGroup} label="Kehadiran" value={kpi.hadir} sub={`${kpi.people} karyawan`} />
          <KpiCard
            icon={HiOutlineCheckBadge}
            label="Tepat Waktu"
            value={kpi.tepat}
            sub={`${kpi.kepatuhan}% kepatuhan`}
            tone="emerald"
            active={empFilter === "sempurna"}
            onClick={() => setEmpFilter((f) => (f === "sempurna" ? "semua" : "sempurna"))}
          />
          <KpiCard
            icon={HiOutlineExclamationTriangle}
            label="Terlambat"
            value={kpi.telat}
            sub={`${kpi.latePeople} orang · ${pct(kpi.telat, kpi.hadir)}%`}
            tone="rose"
            active={empFilter === "pernah_telat"}
            onClick={() => setEmpFilter((f) => (f === "pernah_telat" ? "semua" : "pernah_telat"))}
          />
          <KpiCard icon={HiOutlineClock} label="Rata-rata Telat" value={fmtLate(kpi.avgLate)} sub={`Total ${fmtLate(kpi.totalLate)}`} tone="amber" />
          <KpiCard icon={HiOutlineClock} label="Rata-rata Masuk" value={fmtClock(kpi.avgIn)} sub="Jam check-in" tone="brand" />
          <KpiCard
            icon={HiOutlineCalendarDays}
            label="Belum Check-out"
            value={kpi.noOut}
            sub={kpi.noIn ? `${kpi.noIn} tanpa check-in` : "Absen tidak lengkap"}
            active={empFilter === "belum_out"}
            onClick={() => setEmpFilter((f) => (f === "belum_out" ? "semua" : "belum_out"))}
          />
        </div>
      )}

      {/* Kepatuhan + Tren */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={cn(TABLE_SECTION, "lg:col-span-1")}>
          <SectionHead icon={HiOutlineCheckBadge} title="Tingkat Kepatuhan" sub={focusDate ? fmtDayShort(focusDate) : cutoff.todayOnly ? "Hari ini" : cutoff.rangeLabelShort} />
          <div className="flex flex-col items-center gap-4 p-4 sm:p-5">
            <ComplianceRing value={loading ? 0 : kpi.kepatuhan} />
            <div className="w-full space-y-2">
              <div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-emerald-700">Tepat waktu (≤ 08:00)</span>
                  <span className="tabular-nums text-slate-600">{kpi.tepat}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct(kpi.tepat, kpi.hadir)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-semibold">
                  <span className="text-rose-700">Terlambat (&gt; 08:00)</span>
                  <span className="tabular-nums text-slate-600">{kpi.telat}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${pct(kpi.telat, kpi.hadir)}%` }} />
                </div>
              </div>
            </div>
            <p className={cn("w-full rounded-xl border px-3 py-2 text-[11px] font-semibold", kpiTone.chip)}>
              {kpi.hadir === 0
                ? "Belum ada data check-in pada periode ini."
                : kpi.kepatuhan >= 90
                  ? "Kepatuhan sangat baik. Pertahankan."
                  : kpi.kepatuhan >= 75
                    ? "Kepatuhan cukup. Masih ada ruang perbaikan."
                    : "Kepatuhan rendah. Perlu tindak lanjut HR."}
            </p>
          </div>
        </section>

        <section className={cn(TABLE_SECTION, "lg:col-span-2")}>
          <SectionHead
            icon={HiOutlineCalendarDays}
            title="Tren Harian"
            sub="Batang = jumlah check-in, garis = % kepatuhan. Klik batang untuk fokus ke tanggal itu."
            right={worstDay && worstDay.kepatuhan < 100 && (
              <button
                type="button"
                onClick={() => setFocusDate(worstDay.date)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
              >
                <HiOutlineFire className="h-3.5 w-3.5" /> Terburuk: {worstDay.label} ({worstDay.kepatuhan}%)
              </button>
            )}
          />
          <div className="h-72 px-2 py-3 sm:px-4">
            {loading ? (
              <div className="h-full animate-pulse rounded-xl bg-slate-50" />
            ) : trend.every((d) => d.hadir === 0) ? (
              <div className="grid h-full place-items-center text-xs font-semibold text-slate-400">Tidak ada data absensi</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                  <YAxis yAxisId="n" allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} unit="%" width={40} />
                  <Tooltip content={<TrendTooltip />} cursor={{ fill: "rgba(95,19,64,0.06)" }} />
                  <Bar yAxisId="n" dataKey="tepat" stackId="a" fill={C_ONTIME} name="Tepat waktu" cursor="pointer" onClick={(d) => d?.payload && setFocusDate(d.payload.date)}>
                    {trend.map((d) => <Cell key={d.date} fill={C_ONTIME} fillOpacity={focusDate && focusDate !== d.date ? 0.3 : 1} />)}
                  </Bar>
                  <Bar yAxisId="n" dataKey="telat" stackId="a" fill={C_LATE} name="Terlambat" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => d?.payload && setFocusDate(d.payload.date)}>
                    {trend.map((d) => <Cell key={d.date} fill={C_LATE} fillOpacity={focusDate && focusDate !== d.date ? 0.3 : 1} />)}
                  </Bar>
                  <Line yAxisId="p" type="monotone" dataKey="kepatuhan" stroke={C_BRAND} strokeWidth={2} dot={{ r: 2.5 }} connectNulls name="Kepatuhan" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-2.5 text-[11px] font-semibold text-slate-500 sm:px-5">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_ONTIME }} />Tepat waktu</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_LATE }} />Terlambat</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C_BRAND }} />% Kepatuhan</span>
          </div>
        </section>
      </div>

      {/* Daftar terlambat pada tanggal fokus */}
      {focusDate && (
        <section className={TABLE_SECTION}>
          <SectionHead icon={HiOutlineExclamationTriangle} title={`Terlambat ${fmtDayShort(focusDate)}`} sub={`${lateToday.length} dari ${kpi.hadir} check-in terlambat, urut dari yang paling lama.`} />
          {lateToday.length === 0 ? (
            <p className="py-10 text-center text-xs font-semibold text-emerald-700">Semua karyawan check-in tepat waktu di tanggal ini 🎉</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 sm:p-4">
              {lateToday.map((r) => (
                <div key={r.attendance_id} className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2.5">
                  <div className="grid h-10 w-14 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold tabular-nums text-rose-700 ring-1 ring-rose-200">
                    {fmtClock(r.inMin)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">{fmtEmployeeName(r.employee_name)}</p>
                    <p className="truncate text-[10px] text-slate-500">{r.role_code || "—"} · {outletName(r.outlet_id)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">+{fmtLate(r.lateMin)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Distribusi jam masuk + per hari + perlu perhatian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={TABLE_SECTION}>
          <SectionHead icon={HiOutlineClock} title="Distribusi Jam Masuk" sub="Seberapa jauh dari jam 08:00." />
          <div className="h-60 px-2 py-3">
            {loading ? <div className="h-full animate-pulse rounded-xl bg-slate-50" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<SimpleTooltip />} cursor={{ fill: "rgba(95,19,64,0.06)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((b) => <Cell key={b.id} fill={b.late ? C_LATE : C_ONTIME} fillOpacity={b.late ? 0.55 + BUCKETS.indexOf(b) * 0.1 : 0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={TABLE_SECTION}>
          <SectionHead icon={HiOutlineCalendarDays} title="Keterlambatan per Hari" sub="Hari dengan % terlambat tertinggi." />
          <div className="space-y-2.5 p-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-6 animate-pulse rounded bg-slate-50" />)
            ) : byWeekday.length === 0 ? (
              <p className="py-10 text-center text-xs font-semibold text-slate-400">Tidak ada data</p>
            ) : (() => {
              const max = Math.max(...byWeekday.map((d) => d.lateRate), 1);
              return byWeekday.map((d) => (
                <div key={d.label} title={`${d.telat} terlambat dari ${d.hadir} check-in`}>
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-slate-700">{d.label}</span>
                    <span className="tabular-nums text-slate-500">{d.lateRate}% <span className="text-slate-400">({d.telat}/{d.hadir})</span></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${(d.lateRate / max) * 100}%`, opacity: d.lateRate === max ? 1 : 0.6 }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>

        <section className={TABLE_SECTION}>
          <SectionHead icon={HiOutlineFire} title="Perlu Perhatian" sub="Paling sering terlambat." />
          <div className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <div key={i} className="m-3 h-10 animate-pulse rounded-lg bg-slate-50" />)
            ) : topLate.length === 0 ? (
              <p className="py-10 text-center text-xs font-semibold text-emerald-700">Tidak ada karyawan terlambat 🎉</p>
            ) : topLate.map((e, i) => (
              <button
                key={e.employee_id}
                type="button"
                onClick={() => {
                  setOpenEmp(e.employee_id);
                  setSelectedEmpIds((cur) => (cur.includes(String(e.employee_id)) ? cur : [...cur, String(e.employee_id)]));
                  setEmpFilter("semua");
                  document.getElementById("hr-rekap-karyawan")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
              >
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold", i === 0 ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{fmtEmployeeName(e.employee_name)}</p>
                  <p className="truncate text-[10px] text-slate-500">{e.role_code || "—"} · total {fmtLate(e.lateSum)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-rose-700">{e.telat}x</p>
                  <p className="text-[10px] text-slate-400">dari {e.hadir}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Per outlet / posisi */}
      <section className={TABLE_SECTION}>
        <SectionHead
          icon={HiOutlineBuildingStorefront}
          title={groupBy === "outlet" ? "Kepatuhan per Outlet" : "Kepatuhan per Posisi"}
          sub={groupBy === "outlet" ? "Urut dari kepatuhan terendah. Klik outlet untuk memfilter seluruh dashboard." : "Urut dari kepatuhan terendah. Klik posisi untuk memfilter seluruh dashboard."}
          right={(
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[{ id: "outlet", label: "Outlet" }, { id: "role", label: "Posisi" }].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setGroupBy(t.id)}
                  className={cn("rounded-lg px-3 py-1 text-[11px] font-bold transition", groupBy === t.id ? "bg-[#5f1340] text-white" : "text-slate-500 hover:bg-white")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        />
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-50" />)}</div>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center text-xs font-semibold text-slate-400">Tidak ada data</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 p-3 sm:p-4">
            {groups.map((g) => {
              const t = complianceTone(g.kepatuhan);
              const active = groupBy === "outlet" ? hrisFilters.outletIds.includes(g.key) : hrisFilters.roles.includes(g.key);
              // Filter outlet hanya mengenal mst_outlet; lokasi absen & id tak dikenal tidak bisa difilter
              const isLocation = groupBy === "outlet" && absenLocationById.has(g.key);
              const unknown = groupBy === "outlet" ? !outletById.has(g.key) && !isLocation : g.key === "Tanpa posisi";
              const notFilterable = unknown || isLocation;
              return (
                <button
                  key={g.key}
                  type="button"
                  disabled={notFilterable}
                  title={isLocation
                    ? "Lokasi backup (non-outlet) dari Waschen Mobile"
                    : unknown ? "Tidak terdaftar di master, tidak bisa dipakai sebagai filter" : undefined}
                  onClick={() => {
                    const toggle = (list) => (active ? list.filter((x) => x !== g.key) : [...list, g.key]);
                    if (groupBy === "outlet") hrisFilters.setOutletIds(toggle);
                    else hrisFilters.setRoles(toggle);
                  }}
                  className={cn(
                    "rounded-xl px-3 py-2 text-left transition",
                    unknown && "cursor-default border border-dashed border-amber-300 bg-amber-50/40",
                    isLocation && "cursor-default",
                    !notFilterable && "hover:bg-slate-50",
                    active && "bg-[#5f1340]/5 ring-1 ring-[#5f1340]/20",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span className="truncate">{g.label}</span>
                      {isLocation && <span className="shrink-0 rounded-full bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 ring-1 ring-sky-200">Lokasi Backup</span>}
                    </p>
                    <p className={cn("shrink-0 text-sm font-bold tabular-nums", t.text)}>{g.kepatuhan}%</p>
                  </div>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-emerald-500" style={{ width: `${pct(g.hadir - g.telat, g.hadir)}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${pct(g.telat, g.hadir)}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {g.people} karyawan · {g.hadir} check-in · <span className="text-rose-600 font-semibold">{g.telat} terlambat</span>
                    {g.telat > 0 && ` · rata-rata ${fmtLate(g.avgLate)}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Rekap per karyawan */}
      <section id="hr-rekap-karyawan" className={cn(TABLE_SECTION, "scroll-mt-4")}>
        <SectionHead
          icon={HiOutlineUserGroup}
          title="Rekap Kepatuhan Karyawan"
          sub="Klik baris untuk melihat jam masuk harian. Klik judul kolom untuk mengurutkan."
          right={(
            <button
              type="button"
              onClick={exportExcel}
              disabled={!visibleEmployees.length || exporting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
            >
              <HiOutlineArrowDownTray className="h-3.5 w-3.5" /> {exporting ? "Mengekspor..." : "Export Excel"}
            </button>
          )}
        />
        <div className="space-y-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <FilterScroll>
            {EMP_FILTERS.map((f) => (
              <FilterPill key={f.id} active={empFilter === f.id} onClick={() => setEmpFilter(f.id)}>{f.label}</FilterPill>
            ))}
          </FilterScroll>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-50" />)}</div>
        ) : visibleEmployees.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <HiOutlineUserGroup className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm font-semibold">Tidak ada karyawan yang cocok</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {visibleEmployees.map((e) => {
                const t = complianceTone(e.kepatuhan);
                const open = openEmp === e.employee_id;
                return (
                  <div key={e.employee_id}>
                    <button type="button" onClick={() => setOpenEmp(open ? null : e.employee_id)} className="w-full px-4 py-3 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">{fmtEmployeeName(e.employee_name)}</p>
                          <p className="truncate text-[11px] text-slate-500">{e.role_code || "—"} · {e.outletLabel}</p>
                        </div>
                        <p className={cn("shrink-0 text-lg font-bold tabular-nums", t.text)}>{e.kepatuhan}%</p>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${e.kepatuhan}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">Hadir {e.hadir}</span>
                        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">Tepat {e.tepat}</span>
                        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700">Telat {e.telat}</span>
                        {e.telat > 0 && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-800">Total {fmtLate(e.lateSum)}</span>}
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">Masuk ~{fmtClock(e.avgIn)}</span>
                      </div>
                    </button>
                    {open && <EmployeeDays emp={e} outletName={outletName} />}
                  </div>
                );
              })}
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <SortTh col="employee_name" label="Karyawan" sort={sort} onSort={toggleSort} />
                    <th className="px-4 py-3 font-semibold">Outlet</th>
                    <SortTh col="hadir" label="Hadir" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="telat" label="Terlambat" sort={sort} onSort={toggleSort} align="center" />
                    <SortTh col="kepatuhan" label="Kepatuhan" sort={sort} onSort={toggleSort} />
                    <SortTh col="lateSum" label="Total Telat" sort={sort} onSort={toggleSort} />
                    <SortTh col="avgLate" label="Rata² Telat" sort={sort} onSort={toggleSort} />
                    <SortTh col="avgIn" label="Rata² Masuk" sort={sort} onSort={toggleSort} align="center" />
                    <th className="px-4 py-3 font-semibold">Terakhir Telat</th>
                    <th className="w-8 px-2 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleEmployees.map((e) => {
                    const t = complianceTone(e.kepatuhan);
                    const open = openEmp === e.employee_id;
                    return (
                      <Fragment key={e.employee_id}>
                        <tr onClick={() => setOpenEmp(open ? null : e.employee_id)} className={cn("cursor-pointer hover:bg-slate-50/80", open && "bg-slate-50/80")}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{fmtEmployeeName(e.employee_name)}</p>
                            <p className="text-[10px] text-slate-400">{e.role_code || "—"}{e.employee_code ? ` · ${e.employee_code}` : ""}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600">{e.outletLabel}</td>
                          <td className="px-4 py-3 text-center tabular-nums text-slate-700">
                            {e.hadir}
                            {e.noOut > 0 && <p className="text-[10px] font-semibold text-amber-600">{e.noOut} blm out</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums", e.telat ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>{e.telat}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${e.kepatuhan}%` }} />
                              </div>
                              <span className={cn("font-bold tabular-nums", t.text)}>{e.kepatuhan}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">{e.telat ? fmtLate(e.lateSum) : "—"}</td>
                          <td className="px-4 py-3 tabular-nums text-slate-700">
                            {e.telat ? fmtLate(e.avgLate) : "—"}
                            {e.maxLate > 0 && <p className="text-[10px] text-slate-400">maks {fmtLate(e.maxLate)}</p>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono tabular-nums text-slate-700">{fmtClock(e.avgIn)}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.lastLate ? fmtDateShort(e.lastLate) : "—"}</td>
                          <td className="px-2 py-3 text-slate-400">{open ? <HiOutlineChevronUp className="h-4 w-4" /> : <HiOutlineChevronDown className="h-4 w-4" />}</td>
                        </tr>
                        {open && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <EmployeeDays emp={e} outletName={outletName} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500 sm:px-5">
              {visibleEmployees.length} dari {employees.length} karyawan
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function EmployeeMultiSelect({ options, selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = q
    ? options.filter((o) => `${o.name} ${o.code || ""} ${o.role || ""}`.toLowerCase().includes(q))
    : options;

  const toggle = (id) => onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const selectAllMatches = () => onChange([...new Set([...selected, ...matches.map((o) => o.id)])]);
  const allMatchesSelected = matches.length > 0 && matches.every((o) => selectedSet.has(o.id));

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        onClick={() => { if (disabled) return; setOpen(true); inputRef.current?.focus(); }}
        className={cn(
          "flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white py-1.5 pl-9 pr-9 text-xs transition",
          open ? "border-[#5f1340]/40" : "border-slate-200",
          disabled ? "cursor-not-allowed opacity-60" : "cursor-text",
        )}
      >
        <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-[13px] h-4 w-4 text-slate-400" />
        {selected.map((id) => (
          <span key={id} className="inline-flex max-w-[180px] items-center gap-1 rounded-lg bg-[#5f1340]/10 py-0.5 pl-2 pr-1 text-[11px] font-semibold text-[#5f1340]">
            <span className="truncate">{byId.get(id)?.name || `#${id}`}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(id); }}
              className="rounded p-0.5 hover:bg-[#5f1340]/15"
              aria-label="Hapus dari pilihan"
            >
              <HiOutlineXMark className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && selected.length) onChange(selected.slice(0, -1));
            if (e.key === "Enter" && matches.length === 1) { e.preventDefault(); toggle(matches[0].id); setQuery(""); }
          }}
          placeholder={selected.length ? "Tambah karyawan..." : "Cari & pilih karyawan (bisa lebih dari satu)..."}
          className="min-w-[140px] flex-1 bg-transparent py-1 outline-none placeholder:text-slate-400"
        />
        {selected.length > 0 && (
          <button
            type="button"
            title="Hapus semua pilihan"
            onClick={(e) => { e.stopPropagation(); onChange([]); setQuery(""); }}
            className="absolute right-2 top-[9px] rounded-lg p-1 text-slate-400 hover:bg-slate-100"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px]">
            <span className="text-slate-500">
              {matches.length} karyawan{q ? " cocok" : ""} · <b className="text-slate-700">{selected.length} dipilih</b>
            </span>
            <div className="flex items-center gap-2">
              {matches.length > 0 && !allMatchesSelected && (
                <button type="button" onClick={selectAllMatches} className="font-semibold text-[#5f1340] hover:underline">
                  Pilih {q ? "semua hasil" : "semua"}
                </button>
              )}
              {selected.length > 0 && (
                <button type="button" onClick={() => onChange([])} className="font-semibold text-slate-500 hover:underline">Kosongkan</button>
              )}
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {matches.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-400">Tidak ada karyawan yang cocok</li>
            ) : matches.map((o) => {
              const checked = selectedSet.has(o.id);
              return (
                <li key={o.id} role="option" aria-selected={checked}>
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50", checked && "bg-[#5f1340]/5")}
                  >
                    <span className={cn(
                      "grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] font-bold",
                      checked ? "border-[#5f1340] bg-[#5f1340] text-white" : "border-slate-300 bg-white",
                    )}
                    >
                      {checked ? "✓" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-800">{o.name}</span>
                      <span className="block truncate text-[10px] text-slate-400">{[o.role, o.code].filter(Boolean).join(" · ") || "—"}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmployeeDays({ emp, outletName }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Jam masuk harian</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
        {emp.days.map((d) => {
          const tone = !d.hasIn
            ? "border-slate-200 bg-white text-slate-400"
            : d.late
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700";
          return (
            <div key={d.attendance_id} className={cn("rounded-lg border px-2 py-1.5", tone)} title={outletName(d.outlet_id)}>
              <p className="text-[10px] font-semibold text-slate-500">{fmtDayShort(d.work_date)}</p>
              <p className="text-sm font-bold tabular-nums">{d.hasIn ? fmtClock(d.inMin) : "—"}</p>
              <p className="text-[10px] font-semibold">
                {!d.hasIn ? "Tanpa check-in" : d.late ? `+${fmtLate(d.lateMin)}` : "Tepat"}
                {d.noOut ? " · blm out" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
