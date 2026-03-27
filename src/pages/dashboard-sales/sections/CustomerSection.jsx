import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card } from "../components/ui";
import UnderDevelopmentDialog from "../../../components/UnderDevelopmentDialog";

const SEGMENTATION = [
  { name: "Loyal (>4x)",     value: 0,   color: "#EC4899", icon: "⭐" },
  { name: "Regular (2–3x)",  value: 0,   color: "#60A5FA", icon: "🔁" },
  { name: "One Time (1x)",   value: 135, color: "#F59E0B", icon: "1️⃣" },
  { name: "New Customer",    value: 13,  color: "#A855F7", icon: "🆕" },
];

const PER_OUTLET = [
  { outlet: "Citra Grand",    loyal: 0, regular: 0, oneTime: 41, newCust: 3 },
  { outlet: "Canadian",       loyal: 0, regular: 0, oneTime: 17, newCust: 3 },
  { outlet: "Kota Wisata",    loyal: 0, regular: 0, oneTime: 9,  newCust: 0 },
  { outlet: "Legenda Wisata", loyal: 0, regular: 0, oneTime: 16, newCust: 4 },
  { outlet: "Raffles Hills",  loyal: 0, regular: 0, oneTime: 52, newCust: 3 },
];

const CHART_DATA = PER_OUTLET.map((d) => ({
  name: d.outlet.split(" ").slice(-1)[0],
  "One Time": d.oneTime,
  "New":      d.newCust,
}));

export default function CustomerSection({ _filters }) {
  const [showNotice, setShowNotice] = useState(true);
  const total = SEGMENTATION.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-5">
      <UnderDevelopmentDialog
        open={showNotice}
        title="Data Masih Dummy"
        message="Data pada halaman ini masih dummy dan sedang on progress..."
        closeLabel="Oke, Mengerti"
        onClose={() => setShowNotice(false)}
      />
      {/* KPI Cards — 2 cols on mobile, 3 on sm, 5 on lg */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Total Customer", value: total, icon: "👥", tone: "from-fuchsia-500 to-violet-500" },
          ...SEGMENTATION.map((s) => ({
            label: s.name, value: s.value, icon: s.icon,
            tone: s.name.startsWith("Loyal")   ? "from-pink-400 to-rose-500"
                : s.name.startsWith("Regular") ? "from-sky-400 to-blue-500"
                : s.name.startsWith("One")     ? "from-amber-400 to-orange-500"
                : "from-violet-400 to-purple-500",
          })),
        ].map((k) => (
          <Card key={k.label} className="p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
            <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${k.tone} flex items-center justify-center shadow text-base sm:text-xl shrink-0`}>
              {k.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 leading-tight">{k.label}</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-800">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-5">
        {/* Donut chart */}
        <Card className="col-span-12 lg:col-span-4 p-4 sm:p-6 flex flex-row lg:flex-col items-center gap-6 lg:gap-0">
          <div className="shrink-0">
            <p className="text-sm font-bold text-slate-700 mb-3 lg:mb-4">Segmentasi Customer</p>
            <div className="relative">
              <PieChart width={160} height={160}>
                <Pie data={SEGMENTATION} cx={80} cy={80} innerRadius={46} outerRadius={70} paddingAngle={2} dataKey="value">
                  {SEGMENTATION.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-extrabold text-slate-900">{total}</p>
                  <p className="text-xs text-slate-500">Total</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:mt-4 w-full">
            {SEGMENTATION.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-600 text-xs">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Stacked bar per outlet */}
        <Card className="col-span-12 lg:col-span-8 p-4 sm:p-6">
          <p className="text-sm font-bold text-slate-700 mb-4">Customer per Outlet</p>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA} barSize={24}>
                <CartesianGrid strokeDasharray="4 10" stroke="rgba(148,163,184,0.3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                <Tooltip />
                <Bar dataKey="One Time" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="New" stackId="a" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Per outlet — card list on mobile, table on md+ */}
      <Card className="p-4 sm:p-6">
        <p className="text-sm font-bold text-slate-700 mb-4">Detail Segmentasi per Outlet</p>

        {/* Mobile: card list */}
        <div className="flex flex-col gap-3 md:hidden">
          {PER_OUTLET.map((row) => {
            const rowTotal = row.loyal + row.regular + row.oneTime + row.newCust;
            return (
              <div key={row.outlet} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-sm">{row.outlet}</span>
                  <span className="font-extrabold text-slate-800 text-sm">Total: {rowTotal}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium">⭐ Loyal</p>
                    <p className="text-slate-700 font-semibold">{row.loyal}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">🔁 Regular</p>
                    <p className="text-slate-700 font-semibold">{row.regular}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">1️⃣ One Time</p>
                    <p className="text-amber-600 font-bold">{row.oneTime}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">🆕 New Customer</p>
                    <p className="text-violet-600 font-bold">{row.newCust}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: full table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-500 border-b border-slate-100">
                {["Outlet", "⭐ Loyal", "🔁 Regular", "1️⃣ One Time", "🆕 New Customer", "Total"].map((h) => (
                  <th key={h} className="pb-3 pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PER_OUTLET.map((row) => {
                const rowTotal = row.loyal + row.regular + row.oneTime + row.newCust;
                return (
                  <tr key={row.outlet} className="border-b border-slate-50 hover:bg-slate-50/40 transition">
                    <td className="py-3 pr-4 font-semibold text-slate-800">{row.outlet}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.loyal}</td>
                    <td className="py-3 pr-4 text-slate-600">{row.regular}</td>
                    <td className="py-3 pr-4 font-semibold text-amber-600">{row.oneTime}</td>
                    <td className="py-3 pr-4 font-semibold text-violet-600">{row.newCust}</td>
                    <td className="py-3 pr-4 font-extrabold text-slate-800">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}