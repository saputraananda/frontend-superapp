import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineBuildingStorefront, HiOutlineCurrencyDollar, HiOutlineDocumentText,
  HiOutlineArrowPath, HiOutlineFunnel, HiOutlineShoppingCart,
  HiOutlineCreditCard, HiOutlineMagnifyingGlass,
  HiOutlineClock, HiOutlineCalendar, HiOutlineXMark,
  HiOutlineArrowTrendingUp, HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }
function fmtRp(v) {
  const n = Number(v) || 0;
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function waLink(phone) {
  if (!phone) return null;
  let n = String(phone).replace(/[\s\-()]/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (!n.startsWith("62") && !n.startsWith("+")) n = "62" + n;
  return `https://wa.me/${n.replace("+", "")}`;
}

function payBadge(p) {
  if (!p) return "bg-slate-100 text-slate-600";
  const low = p.toLowerCase();
  if (low.includes("belum")) return "bg-red-50 text-red-700";
  if (low.includes("lunas")) return "bg-emerald-50 text-emerald-700";
  if (low === "tunai") return "bg-emerald-50 text-emerald-700";
  return "bg-sky-50 text-sky-700";
}

function StatCard({ icon: Icon, label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 sm:p-5 transition cursor-pointer",
        accent.border, accent.bg,
        "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
      )}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", accent.iconBg)}>
          <Icon className={cn("h-4 w-4", accent.iconText)} />
        </div>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <div className="text-xl sm:text-2xl font-extrabold text-slate-800 truncate">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

/* ── Nota Detail Modal ── */
function NotaDetailModal({ nd, onClose }) {
  if (!nd.open) return null;
  const first = nd.data[0] || {};
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">Detail Nota: {nd.nota}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
            <HiOutlineXMark className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {nd.loading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : nd.data.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Tidak ada data</div>
          ) : (
            <>
              {/* Header info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                {[
                  ["No. Nota", first.no_nota],
                  ["Customer", first.customer_nama],
                  ["Telepon", first.customer_telepon || "—"],
                  ["Outlet", first.outlet],
                  ["Alamat", first.alamat_customer || "—"],
                  ["Progress", first.progress_pengerjaan || "—"],
                  ["Jenis", first.jenis || "—"],
                  ["Pembayaran", first.pembayaran || "—"],
                  ["Pengambilan", first.pengambilan || "—"],
                  ["Tgl Pengambilan", first.tgl_pengambilan ? String(first.tgl_pengambilan).slice(0, 16) : "—"],
                  ["Pembuat Nota", first.pembuat_nota || "—"],
                  ["Keterangan", first.keterangan_nota || "—"],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-2 py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-500 w-32 shrink-0">{label}</span>
                    <span className="text-slate-800">{val}</span>
                  </div>
                ))}
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ["Subtotal", first.subtotal],
                  ["Express", first.tambahan_express],
                  ["Diskon", first.diskon],
                  ["Pajak", first.pajak],
                  ["Biaya Service", first.biaya_service],
                  ["Total Tagihan", first.total_tagihan],
                ].map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold text-slate-500 mb-1">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{fmtRp(val)}</p>
                  </div>
                ))}
              </div>

              {/* Items table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">Item ({nd.data.length})</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-center py-2 px-2 font-semibold text-slate-500">#</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Layanan</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Item</th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-500">Qty</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nd.data.map((r, i) => (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-2 px-2 text-center text-slate-400">{r.item_ke || i + 1}</td>
                        <td className="py-2 px-2 text-slate-700">{r.jenis_layanan || "—"}</td>
                        <td className="py-2 px-2 text-slate-700 max-w-[200px] truncate">{r.nama_item || "—"}</td>
                        <td className="py-2 px-2 text-center">{r.jumlah} {r.satuan_item || ""}</td>
                        <td className="py-2 px-2 text-right font-bold text-slate-800">{fmtRp(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Timestamps */}
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                <span>Tgl Terima: <b className="text-slate-600">{first.tgl_terima ? String(first.tgl_terima).slice(0, 19).replace("T", " ") : "—"}</b></span>
                <span>Tgl Selesai: <b className="text-slate-600">{first.tgl_selesai ? String(first.tgl_selesai).slice(0, 19).replace("T", " ") : "—"}</b></span>
                <span>Last Sync: <b className="text-slate-600">{first.last_sync ? String(first.last_sync).slice(0, 19).replace("T", " ") : "—"}</b></span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Modal Component ── */
function DetailModal({ modal, onClose, fetchModalPage }) {
  if (!modal.open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-800">{modal.title}</h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{modal.pagination.total || 0} data</span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition">
              <HiOutlineXMark className="h-5 w-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {modal.loading ? (
            <div className="py-12 text-center text-slate-400">Loading...</div>
          ) : modal.data.length === 0 ? (
            <div className="py-12 text-center text-slate-400">Tidak ada data</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">No. Nota</th>
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">Customer</th>
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">Telepon</th>
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">Item</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-500">Qty</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">Total</th>
                  <th className="text-center py-2 px-2 font-semibold text-slate-500">Bayar</th>
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">Tgl Terima</th>
                </tr>
              </thead>
              <tbody>
                {modal.data.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-sky-50">
                    <td className="py-2 px-2 font-medium text-slate-700">{r.no_nota || "—"}</td>
                    <td className="py-2 px-2 text-slate-600 max-w-[120px] truncate">{r.customer_nama || "—"}</td>
                    <td className="py-2 px-2">
                      {r.customer_telepon ? (
                        <a href={waLink(r.customer_telepon)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline">
                          <HiOutlineChatBubbleLeftRight className="h-3 w-3" />
                          {r.customer_telepon}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-2 text-slate-600 max-w-[150px] truncate">{r.nama_item || "—"}</td>
                    <td className="py-2 px-2 text-center">{r.jumlah} {r.satuan_item || ""}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-800">{fmtRp(r.total)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", payBadge(r.pembayaran))}>
                        {r.pembayaran || "—"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-400 whitespace-nowrap">{r.tgl_terima ? String(r.tgl_terima).slice(0, 16) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {modal.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <span className="text-xs text-slate-500">Hal {modal.pagination.page} / {modal.pagination.totalPages}</span>
            <div className="flex gap-1">
              <button disabled={modal.pagination.page <= 1}
                onClick={() => fetchModalPage(modal.pagination.page - 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Prev</button>
              <button disabled={modal.pagination.page >= modal.pagination.totalPages}
                onClick={() => fetchModalPage(modal.pagination.page + 1)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ Main Dashboard ═══════════════════════════ */
export default function B2bKoperasiDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* Detail table state */
  const [detail, setDetail] = useState({ data: [], pagination: { page: 1, totalPages: 1, total: 0 }, loading: false, meta: {} });
  const [filters, setFilters] = useState({ search: "", pembayaran: "", startDate: "", endDate: "" });
  const [searchInput, setSearchInput] = useState("");
  const [limit, setLimit] = useState(50);
  const debounceRef = useRef(null);

  /* Modal state */
  const [modal, setModal] = useState({ open: false, title: "", loading: false, data: [], pagination: {}, params: {} });
  const [notaDetail, setNotaDetail] = useState({ open: false, loading: false, data: [], nota: "" });

  /* ── Fetchers ── */
  const fetchStats = useCallback(async () => {
    setLoading(true); setErr("");
    try { const res = await api("/b2b/kmp/stats"); setData(res.data || null); }
    catch (e) { setErr(e.message || "Gagal memuat data"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchDetail = useCallback(async (page = 1, f = filters, lm = limit) => {
    setDetail(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: lm === "all" ? "all" : String(lm) });
      if (f.search) params.set("search", f.search);
      if (f.pembayaran) params.set("pembayaran", f.pembayaran);
      if (f.startDate) params.set("startDate", f.startDate);
      if (f.endDate) params.set("endDate", f.endDate);
      const res = await api(`/b2b/kmp/transactions?${params}`);
      setDetail({ data: res.data || [], pagination: res.pagination || {}, loading: false, meta: res.meta || {} });
    } catch { setDetail(p => ({ ...p, loading: false })); }
  }, [filters, limit]);

  useEffect(() => { fetchDetail(1, filters, limit); /* eslint-disable-next-line */ }, []);

  /* Auto-search debounce */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const newFilters = { ...filters, search: searchInput };
      setFilters(newFilters);
      fetchDetail(1, newFilters, limit);
    }, 400);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line
  }, [searchInput]);

  const applyFilters = () => {
    const f = { ...filters, search: searchInput };
    setFilters(f);
    fetchDetail(1, f, limit);
  };
  const resetFilters = () => {
    const f = { search: "", pembayaran: "", startDate: "", endDate: "" };
    setFilters(f); setSearchInput("");
    fetchDetail(1, f, limit);
  };
  const handleLimitChange = (v) => {
    const newLimit = v === "all" ? "all" : Number(v);
    setLimit(newLimit);
    fetchDetail(1, filters, newLimit);
  };

  /* ── Modal logic ── */
  const openModal = async (title, params = {}) => {
    setModal({ open: true, title, loading: true, data: [], pagination: {}, params });
    try {
      const qs = new URLSearchParams({ type: params.type || "all", page: 1, limit: 20 });
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && k !== "type") qs.set(k, v); });
      const res = await api(`/b2b/kmp/modal?${qs}`);
      setModal(p => ({ ...p, loading: false, data: res.data || [], pagination: res.pagination || {} }));
    } catch { setModal(p => ({ ...p, loading: false })); }
  };
  const fetchModalPage = async (page) => {
    setModal(p => ({ ...p, loading: true }));
    try {
      const qs = new URLSearchParams({ type: modal.params.type || "all", page: String(page), limit: "20" });
      Object.entries(modal.params).forEach(([k, v]) => { if (v !== undefined && v !== null && k !== "type") qs.set(k, v); });
      const res = await api(`/b2b/kmp/modal?${qs}`);
      setModal(p => ({ ...p, loading: false, data: res.data || [], pagination: res.pagination || {} }));
    } catch { setModal(p => ({ ...p, loading: false })); }
  };
  const closeModal = () => setModal(p => ({ ...p, open: false }));

  /* Nota detail modal */
  const openNotaDetail = async (noNota) => {
    setNotaDetail({ open: true, loading: true, data: [], nota: noNota });
    try {
      const qs = new URLSearchParams({ type: "nota_detail", no_nota: noNota, limit: "100" });
      const res = await api(`/b2b/kmp/modal?${qs}`);
      setNotaDetail(p => ({ ...p, loading: false, data: res.data || [] }));
    } catch { setNotaDetail(p => ({ ...p, loading: false })); }
  };
  const closeNotaDetail = () => setNotaDetail(p => ({ ...p, open: false }));

  /* ── Loading / Error ── */
  if (loading) return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
        <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">{[1,2,3].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}</div>
      </div>
    </div>
  );
  if (err) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-semibold mb-2">{err}</p>
        <button onClick={fetchStats} className="text-sm text-blue-600 hover:underline">Coba lagi</button>
      </div>
    </div>
  );

  const s = data?.summary || {};
  const avgPerNota = s.total_nota > 0 ? Math.round((Number(s.total_tagihan) || 0) / s.total_nota) : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ── Header ── */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-sky-800 to-cyan-600 p-5 shadow-sm sm:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/15">
                <HiOutlineBuildingStorefront className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Dashboard B2B Koperasi Merah Putih</h1>
                <p className="text-sm text-white/70">Rekap transaksi reguler</p>
              </div>
            </div>
            <button onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0">
              <HiOutlineArrowPath className="h-4 w-4" /> Refresh
            </button>
          </div>
        </section>

        {/* ── Stat Cards (3 cards — Pajak & Outlet removed) ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={HiOutlineDocumentText} label="Total Nota" value={s.total_nota || 0}
            sub={`${s.total_items || 0} item`}
            accent={{ border: "border-slate-200", bg: "bg-white", iconBg: "bg-sky-100", iconText: "text-sky-600" }}
            onClick={() => openModal("Semua Transaksi", { type: "all" })}
          />
          <StatCard icon={HiOutlineCurrencyDollar} label="Total Tagihan" value={fmtRp(s.total_tagihan)}
            sub="Seluruh transaksi KMP"
            accent={{ border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" }}
            onClick={() => openModal("Semua Transaksi", { type: "all" })}
          />
          <StatCard icon={HiOutlineShoppingCart} label="Subtotal" value={fmtRp(s.total_subtotal)}
            sub={`Rata-rata: ${fmtRp(avgPerNota)}/nota`}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600" }}
            onClick={() => openModal("Semua Transaksi", { type: "all" })}
          />
        </section>

        {/* ── Daily Trend + Rush Hour ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily trend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineCalendar className="h-5 w-5 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-800">Tren Harian (30 Hari)</h2>
            </div>
            {data?.daily_trend?.length > 0 ? (
              <div className="flex items-end gap-1 h-36">
                {(() => {
                  const maxVal = Math.max(...data.daily_trend.map(d => Number(d.total_nota) || 0), 1);
                  return data.daily_trend.map((d, i) => {
                    const h = Math.max(6, Math.round(((Number(d.total_nota) || 0) / maxVal) * 100));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer group"
                        onClick={() => openModal(`Transaksi ${d.day}`, { type: "daily", day: d.day })}
                        title={`${d.day}: ${d.total_nota} nota, ${fmtRp(d.total_tagihan)}`}>
                        <span className="text-[9px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">{d.total_nota}</span>
                        <div className="w-full bg-sky-100 rounded-t-md overflow-hidden group-hover:bg-sky-200 transition" style={{ height: `${h}%` }}>
                          <div className="w-full h-full bg-sky-500 group-hover:bg-sky-600 rounded-t-md transition-all duration-500" />
                        </div>
                        <span className="text-[8px] text-slate-400">{String(d.day).slice(8)}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data tren harian</p>}
          </div>

          {/* Rush hour */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineClock className="h-5 w-5 text-rose-500" />
              <h2 className="text-sm font-bold text-slate-800">Analisa Rush Hour</h2>
            </div>
            {data?.rush_hour?.length > 0 ? (
              <div className="flex items-end gap-0.5 h-36">
                {(() => {
                  const hours = Array.from({ length: 24 }, (_, i) => {
                    const found = data.rush_hour.find(r => Number(r.hour) === i);
                    return { hour: i, total_nota: found?.total_nota || 0, total_tagihan: found?.total_tagihan || 0 };
                  });
                  const maxVal = Math.max(...hours.map(h => Number(h.total_nota) || 0), 1);
                  const peakHour = hours.reduce((a, b) => (Number(b.total_nota) || 0) > (Number(a.total_nota) || 0) ? b : a, hours[0]);
                  return hours.map((h, i) => {
                    const ht = Math.max(4, Math.round(((Number(h.total_nota) || 0) / maxVal) * 100));
                    const isPeak = h.hour === peakHour?.hour && Number(h.total_nota) > 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer group"
                        onClick={() => openModal(`Transaksi Jam ${String(h.hour).padStart(2, "0")}:00`, { type: "rush_hour", hour: h.hour })}
                        title={`Jam ${String(h.hour).padStart(2, "0")}:00 — ${h.total_nota} nota`}>
                        <div className="w-full rounded-t-sm overflow-hidden group-hover:opacity-80 transition" style={{ height: `${ht}%` }}>
                          <div className={cn("w-full h-full rounded-t-sm transition-all duration-500",
                            isPeak ? "bg-rose-500" : "bg-rose-300 group-hover:bg-rose-400"
                          )} />
                        </div>
                        {i % 3 === 0 && <span className="text-[8px] text-slate-400">{String(h.hour).padStart(2, "0")}</span>}
                      </div>
                    );
                  });
                })()}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data rush hour</p>}
          </div>
        </section>

        {/* ── Payment Breakdown + Top Items + Monthly Trend ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineCreditCard className="h-5 w-5 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-800">Per Pembayaran</h2>
            </div>
            {data?.payments?.length > 0 ? (
              <div className="space-y-3">
                {data.payments.map((p, i) => {
                  const maxVal = Math.max(...data.payments.map(x => Number(x.total_tagihan) || 0), 1);
                  const val = Number(p.total_tagihan) || 0;
                  const pct = Math.round((val / maxVal) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-1 -m-1 transition"
                      onClick={() => openModal(`Transaksi: ${p.pembayaran || "—"}`, { type: "pembayaran", pembayaran: p.pembayaran })}>
                      <span className="text-xs font-semibold text-slate-700 w-24 shrink-0 truncate">{p.pembayaran}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-5 rounded-full transition-all duration-700",
                          String(p.pembayaran).toLowerCase().includes("belum") ? "bg-red-400" : "bg-emerald-500"
                        )} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700">{p.total_nota} nota</span>
                        <span className="text-[10px] text-slate-400 ml-1 block">{fmtRp(val)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data pembayaran</p>}
          </div>

          {/* Top items (was Top Layanan) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineShoppingCart className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Top Item</h2>
            </div>
            {data?.top_items?.length > 0 ? (
              <div className="space-y-2">
                {data.top_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1 transition"
                    onClick={() => openModal(`Item: ${item.nama_item}`, { type: "top_item", nama_item: item.nama_item })}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5 shrink-0">{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.nama_item || "—"}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs font-bold text-slate-800">{fmtRp(item.total_revenue)}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{item.total}x</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data item</p>}
          </div>

          {/* Monthly trend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineArrowTrendingUp className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800">Tren Bulanan</h2>
            </div>
            {data?.monthly_trend?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 font-semibold text-slate-500">Bulan</th>
                      <th className="text-center py-2 px-3 font-semibold text-slate-500">Nota</th>
                      <th className="text-right py-2 px-3 font-semibold text-slate-500">Tagihan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthly_trend.map(m => (
                      <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => openModal(`Transaksi ${m.month}`, { type: "monthly", month: m.month })}>
                        <td className="py-2 px-3 font-medium text-slate-700">{m.month}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{m.total_nota}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">{fmtRp(m.total_tagihan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-xs text-slate-400 italic">Belum ada data tren</p>}
          </div>
        </section>

        {/* ── Detail Table ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineFunnel className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800">Detail Transaksi KMP</h2>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Cari nota / customer / telepon / item..." value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none w-full" />
            </div>
            <select value={filters.pembayaran} onChange={e => { setFilters(p => ({ ...p, pembayaran: e.target.value })); fetchDetail(1, { ...filters, pembayaran: e.target.value, search: searchInput }, limit); }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Pembayaran</option>
              {(detail.meta.payments || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={e => { setFilters(p => ({ ...p, startDate: e.target.value })); }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <input type="date" value={filters.endDate} onChange={e => { setFilters(p => ({ ...p, endDate: e.target.value })); }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <button onClick={applyFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Filter</button>
            <button onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">Reset</button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">No. Nota</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Customer</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Telepon</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Item</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500">Total</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Bayar</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Tgl Terima</th>
                </tr>
              </thead>
              <tbody>
                {detail.loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : detail.data.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-400">Tidak ada data</td></tr>
                ) : detail.data.map((r) => (
                  <tr key={r.id}
                    onClick={() => openNotaDetail(r.no_nota)}
                    className="border-b border-slate-100 hover:bg-sky-50 transition cursor-pointer">
                    <td className="py-2 px-3 font-medium text-sky-700">{r.no_nota || "—"}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate">{r.customer_nama || "—"}</td>
                    <td className="py-2 px-3">
                      {r.customer_telepon ? (
                        <a href={waLink(r.customer_telepon)} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 hover:underline text-xs">
                          <HiOutlineChatBubbleLeftRight className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[110px]">{r.customer_telepon}</span>
                        </a>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate">{r.nama_item || "—"}</td>
                    <td className="py-2 px-3 text-center">{r.jumlah} {r.satuan_item || ""}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">{fmtRp(r.total)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", payBadge(r.pembayaran))}>
                        {r.pembayaran || "—"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{r.tgl_terima ? String(r.tgl_terima).slice(0, 16) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              {detail.pagination.total || 0} data
            </span>
            <div className="flex items-center gap-2">
              <select value={limit} onChange={e => handleLimitChange(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="all">ALL</option>
              </select>
              {detail.pagination.totalPages > 1 && (
                <div className="flex gap-1">
                  <button disabled={detail.pagination.page <= 1}
                    onClick={() => fetchDetail(detail.pagination.page - 1, filters, limit)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {detail.pagination.page} / {detail.pagination.totalPages}
                  </span>
                  <button disabled={detail.pagination.page >= detail.pagination.totalPages}
                    onClick={() => fetchDetail(detail.pagination.page + 1, filters, limit)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Modal ── */}
      <DetailModal modal={modal} onClose={closeModal} fetchModalPage={fetchModalPage} />
      <NotaDetailModal nd={notaDetail} onClose={closeNotaDetail} />
    </div>
  );
}
