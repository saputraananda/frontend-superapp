import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineChartBarSquare,
  HiOutlineCreditCard,
  HiOutlineExclamationTriangle,
  HiOutlineShoppingBag,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { api } from "../../../../lib/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import PageHero from "../PageHero";
import CutoffPeriodFilter from "../CutoffPeriodFilter";
import useCutoffPeriod from "../../hooks/useCutoffPeriod";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function fmtIDR(val) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val) || 0);
}

function fmtNum(val) {
  return new Intl.NumberFormat("id-ID").format(Number(val) || 0);
}

function fmtDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const CHART_COLORS = ["#5f1340", "#8b2e5c", "#c45c8a", "#e8a0bc", "#3d0728", "#7c3aed", "#f59e0b", "#10b981"];

function ChartTooltip({ active, payload, label, valueFormatter = fmtNum }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-slate-700">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || p.fill }} className="font-medium">
          {p.name}: {valueFormatter(p.value)}
        </p>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "from-[#5f1340] to-[#3d0728]" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold text-slate-800 truncate">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = "", action = null }) {
  return (
    <div className={cn("min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** 1.250.000 → "1,3jt", 45.000 → "45rb" */
function fmtShort(val) {
  const n = Number(val) || 0;
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1).replace(".", ",")}M`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1).replace(".", ",")}jt`;
  if (abs >= 1e3) return `${Math.round(n / 1e3)}rb`;
  return String(Math.round(n));
}

const PAY_COLORS = { Lunas: "#10b981", DP: "#f59e0b", Outstanding: "#e11d48" };
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function InsightChip({ label, value, hint, tone = "slate" }) {
  const t = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/50",
    rose: "border-rose-200 bg-rose-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  }[tone];
  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", t)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-bold text-slate-800 sm:text-lg">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function PaymentBadge({ status }) {
  const styles = {
    Lunas: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DP: "bg-amber-50 text-amber-700 border-amber-200",
    Outstanding: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold", styles[status] || "bg-slate-100 text-slate-600 border-slate-200")}>
      {status || "—"}
    </span>
  );
}

export default function DashboardPage() {
  const cutoff = useCutoffPeriod();
  const { dateFrom, dateTo } = cutoff;
  const [outlets, setOutlets] = useState([]);
  const [outletId, setOutletId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOutlets = useCallback(async () => {
    try {
      const res = await api("/waschen/outlets");
      setOutlets(res.data || []);
    } catch {
      /* optional */
    }
  }, []);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const qs = new URLSearchParams();
      if (outletId) qs.set("outletId", outletId);
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);
      const res = await api(`/waschen/dashboard?${qs.toString()}`);
      setData(res.data || null);
    } catch (err) {
      if (silent) return;
      setError(err.message || "Gagal memuat dashboard");
      setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [outletId, dateFrom, dateTo]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useLiveRefresh(() => loadDashboard(true));

  const summary = data?.summary || {};
  const salesTrend = useMemo(
    () => (data?.salesTrend || []).map((row) => ({
      ...row,
      label: fmtDate(row.sale_date),
      revenue: Number(row.revenue) || 0,
      order_count: Number(row.order_count) || 0,
    })),
    [data?.salesTrend],
  );

  const revenueByOutlet = useMemo(
    () => (data?.revenueByOutlet || []).map((row) => ({
      name: row.outlet_code || row.outlet_name,
      revenue: Number(row.revenue) || 0,
      order_count: Number(row.order_count) || 0,
    })),
    [data?.revenueByOutlet],
  );

  const revenueByCategory = useMemo(
    () => (data?.revenueByCategory || []).map((row) => ({
      name: row.category_name,
      value: Number(row.revenue) || 0,
    })),
    [data?.revenueByCategory],
  );

  const customerByTier = useMemo(
    () => (data?.customerByTier || []).map((row) => ({
      name: row.tier_name,
      value: Number(row.customer_count) || 0,
      deposit: Number(row.deposit_balance) || 0,
    })),
    [data?.customerByTier],
  );

  const customerBySource = useMemo(
    () => (data?.customerBySource || []).map((row) => ({
      name: row.source_label,
      value: Number(row.customer_count) || 0,
    })),
    [data?.customerBySource],
  );

  const paymentStatus = data?.paymentStatus || [];
  const membershipSummary = data?.membershipSummary || [];
  const topCustomers = data?.topCustomers || [];
  const recentTransactions = data?.recentTransactions || [];
  const revenueByService = data?.revenueByService || [];
  const depositLedger = data?.depositLedger || [];

  const [svcMetric, setSvcMetric] = useState("revenue");
  const [svcSearch, setSvcSearch] = useState("");
  const [payFilter, setPayFilter] = useState("");
  const [trxSearch, setTrxSearch] = useState("");
  const [weekdayFocus, setWeekdayFocus] = useState(null);

  const cumulativeTrend = useMemo(() => {
    let run = 0;
    return salesTrend.map((r) => ({ label: r.label, cumulative: (run += r.revenue) }));
  }, [salesTrend]);

  const insights = useMemo(() => {
    const active = salesTrend.filter((r) => r.revenue > 0);
    const total = active.reduce((s, r) => s + r.revenue, 0);
    const sorted = [...active].sort((a, b) => b.revenue - a.revenue);
    const revenue = Number(summary.total_revenue) || 0;
    const outstanding = Number(summary.outstanding_amount) || 0;
    return {
      days: active.length,
      avgPerDay: active.length ? total / active.length : 0,
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null,
      outstandingPct: revenue ? Math.round((outstanding / revenue) * 100) : 0,
    };
  }, [salesTrend, summary.total_revenue, summary.outstanding_amount]);

  const weekdayStats = useMemo(() => {
    const acc = WEEKDAYS.map((name) => ({ name, total: 0, count: 0 }));
    salesTrend.forEach((r) => {
      const d = new Date(r.sale_date);
      if (Number.isNaN(d.getTime()) || r.revenue <= 0) return;
      acc[d.getDay()].total += r.revenue;
      acc[d.getDay()].count += 1;
    });
    return acc.map((a) => ({ name: a.name, avg: a.count ? Math.round(a.total / a.count) : 0 }));
  }, [salesTrend]);
  const weekdayBest = useMemo(() => {
    const top = [...weekdayStats].sort((a, b) => b.avg - a.avg)[0];
    return top && top.avg > 0 ? top.name : null;
  }, [weekdayStats]);

  const serviceTotal = useMemo(() => revenueByService.reduce((s, r) => s + (Number(r.revenue) || 0), 0), [revenueByService]);
  const servicesView = useMemo(() => {
    const q = svcSearch.trim().toLowerCase();
    return revenueByService
      .map((r) => ({ ...r, revenue: Number(r.revenue) || 0, qty: Number(r.qty) || 0 }))
      .filter((r) => !q || `${r.service_name} ${r.category_name} ${r.service_code}`.toLowerCase().includes(q))
      .sort((a, b) => b[svcMetric] - a[svcMetric]);
  }, [revenueByService, svcSearch, svcMetric]);

  const membershipChart = useMemo(
    () => membershipSummary.map((r) => ({ name: r.package_name, value: Number(r.active_memberships) || 0 })),
    [membershipSummary],
  );
  const membershipTotal = membershipChart.reduce((s, r) => s + r.value, 0);
  const depositChart = useMemo(
    () => depositLedger.map((r) => ({ name: String(r.type || "").replace(/^./, (c) => c.toUpperCase()), amount: Math.abs(Number(r.total_amount) || 0) })),
    [depositLedger],
  );
  const topSpentMax = useMemo(() => Math.max(0, ...topCustomers.map((c) => Number(c.total_spent) || 0)), [topCustomers]);
  const paymentChart = useMemo(
    () => paymentStatus.map((r) => ({ name: r.payment_status, value: Number(r.amount) || 0 })),
    [paymentStatus],
  );
  const paymentTotal = paymentChart.reduce((s, r) => s + r.value, 0);
  const trxView = useMemo(() => {
    const q = trxSearch.trim().toLowerCase();
    return recentTransactions.filter((t) =>
      (!payFilter || t.payment_status === payFilter)
      && (!q || `${t.order_no} ${t.customer_name}`.toLowerCase().includes(q)));
  }, [recentTransactions, payFilter, trxSearch]);

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Dashboard My Waschen</h1>
          <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
            Ringkasan penjualan, pelanggan, dan membership
          </p>
        </div>
      </PageHero>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:p-5 shadow-sm min-w-0 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_auto] gap-2 sm:gap-3">
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-[#5f1340]/40"
          >
            <option value="">Semua Outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.outlet_code} — {o.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-[#5f1340] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#4d0f34] disabled:opacity-60"
          >
            <HiOutlineArrowPath className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <CutoffPeriodFilter cutoff={cutoff} />
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center gap-2">
          <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={HiOutlineBanknotes} label="Revenue Periode" value={fmtIDR(summary.total_revenue)} sub={`${fmtNum(summary.revenue_orders || summary.total_orders)} nota dibayar`} />
            <StatCard icon={HiOutlineShoppingBag} label="Rata-rata Revenue" value={fmtIDR(summary.avg_order_value)} sub={`Diskon ${fmtIDR(summary.total_discount)}`} tone="from-violet-600 to-purple-700" />
            <StatCard icon={HiOutlineUserGroup} label="Pelanggan Aktif" value={fmtNum(summary.active_customers)} sub={`Total ${fmtNum(summary.total_customers)} pelanggan`} tone="from-sky-600 to-blue-700" />
            <StatCard icon={HiOutlineCreditCard} label="Saldo Deposit" value={fmtIDR(summary.total_deposit_balance)} sub={`${fmtNum(summary.customers_with_membership)} pakai membership`} tone="from-emerald-600 to-teal-700" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={HiOutlineChartBarSquare} label="Piutang Outstanding" value={fmtIDR(summary.outstanding_amount)} sub="Nota belum dibayar" tone="from-rose-600 to-red-700" />
            <StatCard icon={HiOutlineBanknotes} label="Nota Periode" value={fmtNum(summary.total_orders)} sub={`Express fee ${fmtIDR(summary.total_speed_surcharge)}`} tone="from-amber-600 to-orange-700" />
            <StatCard icon={HiOutlineUserGroup} label="Spending Bulanan" value={fmtIDR(summary.monthly_spending_total)} sub={`Lifetime ${fmtIDR(summary.lifetime_spent)}`} tone="from-fuchsia-600 to-pink-700" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Tren Revenue Harian" subtitle="Berdasarkan tanggal pembayaran (bukan tanggal nota)" className="xl:col-span-8">
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5f1340" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#5f1340" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip valueFormatter={(v) => (typeof v === "number" && v > 999 ? fmtIDR(v) : fmtNum(v))} />} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#5f1340" fill="url(#revGrad)" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="order_count" name="Nota" stroke="#8b5cf6" fill="transparent" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Kategori Layanan" subtitle="Revenue per kategori layanan" className="xl:col-span-4">
              <div className="h-56 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={revenueByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {revenueByCategory.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtIDR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            <ChartCard title="Revenue per Outlet" subtitle="Perbandingan revenue antar outlet">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByOutlet}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtIDR} />} />
                    <Bar dataKey="revenue" name="Revenue" fill="#5f1340" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Pelanggan per Tier" subtitle="Jumlah pelanggan di setiap tier">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerByTier} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Pelanggan" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Sumber Pelanggan" subtitle="Dari mana pelanggan datang">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={customerBySource} dataKey="value" nameKey="name" outerRadius={88}>
                      {customerBySource.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmtNum(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Insight cepat dari tren harian */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <InsightChip label="Rata-rata Revenue / Hari" value={fmtIDR(insights.avgPerDay)} hint={`${fmtNum(insights.days)} hari aktif`} />
            <InsightChip label="Hari Terbaik" value={insights.best ? fmtIDR(insights.best.revenue) : "—"} hint={insights.best ? insights.best.label : "Belum ada data"} tone="emerald" />
            <InsightChip label="Hari Terendah" value={insights.worst ? fmtIDR(insights.worst.revenue) : "—"} hint={insights.worst ? insights.worst.label : "Belum ada data"} tone="rose" />
            <InsightChip label="Piutang / Revenue" value={`${insights.outstandingPct}%`} hint="Porsi nota belum dibayar" tone="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Akumulasi Revenue" subtitle="Pertumbuhan revenue kumulatif sepanjang periode" className="xl:col-span-7">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeTrend}>
                    <defs>
                      <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtIDR} />} />
                    <Area type="monotone" dataKey="cumulative" name="Kumulatif" stroke="#10b981" fill="url(#cumGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Pola Hari dalam Seminggu" subtitle="Rata-rata revenue per hari (klik batang untuk fokus)" className="xl:col-span-5">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                    <Tooltip content={<ChartTooltip valueFormatter={fmtIDR} />} />
                    <Bar dataKey="avg" name="Rata-rata" radius={[6, 6, 0, 0]} onClick={(d) => setWeekdayFocus((p) => (p === d.name ? null : d.name))} className="cursor-pointer">
                      {weekdayStats.map((d) => (
                        <Cell key={d.name} fill={d.name === weekdayBest ? "#5f1340" : "#c45c8a"} fillOpacity={weekdayFocus && weekdayFocus !== d.name ? 0.3 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {weekdayBest && <p className="mt-2 text-[11px] text-slate-500">Hari tersibuk: <b className="text-[#5f1340]">{weekdayBest}</b></p>}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard
              title="Top Layanan Terjual"
              subtitle="Layanan dengan revenue tertinggi"
              className="xl:col-span-7"
              action={
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                  {[["revenue", "Revenue"], ["qty", "Qty"]].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setSvcMetric(k)}
                      className={cn("rounded-md px-2.5 py-1 transition", svcMetric === k ? "bg-[#5f1340] text-white shadow-sm" : "text-slate-500 hover:text-slate-800")}>{l}</button>
                  ))}
                </div>
              }
            >
              <input value={svcSearch} onChange={(e) => setSvcSearch(e.target.value)} placeholder="Cari layanan atau kategori..."
                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]/40" />
              {servicesView.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-400">Belum ada data layanan</p>
              ) : (
                <>
                  <div style={{ height: Math.max(180, Math.min(servicesView.length, 8) * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={servicesView.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={svcMetric === "revenue" ? fmtShort : fmtNum} />
                        <YAxis type="category" dataKey="service_name" width={130} tick={{ fontSize: 11 }} tickFormatter={(v) => (String(v).length > 20 ? `${String(v).slice(0, 19)}…` : v)} />
                        <Tooltip content={<ChartTooltip valueFormatter={svcMetric === "revenue" ? fmtIDR : fmtNum} />} />
                        <Bar dataKey={svcMetric} name={svcMetric === "revenue" ? "Revenue" : "Qty"} radius={[0, 6, 6, 0]}>
                          {servicesView.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Layanan</th>
                          <th className="px-3 py-2">Kategori</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Revenue</th>
                          <th className="px-3 py-2 w-28">Kontribusi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {servicesView.map((row) => {
                          const share = serviceTotal ? (row.revenue / serviceTotal) * 100 : 0;
                          return (
                            <tr key={row.service_id} className="transition hover:bg-[#5f1340]/[0.03]">
                              <td className="px-3 py-2.5">
                                <p className="font-semibold text-slate-800">{row.service_name}</p>
                                <p className="text-[10px] font-mono text-[#5f1340]">{row.service_code}</p>
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">{row.category_name}</td>
                              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{fmtNum(row.qty)}</td>
                              <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 tabular-nums">{fmtIDR(row.revenue)}</td>
                              <td className="px-3 py-2.5">
                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#5f1340]" style={{ width: `${Math.min(100, share)}%` }} /></div>
                                <p className="mt-0.5 text-[10px] text-slate-400">{share.toFixed(1)}%</p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </ChartCard>

            <div className="xl:col-span-5 space-y-4">
              <ChartCard title="Membership Aktif" subtitle="Paket membership yang sedang berjalan">
                {membershipSummary.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Belum ada membership aktif</p>
                ) : (
                  <div className="flex flex-col items-center gap-3 sm:flex-row">
                    <div className="relative h-40 w-40 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={membershipChart} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={3}>
                            {membershipChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => `${fmtNum(v)} member`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-lg font-bold text-slate-800">{fmtNum(membershipTotal)}</p>
                        <p className="text-[10px] text-slate-400">member</p>
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      {membershipSummary.map((row, i) => (
                        <div key={`${row.tier}-${row.package_name}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 transition hover:border-[#5f1340]/30 hover:bg-white">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <div>
                              <p className="text-xs font-bold text-slate-800">{row.package_name}</p>
                              <p className="text-[10px] text-slate-500">Tier {row.tier}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-[#5f1340]">{fmtNum(row.active_memberships)} member</p>
                            <p className="text-[10px] text-slate-500">{fmtIDR(row.total_top_up)} top up</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Mutasi Deposit" subtitle="Ringkasan top up & pemakaian deposit">
                {depositLedger.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Belum ada mutasi deposit</p>
                ) : (
                  <>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={depositChart}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                          <Tooltip content={<ChartTooltip valueFormatter={fmtIDR} />} />
                          <Bar dataKey="amount" name="Nominal" radius={[6, 6, 0, 0]}>
                            {depositChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 5) % CHART_COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-2">
                      {depositLedger.map((row) => (
                        <div key={row.type} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                          <span className="text-xs font-semibold capitalize text-slate-700">{row.type}</span>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-700">{fmtIDR(row.total_amount)}</p>
                            <p className="text-[10px] text-slate-400">{fmtNum(row.txn_count)} transaksi</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ChartCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Top Pelanggan" subtitle="Pelanggan dengan belanja tertinggi" className="xl:col-span-5">
              {topCustomers.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Belum ada data pelanggan</p>
              ) : (
                <div className="space-y-2">
                  {topCustomers.map((c, idx) => {
                    const pct = topSpentMax ? (Number(c.total_spent) / topSpentMax) * 100 : 0;
                    return (
                      <div key={c.id} className="group rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-[#5f1340]/30 hover:shadow-sm">
                        <div className="flex items-start gap-3">
                          <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", idx < 3 ? "bg-[#5f1340] text-white" : "bg-[#5f1340]/10 text-[#5f1340]")}>{idx + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">{c.name}</p>
                            <p className="text-[10px] text-slate-500">{c.customer_code} · {c.tier_name}</p>
                            {c.membership_package && <p className="text-[10px] text-amber-700">{c.membership_package}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs font-bold text-emerald-700">{fmtIDR(c.total_spent)}</p>
                            <p className="text-[10px] text-slate-400">Depo {fmtIDR(c.deposit_balance)}</p>
                          </div>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#5f1340] to-[#c45c8a] transition-all group-hover:opacity-80" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            <ChartCard title="Status Pembayaran" subtitle="Klik status untuk memfilter transaksi terbaru" className="xl:col-span-3">
              {paymentStatus.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">Belum ada transaksi</p>
              ) : (
                <>
                  <div className="relative h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}
                          onClick={(d) => setPayFilter((p) => (p === d.name ? "" : d.name))} className="cursor-pointer">
                          {paymentChart.map((d) => (
                            <Cell key={d.name} fill={PAY_COLORS[d.name] || "#94a3b8"} fillOpacity={payFilter && payFilter !== d.name ? 0.25 : 1} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmtIDR(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[10px] text-slate-400">Total nilai</p>
                      <p className="text-sm font-bold text-slate-800">{fmtShort(paymentTotal)}</p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {paymentStatus.map((row) => (
                      <button key={row.payment_status} type="button" onClick={() => setPayFilter((p) => (p === row.payment_status ? "" : row.payment_status))}
                        className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition",
                          payFilter === row.payment_status ? "border-[#5f1340] bg-[#5f1340]/5" : "border-slate-100 hover:border-slate-300")}>
                        <PaymentBadge status={row.payment_status} />
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-800">{fmtIDR(row.amount)}</p>
                          <p className="text-[10px] text-slate-400">{fmtNum(row.order_count)} nota · {paymentTotal ? Math.round((Number(row.amount) / paymentTotal) * 100) : 0}%</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </ChartCard>

            <ChartCard
              title="Transaksi Terbaru"
              subtitle={payFilter ? `Difilter: ${payFilter}` : "Nota terbaru beserta pelanggan & outlet"}
              className="xl:col-span-4"
              action={payFilter ? <button type="button" onClick={() => setPayFilter("")} className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50">Reset</button> : null}
            >
              <input value={trxSearch} onChange={(e) => setTrxSearch(e.target.value)} placeholder="Cari no. nota atau pelanggan..."
                className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#5f1340]/40" />
              <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
                {trxView.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">Tidak ada transaksi yang cocok</p>
                ) : trxView.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-[#5f1340]/30 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{t.order_no}</p>
                        <p className="text-[10px] text-slate-500">{t.customer_name} · {t.outlet_code}</p>
                      </div>
                      <p className="shrink-0 text-xs font-bold text-emerald-700">{fmtIDR(t.grand_total)}</p>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <PaymentBadge status={t.payment_status} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{t.order_category}</span>
                      {t.speed_name && <span className="text-[10px] text-slate-400">{t.speed_name}</span>}
                      <span className="text-[10px] text-slate-400">{fmtNum(t.item_count)} item</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
