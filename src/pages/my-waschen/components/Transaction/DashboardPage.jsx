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

function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm", className)}>
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
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

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (outletId) qs.set("outletId", outletId);
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);
      const res = await api(`/waschen/dashboard?${qs.toString()}`);
      setData(res.data || null);
    } catch (err) {
      setError(err.message || "Gagal memuat dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [outletId, dateFrom, dateTo]);

  useEffect(() => {
    loadOutlets();
  }, [loadOutlets]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-[100rem] mx-auto overflow-x-hidden">
      <PageHero className="!flex-col !items-stretch !gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-3xl">Dashboard My Waschen</h1>
            <p className="mt-2 text-sm leading-6 text-white/75 sm:text-base">
              Ringkasan penjualan, pelanggan, dan membership
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_auto] gap-2 sm:gap-3">
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full min-w-0 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-xs text-white outline-none backdrop-blur-sm"
              >
                <option value="" className="text-slate-800">Semua Outlet</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id} className="text-slate-800">{o.outlet_code} — {o.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-[#5f1340] shadow-md hover:bg-pink-50 disabled:opacity-60"
              >
                {loading ? <HiOutlineArrowPath className="h-4 w-4 animate-spin" /> : <HiOutlineArrowPath className="h-4 w-4" />}
                Refresh
              </button>
            </div>
            <CutoffPeriodFilter cutoff={cutoff} variant="hero" />
          </div>
        
      </PageHero>

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

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Top Layanan Terjual" subtitle="Layanan dengan revenue tertinggi" className="xl:col-span-7">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Layanan</th>
                      <th className="py-2 pr-3">Kategori</th>
                      <th className="py-2 pr-3 text-right">Qty</th>
                      <th className="py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenueByService.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-slate-400">Belum ada data layanan</td></tr>
                    ) : revenueByService.map((row) => (
                      <tr key={row.service_id}>
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-800">{row.service_name}</p>
                          <p className="text-[10px] font-mono text-[#5f1340]">{row.service_code}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">{row.category_name}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{fmtNum(row.qty)}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-700">{fmtIDR(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <div className="xl:col-span-5 space-y-4">
              <ChartCard title="Membership Aktif" subtitle="Paket membership yang sedang berjalan">
                <div className="space-y-2">
                  {membershipSummary.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Belum ada membership aktif</p>
                  ) : membershipSummary.map((row) => (
                    <div key={`${row.tier}-${row.package_name}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{row.package_name}</p>
                        <p className="text-[10px] text-slate-500">Tier {row.tier}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#5f1340]">{fmtNum(row.active_memberships)} member</p>
                        <p className="text-[10px] text-slate-500">{fmtIDR(row.total_top_up)} top up</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Mutasi Deposit" subtitle="Ringkasan top up & pemakaian deposit">
                <div className="space-y-2">
                  {depositLedger.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Belum ada mutasi deposit</p>
                  ) : depositLedger.map((row) => (
                    <div key={row.type} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-700">{row.type}</span>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-700">{fmtIDR(row.total_amount)}</p>
                        <p className="text-[10px] text-slate-400">{fmtNum(row.txn_count)} transaksi</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <ChartCard title="Top Pelanggan" subtitle="Pelanggan dengan belanja tertinggi" className="xl:col-span-5">
              <div className="space-y-2">
                {topCustomers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada data pelanggan</p>
                ) : topCustomers.map((c, idx) => (
                  <div key={c.id} className="flex items-start gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5f1340]/10 text-[11px] font-bold text-[#5f1340]">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-500">{c.customer_code} · {c.tier_name}</p>
                      {c.membership_package && <p className="text-[10px] text-amber-700">{c.membership_package}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-700">{fmtIDR(c.total_spent)}</p>
                      <p className="text-[10px] text-slate-400">Depo {fmtIDR(c.deposit_balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Status Pembayaran" subtitle="Lunas, DP, dan outstanding" className="xl:col-span-3">
              <div className="space-y-2">
                {paymentStatus.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi</p>
                ) : paymentStatus.map((row) => (
                  <div key={row.payment_status} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                    <PaymentBadge status={row.payment_status} />
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{fmtIDR(row.amount)}</p>
                      <p className="text-[10px] text-slate-400">{fmtNum(row.order_count)} nota</p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Transaksi Terbaru" subtitle="Nota terbaru beserta pelanggan & outlet" className="xl:col-span-4">
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Belum ada transaksi</p>
                ) : recentTransactions.map((t) => (
                  <div key={t.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-800">{t.order_no}</p>
                        <p className="text-[10px] text-slate-500">{t.customer_name} · {t.outlet_code}</p>
                      </div>
                      <p className="text-xs font-bold text-emerald-700 shrink-0">{fmtIDR(t.grand_total)}</p>
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
