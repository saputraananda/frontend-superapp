import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from "recharts";
import { Card } from "./ui";
import { cn, fmtIDR } from "../utils/utils";

export default function CustomerAnalyticsCard({ customerData, analyticsTimeData, period }) {
  return (
    <Card className="col-span-12 lg:col-span-6">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-slate-800">Customer Analytics</p>
          <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">{period}</span>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative mx-auto w-[220px] md:mx-0">
            <PieChart width={220} height={220}>
              <Pie data={customerData} cx={110} cy={110} innerRadius={62} outerRadius={92} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                {customerData.map((d, i) => <Cell key={i} fill={d.color} />)}
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
                <div key={r.name} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70">
                  <div className="flex items-center gap-3">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-full", r.color)}>
                      <span>{r.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {r.name} <span className="text-xs font-semibold text-slate-400">{r.range}</span>
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
                    <Line type="monotone" dataKey="v" stroke="#A855F7" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">🔄</span>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">📊</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-emerald-500">+950</p>
                  <p className="text-xs font-semibold text-slate-500">This month</p>
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
  );
}