import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * Dashboard UI — improved to match the reference template:
 * - Softer glass background + card shadows
 * - Top filter bar like the template
 * - Better spacing/typography
 * - Gradient mini cards + tidy legends
 * - Cleaner charts + badges + table styling
 */

const cn = (...a) => a.filter(Boolean).join(" ");

const Card = ({ className, children }) => (
  <div
    className={cn(
      "rounded-2xl bg-white/85 backdrop-blur-xl border border-white/60 shadow-[0_20px_60px_rgba(17,24,39,0.08)]",
      className
    )}
  >
    {children}
  </div>
);

const PillSelect = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none rounded-xl border border-white/70 bg-white/70 backdrop-blur px-4 py-2.5 pr-10 text-sm text-slate-700 shadow-sm outline-none ring-0 transition focus:border-fuchsia-200 focus:ring-4 focus:ring-fuchsia-200/40"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
        <path d="M5.25 7.5 10 12.25 14.75 7.5 16 8.75 10 14.75 4 8.75z" />
      </svg>
    </div>
  </div>
);

const IconBadge = ({ children, tone = "pink" }) => {
  const toneMap = {
    pink: "bg-fuchsia-100 text-fuchsia-600",
    purple: "bg-violet-100 text-violet-600",
    blue: "bg-sky-100 text-sky-600",
    orange: "bg-amber-100 text-amber-700",
  };
  return (
    <div
      className={cn(
        "h-12 w-12 rounded-2xl grid place-items-center shadow-sm",
        toneMap[tone]
      )}
    >
      <span className="text-xl">{children}</span>
    </div>
  );
};

const TinyLegendDot = ({ colorClass }) => (
  <span className={cn("inline-block h-2.5 w-2.5 rounded-full", colorClass)} />
);

const StatRow = ({ icon, tone, label, value }) => (
  <div className="flex items-center gap-3">
    <IconBadge tone={tone}>{icon}</IconBadge>
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="truncate text-base font-semibold text-slate-800">{value}</p>
    </div>
  </div>
);

const SoftButton = ({ children }) => (
  <button className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(236,72,153,0.25)] transition hover:translate-y-[-1px] hover:shadow-[0_20px_40px_rgba(236,72,153,0.28)] active:translate-y-[0px]">
    {children}
  </button>
);

const Tab = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "text-xs font-semibold tracking-wide transition",
      active ? "text-fuchsia-600" : "text-slate-400 hover:text-slate-600"
    )}
  >
    <span className="relative pb-2">
      {children}
      {active && (
        <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500" />
      )}
    </span>
  </button>
);

const fmtIDR = (n) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

const TooltipCard = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/60 bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <div className="mt-1 space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-500">{p.name ?? p.dataKey}</span>
            <span className="text-xs font-semibold text-slate-800">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Dashboard() {
  // Filters (static for UI)
  const [period, setPeriod] = useState("May 2024");
  const [outlet, setOutlet] = useState("All Outlets");
  const [channel, setChannel] = useState("All Channels");
  const [shift, setShift] = useState("All Shifts");
  const [rangeTab, setRangeTab] = useState("MONTHLY");

  // Chart data (more “template-like”: repeated ticks, smooth waves)
  const salesData = useMemo(
    () => [
      { x: "May", sales: 120, orders: 90 },
      { x: "May", sales: 240, orders: 180 },
      { x: "May", sales: 200, orders: 210 },
      { x: "May", sales: 260, orders: 190 },
      { x: "May", sales: 230, orders: 240 },
      { x: "May", sales: 320, orders: 280 },
      { x: "May", sales: 270, orders: 340 },
      { x: "May", sales: 360, orders: 210 },
      { x: "May", sales: 210, orders: 90 },
    ],
    []
  );

  const trafficBreakdown = useMemo(
    () => [
      { name: "Inbound", value: 33, color: "#A855F7" },
      { name: "Existing", value: 55, color: "#EC4899" },
      { name: "Vs. Yesterday", value: 12, color: "#F59E0B" },
    ],
    []
  );

  const trafficDonut = useMemo(
    () => [
      { name: "Achieved", value: 88, color: "#EC4899" },
      { name: "Remaining", value: 12, color: "#A855F7" },
    ],
    []
  );

  const customerData = useMemo(
    () => [
      { name: "Loyal", value: 31, color: "#EC4899" },
      { name: "Regular", value: 24, color: "#60A5FA" },
      { name: "One Time", value: 24, color: "#F59E0B" },
      { name: "Other", value: 21, color: "#A855F7" },
    ],
    []
  );

  const analyticsTimeData = useMemo(
    () => [
      { t: 1, v: 78 },
      { t: 2, v: 84 },
      { t: 3, v: 81 },
      { t: 4, v: 87 },
      { t: 5, v: 92 },
      { t: 6, v: 95 },
    ],
    []
  );

  const pageViewData = useMemo(
    () => [
      { t: 1, v: 380 },
      { t: 2, v: 400 },
      { t: 3, v: 390 },
      { t: 4, v: 410 },
      { t: 5, v: 420 },
      { t: 6, v: 400 },
    ],
    []
  );

  const oxennData = useMemo(
    () => [
      { t: 1, v: 410 },
      { t: 2, v: 420 },
      { t: 3, v: 450 },
      { t: 4, v: 430 },
      { t: 5, v: 470 },
      { t: 6, v: 445 },
    ],
    []
  );

  const cacDonut = useMemo(
    () => [
      { name: "Salaries", value: 32, color: "#EC4899" },
      { name: "Operational", value: 39, color: "#60A5FA" },
      { name: "Marketing", value: 32, color: "#F59E0B" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_10%_10%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(900px_500px_at_85%_15%,rgba(168,85,247,0.18),transparent_55%),radial-gradient(900px_500px_at_70%_90%,rgba(14,165,233,0.14),transparent_55%),linear-gradient(135deg,#f8fafc,rgba(249,168,212,0.22),rgba(167,139,250,0.18),rgba(186,230,253,0.22))]">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-white/60 bg-white/40 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 shadow-[0_12px_26px_rgba(168,85,247,0.25)]" />
              <div className="leading-tight">
                <p className="text-sm font-bold text-slate-800">
                  Dashboard Analytics
                </p>
                <p className="text-xs text-slate-500">Alora Group Indonesia</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white/70 shadow-sm ring-1 ring-white/70 transition hover:scale-[1.03]">
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow">
                  2
                </span>
                🔔
              </button>
              <button className="relative grid h-10 w-10 place-items-center rounded-full bg-white/70 shadow-sm ring-1 ring-white/70 transition hover:scale-[1.03]">
                <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow">
                  3
                </span>
                💬
              </button>
              <button className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-white shadow-md transition hover:scale-[1.03]">
                <img
                  src="https://ui-avatars.com/api/?name=User&background=ffffff"
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              </button>
            </div>
          </div>

          {/* Filter row (like template) */}
          <div className="pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <PillSelect
                value={period}
                onChange={setPeriod}
                options={["May 2024", "Apr 2024", "Mar 2024"]}
              />
              <PillSelect
                value={outlet}
                onChange={setOutlet}
                options={["All Outlets", "Outlet A", "Outlet B"]}
              />
              <PillSelect
                value={channel}
                onChange={setChannel}
                options={["All Channels", "Online", "Offline"]}
              />
              <PillSelect
                value={shift}
                onChange={setShift}
                options={["All Shifts", "Morning", "Evening"]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sales Overview */}
          <Card className="col-span-12 lg:col-span-8">
            <div className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                {/* Left copy */}
                <div className="lg:w-[280px]">
                  <p className="text-xs font-semibold text-slate-500">
                    Sales Overview
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Campaigns and ads performance
                  </p>

                  <div className="mt-5">
                    <p className="text-3xl font-extrabold text-slate-900">
                      {fmtUSD(3468.96)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Current Month Earnings
                    </p>
                  </div>

                  <div className="mt-5">
                    <p className="text-2xl font-extrabold text-slate-900">82</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Current Month Sales
                    </p>
                  </div>

                  <div className="mt-5">
                    <SoftButton>Last Month Summary</SoftButton>
                  </div>
                </div>

                {/* Right chart */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <Tab active={rangeTab === "DAILY"} onClick={() => setRangeTab("DAILY")}>
                        DAILY
                      </Tab>
                      <Tab active={rangeTab === "WEEKLY"} onClick={() => setRangeTab("WEEKLY")}>
                        WEEKLY
                      </Tab>
                      <Tab active={rangeTab === "MONTHLY"} onClick={() => setRangeTab("MONTHLY")}>
                        MONTHLY
                      </Tab>
                      <Tab active={rangeTab === "YEARLY"} onClick={() => setRangeTab("YEARLY")}>
                        YEARLY
                      </Tab>
                    </div>

                    <div className="hidden items-center gap-5 md:flex">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <TinyLegendDot colorClass="bg-violet-500" />
                        Orders
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <TinyLegendDot colorClass="bg-fuchsia-500" />
                        Sales
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-[230px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EC4899" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.35)" />
                        <XAxis dataKey="x" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip content={<TooltipCard />} />
                        <Area
                          type="monotone"
                          dataKey="orders"
                          name="Orders"
                          stroke="#A855F7"
                          strokeWidth={2}
                          fill="url(#gOrders)"
                        />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          name="Sales"
                          stroke="#EC4899"
                          strokeWidth={2}
                          fill="url(#gSales)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Metrics row */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatRow
                  icon="🎯"
                  tone="pink"
                  label="Monthly Target"
                  value={`IDR ${fmtIDR(500000)}`}
                />
                <StatRow
                  icon="📊"
                  tone="purple"
                  label="Target Sales"
                  value={fmtUSD(1097.53)}
                />
                <StatRow
                  icon="💰"
                  tone="blue"
                  label="Seat on Stocks"
                  value={`IDR ${fmtIDR(220000)}`}
                />
                <StatRow
                  icon="📈"
                  tone="orange"
                  label="Sales Today"
                  value={`IDR ${fmtIDR(900000)}`}
                />
              </div>
            </div>
          </Card>

          {/* Traffic */}
          <Card className="col-span-12 lg:col-span-4">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">Traffic</p>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                  {period}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-center">
                <div className="relative h-[220px] w-[220px]">
                  <PieChart width={220} height={220}>
                    <Pie
                      data={trafficDonut}
                      cx={110}
                      cy={110}
                      innerRadius={74}
                      outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {trafficDonut.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>

                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <p className="text-4xl font-extrabold text-slate-900">88%</p>
                      <p className="text-sm font-semibold text-slate-500">
                        Achievement
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-3">
                {trafficBreakdown.map((t) => (
                  <div
                    key={t.name}
                    className="rounded-2xl bg-white/60 px-3 py-3 text-center ring-1 ring-white/70"
                  >
                    <p className="text-2xl font-extrabold text-slate-900">
                      {t.value}%
                    </p>
                    <p className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: t.color }}
                      />
                      {t.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Mini cards row */}
          <div className="col-span-12 grid grid-cols-12 gap-6">
            <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-400 p-6 text-white shadow-[0_20px_50px_rgba(236,72,153,0.28)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sales Performance</p>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  Monthly
                </span>
              </div>
              <div className="mt-4 flex h-14 items-end gap-2">
                {[28, 48, 36, 58, 30, 52, 44].map((h, i) => (
                  <div
                    key={i}
                    className="w-full rounded-md bg-white/25"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-rose-100">↓ 12%</span>
                  <span className="text-emerald-100">↑ 12%</span>
                </div>
                <p className="text-2xl font-extrabold">$300,000</p>
              </div>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 p-6 text-white shadow-[0_20px_50px_rgba(168,85,247,0.28)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Page View</p>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  Trend
                </span>
              </div>
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pageViewData}>
                    <defs>
                      <linearGradient id="gPV" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#ffffff" strokeWidth={2} fill="url(#gPV)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-right text-2xl font-extrabold">$432</p>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-400 p-6 text-white shadow-[0_20px_50px_rgba(14,165,233,0.26)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Oxenn Rate</p>
                <select className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold outline-none">
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Daily</option>
                </select>
              </div>
              <div className="mt-3 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={oxennData}>
                    <defs>
                      <linearGradient id="gOx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#ffffff" strokeWidth={2} fill="url(#gOx)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-right text-2xl font-extrabold">$432</p>
            </div>

            <div className="col-span-12 sm:col-span-6 lg:col-span-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 p-6 text-white shadow-[0_20px_50px_rgba(245,158,11,0.26)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Complain System</p>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  Status
                </span>
              </div>
              <div className="mt-4 flex h-14 items-end gap-2">
                {[34, 50, 40, 56, 44, 62, 52].map((h, i) => (
                  <div
                    key={i}
                    className="w-full rounded-md bg-white/25"
                    style={{ height: `${h}px` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="text-emerald-100">↑ 11.4%</span>
                  <span className="text-emerald-100">↑ 12%</span>
                </div>
                <p className="text-2xl font-extrabold">IDR 94,000</p>
              </div>
            </div>
          </div>

          {/* Customer Analytics */}
          <Card className="col-span-12 lg:col-span-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">
                  Customer Analytics
                </p>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                  {period}
                </span>
              </div>

              <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative mx-auto w-[220px] md:mx-0">
                  <PieChart width={220} height={220}>
                    <Pie
                      data={customerData}
                      cx={110}
                      cy={110}
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {customerData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-2xl font-extrabold text-slate-900">31%</p>
                      <p className="text-xs font-semibold text-slate-500">Top Segment</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="space-y-4">
                    {[
                      { name: "Loyal", range: "(2–4%)", val: 31, icon: "👑", color: "bg-fuchsia-100 text-fuchsia-600" },
                      { name: "Regular", range: "(3–3%)", val: 24, icon: "😊", color: "bg-sky-100 text-sky-600" },
                      { name: "One Time", range: "(1%)", val: 24, icon: "⏱️", color: "bg-amber-100 text-amber-700" },
                    ].map((r) => (
                      <div
                        key={r.name}
                        className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("grid h-10 w-10 place-items-center rounded-full", r.color)}>
                            <span>{r.icon}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {r.name}{" "}
                              <span className="text-xs font-semibold text-slate-400">
                                {r.range}
                              </span>
                            </p>
                            <p className="text-xs text-slate-400">IDR this month</p>
                          </div>
                        </div>
                        <p className="text-sm font-extrabold text-slate-800">{r.val}%</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl bg-white/60 px-4 py-4 ring-1 ring-white/70">
                    <div className="h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsTimeData}>
                          <Line
                            type="monotone"
                            dataKey="v"
                            stroke="#A855F7"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                          🔄
                        </span>
                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                          📊
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-emerald-500">
                          +950
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          This month
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-fuchsia-400 p-4 text-white shadow-[0_18px_40px_rgba(245,158,11,0.18)]">
                      <p className="text-xs font-semibold opacity-90">CAC</p>
                      <p className="mt-1 text-lg font-extrabold">{fmtIDR(16430)}</p>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-r from-violet-400 to-purple-500 p-4 text-white shadow-[0_18px_40px_rgba(168,85,247,0.18)]">
                      <p className="text-xs font-semibold opacity-90">CAC</p>
                      <p className="mt-1 text-lg font-extrabold">{fmtIDR(21700)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Complain System Table */}
          <Card className="col-span-12 lg:col-span-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">Complain System</p>
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                  Summary
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/60 px-4 py-4 ring-1 ring-white/70">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-violet-100 px-4 py-2">
                    <span className="text-sm font-extrabold text-violet-700">
                      IDR 3,230
                    </span>
                    <span className="ml-2 text-xs font-bold text-violet-500">
                      35%
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      IDR 5,523,000
                    </p>
                    <p className="text-xs font-semibold text-slate-400">
                      Total amount
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-white/70">
                <table className="w-full">
                  <thead className="bg-white/70">
                    <tr className="text-left text-xs font-bold text-slate-500">
                      <th className="px-4 py-3">INSPECT</th>
                      <th className="px-4 py-3">CUSTOMERS</th>
                      <th className="px-4 py-3">PRESS</th>
                      <th className="px-4 py-3">NOTES</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/55">
                    {[
                      { a: "CAC WIB", b: "IDR 1,020", c: "Broad", d: "87%", tone: "bg-fuchsia-500" },
                      { a: "CAC WPC", b: "IDR 21,700", c: "Broad", d: "15%", tone: "bg-violet-500" },
                      { a: "CAC Shift", b: "IDR 24,220", c: "Broad", d: "85%", tone: "bg-amber-500" },
                    ].map((r, i) => (
                      <tr key={i} className="border-t border-white/70 text-sm text-slate-700">
                        <td className="px-4 py-3 font-semibold">{r.a}</td>
                        <td className="px-4 py-3">{r.b}</td>
                        <td className="px-4 py-3">{r.c}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex rounded-lg px-3 py-1 text-xs font-bold text-white", r.tone)}>
                            {r.d}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gradient-to-r from-fuchsia-500 to-pink-400 p-4 text-white shadow-[0_18px_40px_rgba(236,72,153,0.18)]">
                  <p className="text-xs font-semibold opacity-90">CAC WPC</p>
                  <p className="mt-1 text-lg font-extrabold">25%</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white shadow-[0_18px_40px_rgba(245,158,11,0.18)]">
                  <p className="text-xs font-semibold opacity-90">Target</p>
                  <p className="mt-1 text-lg font-extrabold">22,200</p>
                  <p className="text-xs font-semibold opacity-90">92%</p>
                </div>
              </div>
            </div>
          </Card>

          {/* CAC Recommendation */}
          <Card className="col-span-12">
            <div className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-slate-800">
                      CAC Recommendation
                    </p>
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">
                      Total: IDR 52K
                    </span>
                  </div>

                  <div className="mt-6 flex flex-col items-center gap-6 md:flex-row">
                    <div className="relative">
                      <PieChart width={260} height={260}>
                        <Pie
                          data={cacDonut}
                          cx={130}
                          cy={130}
                          innerRadius={82}
                          outerRadius={112}
                          paddingAngle={2}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {cacDonut.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 grid place-items-center">
                        <div className="text-center">
                          <p className="text-3xl font-extrabold text-slate-900">
                            3211
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            CAC Score
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                      {cacDonut.map((d) => (
                        <div
                          key={d.name}
                          className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ background: d.color }}
                            />
                            <p className="text-sm font-semibold text-slate-700">
                              {d.name}
                            </p>
                          </div>
                          <p className="text-sm font-extrabold text-slate-900">
                            {d.value}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-[420px]">
                  <div className="rounded-2xl bg-white/60 p-5 ring-1 ring-white/70">
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-2xl text-amber-700 shadow-sm">
                        💡
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-800">
                          Recommendation
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          Morning shifts have the lowest CAC. Promote bundle offers
                          during morning shifts to increase conversion with lower cost.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
                            Bundle Offers
                          </span>
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                            Morning Shift
                          </span>
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                            Low CAC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer spacing */}
        <div className="mt-8 text-center text-xs font-semibold text-slate-400">
          © {new Date().getFullYear()} — Dashboard Analytics
        </div>
      </div>
    </div>
  );
}
