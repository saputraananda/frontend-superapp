import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { Card } from "../components/ui";
import { api, BASE_URL } from "../../../lib/api";

const STATUS_COLOR = {
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  Proses: "bg-blue-100 text-blue-700 border border-blue-200",
  Selesai: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

const BAR_COLORS = ["#6366F1", "#F59E0B", "#34D399", "#F472B6", "#60A5FA", "#FB923C"];

// Resolve attachment URL — handles Google Drive links, full URLs, or relative paths
function resolveAttachment(lampiran) {
  if (!lampiran) return null;
  if (lampiran.startsWith("http://") || lampiran.startsWith("https://")) return lampiran;
  // relative path from server
  const clean = lampiran.replace(/^\//, "");
  return `${BASE_URL}/${clean.startsWith("assets/") ? clean : `assets/${clean}`}`;
}

function isImageUrl(url) {
  if (!url) return false;
  // Google Drive preview
  if (url.includes("drive.google.com") || url.includes("docs.google.com")) return false;
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
}

function buildParams(filters) {
  const { outlet, filterType, month, year, startDate, endDate } = filters;
  const p = new URLSearchParams();
  if (outlet) p.set("outlet", outlet);
  if (filterType) p.set("filterType", filterType);
  if (filterType === "range" && startDate && endDate) {
    p.set("startDate", startDate);
    p.set("endDate", endDate);
  } else if (filterType === "year" && year) {
    p.set("year", year);
  } else if (month) {
    p.set("month", month);
  }
  return p.toString();
}

// ── Attachment display ────────────────────────────────────────────────────
function LampiranBlock({ lampiran, compact = false }) {
  const url = resolveAttachment(lampiran);
  if (!url) return <span className="text-slate-400 text-xs italic">Tidak ada lampiran</span>;

  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
        <img
          src={url}
          alt="Lampiran"
          className={`rounded-lg border border-slate-200 object-cover shadow-sm hover:opacity-90 transition ${compact ? "h-16 w-16" : "h-32 max-w-xs"}`}
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition"
    >
      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      Lihat Lampiran
    </a>
  );
}

// ── Full-detail modal (mobile & desktop) ──────────────────────────────────
function KomplainModal({ row, onClose }) {
  if (!row) return null;
  const url = resolveAttachment(row.lampiran);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ border: "0.5px solid rgba(0,0,0,0.08)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_COLOR[row.status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
              {row.status}
            </span>
            <span className="font-mono text-xs text-slate-400">#{row.id}</span>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Identity grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { label: "Tanggal temuan", value: row.tanggal },
              { label: "Outlet / cabang", value: row.outlet, bold: true },
              { label: "Nama pelanggan", value: row.customer, bold: true },
              { label: "No nota", value: row.no_nota || "-", mono: true },
              { label: "Frontliner", value: row.frontliner || "-" },
              { label: "Dicatat", value: row.created_at || "-" },
            ].map(({ label, value, bold, mono }) => (
              <div key={label}>
                <p className="text-xs text-slate-400 mb-0.5 tracking-wide">{label}</p>
                <p className={`text-sm break-words ${bold ? "font-semibold text-slate-800" : "text-slate-600"} ${mono ? "font-mono text-xs" : ""}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100" />

          {/* Kategori badges */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400 tracking-wide">Kategori komplain</span>
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 w-fit">
                {row.kategori}
              </span>
            </div>
            {row.kategori_kerusakan && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400 tracking-wide">Kategori kerusakan</span>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                  {row.kategori_kerusakan}
                </span>
              </div>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <p className="text-xs text-slate-400 tracking-wide mb-2">Deskripsi komplain</p>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap border-l-2 border-indigo-300">
              {row.deskripsi || "-"}
            </div>
          </div>

          {/* Tindak lanjut */}
          <div>
            <p className="text-xs text-slate-400 tracking-wide mb-2">Tindak lanjut</p>
            <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border-l-2 ${row.tindak_lanjut
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-slate-50 border-slate-200 text-slate-400 italic"
              }`}>
              {row.tindak_lanjut || "Belum ada tindak lanjut"}
            </div>
          </div>

          {/* Lampiran */}
          {url && (
            <div>
              <p className="text-xs text-slate-400 tracking-wide mb-2">Lampiran</p>
              {isImageUrl(url) ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={url}
                    alt="Lampiran komplain"
                    className="rounded-xl border border-slate-100 max-h-56 w-auto object-contain hover:opacity-90 transition"
                  />
                </a>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Buka lampiran
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="text-sm font-medium px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div >
  );
}

function DetailField({ label, value, highlight, mono }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
      <p className={`text-sm break-words ${highlight ? "font-semibold text-slate-800" : "text-slate-600"} ${mono ? "font-mono text-xs" : ""}`}>
        {value || "-"}
      </p>
    </div>
  );
}

// ── Expandable desktop row panel ──────────────────────────────────────────
function DetailPanel({ row, onClose }) {
  const url = resolveAttachment(row.lampiran);

  return (
    <tr>
      <td
        colSpan={8}
        className="border-b border-slate-100"
        style={{ padding: 0 }}
      >
        <div className="flex flex-col gap-3.5 px-0 pt-4 pb-5">

          {/* ── Meta chips ── */}
          <div className="flex flex-wrap items-center gap-2">
            {row.created_at && (
              <MetaChip icon={
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              } label={`Dicatat ${row.created_at}`} />
            )}
            {row.no_nota && (
              <MetaChip icon={
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 12h6M9 16h6M13 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-5-5z" />
                </svg>
              } label={row.no_nota} mono />
            )}
            {row.frontliner && (
              <MetaChip icon={
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              } label={row.frontliner} />
            )}
            {row.kategori_kerusakan && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                {row.kategori_kerusakan}
              </span>
            )}
          </div>

          {/* ── Deskripsi + Tindak lanjut ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400 tracking-wide mb-1.5">Deskripsi komplain</p>
              <div className="bg-white border border-slate-100 rounded-r-lg border-l-2 border-l-indigo-300 px-3 py-2.5 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap" style={{ borderRadius: "0 8px 8px 0" }}>
                {row.deskripsi || "-"}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 tracking-wide mb-1.5">Tindak lanjut</p>
              <div
                className={`px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${row.tindak_lanjut
                    ? "bg-emerald-50 border border-emerald-100 border-l-2 border-l-emerald-400 text-emerald-800"
                    : "bg-slate-50 border border-slate-100 border-l-2 border-l-slate-300 text-slate-400 italic"
                  }`}
                style={{ borderRadius: "0 8px 8px 0" }}
              >
                {row.tindak_lanjut || "Belum ada tindak lanjut"}
              </div>
            </div>
          </div>

          {/* ── Footer: lampiran + tutup ── */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              {url ? (
                <LampiranBlock lampiran={row.lampiran} compact />
              ) : (
                <span className="text-xs text-slate-400 italic">Tidak ada lampiran</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              Tutup detail
            </button>
          </div>

        </div>
      </td>
    </tr>
  );
}

// Helper chip kecil untuk meta info
function MetaChip({ icon, label, mono }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-slate-500 bg-slate-100 border border-slate-200 ${mono ? "font-mono" : ""}`}>
      {icon}
      {label}
    </span>
  );
}

// ── Custom bar chart tooltip ───────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-xl rounded-xl border border-slate-100 px-4 py-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      <p className="text-indigo-600 font-semibold">{payload[0].value} komplain</p>
    </div>
  );
}

export default function KomplainSection({ filters }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [modalRow, setModalRow] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildParams(filters);
      const result = await api(`/sales/komplain?${qs}`);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.outlet, filters?.filterType, filters?.month, filters?.year, filters?.startDate, filters?.endDate]); // intentional: buildParams uses full filters but we only re-fetch on these fields

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = data?.rows ?? [];
  const summary = data?.summary ?? { total: 0, pending: 0, proses: 0, selesai: 0, resolvedRate: 0 };
  const charts = data?.charts ?? { kategori: [], outlet: [], status: [] };

  const filteredRows = rows.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.customer?.toLowerCase().includes(q)
      || r.outlet?.toLowerCase().includes(q)
      || r.kategori?.toLowerCase().includes(q)
      || r.deskripsi?.toLowerCase().includes(q)
      || r.no_nota?.toLowerCase().includes(q)
      || r.frontliner?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-sm font-medium">Memuat data komplain...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-400">
        <p className="text-sm font-semibold">Gagal memuat data</p>
        <p className="text-xs text-slate-400">{error}</p>
        <button onClick={fetchData} className="mt-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Modal ── */}
      {modalRow && <KomplainModal row={modalRow} onClose={() => setModalRow(null)} />}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Komplain", value: summary.total, icon: "⚠️", tone: "from-amber-400 to-orange-500" },
          { label: "Pending", value: summary.pending, icon: "⏳", tone: "from-rose-400 to-red-500" },
          { label: "Proses", value: summary.proses, icon: "🔄", tone: "from-blue-400 to-indigo-500" },
          { label: "Selesai", value: summary.selesai, icon: "✅", tone: "from-emerald-400 to-teal-500" },
        ].map((k) => (
          <Card key={k.label} className="p-3 sm:p-5 flex items-center gap-3">
            <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-lg shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-2xl font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Resolution rate banner ── */}
      <Card className="px-5 py-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 mb-1">Tingkat Penyelesaian</p>
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700"
              style={{ width: `${summary.resolvedRate}%` }}
            />
          </div>
        </div>
        <p className="text-2xl font-extrabold text-emerald-600 shrink-0">{summary.resolvedRate}%</p>
      </Card>

      {/* ── Charts ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Kategori bar */}
        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Komplain per Kategori</p>
          {charts.kategori.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Tidak ada data</p>
          ) : (
            <div className="h-52 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.kategori} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.25)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="value" name="Jumlah" radius={[6, 6, 0, 0]}>
                    {charts.kategori.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Status donut */}
        <Card className="col-span-12 lg:col-span-4 p-4 sm:p-6 flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-slate-700 mb-3 self-start">Status Komplain</p>
          {summary.total === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">Tidak ada data</p>
          ) : (
            <>
              <PieChart width={160} height={160}>
                <Pie
                  data={charts.status}
                  cx={80} cy={80}
                  innerRadius={46} outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {charts.status.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="flex flex-col gap-2 mt-2 w-full">
                {charts.status.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600 font-medium">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Per-outlet bar ── */}
      {charts.outlet.length > 1 && (
        <Card className="p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Komplain per Outlet / Cabang</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.outlet} barSize={32} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.25)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="value" name="Jumlah" radius={[0, 6, 6, 0]}>
                  {charts.outlet.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Detail Table ── */}
      <Card className="p-4 sm:p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <p className="text-sm font-bold text-slate-700 flex-1">
            Detail Komplain
            <span className="ml-2 text-xs font-normal text-slate-400">({filteredRows.length} data)</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Cari customer, outlet, nota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-slate-50"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="all">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Proses">Proses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Tidak ada data yang cocok</p>
        ) : (
          <>
            {/* ── Mobile: card list (tap to open modal) ── */}
            <div className="flex flex-col gap-3 md:hidden">
              {filteredRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-100 bg-white shadow-sm p-4 space-y-3 cursor-pointer active:bg-indigo-50/40 transition"
                  onClick={() => setModalRow(row)}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono text-xs text-slate-400 shrink-0">#{row.id}</span>
                      <span className="text-xs text-slate-400 shrink-0">{row.tanggal}</span>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shrink-0 ${STATUS_COLOR[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {row.status}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                    <div><p className="text-slate-400 font-medium">Outlet</p><p className="text-slate-800 font-semibold">{row.outlet}</p></div>
                    <div><p className="text-slate-400 font-medium">Customer</p><p className="text-slate-800 font-semibold">{row.customer}</p></div>
                    {row.no_nota && <div><p className="text-slate-400 font-medium">No Nota</p><p className="text-slate-700 font-mono">{row.no_nota}</p></div>}
                    {row.frontliner && <div><p className="text-slate-400 font-medium">Frontliner</p><p className="text-slate-700">{row.frontliner}</p></div>}
                  </div>

                  {/* Kategori badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{row.kategori}</span>
                    {row.kategori_kerusakan && (
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">{row.kategori_kerusakan}</span>
                    )}
                  </div>

                  {/* Deskripsi */}
                  <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                    {row.deskripsi}
                  </div>

                  {/* Tindak lanjut preview */}
                  {row.tindak_lanjut && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-xs text-emerald-800 leading-relaxed line-clamp-2">
                      <span className="font-semibold">Tindak Lanjut: </span>{row.tindak_lanjut}
                    </div>
                  )}

                  {/* Lampiran + tap hint */}
                  <div className="flex items-center justify-between pt-1">
                    <div onClick={(e) => e.stopPropagation()}>
                      <LampiranBlock lampiran={row.lampiran} compact />
                    </div>
                    <span className="text-xs text-indigo-400 font-medium">Tap untuk detail →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop: table with expandable rows ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                    {["#", "Tanggal", "Outlet", "Customer", "No Nota", "Frontliner", "Kategori", "Status"].map((h) => (
                      <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`border-b border-slate-50 hover:bg-indigo-50/30 transition cursor-pointer ${expandedId === row.id ? "bg-indigo-50/20" : ""}`}
                        onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      >
                        <td className="py-3 pr-4 font-mono text-xs text-slate-400">{row.id}</td>
                        <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">{row.tanggal}</td>
                        <td className="py-3 pr-4 font-medium text-slate-700">{row.outlet}</td>
                        <td className="py-3 pr-4 text-slate-700">{row.customer}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-slate-500">{row.no_nota || "-"}</td>
                        <td className="py-3 pr-4 text-slate-600">{row.frontliner || "-"}</td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 whitespace-nowrap w-fit">
                              {row.kategori}
                            </span>
                            {row.kategori_kerusakan && (
                              <span className="inline-flex items-center text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 whitespace-nowrap w-fit">
                                {row.kategori_kerusakan}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[row.status] ?? "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                              {row.status}
                            </span>
                            {row.lampiran && (
                              <span className="h-5 w-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-500 shrink-0" title="Ada lampiran">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === row.id && (
                        <DetailPanel row={row} onClose={() => setExpandedId(null)} />
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-400 mt-3 text-center">Klik baris untuk melihat detail lengkap</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}