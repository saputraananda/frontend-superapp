import React from "react";
import { PieChart, Pie, Cell } from "recharts";
import { Card } from "./ui";

export default function CACRecommendationCard({ cacDonut }) {
    return (
        <Card className="col-span-12">
            <div className="p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-base font-bold text-slate-800">CAC Recommendation</p>
                            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600">Total: IDR 52K</span>
                        </div>

                        <div className="mt-6 flex flex-col items-center gap-6 md:flex-row">
                            <div className="relative">
                                <PieChart width={260} height={260}>
                                    <Pie data={cacDonut} cx={130} cy={130} innerRadius={82} outerRadius={112} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                                        {cacDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                </PieChart>
                                <div className="absolute inset-0 grid place-items-center">
                                    <div className="text-center">
                                        <p className="text-3xl font-extrabold text-slate-900">3211</p>
                                        <p className="text-xs font-semibold text-slate-500">CAC Score</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full max-w-sm space-y-3">
                                {cacDonut.map((d) => (
                                    <div key={d.name} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 ring-1 ring-white/70">
                                        <div className="flex items-center gap-3">
                                            <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                                            <p className="text-sm font-semibold text-slate-700">{d.name}</p>
                                        </div>
                                        <p className="text-sm font-extrabold text-slate-900">{d.value}%</p>
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
                                    <p className="text-sm font-extrabold text-slate-800">Recommendation</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                        Morning shifts have the lowest CAC. Promote bundle offers during morning shifts to increase conversion with lower cost.
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">Bundle Offers</span>
                                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">Morning Shift</span>
                                        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">Low CAC</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}