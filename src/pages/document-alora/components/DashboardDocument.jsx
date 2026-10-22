import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../../../lib/api";
import { DetailModal } from "./MasterDocument";
import {
  HiOutlineArrowPath,
  HiOutlineXMark,
  HiOutlineBellAlert,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationCircle,
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
  HiOutlineTableCells,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

// Palet 3 kelas (divalidasi: CVD ΔE ≥ 18, normal ≥ 24). Amber < 3:1 kontras → selalu ada label angka + tabel.
const COLOR = { late: "#dc2626", soon: "#f59e0b", ok: "#2563eb" };

// Segmen batang "Risiko per Entitas" → judul modal + bucket yang dibuka
const SEGMENT = {
  expired: { title: "Kadaluarsa", expiry: "expired" },
  soon:    { title: "Habis ≤ 90 Hari", expiry: "soon" },
  ok:      { title: "Aman", expiry: "ok" },
};

const MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_ID[m - 1]} ${String(y).slice(2)}`;
};

const formatDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const toTitleCase = (str) =>
  str ? String(str).toLowerCase().replace(/(?:^|\s+)\S/g, (c) => c.toUpperCase()) : "";

const daysText = (d) => (d < 0 ? `Lewat ${-d} hari` : d === 0 ? "Hari ini" : `${d} hari lagi`);

const daysCls = (d) =>
  d <= 30 ? "border-rose-200 bg-rose-50 text-rose-700"
  : d <= 60 ? "border-orange-200 bg-orange-50 text-orange-700"
  : "border-amber-200 bg-amber-50 text-amber-700";

const entityName = (r) => {
  if (!r.company_id) return r.entity;
  const base = r.entity_company_name || r.entity;
  return r.entity_outlet_name ? `${base} – ${r.entity_outlet_name}` : base;
};

// Kunci scroll halaman selama modal terbuka: body + container scroll layout ([data-scroll-lock-root] di index.jsx).
let scrollLockCount = 0;
let scrollLockSaved = [];
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    if (scrollLockCount++ === 0) {
      const els = [document.body, ...document.querySelectorAll("[data-scroll-lock-root]")];
      scrollLockSaved = els.map(el => [el, el.style.overflow]);
      els.forEach(el => { el.style.overflow = "hidden"; });
    }
    return () => {
      if (--scrollLockCount === 0) {
        scrollLockSaved.forEach(([el, overflow]) => { el.style.overflow = overflow; });
        scrollLockSaved = [];
      }
    };
  }, [active]);
}

const LOAN_STATUS = {
  borrowed: ["Dipinjam", "border-blue-200 bg-blue-50 text-blue-700"],
  returned: ["Dikembalikan", "border-emerald-200 bg-emerald-50 text-emerald-700"],
  overdue:  ["Terlambat", "border-rose-200 bg-rose-50 text-rose-700"],
  lost:     ["Hilang", "border-slate-300 bg-slate-100 text-slate-600"],
};

// Badge sisa hari dari tanggal kadaluarsa (dihitung di klien; dipakai di modal daftar)
function DaysBadge({ date }) {
  if (!date) return null;
  const d = Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const cls = d > 90 ? "border-slate-200 bg-slate-50 text-slate-500" : daysCls(d);
  return <span className={cn("mt-0.5 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", cls)}>{daysText(d)}</span>;
}

// ── Modal daftar (isi angka/grafik yang diklik) ──────────────────────────────
// spec = { title, subtitle, kind: "docs" | "loans", query: { ...param API } }
const LIST_LIMIT = 100;

function ListModal({ spec, onClose, onSelectDoc }) {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useScrollLock(!!spec);

  useEffect(() => {
    if (!spec) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(""); setRows([]);
      try {
        const q = new URLSearchParams({ limit: LIST_LIMIT, ...spec.query });
        const path = spec.kind === "loans" ? "transactions" : "documents";
        const d = await api(`/doc-alora/${path}?${q}`);
        if (cancelled) return;
        setRows(d.data || []);
        setTotal(d.total || 0);
      } catch (err) {
        if (!cancelled) setError(err.message || "Gagal memuat data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [spec]);

  useEffect(() => {
    if (!spec) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [spec, onClose]);

  if (!spec) return null;
  const isLoans = spec.kind === "loans";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-labelledby="dash-list-title"
        className="relative flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 id="dash-list-title" className="text-base font-bold text-slate-900">{spec.title}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {loading ? "Memuat…" : `${total} ${isLoans ? "peminjaman" : "dokumen"}${spec.subtitle ? ` · ${spec.subtitle}` : ""}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup"
            className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-rose-600">{error}</p>
          ) : rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">Tidak ada data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {isLoans ? (
                      <><th className="py-2 pr-3">Dokumen</th><th className="px-3 py-2">Peminjam</th><th className="px-3 py-2">Batas Kembali</th><th className="px-3 py-2 text-right">Status</th></>
                    ) : (
                      <><th className="py-2 pr-3">Dokumen</th><th className="px-3 py-2">Entitas</th><th className="px-3 py-2">PIC</th><th className="px-3 py-2 text-right">Berakhir</th></>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(r => isLoans ? (
                    <tr key={r.id}>
                      <td className="max-w-[280px] py-2.5 pr-3">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.document_name}</p>
                        <p className="truncate text-[11px] text-slate-400">{r.transaction_code} · {r.document_number}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-slate-700">{toTitleCase(r.borrower_name) || "—"}</p>
                        <p className="text-[11px] text-slate-400">{r.department_name || "—"}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-slate-600">{formatDate(r.return_due)}</p>
                        <p className="text-[11px] text-slate-400">pinjam {formatDate(r.borrow_date)}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {(() => {
                          const late = r.status === "borrowed" && r.return_due && new Date(r.return_due) < new Date(new Date().toDateString());
                          const [label, cls] = LOAN_STATUS[late ? "overdue" : r.status] || LOAN_STATUS.borrowed;
                          return <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold", cls)}>{label}</span>;
                        })()}
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} tabIndex={0} onClick={() => onSelectDoc(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") onSelectDoc(r); }}
                      className="cursor-pointer transition hover:bg-blue-50/40 focus:bg-blue-50/40 focus:outline-none">
                      <td className="max-w-[280px] py-2.5 pr-3">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.document_name}</p>
                        <p className="truncate text-[11px] text-slate-400">{r.document_numbers || r.document_number}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{entityName(r)}</td>
                      <td className="px-3 py-2.5">
                        <p className="text-xs text-slate-700">{toTitleCase(r.pic_name) || "—"}</p>
                        <p className="text-[11px] text-slate-400">{r.department_name || "—"}</p>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <p className="text-xs text-slate-600">{formatDate(r.expiry_date)}</p>
                        <DaysBadge date={r.expiry_date} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {total > rows.length && (
                <p className="mt-3 text-center text-[11px] text-slate-400">Menampilkan {rows.length} dari {total}. Persempit dengan filter entitas.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <p className="text-[11px] text-slate-400">{!isLoans && rows.length > 0 ? "Klik baris untuk melihat detail dokumen" : ""}</p>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kartu bagian ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, right, children, className }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200/80 bg-white shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

// Kartu grafik dengan toggle Grafik/Tabel (tabel = padanan aksesibel dari grafik)
function ChartCard({ title, subtitle, legend, table, children }) {
  const [view, setView] = useState("chart");
  return (
    <Card title={title} subtitle={subtitle}
      right={
        <div className="flex shrink-0 rounded-lg border border-slate-200 p-0.5">
          {[["chart", HiOutlineChartBar, "Grafik"], ["table", HiOutlineTableCells, "Tabel"]].map(([v, Icon, label]) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} title={label}
              className={cn("flex h-6 w-7 items-center justify-center rounded-md transition",
                view === v ? "bg-blue-900 text-white" : "text-slate-400 hover:text-slate-700")}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      }>
      {view === "chart" ? (
        <>
          {legend && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {legend.map(l => (
                <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l.color }} />{l.label}
                </span>
              ))}
            </div>
          )}
          {children}
        </>
      ) : (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>{table.columns.map((c, i) => <th key={c} className={cn("px-3 py-2", i > 0 && "text-right")}>{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {table.rows.map((r, i) => (
                <tr key={i}>{r.map((v, j) => <td key={j} className={cn("px-3 py-2", j > 0 && "text-right tabular-nums")}>{v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ChartTooltip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-800">{label ?? payload[0].payload.name}</p>
      {render(payload)}
    </div>
  );
}

// ── Tile KPI ─────────────────────────────────────────────────────────────────
function Tile({ icon: Icon, label, value, hint, accent, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}1a`, color: accent }}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
    </button>
  );
}

// ── Daftar bar horizontal ringan (PIC / Departemen) ──────────────────────────
function RiskBars({ rows, empty, onSelect }) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>;
  const max = Math.max(...rows.map(r => r.expired + r.soon), 1);
  return (
    <ul className="space-y-3">
      {rows.map(r => (
        <li key={r.id ?? r.name}>
          <button type="button" onClick={() => onSelect(r)}
            className="-mx-2 block w-[calc(100%+1rem)] rounded-lg px-2 py-1 text-left transition hover:bg-slate-50">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-xs font-semibold text-slate-700">{toTitleCase(r.name) || "—"}</p>
            <p className="shrink-0 text-[11px] text-slate-400 tabular-nums">
              {r.expired > 0 && <span className="font-semibold text-rose-600">{r.expired} lewat · </span>}
              <span className="font-semibold text-slate-700">{r.expired + r.soon}</span> dari {r.total}
            </p>
          </div>
          <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
            <div style={{ width: `${(r.expired / max) * 100}%`, background: COLOR.late }} />
            <div style={{ width: `${(r.soon / max) * 100}%`, background: COLOR.soon }} />
          </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Halaman ──────────────────────────────────────────────────────────────────
export default function DashboardDocument() {
  const [company, setCompany]     = useState("");
  const [companies, setCompanies] = useState([]);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [peopleTab, setPeopleTab] = useState("pic");
  const [listSpec, setListSpec]   = useState(null);   // modal daftar
  const [detailRow, setDetailRow] = useState(null);   // modal detail dokumen

  useEffect(() => {
    api("/doc-alora/lookup/companies").then(r => setCompanies(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = company ? `?company_id=${company}` : "";
      setData(await api(`/doc-alora/dashboard/overview${q}`));
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard");
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const companyName = useMemo(() => {
    if (!company) return "";
    if (company === "custom") return "Lainnya (custom)";
    return companies.find(c => String(c.company_id) === company)?.company_name || "";
  }, [company, companies]);

  // Buka modal daftar dengan filter yang sama persis dengan angka di dashboard.
  // opts.company_id menimpa filter entitas dashboard (klik batang entitas).
  const openList = useCallback((title, query = {}, opts = {}) => {
    const { kind = "docs", subtitle, company_id } = opts;
    const q = { ...query };
    const scope = company_id ?? company;
    if (scope) q.company_id = scope;
    if (kind === "docs") { q.sort_by = "expiry_date"; q.sort_dir = "asc"; }
    const scopeName = company_id != null
      ? (company_id === "custom" ? "Lainnya (custom)" : companies.find(c => String(c.company_id) === String(company_id))?.company_name)
      : companyName;
    setListSpec({ title, kind, query: q, subtitle: subtitle ?? scopeName });
  }, [company, companyName, companies]);

  const monthData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Terlewat", count: data.counts.expired, color: COLOR.late },
      ...data.months.map((m, i) => ({ name: monthLabel(m.ym), count: m.count, color: i <= 2 ? COLOR.soon : COLOR.ok })),
    ];
  }, [data]);

  const entityData = useMemo(() => (data?.by_entity || []).map(e => ({
    ...e, ok: Math.max(0, e.total - e.expired - e.soon),
  })), [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-32 text-center">
        <HiOutlineExclamationTriangle className="h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={load} className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Coba lagi</button>
      </div>
    );
  }

  const { counts, attention, loans } = data;
  const watch   = counts.b60 + counts.b90;
  const pct     = (n) => (counts.total ? Math.round((n / counts.total) * 100) : 0);
  const safeAll = counts.safe + counts.no_expiry;

  // Pesan utama: apa yang harus dilakukan sekarang
  const banner =
    counts.expired > 0 ? {
      tone: "rose", icon: HiOutlineExclamationCircle,
      title: `${counts.expired} dokumen sudah kadaluarsa`,
      body: `${counts.b30 > 0 ? `${counts.b30} lainnya akan habis dalam 30 hari. ` : ""}Segera perpanjang atau ganti dokumen yang sudah lewat.`,
      cta: "Lihat yang kadaluarsa", modalTitle: "Dokumen Kadaluarsa", params: { expiry: "expired" },
    } : counts.b30 > 0 ? {
      tone: "amber", icon: HiOutlineBellAlert,
      title: `${counts.b30} dokumen habis dalam 30 hari`,
      body: `Mulai proses perpanjangan sekarang.${watch > 0 ? ` ${watch} dokumen lain habis dalam 31–90 hari.` : ""}`,
      cta: "Lihat dokumen ≤ 30 hari", modalTitle: "Dokumen Habis ≤ 30 Hari", params: { expiry: "30" },
    } : {
      tone: "emerald", icon: HiOutlineShieldCheck,
      title: "Tidak ada dokumen yang perlu tindakan segera",
      body: watch > 0 ? `${watch} dokumen akan habis dalam 31–90 hari — pantau.` : "Semua dokumen terpantau masih aman lebih dari 90 hari.",
      cta: null,
    };
  const tone = {
    rose:    "border-rose-200 bg-rose-50 text-rose-800",
    amber:   "border-amber-200 bg-amber-50 text-amber-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  }[banner.tone];
  const BannerIcon = banner.icon;

  return (
    <div className="space-y-5 p-6">
      {/* Header + filter entitas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Dashboard Dokumen</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {counts.total} dokumen terpantau
            {counts.inactive > 0 && <> · {counts.inactive} nonaktif/arsip tidak dihitung</>}
            {updatedAt && <> · diperbarui {updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={company} onChange={e => setCompany(e.target.value)} aria-label="Filter entitas"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30">
            <option value="">Semua Entitas</option>
            {companies.map(c => <option key={c.company_id} value={c.company_id}>{c.company_name}</option>)}
            <option value="custom">Lainnya (custom)</option>
          </select>
          <button onClick={load} disabled={loading} title="Muat ulang"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-60">
            <HiOutlineArrowPath className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Pesan utama */}
      <div className={cn("flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4", tone)} role="status">
        <BannerIcon className="h-8 w-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight">{banner.title}</p>
          <p className="mt-0.5 text-sm opacity-80">{banner.body}</p>
        </div>
        {banner.cta && (
          <button onClick={() => openList(banner.modalTitle, banner.params)}
            className="shrink-0 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-black/5 transition hover:bg-white">
            {banner.cta}
          </button>
        )}
      </div>

      {/* KPI: distribusi sisa masa berlaku */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Tile icon={HiOutlineExclamationCircle} label="Kadaluarsa" value={counts.expired} accent="#dc2626"
          hint={`${pct(counts.expired)}% dari terpantau`}
          onClick={() => openList("Dokumen Kadaluarsa", { expiry: "expired" })} />
        <Tile icon={HiOutlineBellAlert} label="≤ 30 Hari" value={counts.b30} accent="#ea580c"
          hint={`${pct(counts.b30)}% · perlu tindakan`}
          onClick={() => openList("Dokumen Habis ≤ 30 Hari", { expiry: "30" })} />
        <Tile icon={HiOutlineClock} label="31–60 Hari" value={counts.b60} accent="#f59e0b"
          hint={`${pct(counts.b60)}% · siapkan perpanjangan`}
          onClick={() => openList("Dokumen Habis 31–60 Hari", { expiry: "60" })} />
        <Tile icon={HiOutlineClock} label="61–90 Hari" value={counts.b90} accent="#eab308"
          hint={`${pct(counts.b90)}% · pantau`}
          onClick={() => openList("Dokumen Habis 61–90 Hari", { expiry: "90" })} />
        <Tile icon={HiOutlineCheckCircle} label="Aman > 90 Hari" value={safeAll} accent="#2563eb"
          hint={`${pct(safeAll)}%${counts.no_expiry ? ` · ${counts.no_expiry} tanpa tgl kadaluarsa` : ""}`}
          onClick={() => openList("Dokumen Aman (> 90 Hari)", { expiry: "ok" })} />
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard title="Jadwal Kadaluarsa 12 Bulan ke Depan"
          subtitle="Kapan dokumen jatuh tempo — rencanakan perpanjangan lebih awal"
          legend={[
            { color: COLOR.late, label: "Sudah lewat" },
            { color: COLOR.soon, label: "≤ 3 bulan" },
            { color: COLOR.ok, label: "Lebih jauh" },
          ]}
          table={{ columns: ["Periode", "Jumlah"], rows: monthData.map(m => [m.name, m.count]) }}>
          <div className="h-64" role="img" aria-label="Grafik jumlah dokumen kadaluarsa per bulan">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthData} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }}
                  content={<ChartTooltip render={(p) => (
                    <p className="text-slate-600"><span className="font-bold text-slate-900">{p[0].value}</span> dokumen</p>
                  )} />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {monthData.map((m, i) => <Cell key={i} fill={m.color} />)}
                  <LabelList dataKey="count" position="top" fontSize={11} fill="#475569"
                    formatter={(v) => (v > 0 ? v : "")} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Risiko per Entitas"
          subtitle="Entitas dengan dokumen paling berisiko di urutan atas — klik batang untuk melihat dokumennya"
          legend={[
            { color: COLOR.late, label: "Kadaluarsa" },
            { color: COLOR.soon, label: "Habis ≤ 90 hari" },
            { color: COLOR.ok, label: "Aman" },
          ]}
          table={{
            columns: ["Entitas", "Kadaluarsa", "≤ 90 hari", "Aman", "Total"],
            rows: entityData.map(e => [e.name, e.expired, e.soon, e.ok, e.total]),
          }}>
          {entityData.length === 0 ? (
            <p className="py-16 text-center text-xs text-slate-400">Belum ada data</p>
          ) : (
            <div style={{ height: Math.max(180, entityData.length * 52 + 16) }} role="img" aria-label="Grafik risiko dokumen per entitas">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={entityData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap={10}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickFormatter={(v) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)} />
                  <Tooltip cursor={{ fill: "rgba(15,23,42,0.04)" }}
                    content={<ChartTooltip render={(p) => {
                      const r = p[0].payload;
                      return (
                        <div className="space-y-0.5 text-slate-600">
                          <p><span className="font-bold" style={{ color: COLOR.late }}>{r.expired}</span> kadaluarsa</p>
                          <p><span className="font-bold text-amber-600">{r.soon}</span> habis ≤ 90 hari</p>
                          <p><span className="font-bold" style={{ color: COLOR.ok }}>{r.ok}</span> aman</p>
                          <p className="border-t border-slate-100 pt-0.5 text-slate-400">Total {r.total}</p>
                        </div>
                      );
                    }} />} />
                  {[["expired", COLOR.late, "#fff"], ["soon", COLOR.soon, "#1e293b"], ["ok", COLOR.ok, "#fff"]].map(([key, fill, text]) => (
                    <Bar key={key} dataKey={key} stackId="risk" fill={fill} stroke="#fff" strokeWidth={2}
                      className="cursor-pointer" maxBarSize={26}
                      onClick={(d) => {
                        const row = d.payload ?? d;
                        openList(`${SEGMENT[key].title} — ${row.name}`, { expiry: SEGMENT[key].expiry }, { company_id: row.company_id == null ? "custom" : String(row.company_id) });
                      }}>
                      <LabelList dataKey={key} position="center" fontSize={11} fontWeight={600} fill={text}
                        formatter={(v) => (v > 0 ? v : "")} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Prioritas tindakan + sisi kanan */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Prioritas Tindakan"
          subtitle={attention.total > 0 ? `Dokumen kadaluarsa atau habis ≤ 90 hari — ${attention.rows.length} paling mendesak dari ${attention.total}` : "Dokumen kadaluarsa atau habis ≤ 90 hari"}
          right={
            attention.total > 0 && (
              <button onClick={() => openList("Dokumen Kadaluarsa & Habis ≤ 90 Hari", { expiry: "risk" })}
                className="shrink-0 text-[12px] font-semibold text-blue-700 hover:underline">
                Lihat semua ({attention.total})
              </button>
            )
          }>
          {attention.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <HiOutlineCheckCircle className="h-9 w-9 text-emerald-400" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada dokumen yang mendekati kadaluarsa</p>
              <p className="text-xs text-slate-400">Semua dokumen terpantau aman lebih dari 90 hari.</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">Dokumen</th>
                    <th className="px-2 py-2">Entitas</th>
                    <th className="px-2 py-2">PIC</th>
                    <th className="px-2 py-2 text-right">Berakhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attention.rows.map(r => (
                    <tr key={r.id} tabIndex={0}
                      onClick={() => setDetailRow(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") setDetailRow(r); }}
                      className="cursor-pointer transition hover:bg-blue-50/40 focus:bg-blue-50/40 focus:outline-none">
                      <td className="max-w-[260px] px-2 py-2.5">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.document_name}</p>
                        <p className="truncate text-[11px] text-slate-400">
                          {r.document_numbers || r.document_number}
                          {r.is_borrowed && (
                            <span className="ml-1.5 rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">Sedang dipinjam</span>
                          )}
                        </p>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-slate-600">{entityName(r)}</td>
                      <td className="px-2 py-2.5 text-xs text-slate-600">{toTitleCase(r.pic_name) || "—"}</td>
                      <td className="px-2 py-2.5 text-right">
                        <p className="text-xs text-slate-600">{formatDate(r.expiry_date)}</p>
                        <span className={cn("mt-0.5 inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", daysCls(r.days_left))}>
                          {daysText(r.days_left)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Siapa yang Perlu Ditindaklanjuti"
            subtitle="Dokumen kadaluarsa + habis ≤ 60 hari"
            right={
              <div className="flex shrink-0 rounded-lg border border-slate-200 p-0.5 text-[11px] font-semibold">
                {[["pic", "PIC"], ["dept", "Dept"]].map(([v, l]) => (
                  <button key={v} onClick={() => setPeopleTab(v)} aria-pressed={peopleTab === v}
                    className={cn("rounded-md px-2.5 py-0.5 transition", peopleTab === v ? "bg-blue-900 text-white" : "text-slate-500 hover:text-slate-800")}>
                    {l}
                  </button>
                ))}
              </div>
            }>
            <RiskBars rows={peopleTab === "pic" ? data.by_pic : data.by_department}
              empty="Tidak ada dokumen berisiko dalam 60 hari"
              onSelect={(row) => openList(
                `${peopleTab === "pic" ? "PIC" : "Departemen"}: ${toTitleCase(row.name)} — Kadaluarsa & ≤ 60 Hari`,
                { expiry: "r60", [peopleTab === "pic" ? "pic_id" : "department_id"]: row.id }
              )} />
          </Card>

          <Card title="Peminjaman Dokumen" subtitle="Dokumen yang sedang keluar dari arsip">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={loans.borrowed === 0}
                onClick={() => openList("Dokumen Sedang Dipinjam", { active: "true" }, { kind: "loans" })}
                className="rounded-xl bg-slate-50 px-3 py-2.5 text-left transition enabled:hover:bg-slate-100">
                <p className="text-2xl font-bold text-slate-900 tabular-nums">{loans.borrowed}</p>
                <p className="text-[11px] text-slate-500">Sedang dipinjam</p>
              </button>
              <button type="button" disabled={loans.overdue === 0}
                onClick={() => openList("Peminjaman Lewat Batas Kembali", { overdue: "true" }, { kind: "loans" })}
                className={cn("rounded-xl px-3 py-2.5 text-left transition", loans.overdue > 0 ? "bg-rose-50 hover:bg-rose-100" : "bg-slate-50")}>
                <p className={cn("text-2xl font-bold tabular-nums", loans.overdue > 0 ? "text-rose-700" : "text-slate-900")}>{loans.overdue}</p>
                <p className="text-[11px] text-slate-500">Lewat batas kembali</p>
              </button>
            </div>
            {loans.overdue_rows.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100">
                {loans.overdue_rows.map(l => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700">{l.document_name}</p>
                      <p className="truncate text-[11px] text-slate-400">{toTitleCase(l.borrower_name) || "—"}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                      +{l.days_late} hari
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Kelengkapan Data" subtitle="Hal yang membuat pemantauan tidak akurat">
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Dokumen tanpa lampiran (scan)</span>
                <span className={cn("font-bold tabular-nums", counts.no_attachment > 0 ? "text-amber-600" : "text-emerald-600")}>{counts.no_attachment}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Dokumen tanpa tanggal kadaluarsa</span>
                {counts.no_expiry > 0 ? (
                  <button onClick={() => openList("Dokumen Tanpa Tanggal Kadaluarsa", { expiry: "none" })} className="font-bold tabular-nums text-amber-600 hover:underline">{counts.no_expiry}</button>
                ) : (
                  <span className="font-bold tabular-nums text-emerald-600">0</span>
                )}
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-600">Nonaktif / diarsipkan (tidak dipantau)</span>
                <span className="font-bold tabular-nums text-slate-700">{counts.inactive}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <ListModal spec={listSpec} onClose={() => setListSpec(null)} onSelectDoc={setDetailRow} />
      <DetailModal open={!!detailRow} row={detailRow} lookups={{ companies }} onClose={() => setDetailRow(null)} />
    </div>
  );
}
