import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import {
  HiOutlineUserGroup, HiOutlineUser, HiOutlineCurrencyDollar,
  HiOutlineArrowPath, HiOutlineArrowTrendingUp, HiOutlineFunnel,
  HiOutlineBuildingStorefront, HiOutlineCreditCard, HiOutlineStar,
  HiOutlineMagnifyingGlass, HiOutlinePhone, HiOutlineCalendar,
  HiOutlineDocumentText,
} from "react-icons/hi2";

function cn(...c) { return c.filter(Boolean).join(" "); }

function fmtRp(v) {
  const n = Number(v) || 0;
  return "Rp " + n.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(v) {
  return (Number(v) || 0).toLocaleString("id-ID");
}

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
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

export default function B2bKoperasiCustomer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [list, setList] = useState({ data: [], pagination: { page: 1, totalPages: 1, total: 0 }, loading: false, meta: {} });
  const [filters, setFilters] = useState({ search: "", outlet: "", member: "" });
  const [sort, setSort] = useState({ col: "total_nominal_transaksi", dir: "desc" });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api("/b2b/kmp/customers/stats");
      setData(res.data || null);
    } catch (e) {
      setErr(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const fetchList = useCallback(async (page = 1, f = filters, s = sort) => {
    setList(p => ({ ...p, loading: true }));
    try {
      const params = new URLSearchParams({ page, limit: 20, sort: s.col, order: s.dir });
      if (f.search) params.set("search", f.search);
      if (f.outlet) params.set("outlet", f.outlet);
      if (f.member) params.set("member", f.member);
      const res = await api(`/b2b/kmp/customers?${params}`);
      setList({ data: res.data || [], pagination: res.pagination || {}, loading: false, meta: res.meta || {} });
    } catch {
      setList(p => ({ ...p, loading: false }));
    }
  }, [filters, sort]);

  useEffect(() => { fetchList(1, filters, sort); /* eslint-disable-next-line */ }, []);

  const applyFilters = () => fetchList(1, filters, sort);
  const resetFilters = () => {
    const f = { search: "", outlet: "", member: "" };
    setFilters(f);
    fetchList(1, f, sort);
  };
  const handleSearchKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyFilters(); }
  };
  const toggleSort = (col) => {
    const newSort = sort.col === col
      ? { col, dir: sort.dir === "desc" ? "asc" : "desc" }
      : { col, dir: "desc" };
    setSort(newSort);
    fetchList(1, filters, newSort);
  };

  const SortIcon = ({ col }) => (
    <span className="ml-1 text-[10px]">{sort.col === col ? (sort.dir === "desc" ? "▼" : "▲") : "⇅"}</span>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 sm:py-10">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="h-16 bg-slate-100 rounded-2xl animate-pulse mb-6" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[1,2,3,4,5].map(i => <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />)}
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
                <HiOutlineUserGroup className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white sm:text-2xl">Customer Koperasi Merah Putih</h1>
                <p className="text-sm text-white/70">Daftar customer </p>
              </div>
            </div>
            <button onClick={fetchStats}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/25 transition shadow-sm shrink-0">
              <HiOutlineArrowPath className="h-4 w-4" /> Refresh
            </button>
          </div>
        </section>

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={HiOutlineUserGroup}
            label="Total Customer"
            value={fmtNum(s.total_customer)}
            sub="Customer KMP aktif"
            accent={{ border: "border-slate-200", bg: "bg-white", iconBg: "bg-sky-100", iconText: "text-sky-600" }}
          />
          <StatCard
            icon={HiOutlineDocumentText}
            label="Total Transaksi"
            value={fmtNum(s.total_transaksi)}
            sub={`Rata-rata: ${fmtNum(Math.round(s.avg_transaksi || 0))}`}
            accent={{ border: "border-emerald-200", bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-600" }}
          />
          <StatCard
            icon={HiOutlineCurrencyDollar}
            label="Total Nominal"
            value={fmtRp(s.total_nominal)}
            sub={`Rata-rata: ${fmtRp(Math.round(s.avg_nominal || 0))}`}
            accent={{ border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-600" }}
          />
          <StatCard
            icon={HiOutlineCreditCard}
            label="Total Saldo ePayment"
            value={fmtRp(s.total_saldo)}
            sub="Saldo gabungan"
            accent={{ border: "border-violet-200", bg: "bg-violet-50", iconBg: "bg-violet-100", iconText: "text-violet-600" }}
          />
          <StatCard
            icon={HiOutlineBuildingStorefront}
            label="Outlet Terdaftar"
            value={data?.outlets?.length || 0}
            sub="Outlet berbeda"
            accent={{ border: "border-rose-200", bg: "bg-rose-50", iconBg: "bg-rose-100", iconText: "text-rose-600" }}
          />
        </section>

        {/* ── Top Customers + Member & Outlet Breakdown ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top 10 Customers */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineStar className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Top 10 Customer</h2>
            </div>
            {data?.top_customers?.length > 0 ? (
              <div className="space-y-2">
                {data.top_customers.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      i < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                    )}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{c.nama || "—"}</p>
                      <p className="text-[10px] text-slate-400 truncate">{c.instansi || c.outlet || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600">{fmtRp(c.total_nominal_transaksi)}</p>
                      <p className="text-[10px] text-slate-400">{c.total_jumlah_transaksi} transaksi</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data</p>
            )}
          </div>

          {/* Member + Outlet breakdown */}
          <div className="space-y-6 lg:col-span-2">
            {/* Member breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HiOutlineUser className="h-5 w-5 text-sky-500" />
                <h2 className="text-sm font-bold text-slate-800">Per Tipe Member</h2>
              </div>
              {data?.members?.length > 0 ? (
                <div className="space-y-3">
                  {data.members.map((m, i) => {
                    const maxVal = Math.max(...data.members.map(x => Number(x.total_nominal) || 0), 1);
                    const val = Number(m.total_nominal) || 0;
                    const pct = Math.round((val / maxVal) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700 w-24 shrink-0 truncate">{m.member_type}</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-5 rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <span className="text-xs font-bold text-slate-700">{m.total} org</span>
                          <span className="text-[10px] text-slate-400 ml-1 block">{fmtRp(val)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Belum ada data member</p>
              )}
            </div>

            {/* Outlet breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <HiOutlineBuildingStorefront className="h-5 w-5 text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-800">Per Outlet</h2>
              </div>
              {data?.outlets?.length > 0 ? (
                <div className="space-y-3">
                  {data.outlets.map((o, i) => {
                    const maxVal = Math.max(...data.outlets.map(x => Number(x.total_nominal) || 0), 1);
                    const val = Number(o.total_nominal) || 0;
                    const pct = Math.round((val / maxVal) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-700 w-28 shrink-0 truncate">{o.outlet}</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-5 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <span className="text-xs font-bold text-slate-700">{o.total} org</span>
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
          </div>
        </section>

        {/* ── Registration Trend ── */}
        {data?.registration_trend?.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineCalendar className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800">Tren Pendaftaran (12 Bulan Terakhir)</h2>
            </div>
            <div className="flex items-end gap-2 h-32">
              {(() => {
                const trend = [...data.registration_trend].reverse();
                const maxVal = Math.max(...trend.map(t => Number(t.total) || 0), 1);
                return trend.map((t, i) => {
                  const h = Math.max(8, Math.round(((Number(t.total) || 0) / maxVal) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-700">{t.total}</span>
                      <div className="w-full bg-indigo-100 rounded-t-lg overflow-hidden" style={{ height: `${h}%` }}>
                        <div className="w-full h-full bg-indigo-500 rounded-t-lg transition-all duration-500" />
                      </div>
                      <span className="text-[9px] text-slate-400 rotate-0">{t.month?.slice(5)}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        )}

        {/* ── Customer Table ── */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineFunnel className="h-5 w-5 text-sky-500" />
            <h2 className="text-sm font-bold text-slate-800">Daftar Customer KMP</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input type="text" placeholder="Cari nama / ID / telepon / instansi..." value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                onKeyDown={handleSearchKey}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none w-64" />
            </div>
            <select value={filters.outlet} onChange={e => setFilters(p => ({ ...p, outlet: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Outlet</option>
              {(list.meta.outlets || []).map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={filters.member} onChange={e => setFilters(p => ({ ...p, member: e.target.value }))}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none">
              <option value="">Semua Member</option>
              {(list.meta.members || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={applyFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Filter</button>
            <button onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">Reset</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">ID</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("nama")}>
                    Nama<SortIcon col="nama" />
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Instansi</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Outlet</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-500">Member</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500">Telepon</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("total_jumlah_transaksi")}>
                    Transaksi<SortIcon col="total_jumlah_transaksi" />
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("total_nominal_transaksi")}>
                    Nominal<SortIcon col="total_nominal_transaksi" />
                  </th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("saldo_epayment")}>
                    Saldo<SortIcon col="saldo_epayment" />
                  </th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-500 cursor-pointer hover:text-slate-800" onClick={() => toggleSort("transaksi_terakhir")}>
                    Terakhir<SortIcon col="transaksi_terakhir" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.loading ? (
                  <tr><td colSpan={10} className="py-8 text-center text-slate-400">Loading...</td></tr>
                ) : list.data.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 text-center text-slate-400">Tidak ada data customer KMP</td></tr>
                ) : list.data.map((r) => (
                  <tr key={r.id_konsumen || r.id} className="border-b border-slate-100 hover:bg-sky-50 transition">
                    <td className="py-2 px-3 font-mono text-slate-500">{r.id_konsumen || "—"}</td>
                    <td className="py-2 px-3">
                      <div className="max-w-[180px]">
                        <p className="font-semibold text-slate-800 truncate">{r.nama || "—"}</p>
                        {r.blok && <p className="text-[10px] text-slate-400">Blok {r.blok}</p>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-600 max-w-[150px] truncate">{r.instansi || "—"}</td>
                    <td className="py-2 px-3 text-slate-600">{r.outlet || "—"}</td>
                    <td className="py-2 px-3 text-center">
                      {r.member ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-semibold">{r.member}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {r.nomor_telpon ? (
                        <span className="flex items-center gap-1">
                          <HiOutlinePhone className="h-3 w-3 text-slate-400" />
                          {r.nomor_telpon}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-700">{fmtNum(r.total_jumlah_transaksi)}</td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600">{fmtRp(r.total_nominal_transaksi)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700">{fmtRp(r.saldo_epayment)}</td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{fmtDate(r.transaksi_terakhir)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Halaman {list.pagination.page} dari {list.pagination.totalPages} ({fmtNum(list.pagination.total)} customer)
              </span>
              <div className="flex gap-1">
                <button disabled={list.pagination.page <= 1}
                  onClick={() => fetchList(list.pagination.page - 1, filters, sort)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Prev</button>
                {Array.from({ length: Math.min(5, list.pagination.totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(list.pagination.page - 2 + i, list.pagination.totalPages - 4 + i));
                  return p;
                }).filter((v, i, a) => a.indexOf(v) === i).map(p => (
                  <button key={p}
                    onClick={() => fetchList(p, filters, sort)}
                    className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg border transition",
                      p === list.pagination.page
                        ? "bg-sky-600 text-white border-sky-600"
                        : "border-slate-200 hover:bg-slate-50"
                    )}>{p}</button>
                ))}
                <button disabled={list.pagination.page >= list.pagination.totalPages}
                  onClick={() => fetchList(list.pagination.page + 1, filters, sort)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition">Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
