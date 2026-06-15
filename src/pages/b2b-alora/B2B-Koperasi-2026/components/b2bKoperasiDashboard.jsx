import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineBuildingStorefront, HiOutlineCurrencyDollar, HiOutlineDocumentText,
  HiOutlineArrowPath, HiOutlineArrowTrendingUp, HiOutlineFunnel,
  HiOutlineShoppingCart, HiOutlineCreditCard, HiOutlineClock,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

function fmtRp(v) {
  const n = Number(v) || 0;
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={cn("rounded-2xl border p-4 sm:p-5", accent.border, accent.bg)}>
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

export default function B2bKoperasiDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  /* Detail table state */
  const [detail, setDetail] = useState({ data: [], pagination: { page: 1, totalPages: 1, total: 0 }, loading: false, meta: {} });
  const [filters, setFilters] = useState({ search: "", outlet: "", pembayaran: "", startDate: "", endDate: "" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api("/b2b/kmp/stats");
      setData(res.data || null);
    } catch (e) {
      setErr(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchDetail = useCallback(async (page = 1, f = filters) => {
    setDetail(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (f.search) params.set("search", f.search);
      if (f.outlet) params.set("outlet", f.outlet);
      if (f.pembayaran) params.set("pembayaran", f.pembayaran);
      if (f.startDate) params.set("startDate", f.startDate);
      if (f.endDate) params.set("endDate", f.endDate);
      const res = await api(`/b2b/kmp/transactions?${params}`);
      setDetail({
        data: res.data || [],
        pagination: res.pagination || {},
        loading: false,
        meta: res.meta || {},
      });
    } catch {
      setDetail(p => ({ ...p, loading: false }));
    }
  }, [filters]);

  useEffect(() => { fetchDetail(1, filters); /* eslint-disable-next-line */ }, []);

  const applyFilters = () => fetchDetail(1, filters);
  const resetFilters = () => {
    const f = { search: "", outlet: "", pembayaran: "", startDate: "", endDate: "" };
    setFilters(f);
    fetchDetail(1, f);
  };
  const handleSearchKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyFilters(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">{err}</p>
          <button onClick={fetchStats} className="text-sm text-blue-600 hover:underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  const s = data?.summary || {};

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

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={HiOutlineDocumentText}
            label="Total Nota"
            value={s.total_nota || 0}
            sub={`${s.total_items || 0} item`}
            accent={{ border: "border-slate-200", bg: "bg-white", iconBg: "bg-sky-100", iconText: "text-sky-600" }}
          />
          <StatCard
            icon={HiOutlineCurrencyDollar}
            label="Total Tagihan"
            value={fmtRp(s.total_tagihan)}
            sub="Seluruh transaksi KMP"
            accent={{ border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" }}
          />
          <StatCard
            icon={HiOutlineShoppingCart}
            label="Subtotal"
            value={fmtRp(s.total_subtotal)}
            sub={`Diskon: ${fmtRp(s.total_diskon)}`}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600" }}
          />
          <StatCard
            icon={HiOutlineCreditCard}
            label="Pajak & Service"
            value={fmtRp((Number(s.total_pajak) || 0) + (Number(s.total_biaya_service) || 0))}
            sub={`Pajak: ${fmtRp(s.total_pajak)}`}
            accent={{ border: "border-violet-200", bg: "bg-violet-50", iconBg: "bg-violet-100", iconText: "text-violet-600" }}
          />
        </section>

        {/* ── Outlet + Payment Breakdown ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outlet breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineBuildingStorefront className="h-5 w-5 text-sky-500" />
              <h2 className="text-sm font-bold text-slate-800">Per Outlet</h2>
            </div>
            {data?.outlets?.length > 0 ? (
              <div className="space-y-3">
                {data.outlets.map((o, i) => {
                  const maxVal = Math.max(...data.outlets.map(x => Number(x.total_tagihan) || 0), 1);
                  const val = Number(o.total_tagihan) || 0;
                  const pct = Math.round((val / maxVal) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700 w-28 shrink-0 truncate">{o.outlet}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-5 rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700">{o.total_nota} nota</span>
                        <span className="text-[10px] text-slate-400 ml-1 block">{fmtRp(val)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data outlet</p>
            )}
          </div>

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
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700 w-28 shrink-0 truncate">{p.pembayaran}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700">{p.total_nota} nota</span>
                        <span className="text-[10px] text-slate-400 ml-1 block">{fmtRp(val)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data pembayaran</p>
            )}
          </div>
        </section>

        {/* ── Top Services + Monthly Trend ── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top services */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineShoppingCart className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Top Layanan</h2>
            </div>
            {data?.services?.length > 0 ? (
              <div className="space-y-2">
                {data.services.map((svc, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{i + 1}</span>
                      <span className="text-xs font-semibold text-slate-700">{svc.jenis_layanan || "—"}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800">{fmtRp(svc.total_revenue)}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{svc.total}x</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data layanan</p>
            )}
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
                      <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-700">{m.month}</td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">{m.total_nota}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">{fmtRp(m.total_tagihan)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data tren</p>
            )}
          </div>
        </section>

        {/* ── Detail Table with Filters & Pagination ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineFunnel className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800">Detail Transaksi KMP</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Cari nota / customer / item..." value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                onKeyDown={handleSearchKey}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none w-56" />
            </div>
            <select value={filters.outlet} onChange={e => setFilters(p => ({ ...p, outlet: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Outlet</option>
              {(detail.meta.outlets || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filters.pembayaran} onChange={e => setFilters(p => ({ ...p, pembayaran: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Pembayaran</option>
              {(detail.meta.payments || []).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={filters.startDate} onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <input type="date" value={filters.endDate} onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none" />
            <button onClick={applyFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Filter</button>
            <button onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">Reset</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">No. Nota</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Customer</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Outlet</th>
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
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-sky-50 transition">
                    <td className="py-2 px-3 font-medium text-slate-700">{r.no_nota || "—"}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate">{r.customer_nama || "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{r.outlet || "—"}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate">{r.nama_item || "—"}</td>
                    <td className="py-2 px-3 text-center">{r.jumlah} {r.satuan_item || ""}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800">{fmtRp(r.total)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                        r.pembayaran === "Tunai" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"
                      )}>{r.pembayaran || "—"}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{r.tgl_terima || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Halaman {detail.pagination.page} dari {detail.pagination.totalPages} ({detail.pagination.total} data)
              </span>
              <div className="flex gap-1">
                <button disabled={detail.pagination.page <= 1}
                  onClick={() => fetchDetail(detail.pagination.page - 1, filters)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                {Array.from({ length: Math.min(5, detail.pagination.totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(detail.pagination.page - 2 + i, detail.pagination.totalPages - 4 + i));
                  return p;
                }).filter((v, i, a) => a.indexOf(v) === i).map(p => (
                  <button key={p}
                    onClick={() => fetchDetail(p, filters)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition",
                      p === detail.pagination.page
                        ? "bg-sky-600 text-white border-sky-600"
                        : "border-slate-200 hover:bg-slate-50"
                    )}>{p}</button>
                ))}
                <button disabled={detail.pagination.page >= detail.pagination.totalPages}
                  onClick={() => fetchDetail(detail.pagination.page + 1, filters)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
