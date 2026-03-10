import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Card } from "./ui";

export default function TrafficCard({ trafficDonut, trafficBreakdown, period }) {
  return (
    <Card className="col-span-12 lg:col-span-4">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-slate-800">Traffic</p>
          <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">{period}</span>
        </div>

        <div className="mt-5 flex items-center justify-center">
          <div className="relative h-[220px] w-[220px]">
            <PieChart width={220} height={220}>
              <Pie data={trafficDonut} cx={110} cy={110} innerRadius={74} outerRadius={92} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                {trafficDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-4xl font-extrabold text-slate-900">88%</p>
                <p className="text-sm font-semibold text-slate-500">Achievement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-3">
          {trafficBreakdown.map((t) => (
            <div key={t.name} className="rounded-2xl bg-white/60 px-3 py-3 text-center ring-1 ring-white/70">
              <p className="text-2xl font-extrabold text-slate-900">{t.value}%</p>
              <p className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                {t.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}